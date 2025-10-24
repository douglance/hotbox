const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from safenode!',
    environment: 'Docker sandboxed',
    node_version: process.version,
    platform: process.platform,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Node version: ${process.version}`);
});