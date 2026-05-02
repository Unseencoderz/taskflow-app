const supabase = require('../config/supabase');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const findAuthUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user;

    if (data.users.length < perPage) return null;
    page += 1;
  }
};

const getProfilesByIds = async (ids) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at')
    .in('id', uniqueIds);

  if (error) throw error;
  return new Map(data.map((profile) => [profile.id, profile]));
};

const getAuthUsersByIds = async (ids) => {
  const wanted = new Set(ids.filter(Boolean));
  const users = new Map();
  if (wanted.size === 0) return users;

  let page = 1;
  const perPage = 1000;

  while (users.size < wanted.size) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users) {
      if (wanted.has(user.id)) users.set(user.id, user);
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
};

module.exports = {
  httpError,
  todayDate,
  findAuthUserByEmail,
  getProfilesByIds,
  getAuthUsersByIds
};
