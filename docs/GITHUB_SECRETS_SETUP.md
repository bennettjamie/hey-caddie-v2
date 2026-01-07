# GitHub Secrets Setup Guide

This guide walks you through configuring GitHub Secrets for your CI/CD workflows.

## 🎯 What Are GitHub Secrets?

GitHub Secrets are encrypted environment variables that allow your workflows to access sensitive information (like API keys) without exposing them in your code.

## 📋 Required Secrets

### **For CI Workflow** (Build Testing)

These are needed for the `ci.yml` workflow to build your app:

1. `NEXT_PUBLIC_FIREBASE_API_KEY`
2. `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
3. `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
4. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
5. `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
6. `NEXT_PUBLIC_FIREBASE_APP_ID`

### **For Deploy Workflow** (Optional - Only if using automated deployment)

These are needed for the `deploy.yml` workflow:

7. `VERCEL_TOKEN` - Your Vercel authentication token
8. `VERCEL_ORG_ID` - Your Vercel organization ID
9. `VERCEL_PROJECT_ID` - Your Vercel project ID

---

## 🔧 Step-by-Step Setup

### **Step 1: Get Your Firebase Configuration**

Your Firebase config is already in your `.env.local` file (not committed to git).

1. Open your `.env.local` file:
   ```bash
   cat .env.local
   ```

2. You should see values like:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. **Keep this file open** - you'll need these values

---

### **Step 2: Navigate to GitHub Settings**

1. Go to your repository on GitHub: `https://github.com/bennettjamie/hey-caddie-v2`

2. Click **Settings** (top menu)

3. In the left sidebar, click **Secrets and variables** → **Actions**

4. You should see a page titled "Actions secrets and variables"

---

### **Step 3: Add Firebase Secrets**

For each Firebase secret, repeat these steps:

1. Click **New repository secret** (green button)

2. Enter the secret name and value:

   **Secret 1:**
   - Name: `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value: [Copy from your `.env.local` file]
   - Click **Add secret**

   **Secret 2:**
   - Name: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - Value: [Copy from your `.env.local` file]
   - Click **Add secret**

   **Secret 3:**
   - Name: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Value: [Copy from your `.env.local` file]
   - Click **Add secret**

   **Secret 4:**
   - Name: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - Value: [Copy from your `.env.local` file]
   - Click **Add secret**

   **Secret 5:**
   - Name: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - Value: [Copy from your `.env.local` file]
   - Click **Add secret**

   **Secret 6:**
   - Name: `NEXT_PUBLIC_FIREBASE_APP_ID`
   - Value: [Copy from your `.env.local` file]
   - Click **Add secret**

3. When done, you should see 6 secrets listed

---

### **Step 4: Add Vercel Secrets (Optional)**

⚠️ **Only do this if you want automated deployment**

If you want the `deploy.yml` workflow to automatically deploy to Vercel when you tag a release:

#### **4a. Get Your Vercel Token**

1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Give it a name like "GitHub Actions Deploy"
4. Set scope to your account/team
5. Click **Create**
6. **Copy the token immediately** (you won't see it again!)

Add to GitHub:
- Name: `VERCEL_TOKEN`
- Value: [Paste the token]
- Click **Add secret**

#### **4b. Get Your Vercel Org ID**

1. Go to your Vercel team settings: `https://vercel.com/[your-team]/settings`
2. Scroll to **Team ID** or **Personal Account ID**
3. Copy the ID (looks like: `team_abc123...`)

Add to GitHub:
- Name: `VERCEL_ORG_ID`
- Value: [Paste the ID]
- Click **Add secret**

#### **4c. Get Your Vercel Project ID**

1. Go to your project settings on Vercel
2. Click **Settings** → **General**
3. Scroll to **Project ID**
4. Copy the ID (looks like: `prj_abc123...`)

Add to GitHub:
- Name: `VERCEL_PROJECT_ID`
- Value: [Paste the ID]
- Click **Add secret**

---

## ✅ Verification

### **Check Secrets Are Added**

1. Go back to: Settings → Secrets and variables → Actions
2. You should see at least 6 secrets (Firebase)
3. Or 9 secrets if you added Vercel

### **Test the CI Workflow**

1. Make a small change to any file (e.g., add a comment)
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "test: Trigger CI workflow"
   git push origin main
   ```

3. Go to: **Actions** tab on GitHub
4. You should see a workflow run starting
5. Click on it to watch the progress

**Expected Results:**
- ✅ Lint job passes
- ✅ Type-check job passes
- ✅ Test job passes
- ✅ Build job passes (now that it has Firebase secrets)

If the build job was failing before, it should now pass!

---

## 🔒 Security Notes

### **Safe Practices**

✅ **DO:**
- Use GitHub Secrets for all sensitive data
- Keep your `.env.local` file in `.gitignore`
- Rotate tokens periodically
- Use read-only tokens where possible

❌ **DON'T:**
- Commit `.env.local` to git
- Share secrets in public channels
- Use production credentials for CI testing
- Hardcode secrets in workflow files

### **Why These Secrets Are Public-Safe**

Your Firebase config uses `NEXT_PUBLIC_*` prefix, which means:
- ✅ These values are already exposed in your production build
- ✅ They're meant to be public (client-side)
- ✅ Security is handled by Firebase Security Rules, not by hiding keys
- ✅ Safe to use in CI/CD

The actual security is in your:
- Firebase Security Rules (who can read/write)
- Firebase Authentication (who is logged in)
- API domain restrictions (which domains can use the key)

---

## 🚨 Troubleshooting

### **"Secret Not Found" Error**

**Problem:** Workflow fails with "secret not found"

**Solution:**
1. Check secret name matches exactly (case-sensitive)
2. Verify secret was added to the correct repository
3. Make sure you're on the right branch

### **"Build Failed: Firebase Not Initialized"**

**Problem:** Build job fails even with secrets

**Solution:**
1. Check all 6 Firebase secrets are present
2. Verify values don't have extra spaces
3. Check `.env.local` values are correct
4. Try re-running the workflow

### **"Unauthorized" Error (Vercel)**

**Problem:** Deploy workflow fails with authorization error

**Solution:**
1. Check `VERCEL_TOKEN` is valid and not expired
2. Verify token has correct permissions
3. Check `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
4. Regenerate token if needed

---

## 📊 Quick Reference

### **Secrets Checklist**

**Required (CI):**
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

**Optional (Deploy):**
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`

### **Where to Find Values**

| Secret | Where to Find |
|--------|---------------|
| Firebase keys | `.env.local` file (local) |
| Firebase keys | Firebase Console → Project Settings |
| Vercel Token | vercel.com/account/tokens |
| Vercel Org ID | vercel.com/[team]/settings |
| Vercel Project ID | vercel.com/[team]/[project]/settings |

---

## 🎯 Next Steps

Once secrets are configured:

✅ **Mark Task #2 Complete**
🚀 **Ready for Task #3: Test CI Workflow**

The CI workflow should now run successfully every time you push to GitHub!

---

## 💡 Pro Tips

1. **Use Environment-Specific Secrets**
   - Consider separate Firebase projects for dev/staging/prod
   - Use GitHub Environments for different deployment targets

2. **Secret Rotation**
   - Rotate Vercel tokens every 6-12 months
   - Update secrets if they're compromised

3. **Audit Access**
   - Review who has access to repository settings
   - Limit secret access to necessary workflows only

4. **Backup Configuration**
   - Keep a secure backup of your Firebase config
   - Document where to find values if needed

---

**Need Help?**

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Firebase Console](https://console.firebase.google.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)
