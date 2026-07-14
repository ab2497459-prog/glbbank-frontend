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
    createTransaction: sqlite.createTransaction,
    listTransactions: sqlite.listTransactions
  };
} else {
  async function createTransaction(transaction) {
    const supabase = getSupabase();
    const _id = Date.now().toString();
    // map to snake_case column names for Supabase
    const insertObj = {
      _id,
      userid: transaction.userId,
      fromaccount: transaction.fromAccount,
      toaccount: transaction.toAccount,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      status: transaction.status,
      createdat: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('transactions')
      .insert([insertObj])
      .select()
      .single();

    if (error) {
      throw error;
    }
    const d = data;
    return {
      _id: d._id,
      userId: d.userid,
      fromAccount: d.fromaccount,
      toAccount: d.toaccount,
      amount: d.amount,
      type: d.type,
      description: d.description,
      status: d.status,
      createdAt: d.createdat
    };
  }

  async function listTransactions(userId = null) {
    const supabase = getSupabase();
    let query = supabase.from('transactions').select('*');
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
      userId: d.userid,
      fromAccount: d.fromaccount,
      toAccount: d.toaccount,
      amount: d.amount,
      type: d.type,
      description: d.description,
      status: d.status,
      createdAt: d.createdat
    }));
  }

  module.exports = {
    createTransaction,
    listTransactions
  };
}
