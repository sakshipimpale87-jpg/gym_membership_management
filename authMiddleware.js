/**
 * Authentication and Role Authorization Middleware
 */

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Access denied. Please log in to your account.'
  });
};

// Middleware to ensure user has Admin privileges
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Forbidden. Administrator privileges are required to access this resource.'
  });
};

// Optional check: ensure user is active (not suspended)
const isActiveUser = (req, res, next) => {
  if (req.session && req.session.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Your account has been suspended. Please contact gym administration.'
    });
  }
  return next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isActiveUser
};
