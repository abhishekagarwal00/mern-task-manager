// 404 for unknown API routes
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

// Central error handler: converts Mongoose / Mongo errors into clean HTTP responses
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That email is already registered';
  }

  if (status === 500) console.error(err);
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
