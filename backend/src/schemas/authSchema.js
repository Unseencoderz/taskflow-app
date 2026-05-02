const { z } = require('zod');

const register = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  invite_token: z.string().optional()
});

module.exports = {
  register
};
