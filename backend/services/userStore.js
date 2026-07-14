const USE_SQLITE = String(process.env.USE_SQLITE || '').toLowerCase() === 'true';
let usingSqlite = false;
let sqlite = null;
if (USE_SQLITE) {
  try {
    require('better-sqlite3');
    sqlite = require('./sqliteStore');
    usingSqlite = !!sqlite;
  } catch (err) {
    console.warn('SQLite requested but not available, falling back to Supabase:', err.message);
    usingSqlite = false;
    sqlite = null;
  }
}

const bcrypt = require('bcryptjs');

function getSupabase() {
  if (!global.supabase) {
    throw new Error('Supabase client is not initialized');
  }
  return global.supabase;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

if (usingSqlite) {
  async function createUser(opts) {
    const hashed = await bcrypt.hash(opts.password, 10);
    return sqlite.createUser({ ...opts, password: hashed });
  }

  module.exports = {
    createUser,
    findUserByEmail: sqlite.findUserByEmail,
    findUserByIdentifier: sqlite.findUserByIdentifier,
    findUserById: sqlite.findUserById,
    listUsers: sqlite.listUsers,
    updateUser: sqlite.updateUser,
    deleteUser: sqlite.deleteUser,
    seedDefaultAccounts: async function() {
      const defaults = [
        { name: 'System Admin', email: 'admin@glbbank.com', password: 'admin123', role: 'admin', mobile: '0000000000' },
        { name: 'Bank Manager', email: 'manager@glbbank.com', password: 'manager123', role: 'manager', mobile: '1111111111' },
        { name: 'Bank Employee', email: 'employee@glbbank.com', password: 'employee123', role: 'employee', mobile: '2222222222' }
      ];
      const created = [];
      for (const it of defaults) {
        const exist = sqlite.findUserByEmail(it.email);
        if (exist) { created.push(exist); continue; }
        const u = await createUser(it);
        created.push(u);
      }
      return created;
    },
    seedDefaultAdmin: async function() { const arr = await module.exports.seedDefaultAccounts(); return arr[0]; }
  };
} else {
  async function createUser({ name, email, password, role = 'student', mobile = '', studentId, facultyId, merchantId }) {
    const supabase = getSupabase();
    const normalizedEmail = normalize(email);

    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return { error: 'User already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const _id = Date.now().toString();
    const insertObj = { _id, name, email: normalizedEmail, password: hashedPassword };
    if (role) insertObj.role = role;
    if (mobile) insertObj.mobile = mobile;
    if (studentId) insertObj.studentId = studentId;
    if (facultyId) insertObj.facultyId = facultyId;
    if (merchantId) insertObj.merchantId = merchantId;

    // Insert using lowercase column names where applicable
    const dbInsert = { ...insertObj };
    if (dbInsert.studentId) { dbInsert.studentid = dbInsert.studentId; delete dbInsert.studentId; }
    if (dbInsert.facultyId) { dbInsert.facultyid = dbInsert.facultyId; delete dbInsert.facultyId; }
    if (dbInsert.merchantId) { dbInsert.merchantid = dbInsert.merchantId; delete dbInsert.merchantId; }

    const { data, error } = await supabase
      .from('users')
      .insert([dbInsert])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function findUserByEmail(email) {
    if (!email) return null;
    const supabase = getSupabase();
    const normalizedEmail = normalize(email);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) return null;
    return mapUser(data);
  }

  async function findUserByIdentifier(identifier) {
    if (!identifier) return null;
    const supabase = getSupabase();
    const normalized = normalize(identifier);
    const orQuery = `email.ilike.${normalized},mobile.ilike.${normalized},studentid.ilike.${normalized},facultyid.ilike.${normalized},merchantid.ilike.${normalized},_id.eq.${normalized}`;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(orQuery)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) return null;
    return mapUser(data);
  }

  async function findUserById(id) {
    if (!id) return null;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('_id', String(id))
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) return null;
    return mapUser(data);
  }

  async function listUsers() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('_id,name,email,role,mobile,studentid,facultyid,merchantid');

    if (error) {
      throw error;
    }
    return (data || []).map(mapUser);
  }

  async function updateUser(id, updates) {
    const supabase = getSupabase();
    const allowed = ['name', 'email', 'role', 'mobile', 'studentId', 'facultyId', 'merchantId', 'password'];
    const data = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        data[key] = updates[key];
      }
    }

    if (data.email) {
      data.email = normalize(data.email);
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Translate camelCase to DB column names
    const dbUpdate = { ...data };
    if (dbUpdate.studentId !== undefined) { dbUpdate.studentid = dbUpdate.studentId; delete dbUpdate.studentId; }
    if (dbUpdate.facultyId !== undefined) { dbUpdate.facultyid = dbUpdate.facultyId; delete dbUpdate.facultyId; }
    if (dbUpdate.merchantId !== undefined) { dbUpdate.merchantid = dbUpdate.merchantId; delete dbUpdate.merchantId; }

    const { data: updated, error } = await supabase
      .from('users')
      .update(dbUpdate)
      .eq('_id', String(id))
      .select('_id,name,email,role,mobile,studentid,facultyid,merchantid')
      .single();

    if (error) {
      throw error;
    }
    return updated ? mapUser(updated) : null;
  }

  async function deleteUser(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('_id', String(id))
      .select('_id');

    if (error) {
      throw error;
    }
    return Array.isArray(data) ? data.length > 0 : !!data;
  }

  function mapUser(row) {
    if (!row) return null;
    const u = { ...row };
    if (Object.prototype.hasOwnProperty.call(u, 'studentid')) { u.studentId = u.studentid; delete u.studentid; }
    if (Object.prototype.hasOwnProperty.call(u, 'facultyid')) { u.facultyId = u.facultyid; delete u.facultyid; }
    if (Object.prototype.hasOwnProperty.call(u, 'merchantid')) { u.merchantId = u.merchantid; delete u.merchantid; }
    if (Object.prototype.hasOwnProperty.call(u, 'createdat')) { u.createdAt = u.createdat; delete u.createdat; }
    return u;
  }

  async function seedDefaultAccounts() {
    const defaults = [
      { name: 'System Admin', email: 'admin@glbbank.com', password: 'admin123', role: 'admin', mobile: '0000000000' },
      { name: 'Bank Manager', email: 'manager@glbbank.com', password: 'manager123', role: 'manager', mobile: '1111111111' },
      { name: 'Bank Employee', email: 'employee@glbbank.com', password: 'employee123', role: 'employee', mobile: '2222222222' }
    ];
    const created = [];

    for (const item of defaults) {
      const existing = await findUserByEmail(item.email);
      if (existing) {
        created.push(existing);
        continue;
      }
      created.push(await createUser(item));
    }

    return created;
  }

  async function seedDefaultAdmin() {
    const accounts = await seedDefaultAccounts();
    return accounts[0];
  }

  module.exports = {
    createUser,
    findUserByEmail,
    findUserByIdentifier,
    findUserById,
    listUsers,
    updateUser,
    deleteUser,
    seedDefaultAccounts,
    seedDefaultAdmin
  };
}

