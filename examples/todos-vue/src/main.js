import { createApp } from 'vue';
import App from './App.vue';

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
  console.log('[Vue Todos] WebApp MCP Client initialized');
} else {
  console.warn('[Vue Todos] WebApp MCP Client not found. Make sure to include the client script.');
}

createApp(App).mount('#app');