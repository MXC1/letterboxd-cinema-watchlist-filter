// content.js
// Content script for PCC Watchlist Filter

// Adding logs to track execution
function getWatchlist() {
  console.log('Fetching watchlist from storage');
  return new Promise((resolve) => {
    chrome.storage.sync.get(['watchlist'], (result) => {
      console.log('Retrieved watchlist:', result.watchlist);
      resolve(result.watchlist || []);
    });
  });
}

// Removes the year from a film title
function stripYear(title) {
  return title.replace(/\s*\(\d{4}\)$/, '');
}

// Filters films based on the watchlist
function filterFilms(watchlist) {
  console.log('Filtering films with watchlist:', watchlist);
  const filmBlocks = document.querySelectorAll('div.film_list-outer');
  filmBlocks.forEach((filmBlock) => {
    const titleEl = filmBlock.querySelector('.liveeventtitle');
    if (!titleEl) return;

    const title = stripYear(titleEl.textContent.trim());
    console.log('Checking film title:', title);
    if (!watchlist.includes(title)) {
      console.log('Hiding film block for title:', title);
      hideFilmBlock(filmBlock);
    }
  });
}

// Hides a film block or its parent event
function hideFilmBlock(filmBlock) {
  console.log('Hiding film block:', filmBlock);
  const parentEvent = filmBlock.closest('.jacro-event');
  if (parentEvent) {
    console.log('Hiding parent event:', parentEvent);
    parentEvent.style.display = 'none';
  } else {
    filmBlock.style.display = 'none';
  }
}

// Resets the visibility of all films
function unfilterFilms() {
  const filmBlocks = document.querySelectorAll('.jacro-event, .film_list-outer');
  filmBlocks.forEach((block) => {
    block.style.display = '';
  });
}

// Handles changes to the 'showWatchlist' state
function handleStorageChange(changes, namespace) {
  console.log('Storage changed:', changes, 'Namespace:', namespace);
  if (namespace === 'sync' && changes.showWatchlist) {
    const showWatchlist = changes.showWatchlist.newValue;
    console.log('New showWatchlist value:', showWatchlist);
    if (showWatchlist) {
      getWatchlist().then(filterFilms);
    } else {
      unfilterFilms();
    }
  }
}

// Sets up listeners for storage changes
function setupStorageListener() {
  chrome.storage.onChanged.addListener(handleStorageChange);
}

// Initializes the content script
function initializeContentScript() {
  setupStorageListener();
  // Additional initialization logic can be added here
}

initializeContentScript();
