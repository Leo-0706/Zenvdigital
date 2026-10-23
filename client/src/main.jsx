import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.jsx';
import './index.css';

// Native Mobile APK Bridge
const isNativeApp = Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:';
if (isNativeApp) {
  const originalFetch = window.fetch;
  const defaultHost = import.meta.env.VITE_API_URL || 'http://192.168.29.140:5000';
  window.__ZENV_DEFAULT_API_HOST__ = defaultHost;

  window.fetch = function(resource, init) {
    if (typeof resource === 'string' && (resource.startsWith('/api') || resource.startsWith('/uploads'))) {
      const activeHost = localStorage.getItem('zenv_api_host') || defaultHost;
      resource = `${activeHost}${resource}`;
    }
    return originalFetch(resource, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
