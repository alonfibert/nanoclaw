#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');

const CREDS_PATH = path.join(os.homedir(), '.gdrive-mcp', 'credentials.json');

async function getAuthClient() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(`Credentials not found at ${CREDS_PATH}`);
  }
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
  const auth = new google.auth.OAuth2(creds.client_id, creds.client_secret);
  auth.setCredentials({
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expiry_date: creds.expiry_date
  });
  return auth;
}

async function listSheets(spreadsheetId) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  console.log(`📊 Sheets in "${res.data.properties.title}":`);
  res.data.sheets.forEach((sheet, i) => {
    console.log(`${i + 1}. ${sheet.properties.title} (${sheet.properties.gridProperties.rowCount} rows × ${sheet.properties.gridProperties.columnCount} cols)`);
  });
}

async function readValues(spreadsheetId, range) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  if (!res.data.values) {
    console.log(`No data found in range ${range}`);
    return;
  }
  
  console.log(`📋 Data from ${range}:`);
  res.data.values.forEach((row, i) => {
    console.log(`Row ${i + 1}: ${row.join(' | ')}`);
  });
}

async function writeValues(spreadsheetId, range, values) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const data = [{ range, values: [values.split(',').map(v => v.trim())] }];
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { data }
  });
  
  console.log(`✅ Written to ${range}: ${values}`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  
  try {
    switch (command) {
      case 'list-sheets':
        if (!args[0]) throw new Error('Usage: sheets.js list-sheets <spreadsheet-id>');
        await listSheets(args[0]);
        break;
      case 'read':
        if (!args[1]) throw new Error('Usage: sheets.js read <spreadsheet-id> <range>');
        await readValues(args[0], args[1]);
        break;
      case 'write':
        if (!args[2]) throw new Error('Usage: sheets.js write <spreadsheet-id> <range> <comma-separated-values>');
        await writeValues(args[0], args[1], args[2]);
        break;
      default:
        console.error('Commands: list-sheets, read, write');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
