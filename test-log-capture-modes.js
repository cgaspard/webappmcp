/**
 * Test different log capture modes
 */

const express = require('express');
const winston = require('winston');
const { webappMCP } = require('./packages/webappmcp');

// Test configurations
const testConfigs = [
  {
    name: 'All Capture Enabled (default)',
    config: {
      // All defaults to true
    }
  },
  {
    name: 'Console Only',
    config: {
      logCapture: {
        console: true,
        streams: false,
        winston: false,
        bunyan: false,
        pino: false,
        debug: false,
        log4js: false
      }
    }
  },
  {
    name: 'Winston Only',
    config: {
      logCapture: {
        console: false,
        streams: false,
        winston: true,
        bunyan: false,
        pino: false,
        debug: false,
        log4js: false
      }
    }
  },
  {
    name: 'Streams Only',
    config: {
      logCapture: {
        console: false,
        streams: true,
        winston: false,
        bunyan: false,
        pino: false,
        debug: false,
        log4js: false
      }
    }
  },
  {
    name: 'No Winston (Console + Streams)',
    config: {
      logCapture: {
        console: true,
        streams: true,
        winston: false,
        bunyan: false,
        pino: false,
        debug: false,
        log4js: false
      }
    }
  }
];

// Test each configuration
async function runTests() {
  for (const test of testConfigs) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing: ${test.name}`);
    console.log('='.repeat(60));
    
    // Create new app for each test
    const app = express();
    
    // Apply middleware with specific config
    const middleware = webappMCP({
      wsPort: 4850 + testConfigs.indexOf(test), // Different port for each
      captureServerLogs: true,
      serverLogLimit: 100,
      debug: true,
      ...test.config
    });
    
    app.use(middleware);
    
    // Create Winston logger
    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'test.log' })
      ]
    });
    
    // Generate test logs
    console.log('Console: Test log');
    logger.info('Winston: Test log');
    process.stdout.write('Stream: Test stdout\n');
    process.stderr.write('Stream: Test stderr\n');
    
    // Give time for logs to be captured
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('\nConfiguration used:');
    console.log(JSON.stringify(test.config, null, 2));
    
    // Note: In a real test, you'd query the MCP server to verify what was captured
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('Check the console output above to see which interceptors were activated.');
  console.log('='.repeat(60));
  
  process.exit(0);
}

runTests();