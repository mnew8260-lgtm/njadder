// ════════════════════════════════════════════════════════════
// NJADDER PRO v7.0 — PM2 Ecosystem (Production)
// ════════════════════════════════════════════════════════════
// Usage:
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save          # persist for auto-restart on reboot
//   pm2 startup       # enable PM2 on system boot
// ════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: "njadder",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,

      // Instances: 1 (Next.js handles concurrency internally)
      instances: 1,
      exec_mode: "fork",

      // Environment
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Auto-restart
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 5000,

      // Memory thresholds (auto-restart on leak)
      max_memory_restart: "512M",

      // Logging
      out_file: "/tmp/njadder-out.log",
      error_file: "/tmp/njadder-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      log_time: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Source map support
      source_map_support: true,
    },
  ],
};
