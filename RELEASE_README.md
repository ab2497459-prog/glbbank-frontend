**Release Instructions**
- **Purpose**: Commit and push the integration fixes and E2E tests added to the repo.
- **Prerequisites**: Git installed and configured locally; you have push access to the repo's origin.

- **Commands** (run from project root):

```powershell
# create branch, commit and push (script provided)
.\PREPARE_RELEASE.ps1 -branch "backend-integration-fix" -message "Backend/frontend integration: mapping fixes, employee inline-edit, E2E tests"
```

- **Manual steps** (if you prefer manual git):

```powershell
git checkout -b backend-integration-fix
git add -A
git commit -m "Backend/frontend integration: mapping fixes, employee inline-edit, E2E tests"
git push -u origin backend-integration-fix
```

- **Verify**:

```powershell
cd backend
node test_api.js
node test_ui_e2e.js
# optional headless UI test
node ui_e2e/puppeteer_login_test.js
```

- **Notes**:
- `git` is not available in the current environment where I ran tests; you must run the commit/push steps locally.
- The backend uses Supabase; ensure `backend/.env` has `SUPABASE_URL` and `SUPABASE_KEY` set before running tests.
