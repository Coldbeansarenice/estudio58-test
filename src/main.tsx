import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import i18n from './i18n';
import App from './App';
import './index.css';

// Start in the URL's language so the first paint is already right.
const first = window.location.pathname.split('/')[1];
if (first === 'es' || first === 'en') void i18n.changeLanguage(first);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: register the service worker in production builds only.
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_ROUTER_MODE !== 'memory') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not available here: the site still works */ });
  });
}
