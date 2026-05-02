const express = require('express');

const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const profileController = require('../controllers/profileController');
const { updateProfile } = require('../schemas/profileSchema');

const router = express.Router();

router.patch('/', validate(updateProfile), asyncHandler(profileController.updateProfile));

module.exports = router;
