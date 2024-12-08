// Function to display requests
function displayRequests(requests) {
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
          ${formatData(request.requestBody)}
        </div>
      </div>
      
      <div>
        <button class="expand-btn response-data-btn">Show Response Data</button>
        <div class="data-section" style="display: none;">
          ${formatData(request.response)}
        </div>
      </div>
    `;
    requestList.appendChild(li);
  });
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
  console.log('toggleRequestData called');
  const dataSection = button.nextElementSibling;
  console.log('dataSection:', dataSection);
  const isVisible = dataSection.style.display === 'block';
  console.log('isVisible:', isVisible);
  dataSection.style.display = isVisible ? 'none' : 'block';
  console.log('dataSection.style.display:', dataSection.style.display);
  button.textContent = isVisible ? 'Show Data' : 'Hide Data';
  console.log('button.textContent:', button.textContent);
}

// Refresh data function
function refreshData() {
  chrome.runtime.sendMessage({action: "getRequests"}, function(response) {
    if (response && response.requests) {
      displayRequests(response.requests);
    }
  });
}

// Flatten object with customizable depth and prefix
function flattenObject(obj, prefix = '', depth = 1, currentDepth = 1) {
  let flattened = {};
  
  for (const [key, value] of Object.entries(obj || {})) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null) {
      flattened[newKey] = '';
    } else if (typeof value === 'object' && !Array.isArray(value) && currentDepth < depth) {
      Object.assign(flattened, flattenObject(value, newKey, depth, currentDepth + 1));
    } else {
      // Handle arrays and other values
      flattened[newKey] = Array.isArray(value) ? JSON.stringify(value) : String(value);
    }
  }
  
  return flattened;
}

// Parse request/response body
function parseBody(body) {
  if (!body) return {};
  try {
    return typeof body === 'string' ? JSON.parse(body) : body;
  } catch (e) {
    return { rawContent: body };
  }
}

// Convert requests to CSV
function convertToCSV(requests, depth) {
  const flattenedRequests = requests.map(request => {
    const baseData = {
      timestamp: request.timestamp,
      method: request.method,
      url: request.url,
      status: request.status || 'pending',
      contentType: request.contentType || 'unknown'
    };
    
    if (depth >= 2) {
      // Add request body data
      const requestBodyData = flattenObject(parseBody(request.requestBody), 'req', 2);
      Object.assign(baseData, requestBodyData);
    }
    
    if (depth >= 3) {
      // Add response data
      const responseData = flattenObject(parseBody(request.response), 'res', 2);
      Object.assign(baseData, responseData);
    }
    
    return baseData;
  });
  
  if (flattenedRequests.length === 0) return '';
  
  // Get all possible headers
  const headers = Array.from(new Set(
    flattenedRequests.flatMap(obj => Object.keys(obj))
  ));
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...flattenedRequests.map(obj =>
      headers.map(header => {
        const value = obj[header] || '';
        // Escape and quote values containing commas or quotes
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

// Download CSV file
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  refreshData();

   // Use event delegation for dynamically added buttons
   document.getElementById('requestList').addEventListener('click', function(e) {
    // Check if clicked element is an expand button
    if (e.target.classList.contains('expand-btn')) {
      toggleRequestData(e.target);
    }
  });
  
  // Clear button functionality
  document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('requestList').innerHTML = '';
  });
  
  // Refresh button functionality
  document.getElementById('refreshBtn').addEventListener('click', refreshData);
  
  // Export button functionality
  document.getElementById('exportBtn').addEventListener('click', function() {
    const depth = parseInt(document.getElementById('exportDepth').value);
    chrome.runtime.sendMessage({action: "getRequests"}, function(response) {
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
