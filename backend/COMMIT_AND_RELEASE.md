Release & Commit Instructions

Summary of changes made in this work:
- Updated backend services to map Supabase snake_case ↔ API camelCase (`accountStore.js`, `transactionStore.js`, `userStore.js`).
- Patched `employee/employee.js` to fetch account + transactions and tightened inline-edit updates to allowed fields.
- Added API smoke tests: `test_api.js` and `test_ui_e2e.js`.
- Added a small mapping scanner: `tools/check_mappings.js`.
- Added a Puppeteer UI test: `ui_e2e/puppeteer_login_test.js` and updated `package.json` devDeps.

How to create the release branch and commit locally (run from repository root):

```bash
git checkout -b backend-integration-fix
git add backend/test_ui_e2e.js backend/test_api.js backend/tools/check_mappings.js backend/ui_e2e/puppeteer_login_test.js backend/package.json backend/COMMIT_AND_RELEASE.md employee/employee.js
git commit -m "Backend/frontend integration: mapping fixes, employee inline-edit, E2E tests, puppeteer test"
git push -u origin backend-integration-fix
```

If you prefer a single commit of all changed files, replace the `git add` list with `git add -A`.

Notes:
- I couldn't run `git` here (not available in this environment) — please run the commands above locally to create the branch and push.
- Verify tests locally after installing dependencies: `cd backend && npm install` then run `node test_ui_e2e.js` and `node ui_e2e/puppeteer_login_test.js` (Puppeteer will download a Chromium binary).
