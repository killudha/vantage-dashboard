const express = require('express');
const router = express.Router();
const { getProjects } = require('../controllers/projectController');
const { verifyToken } = require('../middlewares/authMiddleware'); // <-- Import middleware-nya

// Sisipkan verifyToken di tengah, sebelum getProjects
router.get('/', verifyToken, getProjects);

module.exports = router;