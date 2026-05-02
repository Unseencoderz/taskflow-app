const express = require('express');

const taskAccess = require('../middleware/taskAccess');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const taskController = require('../controllers/taskController');
const {
  createTask,
  updateTask,
  createSubtask,
  updateSubtask,
  createComment
} = require('../schemas/taskSchema');

const router = express.Router();

router.get('/', asyncHandler(taskController.listTasks));
router.post('/', validate(createTask), asyncHandler(taskController.createTask));
router.get('/:id', taskAccess, asyncHandler(taskController.getTask));
router.patch('/:id', taskAccess, validate(updateTask), asyncHandler(taskController.updateTask));
router.delete('/:id', taskAccess, asyncHandler(taskController.deleteTask));
router.post('/:id/subtasks', taskAccess, validate(createSubtask), asyncHandler(taskController.addSubtask));
router.patch('/subtasks/:id', validate(updateSubtask), asyncHandler(taskController.updateSubtask));
router.delete('/subtasks/:id', asyncHandler(taskController.deleteSubtask));
router.post('/:id/comments', taskAccess, validate(createComment), asyncHandler(taskController.addComment));

module.exports = router;
