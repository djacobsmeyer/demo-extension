import { log } from '../common/utils.js';

// Example: Capture specific DOM data
function captureDOMData() {
  try {
    const data = {
      title: document.title,
      url: window.location.href,
      // Add more DOM data as needed
    };
    log('Captured DOM Data:', data);
    // Send data to background or popup
    chrome.runtime.sendMessage({ action: "captureDOMData", data });
  } catch (error) {
    console.error('Error capturing DOM data:', error);
  }
}

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getDOMData") {
    captureDOMData();
    sendResponse({ status: 'DOM data captured' });
  }
}); 