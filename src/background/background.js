import { FILTERS } from '../common/constants.js';
import { log } from '../common/utils.js';

// Store captured requests
const requestMap = new Map();

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getRequests") {
    const requestsArray = Array.from(requestMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    log('Sending requests to popup:', requestsArray);
    sendResponse({ requests: requestsArray });
  }
  return true;
});

// Initialize debugger when a tab is activated
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    log('Activated Tab:', tabId, 'URL:', tab.url);
    if (tab.url && !FILTERS.EXCLUDED_URLS.some(prefix => tab.url.startsWith(prefix))) {
      chrome.debugger.attach({ tabId }, "1.0", () => {
        if (chrome.runtime.lastError) {
          console.error('Debugger attach failed:', chrome.runtime.lastError.message);
          return;
        }
        log(`Debugger attached to Tab ID: ${tabId}`);
        chrome.debugger.sendCommand({ tabId }, "Network.enable", {}, () => {
          if (chrome.runtime.lastError) {
            console.error('Network.enable failed:', chrome.runtime.lastError.message);
            return;
          }
          log("Network monitoring enabled for Tab ID:", tabId);
        });
      });
    } else {
      log('Skipped attaching to restricted URL:', tab.url);
    }
  } catch (error) {
    console.error('Tab access error:', error);
  }
});

// Listen for debugger events
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Network.requestWillBeSent") {
    const { requestId, request, timestamp, initiator, type } = params;
    
    // Filter by request type
    if (!FILTERS.REQUEST_TYPES.includes(type)) {
      return;
    }

    const requestEntry = {
      requestId,
      url: request.url,
      method: request.method,
      timestamp: new Date(timestamp * 1000).toISOString(),
      requestBody: request.postData || '',
      status: 'pending',
      response: null
    };
    requestMap.set(requestId, requestEntry);
    log('Request Captured:', requestEntry);
  }

  if (method === "Network.responseReceived") {
    const { requestId, response } = params;
    if (requestMap.has(requestId)) {
      const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
      
      // Filter by Content-Type
      if (!FILTERS.CONTENT_TYPES.includes(contentType.split(';')[0])) {
        requestMap.delete(requestId);
        log(`Excluded Request ID ${requestId} due to Content-Type: ${contentType}`);
        return;
      }

      const requestEntry = requestMap.get(requestId);
      requestEntry.status = response.status;
      requestEntry.contentType = contentType;
      requestMap.set(requestId, requestEntry);
      log('Response Received:', requestEntry);
    }
  }

  if (method === "Network.loadingFinished") {
    const { requestId, timestamp } = params;
    if (requestMap.has(requestId)) {
      const requestEntry = requestMap.get(requestId);
      requestEntry.completed = true;
      requestMap.set(requestId, requestEntry);
      log('Request Completed:', requestEntry);
    }
  }
});

// Handle debugger detachment
chrome.debugger.onDetach.addListener((source, reason) => {
  log('Debugger detached from Tab ID:', source.tabId, 'Reason:', reason);
}); 