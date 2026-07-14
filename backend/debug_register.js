const request = require('supertest');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
const app = require('./server');
(async () => {
  const res = await request(app).post('/api/auth/register').send({ name: 'Dbg Admin', email: 'dbg@example.com', password: 'pass123' });
  console.log('STATUS', res.status);
  console.log('BODY', res.body);
  process.exit(0);
})();