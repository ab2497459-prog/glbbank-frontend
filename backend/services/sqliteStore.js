const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'data', 'glbbank.sqlite');
let db;

function init() {
  if (db) return;
  const BetterSqlite3 = require('better-sqlite3');
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new BetterSqlite3(dbFile);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      _id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      mobile TEXT,
      studentId TEXT,
      facultyId TEXT,
      merchantId TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      _id TEXT PRIMARY KEY,
      userId TEXT,
      accountNumber TEXT UNIQUE,
      accountType TEXT,
      balance REAL,
      status TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      _id TEXT PRIMARY KEY,
      userId TEXT,
      fromAccount TEXT,
      toAccount TEXT,
      amount REAL,
      type TEXT,
      description TEXT,
      status TEXT,
      createdAt TEXT
    );
  `);

  // Import JSON data if present and tables empty
  const usersCount = db.prepare('SELECT COUNT(1) as c FROM users').get().c;
  const dataDir = path.join(__dirname, '..', 'data');
  if (usersCount === 0) {
    try {
      const usersFile = path.join(dataDir, 'users.json');
      if (fs.existsSync(usersFile)) {
        const raw = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const insert = db.prepare('INSERT OR IGNORE INTO users (_id,name,email,password,role,mobile,studentId,facultyId,merchantId,createdAt) VALUES (@_id,@name,@email,@password,@role,@mobile,@studentId,@facultyId,@merchantId,@createdAt)');
        const insertMany = db.transaction((items) => { for (const it of items) insert.run(it); });
        insertMany(raw);
      }
    } catch (err) { /* ignore */ }
  }

  const accCount = db.prepare('SELECT COUNT(1) as c FROM accounts').get().c;
  if (accCount === 0) {
    try {
      const accFile = path.join(dataDir, 'accounts.json');
      if (fs.existsSync(accFile)) {
        const raw = JSON.parse(fs.readFileSync(accFile, 'utf8'));
        const insert = db.prepare('INSERT OR IGNORE INTO accounts (_id,userId,accountNumber,accountType,balance,status,createdAt) VALUES (@_id,@userId,@accountNumber,@accountType,@balance,@status,@createdAt)');
        const insertMany = db.transaction((items) => { for (const it of items) insert.run(it); });
        insertMany(raw);
      }
    } catch (err) { /* ignore */ }
  }

  const txCount = db.prepare('SELECT COUNT(1) as c FROM transactions').get().c;
  if (txCount === 0) {
    try {
      const txFile = path.join(dataDir, 'transactions.json');
      if (fs.existsSync(txFile)) {
        const raw = JSON.parse(fs.readFileSync(txFile, 'utf8'));
        const insert = db.prepare('INSERT OR IGNORE INTO transactions (_id,userId,fromAccount,toAccount,amount,type,description,status,createdAt) VALUES (@_id,@userId,@fromAccount,@toAccount,@amount,@type,@description,@status,@createdAt)');
        const insertMany = db.transaction((items) => { for (const it of items) insert.run(it); });
        insertMany(raw);
      }
    } catch (err) { /* ignore */ }
  }
}

// Users
function createUser({ name, email, password, role = 'student', mobile = '', studentId = '', facultyId = '', merchantId = '' }) {
  init();
  const _id = Date.now().toString();
  const createdAt = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO users (_id,name,email,password,role,mobile,studentId,facultyId,merchantId,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)');
  stmt.run(_id, name, email, password, role, mobile, studentId, facultyId, merchantId, createdAt);
  return { _id, name, email, role, mobile, studentId, facultyId, merchantId, createdAt };
}

function findUserByEmail(email) {
  init();
  return db.prepare('SELECT * FROM users WHERE LOWER(email)=LOWER(?)').get(email) || null;
}

function findUserByIdentifier(identifier) {
  init();
  const normalized = String(identifier || '').trim().toLowerCase();
  return db.prepare(
    `SELECT * FROM users WHERE LOWER(email)=? OR LOWER(mobile)=? OR LOWER(studentId)=? OR LOWER(facultyId)=? OR LOWER(merchantId)=? OR LOWER(_id)=?`
  ).get(normalized, normalized, normalized, normalized, normalized, normalized) || null;
}

function findUserById(id) {
  init();
  return db.prepare('SELECT * FROM users WHERE _id=?').get(id) || null;
}

function listUsers() {
  init();
  return db.prepare('SELECT _id,name,email,role,mobile,studentId,facultyId,merchantId,createdAt FROM users').all();
}

function updateUser(id, updates) {
  init();
  const cols = [];
  const vals = [];
  for (const k of Object.keys(updates)) {
    if (['name','email','role','mobile','studentId','facultyId','merchantId','password'].includes(k)) {
      cols.push(`${k} = ?`);
      vals.push(updates[k]);
    }
  }
  if (cols.length === 0) return null;
  if (updates.password) {
    // hashed password should be provided by caller
  }
  vals.push(id);
  const sql = `UPDATE users SET ${cols.join(', ')} WHERE _id = ?`;
  db.prepare(sql).run(...vals);
  return findUserById(id);
}

function deleteUser(id) {
  init();
  const res = db.prepare('DELETE FROM users WHERE _id = ?').run(id);
  return res.changes > 0;
}

// Accounts
function createAccount({ userId, accountNumber, accountType, balance = 0, status = 'active' }) {
  init();
  const _id = Date.now().toString();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO accounts (_id,userId,accountNumber,accountType,balance,status,createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(_id, userId, accountNumber, accountType, Number(balance || 0), status, createdAt);
  return db.prepare('SELECT * FROM accounts WHERE _id = ?').get(_id);
}

function findAccountByNumber(accountNumber) {
  init();
  return db.prepare('SELECT * FROM accounts WHERE accountNumber = ?').get(accountNumber) || null;
}

function listAccounts(userId = null) {
  init();
  if (!userId) return db.prepare('SELECT * FROM accounts').all();
  return db.prepare('SELECT * FROM accounts WHERE userId = ?').all(userId);
}

function updateAccount(account) {
  init();
  const cols = [];
  const vals = [];
  for (const k of ['userId','accountNumber','accountType','balance','status']) {
    if (Object.prototype.hasOwnProperty.call(account, k)) {
      cols.push(`${k} = ?`);
      vals.push(account[k]);
    }
  }
  vals.push(account._id);
  const sql = `UPDATE accounts SET ${cols.join(', ')} WHERE _id = ?`;
  db.prepare(sql).run(...vals);
  return db.prepare('SELECT * FROM accounts WHERE _id = ?').get(account._id);
}

function deleteAccountById(id) {
  init();
  const res = db.prepare('DELETE FROM accounts WHERE _id = ?').run(id);
  return res.changes > 0;
}

// Transactions
function createTransaction(transaction) {
  init();
  const _id = Date.now().toString();
  const item = { _id, ...transaction, createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO transactions (_id,userId,fromAccount,toAccount,amount,type,description,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(item._id, item.userId, item.fromAccount, item.toAccount, item.amount, item.type, item.description, item.status, item.createdAt);
  return db.prepare('SELECT * FROM transactions WHERE _id = ?').get(_id);
}

function listTransactions(userId = null) {
  init();
  if (!userId) return db.prepare('SELECT * FROM transactions').all();
  return db.prepare('SELECT * FROM transactions WHERE userId = ?').all(userId);
}

module.exports = {
  createUser, findUserByEmail, findUserByIdentifier, findUserById, listUsers, updateUser, deleteUser,
  createAccount, findAccountByNumber, listAccounts, updateAccount, deleteAccountById,
  createTransaction, listTransactions
};
