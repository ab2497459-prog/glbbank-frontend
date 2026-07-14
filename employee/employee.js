let currentActiveFetchedUser = null;

function triggerNativeSMSAlert(mobileNo, textBody) {
  window.location.href = `sms:${mobileNo}?body=${encodeURIComponent(textBody)}`;
}

function switchPanel(panelId) {
  document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tree-node').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(panelId); if (el) el.classList.add('active');
  if (panelId === 'open-account-panel') document.getElementById('node-open').classList.add('active');
  if (panelId === 'tx-terminal-panel') { document.getElementById('node-tx').classList.add('active'); resetTxTerminal(); }
  if (panelId === 'student-reg-panel') { document.getElementById('node-student').classList.add('active'); renderRegistry('student'); }
  if (panelId === 'faculty-reg-panel') { document.getElementById('node-faculty').classList.add('active'); renderRegistry('faculty'); }
  if (panelId === 'merchant-reg-panel') { document.getElementById('node-merchant').classList.add('active'); renderRegistry('merchant'); }
}

function toggleFormFields(type) { /* Preserve existing UI behavior - unchanged */
  const sId = document.getElementById('fldStudentId'), rNo = document.getElementById('fldRollNo'), crs = document.getElementById('fldCourse'), sec = document.getElementById('fldSection'), fId = document.getElementById('fldFacultyId'), shp = document.getElementById('fldShopType'), fName = document.getElementById('accFatherName'), gnd = document.getElementById('accGender'), divSId = document.getElementById('divStudentId'), divRNo = document.getElementById('divRollNo'), divCrs = document.getElementById('divCourse'), divSec = document.getElementById('divSection'), divFId = document.getElementById('divFacultyId'), divShp = document.getElementById('divShopType'), divFName = document.getElementById('divFatherName'), divGnd = document.getElementById('divGender');
  [sId, rNo, crs, sec, fId, shp, fName, gnd].forEach(el => { if (el) el.required = false; });
  [divSId, divRNo, divCrs, divSec, divFId, divShp, divFName, divGnd].forEach(el => { if (el) el.style.display = 'none'; });
  if (type === 'student') { [divSId, divRNo, divCrs, divSec, divFName, divGnd].forEach(el => { if (el) el.style.display='flex'; }); if (sId) sId.required=true; if (rNo) rNo.required=true; if (sec) sec.required=true; }
  else if (type === 'faculty') { [divFId, divGnd].forEach(el => { if (el) el.style.display='flex'; }); if (fId) fId.required = true; }
  else if (type === 'merchant') { [divShp, divFName].forEach(el => { if (el) el.style.display='flex'; }); }
}

// Account opening: POST to backend only. No localStorage fallback.
document.getElementById('accountOpeningForm').addEventListener('submit', function(e) {
  e.preventDefault();
  (async () => {
    const type = document.getElementById('accountTypeSelect').value;
    const inputPan = document.getElementById('accPan').value.trim().toUpperCase();
    const initialDeposit = parseFloat(document.getElementById('accDeposit').value) || 0;
    const generatedAccountNo = String(30000000000 + Math.floor(10000000 + Math.random() * 89999999));
    const payload = { name: document.getElementById('accName').value.trim(), email: document.getElementById('accEmail').value.trim(), password: document.getElementById('accPassword').value, role: type, mobile: document.getElementById('accMobile').value.trim(), studentId: document.getElementById('fldStudentId') ? document.getElementById('fldStudentId').value.trim() : '', facultyId: document.getElementById('fldFacultyId') ? document.getElementById('fldFacultyId').value.trim() : '', merchantId: generatedAccountNo };
    try {
      const reg = await GLBBANK_API.postJSON('/auth/register', payload);
      if (!reg.ok) throw reg.error || new Error(reg.message || 'Registration failed');
      const data = reg.data;
      if (data.token) localStorage.setItem('glbbank_authToken', data.token);
      if (data.user) localStorage.setItem('glbbank_loggedInUser', JSON.stringify(data.user));
      // create account record on backend
      const acctRes = await GLBBANK_API.postJSON('/accounts', { accountNumber: generatedAccountNo, accountType: type, balance: initialDeposit });
      if (acctRes.ok) {
        triggerNativeSMSAlert(payload.mobile, `GLBBANK Welcome! Account ${generatedAccountNo} created.`);
        alert(`${type.toUpperCase()} account opened and registered on backend.`);
        document.getElementById('accountOpeningForm').reset(); document.getElementById('accDeposit').value='0'; toggleFormFields(type);
        return;
      }
      throw new Error('Account creation failed');
    } catch (err) {
      console.warn('Backend register/account creation failed:', err.message);
      alert('Registration failed. Offline/local fallback is disabled.');
    }
  })();
});

