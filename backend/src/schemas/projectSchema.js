const { z } = require('zod');

const projectRoleEnum = z.enum(['admin', 'editor', 'viewer', 'member']);

const createProject = z.object({
  name: z.string().min(1).max(80),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  due_date: z.string().optional().nullable(),
  category: z.string().max(64).optional().nullable(),
  visibility: z.enum(['private', 'team', 'public']).default('team'),
  invites: z
    .array(
      z.object({
        email: z.string().email(),
        role: projectRoleEnum.default('member')
      })
    )
    .max(50)
    .default([])
});

const updateProject = createProject
  .omit({ invites: true })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field required'
  });

const addMember = z.object({
  email: z.string().email(),
  role: projectRoleEnum.default('member')
});

const inviteMember = z.object({
  email: z.string().email(),
  role: projectRoleEnum.optional().default('member')
});

const updateMemberRole = z.object({
  role: projectRoleEnum
});

module.exports = {
  createProject,
  updateProject,
  addMember,
  inviteMember,
  updateMemberRole
};
