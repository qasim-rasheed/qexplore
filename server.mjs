// Small production static server. The app and corpus require no external services.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
try { await access(resolve(root, 'index.html')); }
catch { console.error('Build the app first with npm run build.'); process.exit(1); }
const zip = promisify(gzip);
const cache = new Map();
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { response.writeHead(403); response.end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { response.writeHead(404); response.end(); return; }
    const extension = extname(file);
    const etag = `"${info.size}-${Math.floor(info.mtimeMs)}"`;
    response.setHeader('Content-Type', mime[extension] || 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    response.setHeader('ETag', etag);
    response.setHeader('Vary', 'Accept-Encoding');
    if (request.headers['if-none-match'] === etag) { response.writeHead(304); response.end(); return; }
    const compress = /\bgzip\b/.test(request.headers['accept-encoding'] || '') && ['.html', '.js', '.css', '.json', '.svg'].includes(extension);
    if (compress) {
      response.setHeader('Content-Encoding', 'gzip');
      const key = file + etag;
      if (!cache.has(key)) cache.set(key, zip(await readFile(file)));
      const body = await cache.get(key);
      response.setHeader('Content-Length', body.length);
      response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : body);
    } else {
      response.setHeader('Content-Length', info.size); response.writeHead(200);
      if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
    }
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 400); response.end('Not found');
  }
});
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Qexplore is running on port ${port}.`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
