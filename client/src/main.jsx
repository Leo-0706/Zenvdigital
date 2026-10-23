import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Native Mobile APK Bridge
const isNativeApp = window.Capacitor !== undefined || window.location.protocol === 'capacitor:';
if (isNativeApp) {
  const originalFetch = window.fetch;
  const API_HOST = import.meta.env.VITE_API_URL || 'http://192.168.29.140:5000';
  window.fetch = function(resource, init) {
    if (typeof resource === 'string' && (resource.startsWith('/api') || resource.startsWith('/uploads'))) {
      resource = `${API_HOST}${resource}`;
    }
    return originalFetch(resource, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
