/**
 * PM2 Ecosystem Configuration for Gulyaly Production
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs
 *   pm2 monit
 *   pm2 restart all
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'gulyaly',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/gulyaly',
      
      // Cluster mode for multi-core utilization
      instances: 'max',
      exec_mode: 'cluster',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Restart policies
      max_restarts: 10,
      min_uptime: '5s',
      restart_delay: 1000,
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Production-specific environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      
      // Logging
      log_file: '/var/log/gulyaly/combined.log',
      out_file: '/var/log/gulyaly/out.log',
      error_file: '/var/log/gulyaly/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Process identification
      instance_var: 'INSTANCE_ID',
      
      // Memory management
      node_args: '--max-old-space-size=1024',
    },
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'gulyaly.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/gulyaly.git',
      path: '/var/www/gulyaly',
      'post-deploy':
        'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
    },
  },
};
