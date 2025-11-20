const express = require('express');
const router = express.Router();
const { login, createAdmin, getProfile } = require('../controllers/authController');
const { verifyAdminToken, checkRole } = require('../middleware/auth');

// Public routes
router.post('/login', login);

// Protected routes
router.post('/admin/create', verifyAdminToken, checkRole('super-admin'), createAdmin);
router.get('/profile', verifyAdminToken, getProfile);

module.exports = router;



