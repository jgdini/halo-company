// Servidor estático local com gzip (aproxima o GitHub Pages para medir no Lighthouse).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] || 5600);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const zip = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.txt', '.xml', '.svg']);

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(root, p));
  if (!file.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
  try {
    let body = await readFile(file); const ext = extname(file).toLowerCase();
    const h = { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (zip.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); h['Content-Encoding'] = 'gzip'; }
    res.writeHead(200, h).end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); }
}).listen(port, () => console.log(`http://localhost:${port}/`));
