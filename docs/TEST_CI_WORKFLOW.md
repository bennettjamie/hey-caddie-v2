# Test CI Workflow Guide

This guide walks you through testing your GitHub Actions CI workflow.

## 🎯 What Is the CI Workflow?

The CI (Continuous Integration) workflow automatically runs every time you push code to GitHub. It:

1. **Lints** your code (checks for style issues)
2. **Type-checks** your TypeScript
3. **Runs tests** (Vitest test suite)
4. **Builds** your application

This ensures code quality and catches issues before deployment.

---

## 📋 Prerequisites

Before testing, ensure:

- ✅ Task #1 Complete: Files reviewed
- ✅ Task #2 Complete: GitHub Secrets configured
- ✅ Repository is on GitHub: `https://github.com/bennettjamie/hey-caddie-v2`
- ✅ You have push access to the repository

---

## 🚀 Method 1: Test with a Small Change (Recommended)

This is the safest way to test the CI workflow.

### **Step 1: Make a Small Test Change**

Let's add a comment to the CHANGELOG to trigger the workflow:

```bash
# Open CHANGELOG.md and add a comment
echo "" >> CHANGELOG.md
echo "<!-- CI test $(date) -->" >> CHANGELOG.md
```

Or manually add a comment at the bottom of `CHANGELOG.md`:
```markdown
<!-- CI workflow test -->
```

### **Step 2: Commit and Push**

```bash
# Stage the change
git add CHANGELOG.md

# Commit with a clear message
git commit -m "test: Trigger CI workflow"

# Push to GitHub
git push origin main
```

### **Step 3: Watch the Workflow Run**

1. Go to your repository on GitHub
2. Click the **Actions** tab (top navigation)
3. You should see a new workflow run appear with your commit message
4. Click on the workflow run to see details

### **Step 4: Monitor the Jobs**

The workflow has 4 parallel jobs:

**Expected Progress:**

```
CI Workflow
├─ lint (Running...)          ← Checking ESLint rules
├─ type-check (Running...)    ← Running TypeScript compiler
├─ test (Running...)          ← Running Vitest tests
└─ build (Running...)         ← Building Next.js app
```

**What Success Looks Like:**

```
CI Workflow ✅ (Completed in ~3-5 minutes)
├─ lint ✅ (30s - 1min)
├─ type-check ✅ (30s - 1min)
├─ test ✅ (30s - 1min)
└─ build ✅ (2-3min)
```

### **Step 5: Review Results**

Click on each job to see detailed logs:

**Lint Job:**
```
Run npm run lint
  ✓ No linting errors found
```

**Type-Check Job:**
```
Run npx tsc --noEmit
  ✓ No TypeScript errors
```

**Test Job:**
```
Run npm run test:run
  ✓ All tests passed
```

**Build Job:**
```
Run npm run build
  ✓ Build completed successfully
  ✓ Exported static files
```

---

## 🔍 Method 2: Check Workflow File Syntax

Before pushing, you can validate the workflow file locally:

```bash
# Install GitHub CLI if not already installed
# brew install gh  # macOS
# Or download from: https://cli.github.com/

# Validate workflow syntax
gh workflow view ci.yml
```

---

## 🎨 What to Expect: Visual Guide

### **GitHub Actions Tab**

When you go to the Actions tab, you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ All workflows                                           │
├─────────────────────────────────────────────────────────┤
│ ✅ CI  test: Trigger CI workflow                       │
│    main  #1  by your-username  2 minutes ago           │
├─────────────────────────────────────────────────────────┤
│ ⏸️  Deploy to Production  (No runs yet)                │
└─────────────────────────────────────────────────────────┘
```

### **Workflow Run Details**

Click on a run to see:

```
┌─────────────────────────────────────────────────────────┐
│ test: Trigger CI workflow                               │
│ Run #1 · main · eb590f2                                 │
├─────────────────────────────────────────────────────────┤
│ Jobs                                         Status     │
├─────────────────────────────────────────────────────────┤
│ lint                                         ✅ Success │
│ type-check                                   ✅ Success │
│ test                                         ✅ Success │
│ build                                        ✅ Success │
│ build-status                                 ✅ Success │
└─────────────────────────────────────────────────────────┘
```

### **Job Logs**

Click "build" to see detailed logs:

```
┌─────────────────────────────────────────────────────────┐
│ Set up job                                  0s          │
│ Checkout code                               2s          │
│ Setup Node.js                               3s          │
│ Install dependencies                        45s         │
│ Create dummy .env.local for build           1s          │
│ Build application                           120s        │
│ Upload build artifacts                      10s         │
│ Complete job                                1s          │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

Your CI workflow is working if:

- ✅ All 4 jobs complete successfully (green checkmarks)
- ✅ Build job completes without Firebase errors
- ✅ No red X marks indicating failures
- ✅ Workflow completes in reasonable time (3-5 minutes)
- ✅ You receive no error emails from GitHub

---

## 🚨 Troubleshooting

### **Problem: Build Job Fails with "Firebase Not Defined"**

**Cause:** Firebase secrets not configured correctly

