interface ServerLogEntry {
  level: string;
  timestamp: string;
  args: any[];
  metadata?: any;
}

/**
 * Interceptor for Bunyan logger
 */
export function interceptBunyan(serverLogs: ServerLogEntry[], serverLogLimit: number): boolean {
  try {
    const bunyanPath = Object.keys(require.cache).find(key => 
      key.includes('node_modules/bunyan/') && key.endsWith('bunyan.js')
    );
    
    if (bunyanPath) {
      const bunyan = require(bunyanPath);
      
      // Override the _emit method which all log methods use
      const originalEmit = bunyan.prototype._emit;
      bunyan.prototype._emit = function(rec: any, noemit: boolean) {
        if (!noemit) {
          serverLogs.push({
            level: bunyan.nameFromLevel[rec.level] || 'log',
            timestamp: rec.time || new Date().toISOString(),
            args: [rec.msg],
            metadata: rec,
          });
          
          if (serverLogs.length > serverLogLimit) {
            serverLogs.shift();
          }
        }
        return originalEmit.call(this, rec, noemit);
      };
      
      return true;
    }
  } catch (error) {
    // Bunyan not found
  }
  return false;
}

/**
 * Interceptor for Pino logger
 */
export function interceptPino(serverLogs: ServerLogEntry[], serverLogLimit: number): boolean {
  try {
    const pinoPath = Object.keys(require.cache).find(key => 
      key.includes('node_modules/pino/') && key.endsWith('pino.js')
    );
    
    if (pinoPath) {
      const pino = require(pinoPath);
      
      // Pino uses a different approach - we need to add a custom transport
      // This is more complex and requires pino v7+
      const transport = pino.transport({
        target: {
          write(chunk: string) {
            try {
              const log = JSON.parse(chunk);
              serverLogs.push({
                level: pino.levels.labels[log.level] || 'log',
                timestamp: new Date(log.time).toISOString(),
                args: [log.msg],
                metadata: log,
              });
              
              if (serverLogs.length > serverLogLimit) {
                serverLogs.shift();
              }
            } catch (e) {
              // Failed to parse log
            }
          }
        }
      });
      
      // Try to attach to default logger
      if (pino.destination) {
        const originalDestination = pino.destination;
        pino.destination = function(...args: any[]) {
          const dest = originalDestination.apply(pino, args);
          // Chain our transport
          return {
            ...dest,
            write(chunk: string) {
              transport.write(chunk);
              return dest.write(chunk);
            }
          };
        };
      }
      
      return true;
    }
  } catch (error) {
    // Pino not found
  }
  return false;
}

/**
 * Interceptor for log4js
 */
export function interceptLog4js(serverLogs: ServerLogEntry[], serverLogLimit: number): boolean {
  try {
    const log4jsPath = Object.keys(require.cache).find(key => 
      key.includes('node_modules/log4js/') && key.endsWith('log4js.js')
    );
    
    if (log4jsPath) {
      const log4js = require(log4jsPath);
      
      // Create custom appender
      const webappMCPAppender = {
        configure: () => {
          return (loggingEvent: any) => {
            serverLogs.push({
              level: loggingEvent.level.levelStr.toLowerCase(),
              timestamp: loggingEvent.startTime.toISOString(),
              args: loggingEvent.data,
              metadata: {
                categoryName: loggingEvent.categoryName,
                context: loggingEvent.context,
              },
            });
            
            if (serverLogs.length > serverLogLimit) {
              serverLogs.shift();
            }
          };
        }
      };
      
      // Register our appender
      log4js.configure({
        appenders: {
          webappMCP: { type: webappMCPAppender }
        },
        categories: {
          default: { appenders: ['webappMCP'], level: 'all' }
        }
      });
      
      return true;
    }
  } catch (error) {
    // log4js not found
  }
  return false;
}

/**
 * Interceptor for debug library
 */
