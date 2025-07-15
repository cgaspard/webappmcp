# Troubleshooting Guide

## Common Issues When Running in VS Code

### 1. Dependencies Not Installed

If you see errors about missing modules:

```bash
# Install all dependencies from the root
cd /Users/cgaspard/Projects/cgaspard/webappmcp
npm install
```

### 2. Build Errors

If TypeScript files haven't been compiled:

```bash
# Build all packages
npm run build
```

### 3. Port Already in Use

If you see "EADDRINUSE" errors:

```bash
# Kill any existing processes
pkill -f "node.*server.js"

# Or use a different port
PORT=3457 npm start
```

### 4. Missing Module Errors

If you see "Cannot find module '@webappmcp/middleware'":

```bash
# The packages need to be built first
cd /Users/cgaspard/Projects/cgaspard/webappmcp
npm run build

# Then try running again
cd examples/todos
npm start
```

### 5. WebSocket Connection Failed

If the MCP client can't connect:

1. Ensure both servers are running
2. Check the auth token matches
3. Verify ports 3456 and 3101 are free

### 6. VS Code Launch Issues

If VS Code launch configurations fail:

1. Open Command Palette (Cmd+Shift+P)
2. Run "Tasks: Run Task" 
3. Select "Build All Packages"
4. Then try launching again with F5

## Quick Fix Script

Run this to reset everything:

```bash
#!/bin/bash
cd /Users/cgaspard/Projects/cgaspard/webappmcp

# Clean up
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/dist
rm -rf examples/*/node_modules

# Reinstall and build
npm install
npm run build

# Test
cd examples/todos
npm start
```

## Still Having Issues?

Please share:
1. The exact error message
2. Which launch configuration you selected
3. Output from the VS Code terminal

This will help diagnose the specific issue.