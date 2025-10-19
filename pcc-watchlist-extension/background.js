// Empty background script for manifest v3
chrome.action.onClicked.addListener(() => {
  console.log('Action button clicked');
  chrome.storage.sync.get(['showWatchlist'], (result) => {
    console.log('Current showWatchlist value:', result.showWatchlist);
    const newState = !result.showWatchlist;
    chrome.storage.sync.set({ showWatchlist: newState }, () => {
      console.log('Updated showWatchlist to:', newState);
    });
  });
});
