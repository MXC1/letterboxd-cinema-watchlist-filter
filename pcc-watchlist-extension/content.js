// Content script for PCC Watchlist Filter
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

function filterFilms(watchlist) {
  const filmBlocks = document.querySelectorAll('div.film_list-outer');
  filmBlocks.forEach(filmBlock => {
    const titleEl = filmBlock.querySelector('.liveeventtitle');
    if (!titleEl) return;
    const title = stripYear(titleEl.textContent.trim());
    if (!watchlist.includes(title)) {
      const parentEvent = filmBlock.closest('.jacro-event');
      if (parentEvent) {
        parentEvent.style.display = 'none';
      } else {
        filmBlock.style.display = 'none';
      }
    }
  });
}

function unfilterFilms() {
  const filmBlocks = document.querySelectorAll('.jacro-event, .film_list-outer');
  filmBlocks.forEach(block => {
    block.style.display = '';
  });
}

// Listen for changes to the showWatchlist state
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.showWatchlist) {
    const showWatchlist = changes.showWatchlist.newValue;
    if (showWatchlist) {
      getWatchlist().then(filterFilms);
    } else {
      unfilterFilms();
    }
  }
});

// Initialize based on current state
chrome.storage.sync.get(['showWatchlist'], (result) => {
  if (result.showWatchlist) {
    getWatchlist().then(filterFilms);
  }
});
