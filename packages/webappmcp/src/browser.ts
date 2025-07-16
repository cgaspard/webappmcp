// Browser-only exports
import WebAppMCPClient from './client/index';

// Export for browser usage
export { WebAppMCPClient };

// Also attach to window for script tag usage
if (typeof window !== 'undefined') {
  (window as any).WebAppMCPClient = WebAppMCPClient;
  // Also keep the namespaced version for compatibility
  (window as any).WebAppMCP = {
    WebAppMCPClient
  };
}