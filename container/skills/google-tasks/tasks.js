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

async function listTasks() {
  const auth = await getAuthClient();
  const tasks = google.tasks({ version: 'v1', auth });
  
  const lists = await tasks.tasklists.list();
  if (!lists.data.items || lists.data.items.length === 0) {
    console.log('No task lists found.');
    return;
  }
  
  for (const list of lists.data.items) {
    console.log(`\n📝 ${list.title}`);
    const res = await tasks.tasks.list({ tasklist: list.id, showCompleted: false });
    if (!res.data.items || res.data.items.length === 0) {
      console.log('  (no tasks)');
      continue;
    }
    res.data.items.forEach((task, i) => {
      const status = task.completed ? '✅' : '⭕';
      console.log(`  ${i + 1}. ${status} ${task.title}`);
      if (task.notes) console.log(`     Notes: ${task.notes}`);
    });
  }
}

async function createTask(title, description = '') {
  const auth = await getAuthClient();
  const tasks = google.tasks({ version: 'v1', auth });
  
  const lists = await tasks.tasklists.list();
  const defaultList = lists.data.items?.[0];
  if (!defaultList) throw new Error('No task lists found');
  
  await tasks.tasks.insert({
    tasklist: defaultList.id,
    requestBody: {
      title,
      notes: description || undefined
    }
  });
  
  console.log(`✅ Task created: "${title}"`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  
  try {
    switch (command) {
      case 'list':
        await listTasks();
        break;
      case 'create':
        if (!args[0]) throw new Error('Usage: tasks.js create "Title" [description]');
        await createTask(args[0], args.slice(1).join(' '));
        break;
      default:
        console.error('Commands: list, create <title> [description]');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