// Fetch account holder via backend users list and match by id or mobile
async function fetchAccountHolder() {
  const lookup = document.getElementById('txLookupKey').value.trim();
  if (!lookup) { alert('Please input a search query mobile or account number.'); return; }
  currentActiveFetchedUser = null;
  try {
    // First try to find a user record by identifier (email/mobile/id)
    const usersRes = await GLBBANK_API.getJSON('/users');
    let match = null;
    if (usersRes.ok && Array.isArray(usersRes.data)) {
      match = usersRes.data.find(u => u._id === lookup || u.id === lookup || u.mobile === lookup);
    }
    // If not found by user, try to find an account by account number and derive the user
    if (!match && /^\d+$/.test(lookup)) {
      try {
        const acctRes = await GLBBANK_API.getJSON(`/accounts/${encodeURIComponent(lookup)}`);
        if (acctRes.ok && acctRes.data) {
          // fetch user record for this account's userid
          const ownerId = acctRes.data.userId || acctRes.data.userid || acctRes.data.user_id;
          if (ownerId) {
            const ownerRes = await GLBBANK_API.getJSON(`/users`);
            if (ownerRes.ok && Array.isArray(ownerRes.data)) {
              match = ownerRes.data.find(u => u._id === ownerId || u.id === ownerId);
            }
          }
        }
      } catch (err) { /* ignore */ }
    }
    if (match) currentActiveFetchedUser = { ...match, segmentType: match.role || 'student' };
  } catch (err) { console.warn('Backend user lookup failed:', err.message); }
  if (!currentActiveFetchedUser) { alert('Account record details not located.'); resetTxTerminal(); return; }
  document.getElementById('lblHolderName').innerText = currentActiveFetchedUser.name;
  document.getElementById('lblHolderAccountNo').innerText = currentActiveFetchedUser._id || currentActiveFetchedUser.id;
  document.getElementById('lblHolderSegment').innerText = (currentActiveFetchedUser.segmentType || '').toUpperCase();
  document.getElementById('lblHolderMobile').innerText = currentActiveFetchedUser.mobile || '';
  // fetch account and transactions for this user
  let account = null;
  try {
    const accountsRes = await GLBBANK_API.getJSON('/accounts');
    if (accountsRes.ok && Array.isArray(accountsRes.data)) {
      account = accountsRes.data.find(a => (a.userId||a.userid||a.user_id) === (currentActiveFetchedUser._id||currentActiveFetchedUser.id));
    }
    // if lookup was numeric, prefer matching account number
    const lookupVal = document.getElementById('txLookupKey').value.trim();
    if (!account && /^\d+$/.test(lookupVal)) {
      const acctRes = await GLBBANK_API.getJSON(`/accounts/${encodeURIComponent(lookupVal)}`);
      if (acctRes.ok && acctRes.data) account = acctRes.data;
    }
  } catch (err) { console.warn('Account fetch failed:', err.message); }

  // balance from account if present
  document.getElementById('lblHolderBalance').innerText = parseFloat(account ? (account.balance || 0) : (currentActiveFetchedUser.balance || 0)).toFixed(2);
  document.getElementById('txHolderDetailsCard').style.display='block'; document.getElementById('cashTransactionForm').style.display='grid'; document.getElementById('txHistoryContainer').style.display='block';

  // fetch transactions for this account/user
  let history = [];
  try {
    const txRes = await GLBBANK_API.getJSON('/transactions');
    if (txRes.ok && Array.isArray(txRes.data)) {
      const acctNo = account ? account.accountNumber : (currentActiveFetchedUser._id || currentActiveFetchedUser.id);
      history = txRes.data.filter(t => String(t.toAccount || t.toaccount || t.toaccount) === String(acctNo) || String(t.fromAccount || t.fromaccount) === String(acctNo) || String(t.userId||t.userid) === String(currentActiveFetchedUser._id||currentActiveFetchedUser.id));
    }
  } catch (err) { console.warn('Transaction fetch failed:', err.message); }

  renderTxHistoryTable(history || []);
}

