import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Initialize WebApp MCP Client
if (typeof WebAppMCP !== 'undefined' && WebAppMCP.WebAppMCPClient) {
  const mcpClient = new WebAppMCP.WebAppMCPClient({
    serverUrl: 'ws://localhost:4835',
    authToken: 'demo-token',
    enableDevTools: true,
    autoConnect: true,
    devToolsTheme: 'dark',
    devToolsPosition: 'bottom-right',
    debug: false
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