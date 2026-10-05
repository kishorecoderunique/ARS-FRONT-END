const jwt = require('jsonwebtoken');
const { getUser } = require('../services/data');

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: { message: 'Authentication required.' } });

  let payload;
  try {
    payload = jwt.verify(token, req.app.locals.config.jwtSecret);
  } catch {
    return res.status(401).json({ error: { message: 'Session expired. Please sign in again.' } });
  }

  getUser(payload.id).then(user => {
    if (!user || user.role !== payload.role || user.status !== 'approved') {
      return res.status(401).json({ error: { message: 'Session is no longer valid. Please sign in again.' } });
    }
    req.user = { id: String(user._id), role: user.role, name: user.name };
    next();
  }).catch(next);
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: { message: 'You do not have permission to perform this action.' } });
    }
    next();
  };
}

function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: { message: 'You do not have permission to perform this action.' } });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, requireAnyRole };
