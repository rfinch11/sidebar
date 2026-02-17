Deploy to production. Follow these steps in order:

1. Run `npm run build` to verify the build passes. If it fails, fix the errors and retry before proceeding.
2. Run `git status` and `git diff --stat` to review all changes. Stage only the relevant changed files (never use `git add -A` or `git add .` to avoid committing secrets).
3. Write a concise commit message describing what changed and commit.
4. Run `git push origin main` to trigger a Vercel production deployment.

Report the commit hash and confirm the push succeeded.