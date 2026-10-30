// Wraps an async route handler so a thrown/rejected error is forwarded to Express's
// error middleware instead of becoming an unhandled rejection that can crash the process.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
