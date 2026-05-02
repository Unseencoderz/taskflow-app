const supabase = require('../config/supabase');
const { todayDate } = require('./helpers');

const createNotification = async ({ userId, type, message, link }) => {
  if (!userId) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    message,
    link
  });
};

const ensureOverdueNotifications = async (userId) => {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('assignee_id', userId)
    .neq('status', 'done')
    .lt('due_date', todayDate());

  if (error) throw error;

  for (const task of tasks) {
    const link = `/tasks/${task.id}`;
    const { data: existing, error: existingError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'task_overdue')
      .eq('link', link)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      await createNotification({
        userId,
        type: 'task_overdue',
        message: `"${task.title}" is overdue`,
        link
      });
    }
  }
};

const listNotifications = async (req, res) => {
  await ensureOverdueNotifications(req.userId);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  res.json({ notifications: data });
};

const markNotificationRead = async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select('*')
    .single();

  if (error) throw error;
  res.json({ notification: data });
};

const markAllNotificationsRead = async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', req.userId)
    .eq('read', false);

  if (error) throw error;
  res.json({ ok: true });
};

module.exports = {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
