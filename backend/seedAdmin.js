require('dotenv').config();
const { seedDefaultAccounts, findUserByEmail, createUser } = require('./services/userStore');

const ADMIN_EMAIL = 'tilakrajbhargava4@gmail.com';
const ADMIN_PASSWORD = 'Admintilak12@';
const ADMIN_NAME = 'Tilak Raj Bhargava';

async function seedAdmin() {
  let supabase = global.supabase;
  if (!supabase) {
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_KEY env vars');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    global.supabase = supabase;
  }

  // Remove all users except the desired admin email
  try {
    await supabase.from('users').delete().not('email', 'eq', ADMIN_EMAIL);
  } catch (err) {
    // ignore delete errors here, will surface on seeding below
    console.warn('Could not delete other users:', err.message || err);
  }

  // Ensure admin exists (create if missing)
  const existing = await findUserByEmail(ADMIN_EMAIL);
  if (existing) {
    return existing;
  }

  const admin = await createUser({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', mobile: '0000000000' });
  return admin;
}

if (require.main === module) {
  seedAdmin().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedAdmin };
