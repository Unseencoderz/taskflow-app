const express = require('express');

const projectMember = require('../middleware/projectMember');
const requireProjectAdmin = require('../middleware/requireProjectAdmin');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const projectController = require('../controllers/projectController');
const inviteController = require('../controllers/inviteController');
const { createProject, updateProject, addMember, inviteMember, updateMemberRole } = require('../schemas/projectSchema');

const router = express.Router();

router.get('/', asyncHandler(projectController.listProjects));
router.post('/', validate(createProject), asyncHandler(projectController.createProject));
router.get('/:id', projectMember, asyncHandler(projectController.getProject));
router.patch('/:id', requireProjectAdmin, validate(updateProject), asyncHandler(projectController.updateProject));
router.delete('/:id', requireProjectAdmin, asyncHandler(projectController.deleteProject));
router.get('/:id/tasks', projectMember, asyncHandler(projectController.listProjectTasks));
router.get('/:id/members', projectMember, asyncHandler(projectController.listProjectMembers));
router.post('/:id/invite', requireProjectAdmin, validate(inviteMember), asyncHandler(inviteController.inviteToProject));
router.post('/:id/members', requireProjectAdmin, validate(addMember), asyncHandler(projectController.addProjectMember));
router.patch('/:id/members/:userId/role', requireProjectAdmin, validate(updateMemberRole), asyncHandler(projectController.updateProjectMemberRole));
router.delete('/:id/members/:userId', requireProjectAdmin, asyncHandler(projectController.removeProjectMember));

module.exports = router;
