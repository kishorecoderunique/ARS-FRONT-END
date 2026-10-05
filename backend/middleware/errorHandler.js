function notFound(req, res) {
  res.status(404).json({ error: { message: 'Route not found.' } });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.code === 11000 || err.code === '23505') {
    return res.status(409).json({ error: { message: 'A record with those details already exists.' } });
  }
  const status = err.statusCode || err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      message: status >= 500 ? 'An unexpected server error occurred.' : err.message,
      ...(err.details ? { details: err.details } : {})
    }
  });
}

module.exports = { notFound, errorHandler };