function renderTxHistoryTable(history) {
  const tbody = document.getElementById('txHistoryTableBody'); if (!tbody) return; tbody.innerHTML='';
  if (!history || history.length===0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No operations found in historical ledger tables.</td></tr>`; return; }
  [...history].reverse().forEach(tx => {
    const ttype = (tx.type || tx.Type || '').toString();
    const isPositive = /deposit|initial|received/i.test(ttype);
    const amtColor = isPositive ? '#2e7d32' : '#c62828';
    const amtPrefix = isPositive ? '+' : '-';
    const when = tx.createdAt || tx.createdat || tx.timestamp || '';
    const ref = tx._id || tx.id || '';
    const amount = Number(tx.amount || 0);
    tbody.innerHTML += `<tr><td>${when}</td><td><code>${ref}</code></td><td><strong>${ttype}</strong></td><td style="color:${amtColor}; font-weight:bold;">${amtPrefix} ₹${amount.toFixed(2)}</td><td>-</td></tr>`;
  });
}

// Cash transaction handler: backend-only
document.getElementById('cashTransactionForm').addEventListener('submit', async function(e) {
  e.preventDefault(); if (!currentActiveFetchedUser) return;
  if (currentActiveFetchedUser.status !== 'Active') { alert('Operation Aborted! This account is BLOCKED.'); return; }
  const type = document.getElementById('txActionType').value; const amount = parseFloat(document.getElementById('txAmount').value);
  if (isNaN(amount) || amount <= 0) { alert('Please input valid amounts.'); return; }
  const accountNumber = currentActiveFetchedUser._id || currentActiveFetchedUser.id;
  try {
    const path = type === 'Deposit' ? '/transactions/deposit' : '/transactions/withdraw';
    const res = await GLBBANK_API.postJSON(path, { accountNumber, amount });
    if (res.ok) {
      alert('Cash Ledger operation posted successfully (backend).');
      if (res.data && res.data.account) { currentActiveFetchedUser.balance = res.data.account.balance; if (res.data.transaction) currentActiveFetchedUser.history = currentActiveFetchedUser.history||[], currentActiveFetchedUser.history.push(res.data.transaction); }
      document.getElementById('txAmount').value=''; renderTxHistoryTable(currentActiveFetchedUser.history); document.getElementById('lblHolderBalance').innerText = parseFloat(currentActiveFetchedUser.balance||0).toFixed(2);
      triggerNativeSMSAlert(currentActiveFetchedUser.mobile, `GLBBANK Transaction Alert! Acc No: ${accountNumber} Amount: ₹${amount.toFixed(2)} Ref: ${res.data.transaction ? res.data.transaction.refId : 'N/A'}`);
      return;
    }
  } catch (err) { console.warn('Backend transaction failed:', err.message); }
  alert('Transaction failed. Offline/local fallback disabled.');
});

function resetTxTerminal() { document.getElementById('txLookupKey').value=''; document.getElementById('txHolderDetailsCard').style.display='none'; document.getElementById('cashTransactionForm').style.display='none'; document.getElementById('txHistoryContainer').style.display='none'; currentActiveFetchedUser = null; }

// Registry rendering: fetch users by role from backend
async function renderRegistry(type) {
  const tbody = document.getElementById(`${type}TableBody`);
  const searchVal = (document.getElementById(`search${type.charAt(0).toUpperCase()+type.slice(1)}`)?.value || '').toLowerCase();
  tbody.innerHTML = '';
  try {
    const res = await GLBBANK_API.getJSON(`/users?role=${encodeURIComponent(type)}`);
    const data = (res.ok && Array.isArray(res.data)) ? res.data : [];
    const filtered = data.filter(item => item.name.toLowerCase().includes(searchVal) || ((item.studentId||item.facultyId||item.id||'') + '').toLowerCase().includes(searchVal));
    if (filtered.length===0) { tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;">No enrolled ${type} accounts registered yet.</td></tr>`; return; }
    filtered.forEach(item => {
      let specializedCells = '';
      if (type==='student') specializedCells = `<td><strong>${item._id||item.id}</strong></td><td contenteditable="false" data-field="name">${item.name}</td><td contenteditable="false" data-field="fatherName">${item.fatherName||''}</td><td contenteditable="false" data-field="mobile">${item.mobile||''}</td><td contenteditable="false" data-field="email">${item.email||''}</td><td contenteditable="false" data-field="studentId">${item.studentId||''}</td><td contenteditable="false" data-field="rollNo">${item.rollNo||''}</td><td contenteditable="false" data-field="course">${item.course||''}</td><td contenteditable="false" data-field="section">${item.section||''}</td><td>[Omitted]</td><td contenteditable="false" data-field="pan">${item.pan||''}</td>`;
      else if (type==='faculty') specializedCells = `<td><strong>${item._id||item.id}</strong></td><td contenteditable="false" data-field="name">${item.name}</td><td contenteditable="false" data-field="facultyId">${item.facultyId||''}</td><td contenteditable="false" data-field="mobile">${item.mobile||''}</td><td contenteditable="false" data-field="email">${item.email||''}</td><td contenteditable="false" data-field="gender">${item.gender||''}</td><td>[Omitted]</td><td contenteditable="false" data-field="pan">${item.pan||''}</td>`;
      else specializedCells = `<td><strong>${item._id||item.id}</strong></td><td contenteditable="false" data-field="name">${item.name}</td><td contenteditable="false" data-field="fatherName">${item.fatherName||''}</td><td contenteditable="false" data-field="mobile">${item.mobile||''}</td><td contenteditable="false" data-field="email">${item.email||''}</td><td contenteditable="false" data-field="shopType">${item.shopType||''}</td><td>[Omitted]</td><td contenteditable="false" data-field="pan">${item.pan||''}</td>`;
      const statusClass = (item.status==='Active') ? 'status-active' : 'status-blocked';
      const toggleStatusText = (item.status==='Active') ? 'Block' : 'Unblock';
      tbody.innerHTML += `<tr id="row-${item._id||item.id}">${specializedCells}<td><span class="${statusClass}">${item.status||'Active'}</span></td><td><button class="btn-action-edit" style="padding:4px 8px;" onclick="toggleInlineEdit('${type}','${item._id||item.id}', this)">Inline Edit</button><button class="btn-action btn-status" onclick="toggleAccountLock('${type}','${item._id||item.id}')">${toggleStatusText}</button><button class="btn-delete" style="padding:4px 8px;" onclick="purgeAccount('${type}','${item._id||item.id}')">Delete</button></td></tr>`;
    });
  } catch (err) { console.warn('Registry fetch failed:', err.message); tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;">Unable to load registry.</td></tr>`; }
}

