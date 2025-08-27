// Direct test to see if Winston logs are being captured
const { webappMCP } = require('./packages/webappmcp');
const winston = require('winston');

// Create a simple Express app with Winston
const express = require('express');
const app = express();

// Server log storage (shared reference)
const serverLogs = [];

// Create Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console()
  ]
});

// Simulate the middleware setup
console.log('Setting up log interception...');

// Import and use the interceptor directly
const { interceptAllLoggers, interceptProcessStreams } = require('./packages/webappmcp/dist/middleware/logger-interceptors.js');

const intercepted = interceptAllLoggers(serverLogs, 1000);
console.log('Intercepted loggers:', intercepted);

// Also intercept process streams
interceptProcessStreams(serverLogs, 1000);

// Generate test logs
console.log('\nGenerating test logs...');
logger.error('Winston ERROR test');
logger.warn('Winston WARN test');
logger.info('Winston INFO test');
console.log('Console LOG test');
console.error('Console ERROR test');

// Check captured logs
setTimeout(() => {
  console.log('\n\nCaptured logs:');
  console.log('==============');
  serverLogs.forEach((log, index) => {
    console.log(`${index + 1}. [${log.level}] ${log.timestamp}: ${log.args.join(' ')}`);
  });
  
  console.log(`\nTotal captured: ${serverLogs.length} logs`);
  
  // Check if Winston logs were captured
  const winstonLogs = serverLogs.filter(log => 
    log.args.some(arg => arg.includes('Winston'))
  );
  
  if (winstonLogs.length > 0) {
    console.log(`✅ Winston logs captured: ${winstonLogs.length}`);
  } else {
    console.log('❌ No Winston logs captured');
  }
  
  process.exit(0);
}, 100);