const supabase = require('../config/supabase');

const updateProfile = async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(req.body)
    .eq('id', req.userId)
    .select('*')
    .single();

  if (error) throw error;

  res.json({ profile });
};

module.exports = {
  updateProfile
};
