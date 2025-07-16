import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Initialize WebApp MCP Client
if (typeof WebAppMCPClient !== 'undefined') {
  const mcpClient = new WebAppMCPClient({
    serverUrl: 'ws://localhost:4837',
    authToken: 'demo-token',
    enableDevTools: true
  });
  
  mcpClient.connect();
  console.log('[React Todos] WebApp MCP Client initialized');
} else {
  console.warn('[React Todos] WebApp MCP Client not found. Make sure to include the client script.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);