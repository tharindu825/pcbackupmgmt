/**
 * server.js — Static file server for PC Backup Management System
 * Uses Node.js built-in modules only (no npm packages required)
 */

const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const PORT    = process.env.PORT || 8787;
const ROOT    = __dirname;
// In Docker, DATA_FILE=/data/data.json  (mounted volume)
// In local dev, falls back to ./data.json in the project folder
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, 'data.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Normalise URL — default to index.html
  let urlPath = req.url.split('?')[0]; // strip query string
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);
  // DATA_FILE: /data/data.json in Docker (mounted volume), ./data.json in local dev

  // Handle API: GET /api/data
  if (req.method === 'GET' && urlPath === '/api/data') {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, MIME_TYPES['.json']);
        res.end(JSON.stringify({ error: 'Failed to read data' }));
        return;
      }
      res.writeHead(200, MIME_TYPES['.json']);
      res.end(data);
    });
    return;
  }

  // Handle API: POST /api/data
  if (req.method === 'POST' && urlPath === '/api/data') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        JSON.parse(body); // Validate JSON
        fs.writeFile(DATA_FILE, body, 'utf8', (err) => {
          if (err) throw err;
          res.writeHead(200, MIME_TYPES['.json']);
          res.end(JSON.stringify({ success: true }));
        });
      } catch (e) {
        res.writeHead(400, MIME_TYPES['.json']);
        res.end(JSON.stringify({ error: 'Invalid JSON data' }));
      }
    });
    return;
  }

  // Handle API: POST /api/auto-log
  if (req.method === 'POST' && urlPath === '/api/auto-log') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        fs.readFile(DATA_FILE, 'utf8', (err, dataStr) => {
          if (err) throw err;
          const data = JSON.parse(dataStr);
          
          // Find target PC (case-insensitive by name or IP)
          const searchName = (payload.pcName || '').toLowerCase();
          const targetPC = data.pcs.find(p => 
            p.name.toLowerCase() === searchName || 
            (p.ipAddress && p.ipAddress === searchName)
          );

          if (!targetPC) {
            res.writeHead(404, MIME_TYPES['.json']);
            res.end(JSON.stringify({ error: `PC not found: ${payload.pcName}` }));
            return;
          }

          // Create new log entry
          const today = new Date().toISOString().split('T')[0];
          const newLog = {
            id: 'log_' + Date.now() + Math.floor(Math.random() * 1000),
            pcId: targetPC.id,
            date: payload.backupDate || today,
            backupType: payload.backupType || 'System',
            method: payload.method || 'Automated',
            size: payload.size || '',
            performedBy: 'System Automation',
            notes: payload.notes || 'Automated backup verification'
          };

          // Update PC last backup date
          targetPC.lastBackupDate = newLog.date;

          // Save back to data.json
          data.logs.push(newLog);
          fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8', (writeErr) => {
            if (writeErr) throw writeErr;
            res.writeHead(200, MIME_TYPES['.json']);
            res.end(JSON.stringify({ success: true, logId: newLog.id, pc: targetPC.name }));
          });
        });

      } catch (e) {
        res.writeHead(400, MIME_TYPES['.json']);
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }


  // Security: prevent path traversal outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type':  mime,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  PC Backup Manager running at http://0.0.0.0:${PORT}`);
});
