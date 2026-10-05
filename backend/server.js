require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');
const { loadEnv } = require('./config/env');
const { connectDatabase } = require('./config/db');
const { configureSockets } = require('./sockets');
const { notFound, errorHandler } = require('./middleware/errorHandler');

async function startServer() {
  const config = loadEnv();
  await connectDatabase(config);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.frontendUrl, methods: ['GET', 'POST', 'PATCH'] }
  });
  app.locals.config = config;
  app.set('io', io);
  configureSockets(io, config.jwtSecret);

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === config.frontendUrl) return callback(null, true);
      const error = new Error('Origin is not allowed by CORS.');
      error.statusCode = 403;
      callback(error);
    }
  }));
  app.use(express.json({ limit: '32kb' }));

  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/sos', require('./routes/sosRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  const frontendRoot = path.join(__dirname, '..');
  ['/assets', '/data', '/login', '/rescuer', '/admin', '/trigger-sos'].forEach(route => {
    app.use(route, express.static(path.join(frontendRoot, route.slice(1)), { dotfiles: 'deny', index: 'index.html' }));
  });
  app.get('/', (req, res) => res.sendFile(path.join(frontendRoot, 'index.html')));

  app.use(notFound);
  app.use(errorHandler);

  server.listen(config.port, () => console.log(`ARS server listening on port ${config.port}.`));
  const shutdown = async () => {
    server.close(async () => {
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch(error => {
  console.error('Failed to start ARS server:', error.message);
  process.exit(1);
});
