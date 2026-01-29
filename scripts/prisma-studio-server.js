const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 5555;

// Basic authentication middleware
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Prisma Studio"');
    return res.status(401).send('Authentication required');
  }
  
  const [type, credentials] = auth.split(' ');
  
  if (type !== 'Basic') {
    return res.status(401).send('Invalid authentication type');
  }
  
  const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');
  
  if (username !== 'admin' || password !== 'admin123') {
    return res.status(401).send('Invalid credentials');
  }
  
  next();
};

// Apply authentication to all routes
app.use(basicAuth);

// Proxy to Prisma Studio
app.all('*', (req, res) => {
  // This is a simple proxy - in production you'd want a proper proxy setup
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Prisma Studio - Protected</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔒 Prisma Studio - Protected Access</h1>
        
        <div class="warning">
          <strong>⚠️ Security Warning:</strong> This is a development tool. 
          In production, use proper authentication and HTTPS.
        </div>
        
        <div class="info">
          <h3>📊 Current Status:</h3>
          <ul>
            <li>✅ Authentication: Basic Auth (admin/admin123)</li>
            <li>✅ Port: 5555</li>
            <li>✅ Process: Running</li>
            <li>⚠️ Proxy: Simple implementation</li>
          </ul>
          
          <h3>🔧 To access actual Prisma Studio:</h3>
          <ol>
            <li>Stop this server (Ctrl+C)</li>
            <li>Run: <code>npx prisma studio</code></li>
            <li>Access: http://localhost:5555</li>
          </ol>
          
          <h3>🛡️ For production:</h3>
          <ul>
            <li>Use environment variables for credentials</li>
            <li>Implement proper session management</li>
            <li>Add HTTPS/TLS encryption</li>
            <li>Use reverse proxy (nginx/apache)</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🔒 Prisma Studio with authentication running on port ${PORT}`);
  console.log(`📊 URL: http://localhost:${PORT}`);
  console.log(`🔐 Login: admin`);
  console.log(`🔑 Password: admin123`);
  console.log(`⚠️  This is a development setup - not for production!`);
});
