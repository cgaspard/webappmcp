#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { WebAppMCPServer } from './index.js';

const argv = yargs(hideBin(process.argv))
  .option('ws-port', {
    alias: 'w',
    type: 'number',
    description: 'WebSocket server port',
    default: 3101,
  })
  .option('auth-token', {
    alias: 't',
    type: 'string',
    description: 'Authentication token for client connections',
  })
  .help()
  .parseSync();

async function main() {
  const server = new WebAppMCPServer({
    wsPort: argv['ws-port'],
    authToken: argv['auth-token'] || process.env.MCP_AUTH_TOKEN,
  });

  await server.start();
}

main().catch(console.error);