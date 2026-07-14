(async()=>{
  try {
    const base = 'http://127.0.0.1:5000';
    const creds = { email: 'tilakrajbhargava4@gmail.com', password: 'Admintilak12@' };
    const loginResp = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(creds) });
    const login = await loginResp.json();
    console.log('LOGIN', login);
    const token = login.token;
    const hdr = { 'content-type': 'application/json', 'authorization': 'Bearer ' + token };
    const create = { accountNumber: '1000000004', accountType: 'savings', balance: 5 };
    const resp = await fetch(base + '/api/accounts', { method: 'POST', headers: hdr, body: JSON.stringify(create) });
    const text = await resp.text();
    console.log('STATUS', resp.status);
    try { console.log('BODY', JSON.parse(text)); } catch (e) { console.log('BODY RAW', text); }
      // Deposit
      const dep = { accountNumber: create.accountNumber, amount: 25 };
      const depResp = await fetch(base + '/api/transactions/deposit', { method: 'POST', headers: hdr, body: JSON.stringify(dep) });
      const depText = await depResp.text();
      console.log('DEPOSIT STATUS', depResp.status);
      try { console.log('DEPOSIT BODY', JSON.parse(depText)); } catch (e) { console.log('DEPOSIT BODY RAW', depText); }
      const finalResp = await fetch(base + '/api/accounts/' + create.accountNumber, { method: 'GET', headers: hdr });
      console.log('FINAL STATUS', finalResp.status, 'FINAL BODY', await finalResp.json());
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
