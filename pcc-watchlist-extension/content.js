// Content script for PCC Watchlist Filter
const cinemaConfigs = [
  {
    name: "prince-charles-cinema",
    url: "https://princecharlescinema.com/whats-on/",
    selectors: {
      filmBlock: "div.film_list-outer",
      title: ".liveeventtitle",
      parentEvent: ".jacro-event",
      filmListContainer: ".jacrofilm-list"
    }
  },
  {
    name: "cineworld",
    url: "https://www.cineworld.co.uk/cinemas/",
    selectors: {
      filmBlock: "div.row.movie-row",
      title: "h3.qb-movie-name",
      parentEvent: "div.row.qb-movie",
      filmListContainer: "div.events.col-xs-12"
    }
  },
  {
    name: "odeon",
    url: "https://www.odeon.co.uk/cinemas/",
    selectors: {
      filmBlock: "li.v-showtime-picker-film-list__item",
      title: "h2.v-film-title__text",
      parentEvent: "li.v-showtime-picker-film-list__item",
      filmListContainer: "ul.v-showtime-picker-site-list"
    }
  }
  // Add more cinema configurations here
];

function getWatchlist() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['watchlist'], (result) => {
      resolve(result.watchlist || []);
    });
  });
}

function stripYear(title) {
  return title.replace(/\s*\(\d{4}\)$/, '');
}

function filterFilms(watchlist, selectors) {
  const filmBlocks = document.querySelectorAll(selectors.filmBlock);
  filmBlocks.forEach(filmBlock => {
    const titleEl = filmBlock.querySelector(selectors.title);
    if (!titleEl) return;
    const title = stripYear(titleEl.textContent.trim());
    if (!watchlist.includes(title)) {
      const parentEvent = filmBlock.closest(selectors.parentEvent);
      if (parentEvent) {
        parentEvent.style.display = 'none';
      } else {
        filmBlock.style.display = 'none';
      }
    }
  });
}

function unfilterFilms(selectors) {
  const filmBlocks = document.querySelectorAll(`${selectors.parentEvent}, ${selectors.filmBlock}`);
  filmBlocks.forEach(block => {
    block.style.display = '';
  });
}

function addToggleButton(cinemaConfig) {
  const { selectors } = cinemaConfig;

  // Only add if not already present
  if (document.getElementById('pcc-watchlist-toggle-container')) return;

  // Create a floating container for the buttons
  const container = document.createElement('div');
  container.id = 'pcc-watchlist-toggle-container';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  container.style.display = 'flex';
  container.style.gap = '8px';

  // Toggle button styled as a span.button
  const btn = document.createElement('span');
  btn.id = 'pcc-watchlist-toggle';
  btn.className = 'button';
  btn.textContent = 'Toggle Watchlist Mode';
  // btn.style.all = 'unset'; // Reset all inherited styles
  btn.style.background = '#111'; // Almost black background
  btn.style.color = '#fff'; // White text
  btn.style.borderRadius = '6px';
  btn.style.padding = '8px 14px';
  btn.style.cursor = 'pointer';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.fontWeight = '500';
  btn.style.fontSize = '16px';

  // Explicitly unset ::after content
  const style = document.createElement('style');
  style.textContent = `#pcc-watchlist-toggle::after { content: none !important; }`;
  document.head.appendChild(style);

  container.appendChild(btn);
  document.body.appendChild(container);

  let filtered = false;
  let lastWatchlist = [];

  // MutationObserver to re-apply filter if active
  const filmListContainer = document.querySelector(selectors.filmListContainer);
  if (filmListContainer) {
    const observer = new MutationObserver(async () => {
      if (filtered) {
        if (!lastWatchlist.length) {
          lastWatchlist = await getWatchlist();
        }
        filterFilms(lastWatchlist, selectors);
      }
    });
    observer.observe(filmListContainer, { childList: true, subtree: true });
  }

  btn.addEventListener('click', async () => {
    if (!filtered) {
      lastWatchlist = await getWatchlist();
      filterFilms(lastWatchlist, selectors);
      btn.textContent = 'Show All Films';
    } else {
      unfilterFilms(selectors);
      btn.textContent = 'Toggle Watchlist Mode';
    }
    filtered = !filtered;
  });
}

// Initialize the extension for the appropriate cinema configuration based on the current URL
const currentUrl = window.location.href;
const matchingCinemaConfig = cinemaConfigs.find(config => currentUrl.startsWith(config.url));

if (matchingCinemaConfig) {
  addToggleButton(matchingCinemaConfig);
} else {
  console.warn("No matching cinema configuration found for the current URL.");
}
