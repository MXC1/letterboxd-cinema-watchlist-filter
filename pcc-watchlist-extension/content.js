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
  if (document.getElementById('pcc-watchlist-toggle')) return;

  // Find the filter bar
  const filterBar = document.querySelector('.jacro-filmsort-filter .filmsort-items');
  if (!filterBar) return;

  // Toggle button styled as a span.button
  const btn = document.createElement('span');
  btn.id = 'pcc-watchlist-toggle';
  btn.className = 'button';
  btn.textContent = 'Toggle Watchlist Mode';
  btn.style.marginLeft = '12px';
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.style.borderRadius = '6px';
  btn.style.padding = '8px 14px';
  btn.style.cursor = 'pointer';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.fontWeight = '500';

  // Settings gear button as a span.button
  const gearBtn = document.createElement('span');
  gearBtn.id = 'pcc-watchlist-gear';
  gearBtn.className = 'button';
  gearBtn.title = 'Watchlist Settings';
  gearBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb400" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.31-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06c.46.46 1.12.6 1.82.33h.09c.7 0 1.31-.4 1.51-1V3a2 2 0 0 1 4 0v.09c0 .7.4 1.31 1 1.51.7.27 1.36.13 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82c.2.6.81 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.7 0-1.31.4-1.51 1z"/></svg>';
  gearBtn.style.marginLeft = '8px';
  gearBtn.style.background = '#222';
  gearBtn.style.borderRadius = '6px';
  gearBtn.style.padding = '8px';
  gearBtn.style.cursor = 'pointer';
  gearBtn.style.display = 'inline-flex';
  gearBtn.style.alignItems = 'center';

  filterBar.appendChild(btn);
  filterBar.appendChild(gearBtn);

  gearBtn.addEventListener('click', () => {
    alert('To open the Watchlist Settings, please click the extension icon in your browser toolbar. Chrome does not allow content scripts to open extension popups directly.');
  });

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
