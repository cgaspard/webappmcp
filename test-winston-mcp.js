const http = require('http');

async function testMCPServerLogs() {
  console.log('Testing MCP server log capture on port 3005...\n');
  
  // First establish SSE connection
  const sseReq = http.request({
    hostname: 'localhost',
    port: 3005,
    path: '/mcp/sse',
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': 'Bearer test-winston-token'
    }
  }, (res) => {
    let sessionId = null;
    
    res.on('data', (chunk) => {
      const data = chunk.toString();
      
      // Extract session ID from SSE response
      const sessionMatch = data.match(/sessionId=([^"]+)/);
      if (sessionMatch) {
        sessionId = sessionMatch[1];
        console.log('Got session ID:', sessionId);
        
        // Now make the tools/call request to get server logs
        setTimeout(() => {
          const toolCallData = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'console_get_server_logs',
              arguments: {
                regex: 'Winston'
              }
            }
          });
          
          const toolReq = http.request({
            hostname: 'localhost',
            port: 3005,
            path: `/mcp/sse?sessionId=${encodeURIComponent(sessionId)}`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-winston-token',
              'Content-Length': toolCallData.length
            }
          }, (toolRes) => {
            let responseData = '';
            
            toolRes.on('data', (chunk) => {
              responseData += chunk.toString();
            });
            
            toolRes.on('end', () => {
              console.log('\nMCP Response:');
              try {
                const parsed = JSON.parse(responseData);
                if (parsed.result && parsed.result.content) {
                  const logs = JSON.parse(parsed.result.content[0].text);
                  console.log('\nCaptured Winston logs:');
                  console.log('====================');
                  logs.logs.forEach(log => {
                    console.log(`[${log.level}] ${log.timestamp}: ${log.args.join(' ')}`);
                  });
                }
              } catch (e) {
                console.log(responseData);
              }
              
              // Clean up
              res.destroy();
              process.exit(0);
            });
          });
          
          toolReq.on('error', (e) => {
            console.error('Tool request error:', e);
          });
          
          toolReq.write(toolCallData);
          toolReq.end();
        }, 1000);
      }
    });
  });
  
  sseReq.on('error', (e) => {
    console.error('SSE request error:', e);
  });
  
  sseReq.end();
}

testMCPServerLogs();