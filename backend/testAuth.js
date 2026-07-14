require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL/KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
global.supabase = supabase;

const { findUserByIdentifier } = require('./services/userStore');

(async () => {
  try {
    const email = 'tilakrajbhargava4@gmail.com';
    const user = await findUserByIdentifier(email);
    if (!user) { console.error('User not found'); process.exit(1); }
    console.log('Found user:', user.email, 'role:', user.role);
    const match = await bcrypt.compare('Admintilak12@', user.password);
    console.log('Password matches:', match);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
