// Mock Express for testing
const express = () => {
  const app: any = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    listen: jest.fn((port, callback) => {
      const server = {
        address: jest.fn(() => ({ port: port || 3000 })),
        close: jest.fn((cb) => cb && cb())
      };
      if (callback) callback();
      return server;
    }),
    set: jest.fn(),
    engine: jest.fn(),
  };
  
  return app;
};

express.json = jest.fn(() => jest.fn((req: any, res: any, next: any) => next()));
express.urlencoded = jest.fn(() => jest.fn((req: any, res: any, next: any) => next()));
express.static = jest.fn(() => jest.fn((req: any, res: any, next: any) => next()));

export default express;
export { express };