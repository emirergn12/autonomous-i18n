import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { loadConfig } from '../config/loader.js';
import { scanCodebase } from '../scanner/scanner.js';
import { DiffEngine } from '../audit/diff-engine.js';
import { LocaleStore } from '../store/locale-store.js';
import type { I18nConfig } from '../types/config.js';

export interface DevServerOptions {
  port?: number;
  host?: string;
  cwd?: string;
  staticDir?: string;
}

const MAX_BODY_SIZE = 1024 * 1024; // 1MB payload limit to prevent DoS attacks

function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;

    req.on('data', (chunk) => {
      const chunkLength = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      bytesReceived += chunkLength;
      if (bytesReceived > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Payload Too Large: Maximum allowed payload is 1MB.'));
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse) {
  const origin = req.headers.origin;
  if (origin) {
    // Only allow localhost and 127.0.0.1 origins to prevent Cross-Site DNS rebinding and CSRF
    const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhostOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  } else {
    // CLI or same-origin requests without Origin header
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function createDevServer(options: DevServerOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const port = options.port ?? 3001;

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const reqUrl = new URL(req.url ?? '/', `http://localhost:${port}`);
    const pathname = reqUrl.pathname;

    try {
      const config = loadConfig({ cwd });
      const store = new LocaleStore(config, cwd);
      const diffEngine = new DiffEngine(config, store, cwd);

      // REST API Routes
      if (pathname === '/api/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ config, cwd }));
        return;
      }

      if (pathname === '/api/audit' && req.method === 'GET') {
        const scanResult = await scanCodebase(config, { cwd });
        const audit = await diffEngine.runAudit(scanResult);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ audit, scannedFiles: scanResult.scannedFiles }));
        return;
      }

      if (pathname === '/api/locales' && req.method === 'GET') {
        const locales = store.readAllLocales();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ locales }));
        return;
      }

      if (pathname === '/api/key/update' && req.method === 'POST') {
        const body = await parseJsonBody<{ locale: string; key: string; value: string }>(req);
        if (!body.locale || !body.key || body.value === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required parameters: locale, key, value' }));
          return;
        }

        // Locale & Key validation
        if (typeof body.locale !== 'string' || typeof body.key !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parameters locale and key must be strings.' }));
          return;
        }

        store.updateKey(body.locale, body.key, String(body.value));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, locale: body.locale, key: body.key, value: body.value }));
        return;
      }

      if (pathname === '/api/key/delete' && req.method === 'POST') {
        const body = await parseJsonBody<{ locale: string; key: string }>(req);
        if (!body.locale || !body.key) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required parameters: locale, key' }));
          return;
        }

        if (typeof body.locale !== 'string' || typeof body.key !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parameters locale and key must be strings.' }));
          return;
        }

        const deleted = store.deleteKey(body.locale, body.key);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: deleted, locale: body.locale, key: body.key }));
        return;
      }

      if (pathname === '/api/clean-dead' && req.method === 'POST') {
        const scanResult = await scanCodebase(config, { cwd });
        const audit = await diffEngine.runAudit(scanResult);

        let removedCount = 0;
        for (const item of audit.deadKeys) {
          for (const loc of item.localesPresent) {
            if (store.deleteKey(loc, item.key)) {
              removedCount++;
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, removedCount, deadKeysCount: audit.deadKeys.length }));
        return;
      }

      // Serve Static Files with strict Path Traversal Protection
      if (options.staticDir && fs.existsSync(options.staticDir)) {
        const resolvedStaticDir = path.resolve(options.staticDir);
        let safePath = pathname === '/' ? 'index.html' : pathname;
        // Strip dangerous leading slashes or dots
        safePath = safePath.replace(/^\/+/, '');

        let targetFilePath = path.resolve(resolvedStaticDir, safePath);

        // Security Guard: Prevent directory traversal outside static directory
        if (!targetFilePath.startsWith(resolvedStaticDir + path.sep) && targetFilePath !== resolvedStaticDir) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied: Directory traversal detected.' }));
          return;
        }

        // SPA fallback to index.html if file doesn't exist or is a directory
        if (!fs.existsSync(targetFilePath) || fs.statSync(targetFilePath).isDirectory()) {
          targetFilePath = path.resolve(resolvedStaticDir, 'index.html');
        }

        const ext = path.extname(targetFilePath).toLowerCase();
        const contentTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';
        const fileContent = fs.readFileSync(targetFilePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fileContent);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
  });

  const host = options.host ?? '127.0.0.1';

  return {
    server,
    listen: (customPort?: number, customHost?: string) => {
      const p = customPort ?? port;
      const h = customHost ?? host;
      return new Promise<number>((resolve) => {
        server.listen(p, h, () => {
          const addr = server.address();
          const activePort = addr && typeof addr === 'object' ? addr.port : p;
          resolve(activePort);
        });
      });
    },
    close: () => {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
