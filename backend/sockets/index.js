const jwt = require('jsonwebtoken');
const { getUser } = require('../services/data');

function configureSockets(io, secret) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      const payload = jwt.verify(token, secret);
      getUser(payload.id).then(user => {
        if (!user || user.role !== payload.role || user.status !== 'approved') {
          return next(new Error('Session is no longer valid.'));
        }
        socket.user = { id: String(user._id), role: user.role };
        next();
      }).catch(next);
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', socket => {
    socket.join(`user:${socket.user.id}`);
    socket.join(socket.user.role === 'admin' ? 'admins' : 'rescuers');
  });
}

module.exports = { configureSockets };
