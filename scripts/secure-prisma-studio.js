const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = 5555;
const PRISMA_PORT = 5556; // Prisma Studio will run on this port

// Authentication
const auth = basicAuth({
  users: { 'admin': 'admin123' },
  challenge: true,
  realm: 'Prisma Studio'
});

// Apply authentication to all routes
app.use(auth);

// Proxy to actual Prisma Studio
app.use('/', createProxyMiddleware({
  target: `http://localhost:${PRISMA_PORT}`,
  changeOrigin: true,
  ws: true, // WebSocket support
  logLevel: 'debug'
}));

// Start the server
app.listen(PORT, () => {
  console.log(`🔒 Secure Prisma Studio proxy running on port ${PORT}`);
  console.log(`📊 URL: http://localhost:${PORT}`);
  console.log(`🔐 Login: admin`);
  console.log(`🔑 Password: admin123`);
  console.log(`🗄️  Prisma Studio will be started on port ${PRISMA_PORT}`);
  
  // Start actual Prisma Studio on different port
  const { spawn } = require('child_process');
  const prisma = spawn('npx', ['prisma', 'studio', '--port', PRISMA_PORT, '--browser', 'none'], {
    stdio: 'inherit'
  });
  
  prisma.on('close', (code) => {
    console.log(`Prisma Studio exited with code ${code}`);
    process.exit(code);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});
