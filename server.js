// Rilink Developer API Tester — local server
//
// Serves the static tester UI (./public) and exposes a same-origin proxy
// endpoint that forwards requests to the real Rilink Developer API.
//
// Why a proxy instead of calling the API directly from the browser?
// The Rilink backend (dev_code) has no config/cors.php, so its API does not
// send Access-Control-Allow-Origin headers. A browser calling it directly
// from this tool's origin would be blocked by CORS on the preflight OPTIONS
// request (Authorization + Content-Type headers force a preflight). Routing
// the call through this Node server avoids that entirely: the browser only
// ever talks to localhost, and this server talks server-to-server to Rilink.
//
// No third-party dependencies — only Node's built-in http/fs/fetch.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4780;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));

  // Prevent path traversal outside the public directory.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// Shared upstream call used by both proxy routes below. Talks server-to-server
// to the real Rilink Developer API so the browser never has to (no CORS).
async function proxyUpstream({ method, baseUrl, token, path, payload }) {
  const targetUrl = `${baseUrl.replace(/\/+$/, '')}${path}`;

  const headers = { Accept: 'application/json' };
  // Sent only when the tester deliberately omits a token, to exercise the
  // "missing bearer token" error path.
  if (token) headers.Authorization = `Bearer ${token}`;

  const init = { method, headers, signal: AbortSignal.timeout(30_000) };
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }

  const startedAt = Date.now();

  try {
    const upstream = await fetch(targetUrl, init);

    const durationMs = Date.now() - startedAt;
    const rawText = await upstream.text();
    let jsonBody = null;
    try {
      jsonBody = JSON.parse(rawText);
    } catch {
      // Upstream didn't return JSON (e.g. an HTML error page) — surface raw text instead.
    }

    return {
      proxyOk: true,
      requestUrl: targetUrl,
      httpStatus: upstream.status,
      httpStatusText: upstream.statusText,
      durationMs,
      body: jsonBody !== null ? jsonBody : rawText,
      isJson: jsonBody !== null,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    return {
      proxyOk: false,
      requestUrl: targetUrl,
      durationMs,
      proxyError: err.name === 'TimeoutError'
        ? 'Request to Rilink API timed out after 30s.'
        : `Could not reach Rilink API: ${err.message}`,
    };
  }
}

// Forwards one call to POST {baseUrl}/api/v1/messages/send on behalf of the
// browser, using the token and payload supplied by the tester UI.
async function handleProxySend(req, res) {
  let parsed;
  try {
    parsed = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, { proxyError: 'Invalid JSON body sent to proxy.' });
  }

  const { baseUrl, token, payload } = parsed || {};

  if (!baseUrl || typeof baseUrl !== 'string') {
    return sendJson(res, 400, { proxyError: 'baseUrl is required (e.g. https://rilink.id).' });
  }
  if (!payload || typeof payload !== 'object') {
    return sendJson(res, 400, { proxyError: 'payload (object) is required.' });
  }

  const result = await proxyUpstream({ method: 'POST', baseUrl, token, path: '/api/v1/messages/send', payload });
  return sendJson(res, 200, result);
}

// Forwards one call to GET {baseUrl}/api/v1/devices — lists the tenant's
// connected devices (id, name, sender_phone, status) so the UI can resolve a
// WhatsApp number to a device_id (or send sender_phone directly) instead of
// requiring the user to already know the numeric device_id.
async function handleProxyDevices(req, res) {
  let parsed;
  try {
    parsed = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, { proxyError: 'Invalid JSON body sent to proxy.' });
  }

  const { baseUrl, token } = parsed || {};

  if (!baseUrl || typeof baseUrl !== 'string') {
    return sendJson(res, 400, { proxyError: 'baseUrl is required (e.g. https://rilink.id).' });
  }

  const result = await proxyUpstream({ method: 'GET', baseUrl, token, path: '/api/v1/devices' });
  return sendJson(res, 200, result);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/proxy/send') {
      return await handleProxySend(req, res);
    }
    if (req.method === 'POST' && req.url === '/api/proxy/devices') {
      return await handleProxyDevices(req, res);
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStatic(req, res);
    }
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
  } catch (err) {
    sendJson(res, 500, { proxyError: `Internal tester error: ${err.message}` });
  }
});

server.listen(PORT, () => {
  console.log(`Rilink Developer API Tester running at http://localhost:${PORT}`);
});
