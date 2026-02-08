# Changelog

## [0.3.0] - 2026-02-08

### Breaking Changes
- **All MCP tool names now prefixed with `webapp_`** to prevent naming conflicts with other MCP servers
  - `dom_query` → `webapp_dom_query`
  - `interaction_click` → `webapp_interaction_click`
  - `capture_screenshot` → `webapp_capture_screenshot`
  - And all other tools (see documentation for complete list)
- **Removed duplicate `webapp_list_clients` tool** from diagnostic tools (now only in state tools)

### Added
- **Manual Winston configuration** (recommended approach):
  - New `winstonLogger` configuration parameter to pass Winston logger directly
  - New `middleware.attachWinston(logger)` method for attaching Winston logger after middleware setup
  - Support for Winston loggers created in separate modules
  - Better control over Winston log capture timing
- Complete documentation for Winston integration patterns
- Example code showing separate logger module pattern
- `README-ATTACH-WINSTON.md` with comprehensive Winston usage guide

### Changed
- Winston integration now uses explicit configuration instead of automatic detection
- Updated all documentation (CLAUDE.md, README.md) to reflect new tool names
- Improved Winston transport attachment reliability
- Updated example applications to show recommended Winston pattern

### Fixed
- Winston logger timing issues when created after middleware setup
- Tool name conflicts that could occur with other MCP servers
- Duplicate tool registration issue

### Migration Guide
If upgrading from 0.2.x:
1. Update all tool names to include `webapp_` prefix in your code
2. Update Winston configuration to use recommended pattern:
   ```javascript
   const logger = winston.createLogger({ /* ... */ });
   app.use(webappMCP({ winstonLogger: logger }));
   ```
3. Or use `attachWinston()` if logger is in separate module:
   ```javascript
   const mcpMiddleware = app.use(webappMCP({ /* ... */ }));
   mcpMiddleware.attachWinston(logger);
   ```

## [0.2.3] - 2025-08-27

### Added
- Granular log capture configuration with `logCapture` option
- Selective interception of logging libraries (Winston, Bunyan, Pino, log4js, debug)
- Ability to disable specific log capture methods for performance or compatibility
- Custom Winston transport for comprehensive log capture
- Multi-layer log interception system (library, console, stream levels)
- Support for capturing Winston logs even when using file transports

### Changed
- Improved logger detection and attachment mechanism
- Enhanced circular buffer management for log storage
- Better separation of concerns between different log capture methods

### Fixed
- Winston logs now properly captured regardless of transport configuration
- Resolved duplicate log entries from multiple interception layers
- Fixed compatibility issues with various Winston configurations

## [0.2.2] - 2025-08-17

### Added
- Regex filtering support for `console_get_logs` tool to filter browser console logs by pattern
- Regex filtering support for `console_get_server_logs` tool to filter server console logs by pattern
- Improved log analysis capabilities by allowing pattern-based filtering to reduce log downloads

### Changed
- Updated tool definitions to include optional `regex` parameter for console log tools
- Enhanced error handling for invalid regex patterns in log filtering

## [0.1.5] - 2025-07-16

### Fixed
- Fixed MCP SSE server connection issue caused by body parser middleware consuming request stream
- Fixed SSE server initialization to properly handle MCP handshake without requiring browser client
- Fixed DevTools auto-scroll to show latest items at the top
- Fixed log ordering to display newest entries first
- Fixed unit tests to match updated implementation

### Changed
- Increased DevTools UI size from 400x300px to 500x400px for better visibility
- Updated default theme to dark for DevTools
- Improved SSE server error handling with proper timeout mechanisms
- Standardized logging with [webappmcp] prefix across all modules

### Added
- Express request logging for debugging (can be removed for production)
- WebSocket connection timeout to prevent indefinite hanging
- Better error messages for MCP connection failures

## [0.1.4] - Previous release
- Initial consolidated package release