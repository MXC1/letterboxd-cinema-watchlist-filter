// Empty background script for manifest v3
chrome.action.onClicked.addListener(() => {
  chrome.storage.sync.get(['showWatchlist'], (result) => {
    const newState = !result.showWatchlist;
    chrome.storage.sync.set({ showWatchlist: newState });
    console.log('Toggled showWatchlist to:', newState);
  });
});
