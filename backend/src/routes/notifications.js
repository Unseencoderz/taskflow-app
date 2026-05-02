const express = require('express');

const asyncHandler = require('../middleware/asyncHandler');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/', asyncHandler(notificationController.listNotifications));
router.patch('/:id/read', asyncHandler(notificationController.markNotificationRead));
router.patch('/read-all', asyncHandler(notificationController.markAllNotificationsRead));

module.exports = router;
