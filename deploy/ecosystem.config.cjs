module.exports = {
  apps: [{
    name: 'civicroute-api',
    cwd: '/opt/civicroute/backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 5000 },
    time: true,
    max_memory_restart: '300M',
  }],
};
