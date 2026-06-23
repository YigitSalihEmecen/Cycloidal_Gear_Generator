import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function(msg, url, lineNo, columnNo, error) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.background = 'red';
  div.style.color = 'white';
  div.style.zIndex = '99999';
  div.style.padding = '20px';
  div.innerHTML = 'Error: ' + msg + '<br/>' + (error && error.stack ? error.stack : '');
  document.body.appendChild(div);
  return false;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
