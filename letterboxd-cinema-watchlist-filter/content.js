// Content script for Letterboxd Cinema Watchlist Filter
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
  },
  {
    name: "vue",
    url: /^https:\/\/www\.myvue\.com\/cinema\/.*\/whats-on.*$/,
    selectors: {
      filmBlock: "li.showing-listing__item",
      title: "span.film-heading__title",
      parentEvent: "li.showing-listing__item",
      filmListContainer: "div.showing-listing"
    }
  },
  {
    name: "vue-homepage",
    url: /^https:\/\/www\.myvue\.com\/?$/,
    selectors: {
      filmBlock: "li.film-cards-list-item",
      title: "h3.card-title a",
      parentEvent: "li.film-cards-list-item",
      filmListContainer: "ul.film-cards-list"
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
function initializeExtension() {
  const currentUrl = window.location.href;

  // Remove existing toggle button if present
  const existingContainer = document.getElementById('pcc-watchlist-toggle-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  const matchingCinemaConfig = cinemaConfigs.find(config => {
    if (typeof config.url === 'string') {
      return currentUrl.startsWith(config.url);
    } else if (config.url instanceof RegExp) {
      return config.url.test(currentUrl);
    }
    return false;
  });

  if (matchingCinemaConfig) {
    addToggleButton(matchingCinemaConfig);
  } else {
    console.log("No matching cinema configuration found for the current URL.");
  }
}

// Observe URL changes to reinitialize the extension
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    initializeExtension();
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });

// Fallback for single-page applications (SPAs) or history API changes
window.addEventListener('popstate', initializeExtension);
window.addEventListener('pushstate', initializeExtension);
window.addEventListener('replacestate', initializeExtension);

// Initial call to set up the extension
initializeExtension();
