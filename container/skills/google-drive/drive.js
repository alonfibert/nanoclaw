#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');

const CREDS_PATH = path.join(os.homedir(), '.gdrive-mcp', 'credentials.json');

async function loadCredentials() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(`Credentials not found at ${CREDS_PATH}. Run OAuth setup first.`);
  }
  return JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
}

async function getAuthClient() {
  const creds = await loadCredentials();
  const auth = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret
  );
  auth.setCredentials({
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expiry_date: creds.expiry_date
  });
  return auth;
}

async function listFiles(pageSize = 10) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  
  const res = await drive.files.list({
    pageSize,
    spaces: 'drive',
    fields: 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc'
  });

  if (!res.data.files || res.data.files.length === 0) {
    console.log('No files found in Google Drive.');
    return;
  }

  console.log('📁 Google Drive Files:');
  res.data.files.forEach((file, i) => {
    console.log(`${i + 1}. ${file.name}`);
    console.log(`   Modified: ${new Date(file.modifiedTime).toLocaleString()}`);
    console.log(`   Link: ${file.webViewLink}`);
  });
}

async function searchFiles(query) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  
  const res = await drive.files.list({
    q: `name contains '${query}' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name, mimeType, webViewLink, createdTime)',
    pageSize: 10
  });

  if (!res.data.files || res.data.files.length === 0) {
    console.log(`No files found matching "${query}".`);
    return;
  }

  console.log(`🔍 Search results for "${query}":`);
  res.data.files.forEach((file, i) => {
    console.log(`${i + 1}. ${file.name}`);
    console.log(`   Link: ${file.webViewLink}`);
  });
}

async function main() {
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case 'list':
        await listFiles(args[0] ? parseInt(args[0]) : 10);
        break;
      case 'search':
        if (!args[0]) throw new Error('Usage: drive.js search <query>');
        await searchFiles(args.join(' '));
        break;
      default:
        console.error('Usage: drive.js list [pageSize] | search <query>');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
