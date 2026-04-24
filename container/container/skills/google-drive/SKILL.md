---
name: google-drive
description: Access Google Drive - list files, upload, download, search documents
allowed-tools: Bash($SKILL_DIR/drive.js:*)
---

# Google Drive Access

Use this to interact with your Google Drive. The agent can:
- List your files and folders
- Search for documents
- Get file metadata
- Upload files
- Download files
- Create folders
- Delete files

## How it Works

The agent will run commands like:
```bash
node /path/to/drive.js list
node /path/to/drive.js search "report"
node /path/to/drive.js download "filename" "/path/to/save"
```

Credentials are loaded from `~/.gdrive-mcp/credentials.json` (already set up via OAuth).
