const supabase = require('../config/supabase');
const { findAuthUserByEmail, getAuthUsersByIds, getProfilesByIds, httpError } = require('./helpers');
const { createNotification } = require('./notificationController');
const { createPendingInviteWithEmail } = require('./inviteController');

const getProjectIdsForUser = async (userId) => {
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (error) throw error;
  return [...new Set(data.map((membership) => membership.project_id))];
};

const addProjectCounts = async (projects, userId) => {
  const ids = projects.map((project) => project.id);
  if (ids.length === 0) return projects;

  const [{ data: tasks, error: taskError }, { data: members, error: memberError }] = await Promise.all([
    supabase.from('tasks').select('id, project_id').in('project_id', ids),
    supabase.from('project_members').select('id, project_id, user_id, role').in('project_id', ids)
  ]);

  if (taskError) throw taskError;
  if (memberError) throw memberError;

  const taskCounts = tasks.reduce((acc, task) => {
    acc[task.project_id] = (acc[task.project_id] || 0) + 1;
    return acc;
  }, {});

  const memberCounts = members.reduce((acc, member) => {
    acc[member.project_id] = (acc[member.project_id] || 0) + 1;
    return acc;
  }, {});

  return projects.map((project) => ({
    ...project,
    task_count: taskCounts[project.id] || 0,
    member_count: memberCounts[project.id] || 0,
    member_ids: members
      .filter((member) => member.project_id === project.id)
      .map((member) => member.user_id),
    project_role: members.find((member) => member.project_id === project.id && member.user_id === userId)?.role || null
  }));
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

const listProjects = async (req, res) => {
  const projectIds = await getProjectIdsForUser(req.userId);

  let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

  if (projectIds.length === 0) {
    return res.json({ projects: [] });
  }
  query = query.in('id', projectIds);

  const { data, error } = await query;
  if (error) throw error;

  res.json({ projects: await addProjectCounts(data, req.userId) });
};

const createProject = async (req, res) => {
  const { invites = [], ...fields } = req.body;
  const creatorEmail = (req.user.email || '').toLowerCase().trim();

  const insertPayload = {
    name: fields.name,
    description: fields.description ?? null,
    status: fields.status,
    due_date: fields.due_date ?? null,
    category: fields.category ?? null,
    visibility: fields.visibility ?? 'team',
    created_by: req.userId,
    updated_at: new Date().toISOString()
  };

  const { data: project, error } = await supabase.from('projects').insert(insertPayload).select('*').single();

  if (error) throw error;

  const { error: memberError } = await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: req.userId,
    role: 'admin'
  });

  if (memberError) throw memberError;

  const inviterProfiles = await getProfilesByIds([req.userId]);
  const inviter = inviterProfiles.get(req.userId);
  const inviterName = inviter?.full_name || req.user.email || 'A teammate';

  const seenEmails = new Set(creatorEmail ? [creatorEmail] : []);
  let addedMembers = 0;
  let pendingInvites = 0;

  for (const row of invites) {
    const email = String(row.email || '')
      .toLowerCase()
      .trim();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);

    const role = ['admin', 'editor', 'viewer', 'member'].includes(row.role) ? row.role : 'member';

    const existingUser = await findAuthUserByEmail(email);

    if (existingUser) {
      if (existingUser.id === req.userId) continue;

      const { data: already, error: alreadyErr } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (alreadyErr) throw alreadyErr;
      if (already) continue;

      const { error: addErr } = await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: existingUser.id,
        role
      });

      if (addErr) throw addErr;

      await createNotification({
        userId: existingUser.id,
        type: 'project_updated',
        message: `You were added to ${project.name}`,
        link: `/projects/${project.id}`
      });

      addedMembers += 1;
    } else {
      await createPendingInviteWithEmail({
        projectId: project.id,
        email,
        invitedBy: req.userId,
        role,
        inviterName,
        projectName: project.name
      });
      pendingInvites += 1;
    }
  }

  const [withCounts] = await addProjectCounts([project], req.userId);

  res.status(201).json({
    project: withCounts,
    invites_summary: {
      added_members: addedMembers,
      pending_invites: pendingInvites
    }
  });
};

