require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');
const { loadEnv } = require('./config/env');
const { connectDatabase } = require('./config/db');
const { configureSockets } = require('./sockets');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApplication(config) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.frontendUrl, methods: ['GET', 'POST', 'PATCH'] }
  });
  app.locals.config = config;
  app.set('io', io);
  configureSockets(io, config.jwtSecret, config);

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

  app.use('/api', (req, res, next) => {
    if (!databaseReady) {
      databaseReady = connectDatabase(config).catch(error => {
        databaseReady = null;
        throw error;
      });
    }
    databaseReady.then(() => next()).catch(next);
  });
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/sos', require('./routes/sosRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  const frontendRoot = path.join(__dirname, '..');
  let databaseReady;
  if (config.localDemoMode) {
    app.get('/login/index.html', (req, res) => res.redirect('/admin/index.html'));
  }
  ['/assets', '/data', '/login', '/rescuer', '/admin', '/trigger-sos'].forEach(route => {
    const directory = path.join(frontendRoot, route.slice(1));
    app.use(route, async (req, res, next) => {
      let filePath = path.resolve(directory, `.${req.path}`);
      if (filePath !== directory && !filePath.startsWith(`${directory}${path.sep}`)) return next();
      try {
        let fileStat = await fs.stat(filePath);
        if (fileStat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
          fileStat = await fs.stat(filePath);
        }
        if (!fileStat.isFile()) return next();
        res.sendFile(filePath, error => {
          if (error) next(error);
        });
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return next();
        next(error);
      }
    });
  });
  if (config.localDemoMode) {
    app.get('/', (req, res) => res.redirect('/admin/index.html'));
  } else {
    app.get('/', (req, res) => res.sendFile(path.join(frontendRoot, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return server;
}

async function startServer() {
  const config = loadEnv();
  await connectDatabase(config);
  const server = createApplication(config);
  const host = config.localDemoMode ? '127.0.0.1' : undefined;
  server.listen(config.port, host, () => {
    const mode = config.localDemoMode ? ' (LOCAL DEMO MODE; authentication disabled)' : '';
    console.log(`ARS server listening on ${host || 'all interfaces'}:${config.port}${mode}.`);
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start ARS server:', error.message);
    process.exit(1);
  });
}

module.exports = { createApplication, startServer };
