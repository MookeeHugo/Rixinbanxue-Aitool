const path = require('path');

module.exports = {
  apps: [
    {
      name: 'rixinmath-pipeline',
      cwd: __dirname,
      script: 'uvicorn',
      args: 'preprocess_service:app --host 0.0.0.0 --port 8000 --log-level info',
      interpreter: path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
      watch: false,
      env: {
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8'
      },
      max_memory_restart: '1G',
      autorestart: true,
      restart_delay: 3000,
      error_file: path.join(__dirname, 'logs', 'error.log'),
      out_file: path.join(__dirname, 'logs', 'out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};
