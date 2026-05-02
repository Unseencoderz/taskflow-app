const express = require('express');

const asyncHandler = require('../middleware/asyncHandler');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/stats', asyncHandler(dashboardController.stats));

module.exports = router;
