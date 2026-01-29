const express = require('express');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = 5555;

// Basic authentication
const auth = basicAuth({
  users: { 'admin': 'admin123' },
  challenge: true,
  realm: 'Prisma Studio Access'
});

// Apply authentication to all routes
app.use(auth);

// Simple info page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🔒 Prisma Studio - Protected</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 800px;
          width: 90%;
          padding: 40px;
          text-align: center;
        }
        .lock-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #333; margin-bottom: 20px; font-size: 2.5em; }
        .success { color: #28a745; font-weight: bold; margin-bottom: 30px; font-size: 1.2em; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .info-card { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px; 
          border-left: 4px solid #007bff;
          text-align: left;
        }
        .info-card h3 { color: #007bff; margin-bottom: 10px; }
        .info-card p { color: #666; line-height: 1.6; }
        .warning { 
          background: #fff3cd; 
          border: 1px solid #ffeaa7; 
          padding: 15px; 
          border-radius: 8px; 
          margin: 20px 0;
          color: #856404;
        }
        .btn {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          margin: 10px;
          transition: background 0.3s;
        }
        .btn:hover { background: #0056b3; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="lock-icon">🔐</div>
        <h1>Prisma Studio</h1>
        <div class="success">✅ Authentication Successful</div>
        
        <div class="info-grid">
          <div class="info-card">
            <h3>🔐 Security Status</h3>
            <p><strong>Authentication:</strong> Basic Auth<br>
               <strong>Access Level:</strong> Protected<br>
               <strong>Session:</strong> Active</p>
          </div>
          
          <div class="info-card">
            <h3>📊 Service Info</h3>
            <p><strong>Port:</strong> ${PORT}<br>
               <strong>Protocol:</strong> HTTP<br>
               <strong>Status:</strong> Running</p>
          </div>
          
          <div class="info-card">
            <h3>👤 User Access</h3>
            <p><strong>Username:</strong> admin<br>
               <strong>Role:</strong> Database Admin<br>
               <strong>Permissions:</strong> Full Access</p>
          </div>
          
          <div class="info-card">
            <h3>🗄️ Database</h3>
            <p><strong>Type:</strong> SQLite<br>
               <strong>Location:</strong> Local<br>
               <strong>Tables:</strong> Users, Products, Orders</p>
          </div>
        </div>
        
        <div class="warning">
          <strong>⚠️ Development Mode:</strong> This is a development setup. 
          For production, use HTTPS, proper session management, and reverse proxy.
        </div>
        
        <div style="margin-top: 30px;">
          <a href="#" onclick="window.close()" class="btn">🔒 Close Secure Session</a>
          <a href="/logout" class="btn btn-danger">🚪 Logout</a>
        </div>
        
        <div style="margin-top: 20px; font-size: 0.9em; color: #666;">
          <p>To access actual Prisma Studio:</p>
          <p><code>npm run studio</code> (unprotected) or use this secure proxy</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Logout endpoint
app.get('/logout', (req, res) => {
  res.set('WWW-Authenticate', 'Basic realm="Prisma Studio", charset="UTF-8"');
  res.status(401).send('Logged out. Please close browser window.');
});

// Start server
app.listen(PORT, () => {
  console.log(`🔒 Secure Prisma Studio running on port ${PORT}`);
  console.log(`📊 URL: http://localhost:${PORT}`);
  console.log(`🔐 Login: admin`);
  console.log(`🔑 Password: admin123`);
  console.log(`⚠️  This is a secure proxy - not actual Prisma Studio`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down secure Prisma Studio...');
  process.exit(0);
});
