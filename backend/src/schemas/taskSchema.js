const { z } = require('zod');

const createTask = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo')
});

const updateTask = z
  .object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().optional().nullable(),
    assignee_id: z.string().uuid().optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().optional().nullable(),
    status: z.enum(['todo', 'in_progress', 'done']).optional()
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field required' });

const createSubtask = z.object({
  title: z.string().min(1).max(160)
});

const updateSubtask = z.object({
  done: z.boolean()
});

const createComment = z.object({
  body: z.string().min(1).max(2000)
});

module.exports = {
  createTask,
  updateTask,
  createSubtask,
  updateSubtask,
  createComment
};
