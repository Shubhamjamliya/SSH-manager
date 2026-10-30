// Centralized error handler: catches anything forwarded via next(err) (including from
// asyncHandler-wrapped routes) so a single bad request can never crash the process or
// leak stack traces/internals to the client.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  res.status(err.status || 500).json({ message: 'Something went wrong' });
}

module.exports = errorHandler;
