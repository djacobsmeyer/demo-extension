// Store captured requests
let requestMap = new Map();

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "getRequests") {
      const requestsArray = Array.from(requestMap.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      sendResponse({requests: requestsArray});
    }
    return true;
  }
);

// Initialize debugger when a tab is activated
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    // Check if URL is accessible
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      chrome.debugger.attach({ tabId }, "1.0", () => {
        chrome.debugger.sendCommand({ tabId }, "Network.enable");
      });
    }
  } catch (error) {
    console.log('Tab access error:', error);
  }
});