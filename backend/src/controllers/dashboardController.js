const supabase = require('../config/supabase');
const { todayDate } = require('./helpers');

const stats = async (req, res) => {
  const { data: memberships, error: membershipError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', req.userId);

  if (membershipError) throw membershipError;

  const projectIds = [...new Set(memberships.map((membership) => membership.project_id))];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: openTasks, error: openError }, { count: completedThisWeek, error: doneError }, { count: overdueTasks, error: overdueError }] =
    await Promise.all([
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', req.userId)
        .neq('status', 'done'),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', req.userId)
        .eq('status', 'done')
        .gte('updated_at', sevenDaysAgo),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', req.userId)
        .lt('due_date', todayDate())
        .neq('status', 'done')
    ]);

  if (openError) throw openError;
  if (doneError) throw doneError;
  if (overdueError) throw overdueError;

  res.json({
    totalProjects: projectIds.length,
    openTasks: openTasks || 0,
    completedThisWeek: completedThisWeek || 0,
    overdueTasks: overdueTasks || 0
  });
};

module.exports = {
  stats
};
