---
name: github
description: GitHub - list repos, search code, manage issues, view pull requests
---

# GitHub Skill

Access your GitHub repositories and manage issues/PRs. Uses personal access token from .env.

Usage:
```bash
node github.js repos                    # List your repositories
node github.js search <query>           # Search repositories
node github.js issues <repo>            # List issues in repo (format: owner/repo)
node github.js create-issue <repo> "title" "body"  # Create issue
```

Examples:
- `node github.js repos`
- `node github.js issues "anthropics/anthropic-sdk-python"`
- `node github.js create-issue "myrepo" "Bug found" "Description here"`
