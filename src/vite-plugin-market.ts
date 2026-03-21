/**
 * Vite plugin to serve component market files during development
 * In production, nginx handles /market/ paths
 */
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

export function marketPlugin() {
  const marketRoot = '/opt/market';

  return {
    name: 'market-files',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // Only handle /market/ path
        const marketPrefix = '/market/';

        if (!req.url?.startsWith(marketPrefix)) {
          next();
          return;
        }

        const relativePath = req.url.substring(marketPrefix.length);

        try {
          const fullPath = join(marketRoot, relativePath);

          // Check if file exists
          statSync(fullPath);

          // Set content type based on extension
          const ext = relativePath.split('.').pop();
          const contentTypes: Record<string, string> = {
            'js': 'application/javascript',
            'json': 'application/json',
            'css': 'text/css',
            'html': 'text/html',
          };
          res.setHeader('Content-Type', contentTypes[ext || 'js'] || 'application/octet-stream');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-cache');

          // Serve the file
          const content = readFileSync(fullPath, 'utf-8');
          res.end(content);

          console.log(`[Market] Serving ${req.url} from ${fullPath}`);
          return;
        } catch (err) {
          // File not found or error
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
      });
    },
  };
}
