import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { NotificationProvider } from './context/NotificationContext';
import './styles/global.css';
import 'highlight.js/styles/atom-one-dark.css';

/**
 * Entry point React додатку
 * 
 * Імпорти:
 * - React та ReactDOM
 * - Головний App компонент
 * - Стилі (global CSS + highlight.js тема)
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>,
);
