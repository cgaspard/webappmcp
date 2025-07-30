const WebSocket = require('ws');

async function debugConnection() {
  console.log('Debugging WebSocket connection...');
  
  const ws = new WebSocket('ws://localhost:4835', {
    headers: {
      'Authorization': 'Bearer demo-token'
    }
  });

  ws.on('open', () => {
    console.log('✅ Connected!');
    
    // Try sending a tool request
    const message = {
      type: 'tool_execute',
      requestId: 'test-123',
      tool: 'dom_query',
      args: { selector: '#app' }
    };
    
    console.log('Sending:', message);
    ws.send(JSON.stringify(message));
  });

  ws.on('message', (data) => {
    console.log('Received:', data.toString());
  });

  ws.on('error', (error) => {
    console.error('Error:', error);
  });

  ws.on('close', () => {
    console.log('Connection closed');
  });
}

debugConnection();