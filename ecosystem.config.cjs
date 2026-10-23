const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "efootball-api",
      cwd: path.join(__dirname, "backend"),
      script: "src/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      max_memory_restart: "512M",
      time: true,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "3005",
        APP_ORIGIN: "https://efootball.shadiqur.bd",
        SESSION_SAME_SITE: "strict",
        TRUST_PROXY: "1",
      },
    },
  ],
};
