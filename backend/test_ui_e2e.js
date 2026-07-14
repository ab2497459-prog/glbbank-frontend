(async()=>{
  try {
    const base = 'http://127.0.0.1:5000';
    const creds = { email: 'tilakrajbhargava4@gmail.com', password: 'Admintilak12@' };
    const make = async (path, token, body) => {
      const hdr = { 'content-type': 'application/json' };
      if (token) hdr.authorization = 'Bearer ' + token;
      const res = await fetch(base + path, { method: 'POST', headers: hdr, body: JSON.stringify(body) });
      const txt = await res.text();
      let js = null; try { js = JSON.parse(txt); } catch(e) { js = txt; }
      return { status: res.status, body: js };
    };

    const get = async (path, token) => {
      const hdr = {}; if (token) hdr.authorization = 'Bearer ' + token;
      const res = await fetch(base + path, { method: 'GET', headers: hdr });
      const js = await res.json(); return { status: res.status, body: js };
    };

    console.log('Logging in...');
    const loginResp = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(creds) });
    const login = await loginResp.json();
    if (!login.token) throw new Error('Login failed');
    const token = login.token;
    console.log('Logged in as', login.user && login.user.email);

    const acctA = { accountNumber: '1000000101', accountType: 'savings', balance: 10 };
    const acctB = { accountNumber: '1000000102', accountType: 'savings', balance: 5 };

    console.log('Creating account A', acctA.accountNumber);
    const aRes = await make('/api/accounts', token, acctA);
    console.log('A create', aRes.status, aRes.body && aRes.body.message ? aRes.body.message : 'ok');
    console.log('Creating account B', acctB.accountNumber);
    const bRes = await make('/api/accounts', token, acctB);
    console.log('B create', bRes.status, bRes.body && bRes.body.message ? bRes.body.message : 'ok');

    // Deposit to A
    console.log('Depositing 100 to A');
    const dep = await make('/api/transactions/deposit', token, { accountNumber: acctA.accountNumber, amount: 100 });
    console.log('Deposit', dep.status, dep.body);

    // Transfer 30 from A to B
    console.log('Transferring 30 from A to B');
    const tr = await make('/api/transactions/transfer', token, { fromAccount: acctA.accountNumber, toAccount: acctB.accountNumber, amount: 30 });
    console.log('Transfer', tr.status, tr.body);

    // Fetch final balances
    const finalA = await get('/api/accounts/' + encodeURIComponent(acctA.accountNumber), token);
    const finalB = await get('/api/accounts/' + encodeURIComponent(acctB.accountNumber), token);
    console.log('Final A', finalA.status, finalA.body);
    console.log('Final B', finalB.status, finalB.body);

    const balA = Number(finalA.body.balance || 0);
    const balB = Number(finalB.body.balance || 0);
    console.log('Balances => A:', balA, 'B:', balB);
    if (balA >= 0) console.log('E2E flow completed.');

  } catch (e) {
    console.error('E2E test failed', e);
    process.exit(1);
  }
})();
