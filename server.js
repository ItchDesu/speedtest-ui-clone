import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import crypto from 'node:crypto';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: false },
  maxHttpBufferSize: 10 * 1024 * 1024
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.static('public', { maxAge: '1h' }));
app.set('view engine', 'ejs');
app.set('views', './views');

app.get('/', (_req, res) => res.render('index', { title: 'Speedtest' }));

// Descarga por HTTP para medir download
app.get('/api/download', (req, res) => {
  const sizeMB = Math.min(parseFloat(req.query.sizeMB) || 100, 300);
  const totalBytes = Math.floor(sizeMB * 1024 * 1024);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': totalBytes,
    'Cache-Control': 'no-store'
  });
  const chunk = 64 * 1024;
  let sent = 0;
  while (sent < totalBytes) {
    const n = Math.min(chunk, totalBytes - sent);
    res.write(crypto.randomBytes(n));
    sent += n;
  }
  res.end();
});

// Socket.IO: ping/jitter + upload
io.on('connection', (socket) => {
  socket.on('ping:client', (t) => socket.emit('ping:server', t, Date.now()));

  let up = null;
  socket.on('upload:start', () => {
    up = { bytes: 0, t0: Date.now() };
    socket.emit('upload:ack', 'ok');
  });
  socket.on('upload:chunk', (ab) => {
    if (!up) return;
    if (ab?.byteLength) up.bytes += ab.byteLength;
  });
  socket.on('upload:stop', () => {
    if (!up) return;
    const sec = (Date.now() - up.t0) / 1000;
    const mbps = (up.bytes * 8) / 1e6 / Math.max(sec, 0.001);
    socket.emit('upload:result', { bytes: up.bytes, seconds: sec, mbps });
    up = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`http://localhost:${PORT}`));
