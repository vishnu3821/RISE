import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (!sessionStorage.getItem('jwt_flushed_v2')) {
  localStorage.clear();
  sessionStorage.setItem('jwt_flushed_v2', '1');
  window.location.reload();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
