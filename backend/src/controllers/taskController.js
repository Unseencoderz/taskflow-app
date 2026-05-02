const supabase = require('../config/supabase');
const { getProfilesByIds, httpError, todayDate } = require('./helpers');
const { createNotification } = require('./notificationController');

const assertCanCreateTask = async (req, projectId) => {
  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', req.userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw httpError(403, 'Project membership required');
  }
};

const canAccessTask = async (req, task) => {
  if (task.assignee_id === req.userId || task.created_by === req.userId) {
    return true;
  }

  const { data, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', task.project_id)
    .eq('user_id', req.userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
};

const getTaskById = async (taskId) => {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();

  if (error || !data) {
    throw httpError(404, 'Task not found');
  }

  return data;
};

const attachSubtasks = async (tasks) => {
  const ids = tasks.map((task) => task.id);
  if (ids.length === 0) return tasks;

  const { data: subtasks, error } = await supabase
    .from('subtasks')
    .select('*')
    .in('task_id', ids)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const byTask = subtasks.reduce((acc, subtask) => {
    acc[subtask.task_id] = acc[subtask.task_id] || [];
    acc[subtask.task_id].push(subtask);
    return acc;
  }, {});

  return tasks.map((task) => ({
    ...task,
    subtasks: byTask[task.id] || []
  }));
};

const listTasks = async (req, res) => {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (req.query.assignee === 'me' || !req.query.assignee) {
    query = query.eq('assignee_id', req.userId);
  } else {
    return res.status(403).json({ error: 'Cannot view tasks for another assignee' });
  }

  if (req.query.overdue === 'true') {
    query = query.lt('due_date', todayDate()).neq('status', 'done');
  }

  if (req.query.limit) {
    const limit = Number.parseInt(req.query.limit, 10);
    if (Number.isFinite(limit) && limit > 0) query = query.limit(limit);
  }

  const { data: tasks, error } = await query;
  if (error) throw error;

  const tasksWithSubtasks = await attachSubtasks(tasks);
  const projectIds = [...new Set(tasksWithSubtasks.map((task) => task.project_id))];
  const { data: projects, error: projectError } =
    projectIds.length > 0
      ? await supabase.from('projects').select('id, name').in('id', projectIds)
      : { data: [], error: null };

  if (projectError) throw projectError;

  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const grouped = tasksWithSubtasks.reduce((acc, task) => {
    const project = projectMap.get(task.project_id) || { id: task.project_id, name: 'Project' };
    let group = acc.find((item) => item.project.id === project.id);

    if (!group) {
      group = { project, tasks: [] };
      acc.push(group);
    }

    group.tasks.push(task);
    return acc;
  }, []);

  res.json({ groups: grouped });
};

const createTask = async (req, res) => {
  await assertCanCreateTask(req, req.body.project_id);

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      ...req.body,
      created_by: req.userId,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('activity_log').insert({
    task_id: task.id,
    actor_id: req.userId,
    action: 'created',
    meta: {}
  });

  if (task.assignee_id && task.assignee_id !== req.userId) {
    await createNotification({
      userId: task.assignee_id,
      type: 'task_assigned',
      message: `You were assigned "${task.title}"`,
      link: `/tasks/${task.id}`
    });
  }

  res.status(201).json({ task });
};

const getTask = async (req, res) => {
  const task = req.task || (await getTaskById(req.params.id));

  const [
    { data: project, error: projectError },
    { data: subtasks, error: subtaskError },
    { data: comments, error: commentError },
    { data: activity, error: activityError }
  ] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', task.project_id).single(),
    supabase.from('subtasks').select('*').eq('task_id', task.id).order('created_at', { ascending: true }),
    supabase.from('comments').select('*').eq('task_id', task.id).order('created_at', { ascending: true }),
    supabase.from('activity_log').select('*').eq('task_id', task.id).order('created_at', { ascending: false })
  ]);

  if (projectError) throw projectError;
  if (subtaskError) throw subtaskError;
  if (commentError) throw commentError;
  if (activityError) throw activityError;

  const profiles = await getProfilesByIds([
    task.assignee_id,
    ...comments.map((comment) => comment.author_id),
    ...activity.map((entry) => entry.actor_id)
  ]);

  res.json({
    task: {
      ...task,
      project,
      assignee: task.assignee_id ? profiles.get(task.assignee_id) || null : null
    },
    subtasks,
    comments: comments.map((comment) => ({
      ...comment,
      author: profiles.get(comment.author_id) || null
    })),
    activity: activity.map((entry) => ({
      ...entry,
      actor: profiles.get(entry.actor_id) || null
    }))
  });
};

