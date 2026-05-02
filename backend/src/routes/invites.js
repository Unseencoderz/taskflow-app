const express = require('express');

const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const inviteController = require('../controllers/inviteController');

const router = express.Router();

router.get('/:token', asyncHandler(inviteController.describeInvite));
router.post('/:token/accept', auth, asyncHandler(inviteController.acceptInvite));

module.exports = router;
