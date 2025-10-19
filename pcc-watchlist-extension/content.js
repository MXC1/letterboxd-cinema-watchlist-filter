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

function addToggleButton() {
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
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.style.borderRadius = '6px';
  btn.style.padding = '8px 14px';
  btn.style.cursor = 'pointer';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.fontWeight = '500';

  container.appendChild(btn);
  document.body.appendChild(container);

  let filtered = false;
  let lastWatchlist = [];

  // MutationObserver to re-apply filter if active
  const filmListContainer = document.querySelector('.jacrofilm-list');
  if (filmListContainer) {
    const observer = new MutationObserver(async () => {
      if (filtered) {
        if (!lastWatchlist.length) {
          lastWatchlist = await getWatchlist();
        }
        filterFilms(lastWatchlist);
      }
    });
    observer.observe(filmListContainer, { childList: true, subtree: true });
  }

  btn.addEventListener('click', async () => {
    if (!filtered) {
      lastWatchlist = await getWatchlist();
      filterFilms(lastWatchlist);
      btn.textContent = 'Show All Films';
    } else {
      unfilterFilms();
      btn.textContent = 'Toggle Watchlist Mode';
    }
    filtered = !filtered;
  });
}

addToggleButton();
