// Simple validation helpers to keep dependencies minimal
function bad(res, errors) {
  return res.status(400).json({ errors: Array.isArray(errors) ? errors : [errors] });
}

exports.validateRegister = (req, res, next) => {
  req.body = req.body || {};
  // sanitize/normalize
  if (req.body.name) req.body.name = String(req.body.name).trim();
  if (req.body.email) req.body.email = String(req.body.email).trim().toLowerCase();
  if (req.body.role) req.body.role = String(req.body.role).trim().toLowerCase();
  const { name, email, password } = req.body;
  const errors = [];
  if (!name || String(name).length < 2) errors.push('Name is required (min 2 chars)');
  if (!email || !/^\S+@\S+\.\S+$/.test(String(email))) errors.push('A valid email is required');
  if (!password || String(password).length < 6) errors.push('Password must be at least 6 characters');
  if (errors.length) return bad(res, errors);
  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) return bad(res, 'Email and password are required');
  next();
};

exports.validateAccountCreate = (req, res, next) => {
  req.body = req.body || {};
  if (req.body.accountNumber) req.body.accountNumber = String(req.body.accountNumber).trim();
  if (req.body.accountType) req.body.accountType = String(req.body.accountType).trim().toLowerCase();
  const { accountNumber, accountType, balance } = req.body;
  const errors = [];
  if (!accountNumber) errors.push('Account number is required');
  if (balance !== undefined && isNaN(Number(balance))) errors.push('Balance must be a number');
  if (errors.length) return bad(res, errors);
  next();
};

exports.validateTransfer = (req, res, next) => {
  req.body = req.body || {};
  if (req.body.fromAccount) req.body.fromAccount = String(req.body.fromAccount).trim();
  if (req.body.toAccount) req.body.toAccount = String(req.body.toAccount).trim();
  const { fromAccount, toAccount, amount } = req.body;
  const parsed = Number(amount);
  if (!fromAccount || !toAccount) return bad(res, 'From and To account numbers required');
  if (!parsed || parsed <= 0) return bad(res, 'Amount must be a positive number');
  next();
};

exports.validateDepositWithdraw = (req, res, next) => {
  req.body = req.body || {};
  if (req.body.accountNumber) req.body.accountNumber = String(req.body.accountNumber).trim();
  const { accountNumber, amount } = req.body || {};
  const parsed = Number(amount);
  if (!accountNumber) return bad(res, 'Account number is required');
  if (!parsed || parsed <= 0) return bad(res, 'Amount must be a positive number');
  next();
};

exports.validateUserUpdate = (req, res, next) => {
  req.body = req.body || {};
  // sanitize some fields
  if (req.body.name) req.body.name = String(req.body.name).trim();
  if (req.body.mobile) req.body.mobile = String(req.body.mobile).trim();
  if (req.body.role) req.body.role = String(req.body.role).trim().toLowerCase();
  const allowed = ['name','mobile','role','studentId','facultyId','merchantId'];
  const updates = Object.keys(req.body || {});
  const invalid = updates.filter(k => !allowed.includes(k));
  if (invalid.length) return bad(res, `Invalid update fields: ${invalid.join(', ')}`);
  next();
};

module.exports = exports;
