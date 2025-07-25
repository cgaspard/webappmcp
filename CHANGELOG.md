# Changelog

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