const updateTask = async (req, res) => {
  const existing = req.task || (await getTaskById(req.params.id));
  const body = req.body;

  if (req.projectRole !== 'admin') {
    const keys = Object.keys(body);
    const canOnlyUpdateOwnStatus =
      existing.assignee_id === req.userId && keys.length === 1 && keys[0] === 'status';

    if (!canOnlyUpdateOwnStatus) {
      return res.status(403).json({ error: 'Members can only update status on their own tasks' });
    }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) throw error;

  const activity = [];

  if (body.status && body.status !== existing.status) {
    activity.push({
      task_id: existing.id,
      actor_id: req.userId,
      action: 'status_changed',
      meta: { from: existing.status, to: body.status }
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'assignee_id') && body.assignee_id !== existing.assignee_id) {
    activity.push({
      task_id: existing.id,
      actor_id: req.userId,
      action: 'assignee_changed',
      meta: { from: existing.assignee_id, to: body.assignee_id }
    });

    if (body.assignee_id && body.assignee_id !== req.userId) {
      await createNotification({
        userId: body.assignee_id,
        type: 'task_assigned',
        message: `You were assigned "${task.title}"`,
        link: `/tasks/${task.id}`
      });
    }
  }

  if (activity.length > 0) {
    const { error: activityError } = await supabase.from('activity_log').insert(activity);
    if (activityError) throw activityError;
  }

  res.json({ task });
};

const deleteTask = async (req, res) => {
  const task = req.task || (await getTaskById(req.params.id));

  if (req.projectRole !== 'admin' && task.created_by !== req.userId) {
    throw httpError(403, 'Cannot delete this task');
  }

  const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
  if (error) throw error;

  res.status(204).send();
};

const addSubtask = async (req, res) => {
  const task = req.task || (await getTaskById(req.params.id));

  const { data: subtask, error } = await supabase
    .from('subtasks')
    .insert({
      task_id: task.id,
      title: req.body.title,
      done: false
    })
    .select('*')
    .single();

  if (error) throw error;

  res.status(201).json({ subtask });
};

const updateSubtask = async (req, res) => {
  const { data: existing, error: findError } = await supabase
    .from('subtasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (findError || !existing) {
    throw httpError(404, 'Subtask not found');
  }

  const task = await getTaskById(existing.task_id);
  if (!(await canAccessTask(req, task))) {
    return res.status(403).json({ error: 'Task access required' });
  }

  const { data: subtask, error } = await supabase
    .from('subtasks')
    .update({ done: req.body.done })
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) throw error;

  res.json({ subtask });
};

const deleteSubtask = async (req, res) => {
  const { data: existing, error: findError } = await supabase
    .from('subtasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (findError || !existing) {
    throw httpError(404, 'Subtask not found');
  }

  const task = await getTaskById(existing.task_id);
  if (!(await canAccessTask(req, task))) {
    return res.status(403).json({ error: 'Task access required' });
  }

  const { error } = await supabase.from('subtasks').delete().eq('id', req.params.id);
  if (error) throw error;

  res.status(204).send();
};

const addComment = async (req, res) => {
  const task = req.task || (await getTaskById(req.params.id));

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      task_id: task.id,
      author_id: req.userId,
      body: req.body.body
    })
    .select('*')
    .single();

  if (error) throw error;

  res.status(201).json({ comment });
};

module.exports = {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addComment
};
