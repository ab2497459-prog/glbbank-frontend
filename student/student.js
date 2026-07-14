const activeSessionStudentMobile = localStorage.getItem('glbbank_loggedInUserMobile') || '';
let currentStudentAccount = null;
let verifiedReceiver = null;
let transactionHistory = [];

function switchSection(sectionId) {
  document.querySelectorAll('.workspace-card').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.navi-menu-btn').forEach(b => b.classList.remove('active'));
  const s = document.getElementById(sectionId); if (s) s.classList.add('active');
}

function terminateSession() {
  if (confirm('Confirm logout?')) {
    localStorage.removeItem('glbbank_authToken');
    localStorage.removeItem('glbbank_loggedInUser');
    localStorage.removeItem('glbbank_loggedInUserMobile');
    window.location.href = '../landing-page/index.html';
  }
}

async function initializeStudentWorkspace() {
  if (!activeSessionStudentMobile) return window.location.href = '../landing-page/index.html';
  const profile = await fetchStudentProfile();
  if (!profile) return;
  bindStudentProfile(profile);
  await fetchStudentAccount();
  await fetchStudentTransactions();
  renderStudentHistory();
}

async function fetchStudentProfile() {
  try {
    const res = await window.GLBBANK_API.getJSON('/profile');
    if (res.ok && res.data && res.data.role === 'student') {
      localStorage.setItem('glbbank_loggedInUser', JSON.stringify(res.data));
      return res.data;
    }
  } catch (err) {
    console.warn('Profile fetch failed:', err.message);
  }
  alert('Cannot fetch profile — backend required. Please login again.');
  terminateSession();
  return null;
}

function bindStudentProfile(student) {
  if (!student) return;
  document.getElementById('profAccountNo').innerText = student.studentId || student._id || '-';
  document.getElementById('profName').innerText = student.name || '-';
  document.getElementById('profMobile').innerText = student.mobile || '-';
  document.getElementById('profEmail').innerText = student.email || '-';
}

async function fetchStudentAccount() {
  try {
    const res = await window.GLBBANK_API.getJSON('/accounts');
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      currentStudentAccount = res.data[0].accountNumber;
    }
  } catch (err) {
    console.warn('Account fetch failed:', err.message);
  }
}

async function fetchStudentTransactions() {
  try {
    const res = await window.GLBBANK_API.getJSON('/transactions');
    if (res.ok && Array.isArray(res.data)) transactionHistory = res.data;
  } catch (err) {
    console.warn('Transaction fetch failed:', err.message);
  }
}

async function lookupReceiverProfile() {
  const key = document.getElementById('txtReceiverInput').value.trim();
  if (!key) return alert('Enter receiver account or mobile.');
  verifiedReceiver = null;
  if (/^\d+$/.test(key)) {
    try {
      const res = await window.GLBBANK_API.getJSON(`/accounts/${encodeURIComponent(key)}`);
      if (res.ok && res.data) verifiedReceiver = { accountNumber: res.data.accountNumber, displayName: `Account ${res.data.accountNumber}` };
    } catch (err) { console.warn('Account lookup failed:', err.message); }
  }
  if (!verifiedReceiver) alert('Receiver could not be located. Backend lookup required.');
}

async function initiatePaymentSequence() {
  const amount = parseFloat(document.getElementById('numTransferAmount').value);
  if (!verifiedReceiver) return alert('Verify recipient first.');
  if (isNaN(amount) || amount <= 0) return alert('Enter a valid amount.');
  if (!currentStudentAccount) return alert('Your account not resolved.');
  try {
    const res = await window.GLBBANK_API.postJSON('/transactions/transfer', { fromAccount: currentStudentAccount, toAccount: verifiedReceiver.accountNumber, amount });
    if (res.ok) {
      alert('Transfer successful.');
      document.getElementById('txtReceiverInput').value = '';
      document.getElementById('numTransferAmount').value = '';
      await fetchStudentTransactions(); renderStudentHistory();
      return;
    }
  } catch (err) { console.warn('Backend transfer failed:', err.message); }
  alert('Transfer failed. Offline/local transfers are disabled.');
}

function renderStudentHistory() {
  const tbody = document.getElementById('tblStudentHistoryBody'); if (!tbody) return;
  tbody.innerHTML = '';
  const history = Array.isArray(transactionHistory) ? transactionHistory : [];
  if (history.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#666;">No transaction history available.</td></tr>'; return; }
  history.slice().reverse().forEach(tx => {
    const amount = parseFloat(tx.amount||0).toFixed(2);
    const post = parseFloat(tx.postBalance||0).toFixed(2);
    const isCredit = String(tx.type||'').toLowerCase().includes('received');
    tbody.innerHTML += `<tr><td>${tx.timestamp||'-'}</td><td><code>${tx.refId||'-'}</code></td><td>${tx.type||'-'}</td><td style="color:${isCredit?'#2e7d32':'#c62828'};">${isCredit?'+':'-'} ₹${amount}</td><td>₹${post}</td></tr>`;
  });
}

function processAvatarUpdate(event) { alert('Avatar updates require backend support.'); }
function commitUpiPinConfig() { alert('UPI PIN configuration requires backend support.'); }
function executeBalanceCheck() { alert('Balance inquiry requires backend support.'); }
function commitPasswordReset() { alert('Password reset requires backend support.'); }

window.addEventListener('DOMContentLoaded', initializeStudentWorkspace);
