process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

const dataDir = path.join(__dirname, '..', 'data');
const usersFile = path.join(dataDir, 'users.json');
const accountsFile = path.join(dataDir, 'accounts.json');
const transactionsFile = path.join(dataDir, 'transactions.json');

function cleanData() {
  try { if (fs.existsSync(usersFile)) fs.unlinkSync(usersFile); } catch (e) {}
  try { if (fs.existsSync(accountsFile)) fs.unlinkSync(accountsFile); } catch (e) {}
  try { if (fs.existsSync(transactionsFile)) fs.unlinkSync(transactionsFile); } catch (e) {}
}

beforeAll(() => {
  cleanData();
});

afterAll(() => {
  cleanData();
});

describe('Basic API flows', () => {
  let token;
  const uniqueSeed = Date.now().toString().slice(-6);
  const adminEmail = `tadmin+${uniqueSeed}@example.com`;
  const adminMobile = `9000${uniqueSeed}`;

  test('Register admin user and login', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Test Admin', email: adminEmail, password: 'adminpass', role: 'admin', mobile: adminMobile });
    expect([200,201]).toContain(reg.status);

    const login = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'adminpass' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
    expect(login.body.user.role).toBe('admin');
    token = login.body.token;

    const loginByMobile = await request(app).post('/api/auth/login').send({ email: adminMobile, password: 'adminpass' });
    expect(loginByMobile.status).toBe(200);
    expect(loginByMobile.body.user.role).toBe('admin');
  });

  test('Create account with auth', async () => {
    const accountNumber = `ACCT${Date.now().toString().slice(-7)}`;
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountNumber, accountType: 'savings', balance: 1000 });
    expect([200,201]).toContain(res.status);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.accountNumber).toBe(accountNumber);
  });

  test('List accounts', async () => {
    const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find(a => a.accountNumber === 'ACCT1001')).toBeTruthy();
  });
});
