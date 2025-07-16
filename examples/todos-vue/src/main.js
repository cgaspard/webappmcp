import { createApp } from 'vue';
import App from './App.vue';

// Initialize WebApp MCP Client
if (typeof WebAppMCPClient !== 'undefined') {
  const mcpClient = new WebAppMCPClient({
    serverUrl: 'ws://localhost:4839',
    authToken: 'demo-token',
    enableDevTools: true
  });
  
  mcpClient.connect();
  console.log('[Vue Todos] WebApp MCP Client initialized');
} else {
  console.warn('[Vue Todos] WebApp MCP Client not found. Make sure to include the client script.');
}

createApp(App).mount('#app');