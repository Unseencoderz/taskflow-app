const { z } = require('zod');

const updateProfile = z
  .object({
    full_name: z.string().min(1).max(120).optional(),
    avatar_url: z.string().url().optional().nullable()
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field required' });

module.exports = {
  updateProfile
};
