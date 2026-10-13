import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createDevServer } from '../src/server/index.js';

describe('DevServer Security Suite', () => {
  let tempDir: string;
  let staticDir: string;
  let serverInstance: ReturnType<typeof createDevServer>;
  let serverPort: number;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-server-test-'));
    staticDir = path.join(tempDir, 'dist');
    fs.mkdirSync(staticDir);
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html><body>Dashboard</body></html>');
    fs.writeFileSync(path.join(staticDir, 'app.js'), 'console.log("secure app");');

    // Create minimal locales
    const localesDir = path.join(tempDir, 'locales');
    fs.mkdirSync(localesDir);
    fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify({ hello: 'Hello' }));

    serverInstance = createDevServer({
      cwd: tempDir,
      staticDir,
      port: 0, // OS assigns open port
    });

    serverPort = await serverInstance.listen(0);
  });

  afterEach(async () => {
    await serverInstance.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function makeRequest(
    options: http.RequestOptions,
    postData?: string
  ): Promise<{ statusCode?: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          ...options,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
          });
        }
      );

      req.on('error', reject);

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  it('should serve legitimate static files from staticDir', async () => {
    const res = await makeRequest({ path: '/', method: 'GET' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Dashboard');
  });

  it('should prevent Directory Traversal in static file serving', async () => {
    // Attempt to access parent directory outside staticDir
    const res = await makeRequest({ path: '/../../../../windows/win.ini', method: 'GET' });
    // Should be rejected with 403 or fallback safely to SPA index without leaking files
    if (res.statusCode === 403) {
      expect(res.body).toContain('Directory traversal detected');
    } else {
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Dashboard'); // safe SPA fallback
    }
  });

  it('should restrict CORS headers for unauthorized third-party origins', async () => {
    const maliciousOrigin = 'https://malicious-website.com';
    const res = await makeRequest({
      path: '/api/config',
      method: 'GET',
      headers: { Origin: maliciousOrigin },
    });

    // Access-Control-Allow-Origin should NOT reflect the malicious origin
    expect(res.headers['access-control-allow-origin']).not.toBe(maliciousOrigin);
  });

  it('should allow CORS for local origins (localhost / 127.0.0.1)', async () => {
    const localOrigin = 'http://localhost:3000';
    const res = await makeRequest({
      path: '/api/config',
      method: 'GET',
      headers: { Origin: localOrigin },
    });

    expect(res.headers['access-control-allow-origin']).toBe(localOrigin);
  });

  it('should reject requests with invalid locale path traversal parameters in key update', async () => {
    const res = await makeRequest(
      {
        path: '/api/key/update',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ locale: '../../bad', key: 'title', value: 'Test' })
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toContain('Security Exception');
  });
});
