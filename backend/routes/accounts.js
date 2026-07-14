const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validate = require('../middleware/validate');
const { createAccount, listAccounts, findAccountByNumber, updateAccount, deleteAccountById } = require('../services/accountStore');
const router = express.Router();

router.post('/', auth, validate.validateAccountCreate, async (req, res) => {
  try {
    const { accountNumber, accountType, balance } = req.body;

    if (!accountNumber) {
      return res.status(400).json({ message: 'Account number is required' });
    }

    const existingAccount = await findAccountByNumber(accountNumber);
    if (existingAccount) {
      return res.status(400).json({ message: 'Account number already exists' });
    }

    const account = await createAccount({
      userId: req.user._id,
      accountNumber,
      accountType: accountType || 'savings',
      balance: Number(balance || 0)
    });

    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const canViewAll = ['admin', 'manager', 'employee'].includes(req.user.role);
    const accounts = canViewAll ? await listAccounts() : await listAccounts(req.user._id);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:accountNumber', auth, async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber;
    const account = await findAccountByNumber(accountNumber);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, validate.validateAccountCreate, async (req, res) => {
  try {
    const id = req.params.id;
    const accountList = await listAccounts();
    const existing = accountList.find(a => a._id === id);
    if (!existing) return res.status(404).json({ message: 'Account not found' });

    // Only admin or manager can modify account metadata
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Only allow changing accountType or status via this endpoint
    const updated = { ...existing };
    if (req.body.accountType) updated.accountType = req.body.accountType;
    if (req.body.status) updated.status = req.body.status;

    const saved = await updateAccount(updated);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const id = req.params.id;
    const ok = await deleteAccountById(id);
    if (!ok) return res.status(404).json({ message: 'Account not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
