const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Verify user token
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

// Verify admin token
const verifyAdminToken = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    const admin = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!admin || !admin.isActive) {
      return res
        .status(401)
        .json({ error: "Invalid or inactive admin account." });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};

// Check admin role
const checkRole = (...roles) => {
  return (req, res, next) => {
    console.log("req.admin", req.admin, roles.includes(req.admin.role));

    if (!req.admin || !roles.includes(req.admin.role)) {
      return res
        .status(403)
        .json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

module.exports = { verifyToken, verifyAdminToken, checkRole };
