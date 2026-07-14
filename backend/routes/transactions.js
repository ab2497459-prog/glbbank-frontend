const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { findAccountByNumber, updateAccount } = require('../services/accountStore');
const { createTransaction, listTransactions } = require('../services/transactionStore');
const router = express.Router();

router.post('/transfer', auth, validate.validateTransfer, async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, description } = req.body;
    const parsedAmount = Number(amount);

    if (!fromAccount || !toAccount || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Valid transfer details are required' });
    }

    const senderAccount = await findAccountByNumber(fromAccount);
    const receiverAccount = await findAccountByNumber(toAccount);

    if (!senderAccount || !receiverAccount) {
      return res.status(400).json({ message: 'One or both accounts were not found' });
    }

    if (senderAccount.balance < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    senderAccount.balance -= parsedAmount;
    receiverAccount.balance += parsedAmount;

    await updateAccount(senderAccount);
    await updateAccount(receiverAccount);

    const transaction = await createTransaction({
      userId: req.user._id,
      fromAccount,
      toAccount,
      amount: parsedAmount,
      type: 'transfer',
      description: description || 'Transfer',
      status: 'completed'
    });

    res.status(201).json({ transaction, senderAccount, receiverAccount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/deposit', auth, validate.validateDepositWithdraw, async (req, res) => {
  try {
    const { accountNumber, amount, description } = req.body;
    const parsedAmount = Number(amount);

    if (!accountNumber || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Valid deposit details are required' });
    }

    const account = await findAccountByNumber(accountNumber);
    if (!account) {
      return res.status(400).json({ message: 'Account not found' });
    }

    account.balance += parsedAmount;
    await updateAccount(account);

    const transaction = await createTransaction({
      userId: req.user._id,
      fromAccount: 'SYSTEM',
      toAccount: accountNumber,
      amount: parsedAmount,
      type: 'deposit',
      description: description || 'Deposit',
      status: 'completed'
    });

    res.status(201).json({ transaction, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/withdraw', auth, validate.validateDepositWithdraw, async (req, res) => {
  try {
    const { accountNumber, amount, description } = req.body;
    const parsedAmount = Number(amount);

    if (!accountNumber || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Valid withdrawal details are required' });
    }

    const account = await findAccountByNumber(accountNumber);
    if (!account) {
      return res.status(400).json({ message: 'Account not found' });
    }

    if (account.balance < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    account.balance -= parsedAmount;
    await updateAccount(account);

    const transaction = await createTransaction({
      userId: req.user._id,
      fromAccount: accountNumber,
      toAccount: 'SYSTEM',
      amount: parsedAmount,
      type: 'withdraw',
      description: description || 'Withdrawal',
      status: 'completed'
    });

    res.status(201).json({ transaction, account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const transactions = req.user.role === 'admin' ? await listTransactions() : await listTransactions(req.user._id);
    res.json(transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
