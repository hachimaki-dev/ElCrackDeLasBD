import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HomeApp } from './HomeApp.tsx'

const init = () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const isHomeView = rootElement.dataset.view === 'home';
    createRoot(rootElement).render(
      <StrictMode>
        {isHomeView ? <HomeApp /> : <App />}
      </StrictMode>
    );
  } else {
    console.error('SQL Engine Lab: Root element not found in DOM.');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