**Solution:**
1. Go back to Task #2 and verify all 6 Firebase secrets are added
2. Check secret names match exactly (case-sensitive)
3. Re-run the workflow: Click "Re-run jobs" → "Re-run failed jobs"

**Check:**
```bash
# Verify secrets are set (you won't see values, just names)
gh secret list
```

---

### **Problem: Lint Job Fails**

**Cause:** ESLint errors in code

**Solution:**
1. Run lint locally to see errors:
   ```bash
   npm run lint
   ```
2. Fix the errors shown
3. Commit and push again

---

### **Problem: Type-Check Job Fails**

**Cause:** TypeScript errors

**Solution:**
1. Run type-check locally:
   ```bash
   npx tsc --noEmit
   ```
2. Fix TypeScript errors
3. Commit and push again

---

### **Problem: Test Job Fails**

**Cause:** Tests are failing

**Solution:**
1. Run tests locally:
   ```bash
   npm test
   ```
2. Fix failing tests
3. Commit and push again

---

### **Problem: Workflow Doesn't Trigger**

**Possible Causes:**
- Workflow file syntax error
- Workflow file not in correct location (`.github/workflows/`)
- Branch is not `main` (workflow only runs on `main` and PRs)

**Solution:**
1. Check workflow file exists:
   ```bash
   ls .github/workflows/ci.yml
   ```
2. Verify branch:
   ```bash
   git branch --show-current
   # Should show: main
   ```
3. Check syntax:
   ```bash
   cat .github/workflows/ci.yml
   ```

---

## 📊 Performance Benchmarks

**Typical Job Duration:**

| Job | Time | Notes |
|-----|------|-------|
| Lint | 30-60s | Fast, checks code style |
| Type-check | 30-60s | Fast, no compilation |
| Test | 30-90s | Depends on test count |
| Build | 2-4min | Slowest, full Next.js build |
| **Total** | **3-6min** | All jobs run in parallel |

**If jobs are taking longer:**
- Check GitHub Actions status: status.github.com
- Network issues may slow npm install
- First run is slower (cache building)
- Subsequent runs are faster (cached dependencies)

---

## 🎯 What Happens on Different Events

### **Push to Main Branch**
```bash
git push origin main
```
✅ Triggers: All 4 jobs (lint, type-check, test, build)

### **Pull Request**
```bash
# Create PR on GitHub
```
✅ Triggers: All 4 jobs
✅ Shows status in PR
✅ Blocks merge if jobs fail (optional)

### **Push to Other Branch**
```bash
git push origin feature-branch
```
❌ Does not trigger (by default)
✅ Only triggers if PR is open

---

## 🔄 Re-running Workflows

If a job fails due to temporary issues (network, GitHub outage):

1. Go to the failed workflow run
2. Click **Re-run jobs** (top right)
3. Choose:
   - "Re-run failed jobs" (just the failed ones)
   - "Re-run all jobs" (everything)

---

## 📈 Next Steps After Successful CI

Once your CI is passing:

### **1. Add Status Badge to README**

Add this to the top of your `README.md`:

```markdown
![CI](https://github.com/bennettjamie/hey-caddie-v2/workflows/CI/badge.svg)
```

This shows a badge indicating if your CI is passing:
- ✅ Green badge = passing
- ❌ Red badge = failing

### **2. Enable Branch Protection (Optional)**

Require CI to pass before merging:

1. Go to: Settings → Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Check: "Require status checks to pass"
5. Select: lint, type-check, test, build
6. Save

Now you can't merge code that breaks CI!

### **3. Set Up Notifications**

Configure when to get notified:

1. GitHub → Settings (your account) → Notifications
2. Configure "Actions" notifications
3. Choose: "Only failures" or "All activity"

---

## ✅ Verification Checklist

- [ ] Workflow appears in Actions tab
- [ ] All 4 jobs show green checkmarks
- [ ] No error messages in logs
- [ ] Build completes successfully
- [ ] Workflow completes in reasonable time
- [ ] Can see workflow status on commit
- [ ] (Optional) Status badge added to README
- [ ] (Optional) Branch protection enabled

---

## 🎯 Success!

If everything is green:

✅ **Task #3 Complete: CI Workflow Tested**
🚀 **Ready for Task #4: Try the Logger**

Your repository now has automated quality checks on every push!

---

## 💡 Pro Tips

### **Faster Debugging**

If something fails:
1. Click on the failed job
2. Look for red error messages
3. Copy error message and fix locally
4. Don't spam re-runs - fix the issue first!

### **Skip CI (Rare Cases)**

If you need to push without triggering CI:
```bash
git commit -m "docs: Update README [skip ci]"
```

Add `[skip ci]` to commit message.

**⚠️ Use sparingly!** CI is there for a reason.

### **Workflow Dispatch (Manual Trigger)**

Add this to your workflow file to enable manual runs:

```yaml
on:
  workflow_dispatch:  # Adds "Run workflow" button
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
```

Then you can manually trigger from Actions tab.

---

**Questions?**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Troubleshooting Guide](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)
