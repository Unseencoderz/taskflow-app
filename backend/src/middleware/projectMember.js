const supabase = require('../config/supabase');

module.exports = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId || req.body.project_id;

    if (!projectId) {
      return res.status(400).json({ error: 'Project id is required' });
    }

    const { data, error } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', projectId)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) {
      return next(error);
    }

    if (!data) {
      return res.status(403).json({ error: 'Project access required' });
    }

    req.projectRole = data.role;
    next();
  } catch (err) {
    next(err);
  }
};
