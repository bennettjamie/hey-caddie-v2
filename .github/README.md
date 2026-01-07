# GitHub Configuration

This directory contains GitHub-specific configuration files for the HeyCaddie project.

## Issue Templates

Located in `ISSUE_TEMPLATE/`:

- **bug_report.md** - Template for reporting bugs with fields specific to HeyCaddie (voice commands, betting, MRTZ, etc.)
- **feature_request.md** - Template for suggesting new features
- **config.yml** - Configuration for issue template chooser

## Pull Request Template

**pull_request_template.md** - Comprehensive checklist for pull requests including:
- Type of change classification
- Testing requirements (manual and automated)
- Code quality checklist
- Documentation updates
- Firebase/database change tracking
- Performance considerations

## Workflows

Located in `workflows/`:

### CI Workflow (`ci.yml`)
Runs on every push to `main` and on all pull requests:
- **Lint**: ESLint checks
- **Type Check**: TypeScript compilation
- **Test**: Vitest test suite
- **Build**: Next.js production build

### Deploy Workflow (`deploy.yml`)
Runs when version tags are pushed (e.g., `v1.0.0`):
- Runs full test suite
- Builds production application
- Deploys to Vercel
- Creates GitHub release with notes

## Required GitHub Secrets

To use the workflows, configure these secrets in your repository settings:

### Firebase Configuration (for CI/CD builds)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Vercel Deployment (for deploy workflow)
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

## Setting Up GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret listed above

## Using the Templates

### Creating an Issue
1. Go to the **Issues** tab
2. Click **New Issue**
3. Choose either **Bug Report** or **Feature Request**
4. Fill out the template

### Creating a Pull Request
1. Push your branch to GitHub
2. Open a pull request
3. The PR template will auto-populate
4. Fill out all relevant sections

### Triggering Deployments
To deploy a new version:

```bash
# Update version in package.json and CHANGELOG.md
npm version patch  # or minor, or major

# Push with tags
git push --follow-tags
```

This will trigger the deploy workflow automatically.

## Customizing Templates

Feel free to modify these templates to better fit your workflow. The templates are written in GitHub Flavored Markdown with YAML front matter for configuration.
