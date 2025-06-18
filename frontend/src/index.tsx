import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// CRITICAL: Always load protection system first
import './setupProtection';
import './utils/developmentModeProtection';
import './utils/walletFixer';

// Enhanced error handling and stability
window.addEventListener('error', (event) => {
  console.warn('Global error caught:', event.error);
  // Prevent white screen on critical errors
  if (event.error && event.error.message && event.error.message.includes('Loading chunk')) {
    console.log('Reloading due to chunk loading error...');
    window.location.reload();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  // Don't prevent default for promise rejections, just log them
});

// Enhance navigation stability
// eslint-disable-next-line no-restricted-globals
const originalPushState = history.pushState;
// eslint-disable-next-line no-restricted-globals
const originalReplaceState = history.replaceState;

// eslint-disable-next-line no-restricted-globals
history.pushState = function(data: any, unused: string, url?: string | URL | null) {
  try {
    return originalPushState.call(this, data, unused, url);
  } catch (error) {
    console.warn('Navigation error:', error);
    return false;
  }
};

// eslint-disable-next-line no-restricted-globals
history.replaceState = function(data: any, unused: string, url?: string | URL | null) {
  try {
    return originalReplaceState.call(this, data, unused, url);
  } catch (error) {
    console.warn('Navigation error:', error);
    return false;
  }
};

// Prevent refresh loops
let refreshCount = 0;
const MAX_REFRESHES = 3;

try {
  const refreshCountStr = sessionStorage.getItem('refreshCount');
  if (refreshCountStr) {
    refreshCount = parseInt(refreshCountStr, 10) || 0;
  }

  if (refreshCount >= MAX_REFRESHES) {
    console.warn('Maximum refresh attempts reached, clearing storage...');
    sessionStorage.clear();
    localStorage.removeItem('refreshCount');
    refreshCount = 0;
  }

  sessionStorage.setItem('refreshCount', (refreshCount + 1).toString());
} catch (error) {
  console.warn('Session storage not available:', error);
}

// Clear refresh count after successful load
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      sessionStorage.removeItem('refreshCount');
    } catch (error) {
      console.warn('Could not clear refresh count:', error);
    }
  }, 5000);
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  
  // Fallback rendering without StrictMode
  try {
    root.render(<App />);
  } catch (fallbackError) {
    console.error('Fallback rendering also failed:', fallbackError);
    
    // Last resort: show error message
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        text-align: center;
      ">
        <div>
          <h1 style="color: #e53e3e;">Application Loading Error</h1>
          <p>Please refresh the page or contact support.</p>
          <button onclick="window.location.reload()" style="
            background: #3182ce;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 20px;
          ">Refresh Page</button>
        </div>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
