import { convertToCSV, downloadCSV, log } from '../common/utils.js';

// Function to display requests
function displayRequests(requests) {
  log('Displaying Requests:', requests);
  const requestList = document.getElementById('requestList');
  requestList.innerHTML = '';

  requests.forEach(request => {
    const li = document.createElement('li');
    li.className = 'request-item';

    const statusClass = request.status >= 200 && request.status < 300 ? 'success' : 'error';

    li.innerHTML = `
      <div>
        <span class="method">${request.method}</span>
        <span class="status ${statusClass}">${request.status || 'pending'}</span>
      </div>
      <div class="url">${request.url}</div>
      <div class="timestamp">${request.timestamp}</div>
      
      <div>
        <button class="expand-btn request-data-btn">Show Request Data</button>
        <div class="data-section" style="display: none;">
          <pre>${sanitizeHTML(formatData(request.requestBody))}</pre>
        </div>
      </div>
      
      <div>
        <button class="expand-btn response-data-btn">Show Response Data</button>
        <div class="data-section" style="display: none;">
          <pre>${sanitizeHTML(formatData(request.response))}</pre>
        </div>
      </div>
    `;
    requestList.appendChild(li);
  });
}

// Utility function to sanitize HTML to prevent XSS
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Format data for display
function formatData(data) {
  if (!data) return 'No data available';
  try {
    // Try to parse and prettify JSON
    const parsed = JSON.parse(data);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    // If not JSON, return as is
    return data;
  }
}

// Toggle request/response data visibility
function toggleRequestData(button) {
  log('toggleRequestData called');
  const dataSection = button.nextElementSibling;
  log('dataSection:', dataSection);
  const isVisible = dataSection.style.display === 'block';
  log('isVisible:', isVisible);
  dataSection.style.display = isVisible ? 'none' : 'block';
  button.textContent = isVisible ? 'Show Data' : 'Hide Data';
  log('button.textContent:', button.textContent);
}

// Refresh data function
function refreshData() {
  log('Refreshing data...');
  chrome.runtime.sendMessage({ action: "getRequests" }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error fetching requests:', chrome.runtime.lastError.message);
      return;
    }
    log('Received response from background:', response);
    if (response && response.requests) {
      displayRequests(response.requests);
    }
  });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  refreshData();

  // Use event delegation for dynamically added buttons
  document.getElementById('requestList').addEventListener('click', function(e) {
    log('Popup Click Event:', e.target);
    if (e.target.classList.contains('expand-btn')) {
      log('Expand button clicked');
      toggleRequestData(e.target);
    }
  });

  // Clear button functionality
  document.getElementById('clearBtn').addEventListener('click', function() {
    log('Clear Requests button clicked');
    document.getElementById('requestList').innerHTML = '';
  });

  // Refresh button functionality
  document.getElementById('refreshBtn').addEventListener('click', function() {
    log('Refresh button clicked');
    refreshData();
  });

  // Export button functionality
  document.getElementById('exportBtn').addEventListener('click', function() {
    const depth = parseInt(document.getElementById('exportDepth').value);
    log('Export button clicked with depth:', depth);
    chrome.runtime.sendMessage({ action: "getRequests" }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error exporting requests:', chrome.runtime.lastError.message);
        return;
      }
      if (response && response.requests) {
        const csv = convertToCSV(response.requests, depth);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadCSV(csv, `xhr-requests-${timestamp}.csv`);
      }
    });
  });

  // Auto-refresh every 2 seconds
  setInterval(refreshData, 2000);
}); 