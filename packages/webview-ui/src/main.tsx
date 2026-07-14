import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { HomeApp } from './HomeApp.tsx'

const init = () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <HomeApp />
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