export function interceptDebug(serverLogs: ServerLogEntry[], serverLogLimit: number): boolean {
  try {
    const debugPath = Object.keys(require.cache).find(key => 
      key.includes('node_modules/debug/') && key.endsWith('debug.js')
    );
    
    if (debugPath) {
      const debug = require(debugPath);
      
      // Override the log function
      const originalLog = debug.log || console.log;
      debug.log = function(...args: any[]) {
        serverLogs.push({
          level: 'debug',
          timestamp: new Date().toISOString(),
          args: args,
        });
        
        if (serverLogs.length > serverLogLimit) {
          serverLogs.shift();
        }
        
        return originalLog.apply(this, args);
      };
      
      return true;
    }
  } catch (error) {
    // debug not found
  }
  return false;
}

/**
 * Configuration for selective log interception
 */
export interface LogCaptureConfig {
  console?: boolean;
  streams?: boolean;
  winston?: boolean;
  bunyan?: boolean;
  pino?: boolean;
  debug?: boolean;
  log4js?: boolean;
}

/**
 * Try to intercept all known logging libraries based on config
 */
export function interceptAllLoggers(
  serverLogs: ServerLogEntry[], 
  serverLogLimit: number,
  captureConfig: LogCaptureConfig = {}
): string[] {
  const intercepted: string[] = [];
  
  // Default all to true if not specified
  const config = {
    console: true,
    streams: true,
    winston: true,
    bunyan: true,
    pino: true,
    debug: true,
    log4js: true,
    ...captureConfig
  };
  
  if (config.bunyan && interceptBunyan(serverLogs, serverLogLimit)) {
    intercepted.push('bunyan');
  }
  
  if (config.pino && interceptPino(serverLogs, serverLogLimit)) {
    intercepted.push('pino');
  }
  
  if (config.log4js && interceptLog4js(serverLogs, serverLogLimit)) {
    intercepted.push('log4js');
  }
  
  if (config.debug && interceptDebug(serverLogs, serverLogLimit)) {
    intercepted.push('debug');
  }
  
  // Check for Winston if enabled
  if (config.winston) {
    try {
      // First try our custom transport approach
      const { attachToWinston } = require('./winston-transport');
      if (attachToWinston(serverLogs, serverLogLimit)) {
        intercepted.push('winston');
      }
    } catch (error) {
      // Winston transport not available
    }
    
    // Also try direct Winston interception as fallback
    if (!intercepted.includes('winston')) {
      try {
        const winston = require('winston');
        const { createWinstonTransport } = require('./winston-transport');
        const transport = createWinstonTransport(serverLogs, serverLogLimit);
        
        if (transport && winston.loggers && winston.loggers.get) {
          // Add to default logger
          winston.loggers.get('default').add(transport);
          intercepted.push('winston');
        }
      } catch (error) {
        // Winston not available
      }
    }
  }
  
  return intercepted;
}

/**
 * Process.stdout/stderr interception as last resort
 */
export function interceptProcessStreams(serverLogs: ServerLogEntry[], serverLogLimit: number) {
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  
  process.stdout.write = function(chunk: any, ...args: any[]): boolean {
    const text = chunk?.toString ? chunk.toString() : String(chunk);
    
    // Don't capture our own logs
    if (!text.includes('[webappmcp]')) {
      serverLogs.push({
        level: 'log',
        timestamp: new Date().toISOString(),
        args: [text.trim()],
        metadata: { stream: 'stdout' },
      });
      
      if (serverLogs.length > serverLogLimit) {
        serverLogs.shift();
      }
    }
    
    return originalStdoutWrite.apply(process.stdout, arguments as any) as boolean;
  };
  
  process.stderr.write = function(chunk: any, ...args: any[]): boolean {
    const text = chunk?.toString ? chunk.toString() : String(chunk);
    
    // Don't capture our own logs
    if (!text.includes('[webappmcp]')) {
      serverLogs.push({
        level: 'error',
        timestamp: new Date().toISOString(),
        args: [text.trim()],
        metadata: { stream: 'stderr' },
      });
      
      if (serverLogs.length > serverLogLimit) {
        serverLogs.shift();
      }
    }
    
    return originalStderrWrite.apply(process.stderr, arguments as any) as boolean;
  };
}