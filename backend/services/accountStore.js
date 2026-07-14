const USE_SQLITE = String(process.env.USE_SQLITE || '').toLowerCase() === 'true';
let sqlite = null;
let sqliteLoaded = false;
if (USE_SQLITE) {
  try {
    sqlite = require('./sqliteStore');
    sqliteLoaded = !!sqlite;
  } catch (err) {
    console.warn('SQLite requested but not available, falling back to Supabase:', err.message);
  }
}

function getSupabase() {
  if (!global.supabase) {
    throw new Error('Supabase client is not initialized');
  }
  return global.supabase;
}

if (sqliteLoaded) {
  module.exports = {
    createAccount: sqlite.createAccount,
    findAccountByNumber: sqlite.findAccountByNumber,
    listAccounts: sqlite.listAccounts,
    updateAccount: sqlite.updateAccount,
    deleteAccountById: sqlite.deleteAccountById
  };
} else {
  async function createAccount({ userId, accountNumber, accountType, balance = 0, status = 'active' }) {
    const supabase = getSupabase();
    const _id = Date.now().toString();
    // map to snake_case column names used in Supabase
    const insertRecord = {
      _id,
      userid: userId,
      accountnumber: String(accountNumber).trim(),
      accounttype: accountType,
      balance: Number(balance || 0),
      status,
      createdat: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('accounts')
      .insert([insertRecord])
      .select()
      .single();

    if (error) {
      throw error;
    }
    // map back to camelCase for API
    return data && {
      _id: data._id,
      userId: data.userid || data.user_id,
      accountNumber: data.accountnumber,
      accountType: data.accounttype,
      balance: data.balance,
      status: data.status,
      createdAt: data.createdat
    };
  }

  async function findAccountByNumber(accountNumber) {
    if (!accountNumber) return null;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('accountnumber', String(accountNumber).trim())
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) return null;
    return {
      _id: data._id,
      userId: data.userid || data.user_id,
      accountNumber: data.accountnumber,
      accountType: data.accounttype,
      balance: data.balance,
      status: data.status,
      createdAt: data.createdat
    };
  }

  async function listAccounts(userId = null) {
    const supabase = getSupabase();
    let query = supabase.from('accounts').select('*');
    if (userId) {
      query = query.eq('userid', String(userId));
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const rows = data || [];
    return rows.map(d => ({
      _id: d._id,
      userId: d.userid || d.user_id,
      accountNumber: d.accountnumber,
      accountType: d.accounttype,
      balance: d.balance,
      status: d.status,
      createdAt: d.createdat
    }));
  }

  async function updateAccount(account) {
    if (!account || !account._id) return null;
    const supabase = getSupabase();
    const updates = {};
    if (account.accountType) updates.accounttype = account.accountType;
    if (account.status) updates.status = account.status;
    if (Object.prototype.hasOwnProperty.call(account, 'balance')) updates.balance = Number(account.balance || 0);

    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('_id', String(account._id))
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    const d = data;
    return {
      _id: d._id,
      userId: d.userid || d.user_id,
      accountNumber: d.accountnumber,
      accountType: d.accounttype,
      balance: d.balance,
      status: d.status,
      createdAt: d.createdat
    };
  }

  async function deleteAccountById(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('accounts')
      .delete()
      .eq('_id', String(id))
      .select('_id');

    if (error) {
      throw error;
    }
    return Array.isArray(data) ? data.length > 0 : !!data;
  }

  module.exports = {
    createAccount,
    findAccountByNumber,
    listAccounts,
    updateAccount,
    deleteAccountById
  };
}
