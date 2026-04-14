const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adds { uid, role } to the request object
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Requires Admin Role" });
  }
  next();
};

module.exports = { verifyToken, isAdmin };