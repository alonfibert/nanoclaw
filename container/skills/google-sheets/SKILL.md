---
name: google-sheets
description: Access Google Sheets - read/write data, list sheets, get values
---

# Google Sheets Skill

Read and write data in your Google Sheets. Share the same OAuth credentials as Google Drive.

Usage:
```bash
node sheets.js list-sheets <spreadsheet-id>
node sheets.js read <spreadsheet-id> <range>
node sheets.js write <spreadsheet-id> <range> <values>
```

Example: `node sheets.js read "1abc..." "Sheet1!A1:C10"`
