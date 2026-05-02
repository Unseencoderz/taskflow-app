const supabase = require('../config/supabase');
const { findAuthUserByEmail, httpError } = require('./helpers');
const { acceptInviteForUser } = require('./inviteController');

const register = async (req, res) => {
  const { full_name, email, invite_token } = req.body;
  const user = await findAuthUserByEmail(email);

  if (!user) {
    throw httpError(404, 'Supabase auth user not found');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        full_name,
        role: 'member'
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) throw error;

  let acceptedInvite = null;

  if (invite_token) {
    acceptedInvite = await acceptInviteForUser({
      token: invite_token,
      userId: user.id,
      email: user.email || email
    });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role
    },
    project_id: acceptedInvite?.project_id || null
  });
};

const me = async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.profile.full_name,
    avatar_url: req.user.profile.avatar_url,
    role: req.user.profile.role
  });
};

module.exports = {
  register,
  me
};
