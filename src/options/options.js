import { log } from '../common/utils.js';

// Save options to storage
function saveOptions(e) {
  e.preventDefault();
  const apiEndpoint = document.getElementById('apiEndpoint').value;
  const enableDomCapture = document.getElementById('enableDomCapture').checked;

  chrome.storage.sync.set({
    apiEndpoint,
    enableDomCapture
  }, () => {
    log('Options saved:', { apiEndpoint, enableDomCapture });
    alert('Options saved successfully!');
  });
}

// Restore options from storage
function restoreOptions() {
  chrome.storage.sync.get(['apiEndpoint', 'enableDomCapture'], (items) => {
    document.getElementById('apiEndpoint').value = items.apiEndpoint || '';
    document.getElementById('enableDomCapture').checked = items.enableDomCapture || false;
    log('Options restored:', items);
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('optionsForm').addEventListener('submit', saveOptions); 