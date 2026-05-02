const supabase = require('../config/supabase');
const { randomUUID } = require('crypto');
const { findAuthUserByEmail, getProfilesByIds, httpError } = require('./helpers');
const { createNotification } = require('./notificationController');

const getInvitation = async (token) => {
  const { data, error } = await supabase
    .from('project_invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) throw httpError(404, 'Invite not found');
  return data;
};

const describeInvite = async (req, res) => {
  const invitation = await getInvitation(req.params.token);

  if (invitation.accepted) {
    return res.status(410).json({ error: 'This invite was already accepted. Login to your account.' });
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    return res.status(410).json({
      error: 'This invite link has expired. Ask the project admin to invite you again.'
    });
  }

  const [{ data: project, error: projectError }, profiles] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', invitation.project_id).single(),
    getProfilesByIds([invitation.invited_by])
  ]);

  if (projectError) throw projectError;

  res.json({
    email: invitation.email,
    project: {
      id: project.id,
      name: project.name
    },
    invitedBy: profiles.get(invitation.invited_by) || null,
    expires_at: invitation.expires_at,
    accepted: invitation.accepted
  });
};

const acceptInviteForUser = async ({ token, userId, email }) => {
  const invitation = await getInvitation(token);
  const normalizedEmail = email.toLowerCase().trim();

  if (invitation.accepted) {
    throw httpError(409, 'This invite was already accepted. Login to your account.');
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw httpError(410, 'This invite link has expired. Ask the project admin to invite you again.');
  }

  if (invitation.email.toLowerCase().trim() !== normalizedEmail) {
    throw httpError(403, 'This invite belongs to a different email address.');
  }

  const inviteRole =
    invitation.role && ['admin', 'editor', 'viewer', 'member'].includes(invitation.role)
      ? invitation.role
      : 'member';

  const { error: memberError } = await supabase.from('project_members').upsert(
    {
      project_id: invitation.project_id,
      user_id: userId,
      role: inviteRole
    },
    { onConflict: 'project_id,user_id' }
  );

  if (memberError) throw memberError;

  await createNotification({
    userId,
    type: 'project_updated',
    message: 'You were added to a new project',
    link: `/projects/${invitation.project_id}`
  });

  const { error: inviteError } = await supabase
    .from('project_invitations')
    .update({ accepted: true })
    .eq('id', invitation.id);

  if (inviteError) throw inviteError;

  return invitation;
};

const acceptInvite = async (req, res) => {
  const invitation = await acceptInviteForUser({
    token: req.params.token,
    userId: req.userId,
    email: req.user.email
  });

  res.json({
    accepted: true,
    project_id: invitation.project_id
  });
};

const ensureProjectInvite = async ({ projectId, email, invitedBy, role = 'member' }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const safeRole = ['admin', 'editor', 'viewer', 'member'].includes(role) ? role : 'member';

  const { data: existingInvite, error: inviteFindError } = await supabase
    .from('project_invitations')
    .select('*')
    .eq('project_id', projectId)
    .eq('email', normalizedEmail)
    .eq('accepted', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (inviteFindError) throw inviteFindError;
  if (existingInvite) return existingInvite;

  const { data: invite, error } = await supabase
    .from('project_invitations')
    .insert({
      token: randomUUID(),
      email: normalizedEmail,
      project_id: projectId,
      invited_by: invitedBy,
      role: safeRole
    })
    .select('*')
    .single();

  if (error) throw error;
  return invite;
};

const sendInviteEmail = async ({ email, token, inviterName, projectName }) => {
  const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/signup?invite=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY missing. Invite link for ${email}: ${inviteLink}`);
    return { sent: false, inviteLink };
  }

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.RESEND_FROM || 'TaskFlow <onboarding@resend.dev>',
    to: email,
    subject: `${inviterName} invited you to ${projectName} on TaskFlow`,
    html: `
      <p>Hi,</p>
      <p><b>${inviterName}</b> has invited you to join <b>${projectName}</b> on TaskFlow.</p>
      <p><a href="${inviteLink}">Accept Invitation</a></p>
      <p>This link expires in 7 days.</p>
    `
  });

  return { sent: true, inviteLink };
};

const inviteToProject = async (req, res) => {
  const projectId = req.params.id;
  const email = req.body.email.toLowerCase().trim();
  const inviteRole = ['admin', 'editor', 'viewer', 'member'].includes(req.body.role)
    ? req.body.role
    : 'member';

  const [{ data: project, error: projectError }, inviterProfiles] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', projectId).single(),
    getProfilesByIds([req.userId])
  ]);

  if (projectError || !project) throw httpError(404, 'Project not found');

  const user = await findAuthUserByEmail(email);

  if (user) {
    const { data: existingMember, error: existingError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingMember) throw httpError(409, 'This user is already a project member');

    const { data: member, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: user.id,
        role: inviteRole
      })
      .select('*')
      .single();

    if (error) throw error;

    await createNotification({
      userId: user.id,
      type: 'project_updated',
      message: `You were added to ${project.name}`,
      link: `/projects/${projectId}`
    });

    return res.status(201).json({
      message: 'User added to project',
      added: true,
      invited: false,
      member
    });
  }

  const invite = await ensureProjectInvite({ projectId, email, invitedBy: req.userId, role: inviteRole });
  const inviter = inviterProfiles.get(req.userId);
  const emailResult = await sendInviteEmail({
    email,
    token: invite.token,
    inviterName: inviter?.full_name || req.user.email,
    projectName: project.name
  });

  res.status(201).json({
    message: `Invitation sent to ${email}`,
    added: false,
    invited: true,
    invite: {
      email: invite.email,
      expires_at: invite.expires_at
    },
    inviteLink: emailResult.sent ? undefined : emailResult.inviteLink
  });
};

const createPendingInviteWithEmail = async ({
  projectId,
  email,
  invitedBy,
  role,
  inviterName,
  projectName
}) => {
  const invite = await ensureProjectInvite({ projectId, email, invitedBy, role });
  const emailResult = await sendInviteEmail({
    email,
    token: invite.token,
    inviterName,
    projectName
  });
  return { invite, emailResult };
};

module.exports = {
  describeInvite,
  acceptInvite,
  acceptInviteForUser,
  inviteToProject,
  ensureProjectInvite,
  createPendingInviteWithEmail
};
