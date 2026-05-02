const supabase = require('../config/supabase');

module.exports = async (req, res, next) => {
  try {
    const taskId = req.params.id;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('id, role')
      .eq('project_id', task.project_id)
      .eq('user_id', req.userId)
      .maybeSingle();

    if (membershipError) {
      return next(membershipError);
    }

    if (membership) {
      req.task = task;
      req.projectRole = membership.role;
      return next();
    }

    if (task.assignee_id !== req.userId && task.created_by !== req.userId) {
      return res.status(403).json({ error: 'Task access required' });
    }

    req.task = task;
    req.projectRole = null;
    next();
  } catch (err) {
    next(err);
  }
};
