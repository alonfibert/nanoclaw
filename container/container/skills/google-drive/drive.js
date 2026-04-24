#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');

const CREDS_PATH = path.join(os.homedir(), '.gdrive-mcp', 'credentials.json');

async function loadCredentials() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(`Credentials not found at ${CREDS_PATH}. Run the OAuth setup first.`);
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
    console.log(`${i + 1}. ${file.name} (${file.mimeType})`);
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

  console.log(`\n🔍 Search results for "${query}":`);
  res.data.files.forEach((file, i) => {
    console.log(`${i + 1}. ${file.name}`);
    console.log(`   Link: ${file.webViewLink}`);
  });
}

async function getFileInfo(fileId) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth });
  
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, webViewLink, createdTime, modifiedTime, size, owners'
  });

  console.log('📄 File Information:');
  console.log(`Name: ${res.data.name}`);
  console.log(`Type: ${res.data.mimeType}`);
  console.log(`Size: ${res.data.size ? (res.data.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
  console.log(`Created: ${new Date(res.data.createdTime).toLocaleString()}`);
  console.log(`Modified: ${new Date(res.data.modifiedTime).toLocaleString()}`);
  console.log(`Owner: ${res.data.owners?.[0]?.displayName || 'Unknown'}`);
  console.log(`Link: ${res.data.webViewLink}`);
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
      case 'info':
        if (!args[0]) throw new Error('Usage: drive.js info <fileId>');
        await getFileInfo(args[0]);
        break;
      default:
        console.error('Unknown command:', command);
        console.error('Available: list [pageSize], search <query>, info <fileId>');
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
