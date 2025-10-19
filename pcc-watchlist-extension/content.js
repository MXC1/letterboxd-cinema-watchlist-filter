// content.js
// Content script for PCC Watchlist Filter

const cinemaConfigs = [
  {
    name: "prince-charles-cinema",
    url: "https://princecharlescinema.com/whats-on/",
    filmSelector: "div.film_list-outer",
    titleSelector: ".liveeventtitle",
    parentSelector: ".jacro-event",
  },
  // Add new cinema configurations here
  // {
  //   name: "another-cinema",
  //   url: "https://anothercinema.com/films",
  //   filmSelector: "div.movie-item",
  //   titleSelector: ".movie-title",
  //   parentSelector: ".event-container",
  // },
];

// Adding logs to track execution
function getWatchlist() {
  console.log("Fetching watchlist from storage");
  return new Promise((resolve) => {
    chrome.storage.sync.get(["watchlist"], (result) => {
      console.log("Retrieved watchlist:", result.watchlist);
      resolve(result.watchlist || []);
    });
  });
}

// Removes the year from a film title
function stripYear(title) {
  return title.replace(/\s*\(\d{4}\)$/, "");
}

// Filters films based on the watchlist
function filterFilms(watchlist, config) {
  console.log(`Filtering films for cinema: ${config.name}`);
  const filmBlocks = document.querySelectorAll(config.filmSelector);
  console.log(`Found ${filmBlocks.length} film blocks for cinema: ${config.name}`);
  filmBlocks.forEach((filmBlock) => {
    const titleEl = filmBlock.querySelector(config.titleSelector);
    if (!titleEl) {
      console.log("No title element found in film block:", filmBlock);
      return;
    }

    const title = stripYear(titleEl.textContent.trim());
    console.log("Checking film title:", title);
    if (!watchlist.includes(title)) {
      console.log("Hiding film block for title:", title);
      hideFilmBlock(filmBlock, config.parentSelector);
    }
  });
}

// Hides a film block or its parent event
function hideFilmBlock(filmBlock, parentSelector) {
  console.log("Hiding film block:", filmBlock);
  const parentEvent = filmBlock.closest(parentSelector);
  if (parentEvent) {
    console.log("Hiding parent event:", parentEvent);
    parentEvent.style.display = "none";
  } else {
    filmBlock.style.display = "none";
  }
}

// Resets the visibility of all films
function unfilterFilms(config) {
  console.log(`Resetting visibility for cinema: ${config.name}`);
  const filmBlocks = document.querySelectorAll(`${config.parentSelector}, ${config.filmSelector}`);
  console.log(`Found ${filmBlocks.length} blocks to reset for cinema: ${config.name}`);
  filmBlocks.forEach((block) => {
    block.style.display = "";
  });
}

// Handles changes to the 'showWatchlist' state
function handleStorageChange(changes, namespace, config) {
  console.log("Storage changed:", changes, "Namespace:", namespace);
  if (namespace === "sync" && changes.showWatchlist) {
    const showWatchlist = changes.showWatchlist.newValue;
    console.log(`New showWatchlist value for cinema ${config.name}:`, showWatchlist);
    if (showWatchlist) {
      getWatchlist().then((watchlist) => {
        console.log(`Applying filter for cinema: ${config.name}`);
        filterFilms(watchlist, config);
      });
    } else {
      console.log(`Removing filter for cinema: ${config.name}`);
      unfilterFilms(config);
    }
  }
}

// Sets up listeners for storage changes
function setupStorageListener(config) {
  console.log(`Setting up storage listener for cinema: ${config.name}`);
  chrome.storage.onChanged.addListener((changes, namespace) => {
    handleStorageChange(changes, namespace, config);
  });
}

// Initializes the content script
function initializeContentScript() {
  cinemaConfigs.forEach((config) => {
    console.log(`Initializing content script for cinema: ${config.name}`);
    setupStorageListener(config);
  });
  // Additional initialization logic can be added here
}

initializeContentScript();
