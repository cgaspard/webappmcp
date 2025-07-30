/**
 * Jest setup file for Vue Todo regression tests
 */

// Increase Jest timeout for MCP operations
jest.setTimeout(30000);

// Global test configuration
global.TEST_CONFIG = {
  VUE_APP_URL: 'http://localhost:3000',
  MCP_WS_URL: 'ws://localhost:3101',
  SCREENSHOT_DIR: './test-screenshots',
  TEST_TIMEOUT: 30000
};

// Console setup for debugging
if (process.env.DEBUG) {
  console.log('Debug mode enabled for regression tests');
}

beforeAll(() => {
  console.log('Starting Vue Todo regression test suite...');
});

afterAll(() => {
  console.log('Vue Todo regression tests completed.');
});