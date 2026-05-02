const express = require('express');

const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const authController = require('../controllers/authController');
const { register } = require('../schemas/authSchema');

const router = express.Router();

router.post('/register', validate(register), asyncHandler(authController.register));
router.get('/me', authMiddleware, asyncHandler(authController.me));

module.exports = router;
