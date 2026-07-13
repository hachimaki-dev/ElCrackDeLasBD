import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HomeApp } from './HomeApp.tsx'

const rootElement = document.getElementById('root');
const isHomeView = rootElement?.dataset.view === 'home';

createRoot(rootElement!).render(
  <StrictMode>
    {isHomeView ? <HomeApp /> : <App />}
  </StrictMode>,
)
