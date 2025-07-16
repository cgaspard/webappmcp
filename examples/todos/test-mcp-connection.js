const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

async function testMCPConnection() {
  console.log('Testing MCP connection...');
  
  try {
    // Create SSE transport
    const transport = new SSEClientTransport(
      new URL('http://localhost:4834/mcp/sse'),
      {
        headers: {
          'Authorization': 'Bearer demo-token'
        }
      }
    );
    
    // Create client
    const client = new Client(
      {
        name: 'test-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );
    
    // Connect
    await client.connect(transport);
    console.log('Connected to MCP server!');
    
    // List tools
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name));
    
    // Test dom_query tool
    if (tools.tools.some(t => t.name === 'dom_query')) {
      console.log('Testing dom_query tool...');
      const result = await client.callTool({
        name: 'dom_query',
        arguments: {
          selector: '.todo-item'
        }
      });
      console.log('Todo items found:', result);
    }
    
    // Close connection
    await client.close();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMCPConnection();