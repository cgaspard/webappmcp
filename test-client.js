const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3101', {
  headers: {
    'Authorization': 'Bearer demo-token'
  }
});

ws.on('open', () => {
  console.log('Connected to WebApp MCP server');
  
  // Send init message
  ws.send(JSON.stringify({
    type: 'init',
    url: 'http://localhost:3456'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.type === 'connected') {
    console.log('✓ Successfully connected with clientId:', message.clientId);
    console.log('✓ Permissions:', message.permissions);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
  process.exit(1);
});

ws.on('close', () => {
  console.log('Disconnected from server');
});

setTimeout(() => {
  console.error('Timeout - no response received');
  process.exit(1);
}, 5000);