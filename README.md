GLBBANK - Local Fullstack (Developer) README

This workspace contains a static frontend and a small Express backend using JSON file persistence for local development.

Quick start

1. Start the backend (from the `backend` folder):

```powershell
Set-Location .\backend
node server.js
```

The server listens on port `5000` by default and seeds default admin/manager/employee accounts on first run.

2. Serve the frontend (from project root):

```powershell
npx http-server . -p 8080
```

Then open: http://127.0.0.1:8080/landing-page/index.html

Default seeded admin credentials

- email: admin@glbbank.com
- password: admin123

API

Base URL: http://127.0.0.1:5000/api

Important endpoints (examples)

- POST /auth/login — body { email, password } → returns token
- POST /auth/register — register user
- GET /users?role=student|employee|faculty|merchant — list users
- PUT /users/:id — update user (admin/manager)
- DELETE /users/:id — delete user (admin/manager)
- POST /accounts — create account (auth required)
- GET /accounts — list accounts (auth required)
- PUT /accounts/:id — update account metadata (admin/manager)
- DELETE /accounts/:id — delete account (admin only)
- POST /transactions/deposit|withdraw|transfer — create transactions

Sample curl (login + create user)

```bash
# login
curl -s -X POST http://127.0.0.1:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@glbbank.com","password":"admin123"}'

# create a user (include Authorization: Bearer <token>)
curl -s -X POST http://127.0.0.1:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@example.test","password":"pass1234","role":"student"}'
```

Notes

- The frontend prefers backend-first calls and falls back to localStorage if the backend is unreachable. The shared helper `shared/api.js` normalizes backend `_id` to `id` so UI code can use `id` consistently.
- Data is persisted in `backend/data/*.json` (users, accounts, transactions).
- This setup is intended for local development and demonstration only.

If you want, I can:

- Add a short `Makefile` or `package.json` scripts to start both frontend and backend with a single command.
- Commit changes into a branch and create a patch/PR.
- Add Playwright UI tests that exercise the main login and manager flows.

---