const getProject = async (req, res) => {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !project) {
    throw httpError(404, 'Project not found');
  }

  const [withCounts] = await addProjectCounts([project], req.userId);
  res.json({ project: withCounts });
};

const updateProject = async (req, res) => {
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      ...req.body,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error || !project) {
    throw httpError(404, 'Project not found');
  }

  res.json({ project });
};

const deleteProject = async (req, res) => {
  const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
  if (error) throw error;

  res.status(204).send();
};

const listProjectTasks = async (req, res) => {
  const allowedSorts = new Set(['due_date', 'created_at', 'updated_at', 'priority', 'status', 'title']);
  const sort = allowedSorts.has(req.query.sort) ? req.query.sort : 'created_at';

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('project_id', req.params.id)
    .order(sort, { ascending: sort === 'due_date' || sort === 'title' });

  if (req.query.status) query = query.eq('status', req.query.status);
  if (req.query.assignee) query = query.eq('assignee_id', req.query.assignee);
  if (req.query.search) query = query.ilike('title', `%${req.query.search}%`);

  const { data, error } = await query;
  if (error) throw error;

  res.json({ tasks: await attachSubtasks(data) });
};

const listProjectMembers = async (req, res) => {
  const { data: memberships, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', req.params.id)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  const userIds = memberships.map((membership) => membership.user_id);
  const [profiles, authUsers] = await Promise.all([
    getProfilesByIds(userIds),
    getAuthUsersByIds(userIds)
  ]);
  const members = memberships.map((membership) => ({
    ...membership,
    profile: {
      ...(profiles.get(membership.user_id) || {}),
      email: authUsers.get(membership.user_id)?.email || null
    }
  }));

  res.json({ members });
};

const addProjectMember = async (req, res) => {
  const user = await findAuthUserByEmail(req.body.email);

  if (!user) {
    throw httpError(404, 'User not found');
  }

  const { data: member, error } = await supabase
    .from('project_members')
    .upsert(
      {
        project_id: req.params.id,
        user_id: user.id,
        role: req.body.role
      },
      { onConflict: 'project_id,user_id' }
    )
    .select('*')
    .single();

  if (error) throw error;

  await createNotification({
    userId: user.id,
    type: 'project_updated',
    message: 'You were added to a new project',
    link: `/projects/${req.params.id}`
  });

  res.status(201).json({ member });
};

const updateProjectMemberRole = async (req, res) => {
  const { id: projectId, userId } = req.params;

  if (userId === req.userId) {
    throw httpError(400, 'You cannot change your own project role');
  }

  if (['member', 'editor', 'viewer'].includes(req.body.role)) {
    const { count, error: countError } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('role', 'admin');

    if (countError) throw countError;

    const { data: target, error: targetError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (targetError || !target) throw httpError(404, 'Project member not found');
    if (target.role === 'admin' && count <= 1) {
      throw httpError(400, 'A project must have at least one admin');
    }
  }

  const { data: member, error } = await supabase
    .from('project_members')
    .update({ role: req.body.role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  res.json({ member });
};

const removeProjectMember = async (req, res) => {
  const { id: projectId, userId } = req.params;

  if (userId === req.userId) {
    throw httpError(400, 'You cannot remove yourself from a project you administer');
  }

  const { data: target, error: targetError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (targetError || !target) throw httpError(404, 'Project member not found');

  if (target.role === 'admin') {
    const { count, error: countError } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('role', 'admin');

    if (countError) throw countError;
    if (count <= 1) throw httpError(400, 'A project must have at least one admin');
  }

  const { error: taskError } = await supabase
    .from('tasks')
    .update({ assignee_id: null, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('assignee_id', userId);

  if (taskError) throw taskError;

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw error;

  res.status(204).send();
};

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjectTasks,
  listProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember
};
