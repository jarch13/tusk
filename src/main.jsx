// src/main.jsx
const BUILD_ID = import.meta.env.VITE_BUILD_ID || 'dev';

// If we already stored a build id and it's different, force a one-time reload
try {
  const prev = localStorage.getItem('BUILD_ID');
  if (prev && prev !== BUILD_ID) {
    localStorage.setItem('BUILD_ID', BUILD_ID);
    // Force a full reload to pull the new index + hashed assets
    window.location.reload();
  } else if (!prev) {
    localStorage.setItem('BUILD_ID', BUILD_ID);
  }
} catch (_) {
  // ignore storage errors (private mode, etc.)
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