async function toggleInlineEdit(type, id, btnEl) {
  const row = document.getElementById(`row-${id}`);
  const cells = row.querySelectorAll('td[contenteditable]');
  if (btnEl.innerText === 'Inline Edit') { cells.forEach(c => c.setAttribute('contenteditable','true')); btnEl.innerText='Save'; btnEl.style.backgroundColor='#2e7d32'; return; }
  cells.forEach(c => c.setAttribute('contenteditable','false')); btnEl.innerText='Inline Edit'; btnEl.style.backgroundColor='var(--sbi-accent)';
  let updates = {};
  const allowed = ['name','mobile','role','studentId','facultyId','merchantId'];
  const unsupported = [];
  cells.forEach(cell => {
    const field = cell.getAttribute('data-field');
    const newValue = cell.innerText.trim();
    if (!field) return;
    if (allowed.includes(field)) updates[field] = newValue;
    else unsupported.push(field);
  });
  if (unsupported.length) {
    alert('Note: The following fields cannot be updated inline and will be ignored: ' + unsupported.join(', '));
  }
  if (Object.keys(updates).length === 0) { alert('No supported fields changed.'); return; }
  try {
    const res = await GLBBANK_API.putJSON(`/users/${encodeURIComponent(id)}`, updates);
    if (res.ok) alert('Data state changes updated.'); else alert('Update failed: ' + (res.message || 'Unknown'));
  } catch (err) { console.warn('Update failed:', err.message); alert('Update failed.'); }
}

function toggleAccountLock(type, id) { alert('Account lock/unlock should be done via Accounts panel (backend).'); }

async function purgeAccount(type, id) {
  if (!confirm('Permanently purge this profile from the bank record directories?')) return;
  try { const res = await GLBBANK_API.deleteJSON(`/users/${encodeURIComponent(id)}`); if (res.ok) { renderRegistry(type); } else { alert('Delete failed.'); } } catch (err) { console.warn('Delete failed:', err.message); alert('Delete failed.'); }
}

function clearEmployeeSession() { localStorage.removeItem('glbbank_authToken'); localStorage.removeItem('glbbank_loggedInUser'); localStorage.removeItem('glbbank_loggedInUserMobile'); }
function triggerLogout() { if (confirm('Are you sure you want to terminate this session?')) { clearEmployeeSession(); window.location.href = '../landing-page/index.html'; } }

async function initializeEmployeeWorkspace() {
  const token = localStorage.getItem('glbbank_authToken');
  const storedUser = localStorage.getItem('glbbank_loggedInUser');
  if (!token && !storedUser) { alert('Please login before using the employee workspace.'); window.location.href = '../landing-page/index.html'; return; }
  let user = null;
  if (token) {
    try { const res = await GLBBANK_API.getJSON('/profile'); if (res.ok && res.data) { user = res.data; localStorage.setItem('glbbank_loggedInUser', JSON.stringify(user)); } } catch (err) { console.warn('Employee session verification failed:', err.message); }
  }
  if (!user && storedUser) { try { user = JSON.parse(storedUser); } catch (err) { user = null; } }
  if (!user || !['employee','manager','admin'].includes(user.role)) { alert('Unauthorized access or invalid session. Please login again.'); clearEmployeeSession(); window.location.href = '../landing-page/index.html'; return; }
  toggleFormFields('student');
}

window.onload = initializeEmployeeWorkspace;
