// Winston transport for capturing logs
// This module is optional and only loads if Winston is available

interface ServerLogEntry {
  level: string;
  timestamp: string;
  args: any[];
  metadata?: any;
}

/**
 * Create a Winston transport dynamically if Winston is available
 */
export function createWinstonTransport(serverLogs: ServerLogEntry[], serverLogLimit: number) {
  try {
    // Try to load winston-transport base class
    const Transport = require('winston-transport');
    
    // Create custom transport class
    class WebAppMCPTransport extends Transport {
      constructor(opts: any = {}) {
        super(opts);
      }
      
      log(info: any, callback: () => void) {
        setImmediate(() => {
          this.emit('logged', info);
        });
        
        // Store the log entry
        serverLogs.push({
          level: info.level,
          timestamp: info.timestamp || new Date().toISOString(),
          args: [info.message],
          metadata: info,
        });
        
        // Maintain circular buffer
        if (serverLogs.length > serverLogLimit) {
          serverLogs.shift();
        }
        
        callback();
      }
    }
    
    return new WebAppMCPTransport();
  } catch (error) {
    // winston-transport not available
    return null;
  }
}

/**
 * Helper to detect and attach to Winston loggers
 */
export function attachToWinston(serverLogs: ServerLogEntry[], serverLogLimit: number): boolean {
  try {
    // Try to find Winston in the require cache
    const winstonPath = Object.keys(require.cache).find(key => 
      key.includes('node_modules/winston/') && key.endsWith('winston.js')
    );
    
    if (winstonPath) {
      const winston = require(winstonPath);
      const transport = createWinstonTransport(serverLogs, serverLogLimit);
      
      if (!transport) {
        return false;
      }
      
      // Add our transport to the default logger if it exists
      if (winston.default && winston.default.add) {
        winston.default.add(transport);
      }
      
      // Also intercept createLogger to add our transport to new loggers
      const originalCreateLogger = winston.createLogger;
      if (originalCreateLogger) {
        winston.createLogger = function(...args: any[]) {
          const logger = originalCreateLogger.apply(winston, args);
          const newTransport = createWinstonTransport(serverLogs, serverLogLimit);
          if (newTransport) {
            logger.add(newTransport);
          }
          return logger;
        };
      }
      
      return true;
    }
  } catch (error) {
    // Winston not found or error attaching
    return false;
  }
  return false;
}