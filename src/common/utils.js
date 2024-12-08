export const FILTERS = {
    REQUEST_TYPES: ['XHR', 'Fetch'],
    CONTENT_TYPES: ['application/json', 'text/json'],
    EXCLUDED_URLS: ['chrome://', 'chrome-extension://']
  };

// Example: Sending data to an API endpoint

async function sendDataToAPI(data) {
  try {
    const response = await fetch('https://your-api-endpoint.com/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    log('Data sent successfully:', result);
  } catch (error) {
    console.error('Error sending data to API:', error);
  }
}

// Example: Storage Utility

export function saveToStorage(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export function getFromStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
}