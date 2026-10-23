// Content script for Letterboxd Cinema Watchlist Filter
console.log('[LBFilter] Content script loaded on:', window.location.href);
const cinemaConfigs = [
  {
    name: "prince-charles-cinema",
    url: "https://princecharlescinema.com/whats-on/",
    weekdayFilter: true,
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
  },
  {
    // FilmHose is a React SPA with unclassed markup: each title is a collapsed row
    // (<span>▶</span><strong>Title</strong><span>(N showings)</span>) whose showtimes
    // ("Sun 25 Oct 7:20 PM · Venue · Title") only render once expanded.
    name: "filmhose",
    url: "https://filmhose.uk/titles",
    selectors: {
      filmBlock: "div:has(> div > div > strong)",
      title: "strong",
      parentEvent: "div:has(> div > div > strong)",
      filmListContainer: "div:has(> div > div > div > strong)"
    },
    expand: block => {
      const row = block.querySelector('strong')?.parentElement;
      if (row && row.firstElementChild?.textContent.trim() === '▶') row.click();
    }
  }
  // Add more cinema configurations here
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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

function normalizeTitle(title) {
  return title
    .replace(/\u2026/g, '...')   // unicode ellipsis → three dots
    .replace(/[\u2018\u2019]/g, "'")  // curly single quotes → straight
    .replace(/[\u201C\u201D]/g, '"')  // curly double quotes → straight
    .replace(/\u2013/g, '-')    // en-dash → hyphen
    .replace(/\u2014/g, '-')    // em-dash → hyphen
    .replace(/\.{2,}$/, '')     // strip trailing dots/ellipsis
    .toLowerCase()
    .trim();
}

function hasWeekdayEveningShowtime(element) {
  // DOM-based approach: parse .heading elements for day, .time elements for time
  const headings = element.querySelectorAll('.heading, .performance-list-items > div');
  if (headings.length > 0) {
    const ul = element.querySelector('.performance-list-items');
    if (!ul) return false;

    let currentDay = null;
    for (const child of ul.children) {
      if (child.classList.contains('heading') || child.tagName === 'DIV') {
        const dayMatch = child.textContent.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
        currentDay = dayMatch ? dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase() : null;
      } else if (child.tagName === 'LI' && currentDay) {
        const timeEl = child.querySelector('.time');
        if (!timeEl) continue;
        const timeMatch = timeEl.textContent.trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (!timeMatch) continue;

        let hour24 = parseInt(timeMatch[1]);
        const period = timeMatch[3].toUpperCase();
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;

        if (WEEKDAYS.includes(currentDay) && hour24 >= 17 && hour24 < 19) {
          return true;
        }
      }
    }
    return false;
  }

  return false;
}

function applyFilters(filterState, selectors, expand) {
  // First, show all films
  const allBlocks = document.querySelectorAll(`${selectors.parentEvent}, ${selectors.filmBlock}`);
  allBlocks.forEach(block => {
    block.style.display = '';
  });

  const filmBlocks = document.querySelectorAll(selectors.filmBlock);
  filmBlocks.forEach(filmBlock => {
    const parentEvent = filmBlock.closest(selectors.parentEvent) || filmBlock;

    // Watchlist filter
    if (filterState.watchlistActive) {
      const titleEl = filmBlock.querySelector(selectors.title);
      if (!titleEl) return;
      const title = normalizeTitle(stripYear(titleEl.textContent.trim()));
      if (!filterState.normalizedWatchlist.includes(title)) {
        parentEvent.style.display = 'none';
        return;
      }
    }

    // Weekday evening filter: search in filmBlock (contains the showtimes), not parentEvent
    if (filterState.timeActive) {
      if (expand) expand(filmBlock); // showtimes only exist in the DOM once expanded
      if (!hasWeekdayEveningShowtime(filmBlock)) {
        parentEvent.style.display = 'none';
      }
    }
  });
}

function addToggleButton(cinemaConfig) {
  const { selectors, expand } = cinemaConfig;

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

  const btnStyle = `
    background: #111;
    color: #fff;
    border-radius: 6px;
    padding: 8px 14px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    font-weight: 500;
    font-size: 16px;
  `;

  // Toggle button styled as a span.button
  const btn = document.createElement('span');
  btn.id = 'pcc-watchlist-toggle';
  btn.className = 'button';
  btn.textContent = 'Toggle Watchlist Mode';
  btn.style.cssText = btnStyle;

  // Weekday evening filter button
  const timeBtn = document.createElement('span');
  timeBtn.id = 'pcc-time-toggle';
  timeBtn.className = 'button';
  timeBtn.textContent = 'Weekday 17-19';
  timeBtn.style.cssText = btnStyle;

  // Explicitly unset ::after content
  const style = document.createElement('style');
  style.textContent = `
    #pcc-watchlist-toggle::after { content: none !important; }
    #pcc-time-toggle::after { content: none !important; }
    #pcc-time-toggle.active { background: #ffb400 !important; color: #181818 !important; }
    #pcc-watchlist-toggle.active { background: #ffb400 !important; color: #181818 !important; }
  `;
  document.head.appendChild(style);

  container.appendChild(btn);
  // Showtime parsing only exists for some sites, so only offer the filter there
  if (cinemaConfig.weekdayFilter) container.appendChild(timeBtn);
  document.body.appendChild(container);

  const filterState = {
    watchlistActive: false,
    timeActive: false,
    watchlist: [],
    normalizedWatchlist: []
  };

  // MutationObserver to re-apply filters if active
  const filmListContainer = document.querySelector(selectors.filmListContainer) || (expand ? document.body : null);
  if (filmListContainer) {
    const observer = new MutationObserver(async () => {
      if (filterState.watchlistActive || filterState.timeActive) {
        if (filterState.watchlistActive && !filterState.watchlist.length) {
          filterState.watchlist = await getWatchlist();
          filterState.normalizedWatchlist = filterState.watchlist.map(normalizeTitle);
        }
        applyFilters(filterState, selectors, expand);
      }
    });
    observer.observe(filmListContainer, { childList: true, subtree: true });
  }

  btn.addEventListener('click', async () => {
    filterState.watchlistActive = !filterState.watchlistActive;
    if (filterState.watchlistActive) {
      filterState.watchlist = await getWatchlist();
      filterState.normalizedWatchlist = filterState.watchlist.map(normalizeTitle);
      btn.textContent = 'Show All Films';
      btn.classList.add('active');
    } else {
      btn.textContent = 'Toggle Watchlist Mode';
      btn.classList.remove('active');
    }
    applyFilters(filterState, selectors, expand);
  });

  timeBtn.addEventListener('click', () => {
    filterState.timeActive = !filterState.timeActive;
    console.log('[LBFilter] Time filter toggled:', filterState.timeActive);
    console.log('[LBFilter] Film blocks found:', document.querySelectorAll(selectors.filmBlock).length);
    console.log('[LBFilter] Parent events found:', document.querySelectorAll(selectors.parentEvent).length);
    if (filterState.timeActive) {
      timeBtn.textContent = 'Weekday 17-19 ✓';
      timeBtn.classList.add('active');
    } else {
      timeBtn.textContent = 'Weekday 17-19';
      timeBtn.classList.remove('active');
    }
    applyFilters(filterState, selectors, expand);
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
