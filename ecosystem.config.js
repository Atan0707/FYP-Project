module.exports = {
  apps: [
    {
      name: 'fyp-project',
      script: 'yarn',
      args: 'start',
      cwd: '/Users/hariz/Desktop/FYP-Project',
      instances: 'max', // or 'max' for cluster mode
      exec_mode: 'cluster', // or 'cluster'
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart policy
      watch: false,
      max_memory_restart: '1G',
      
      // Logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced features
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      
      // Environment variables from .env file
      env_file: '.env'
    }
  ]
};
