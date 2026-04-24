#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to get token from env var, or read from .env file
let TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  const envPath = path.join(os.homedir(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NOTION_TOKEN=(.+)/);
    if (match) TOKEN = match[1].trim();
  }
}

const NOTION_VERSION = '2022-06-28';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function listDatabases() {
  if (!TOKEN) throw new Error('NOTION_TOKEN not set in .env');
  
  const res = await makeRequest('POST', '/v1/search', {
    filter: { value: 'database', property: 'object' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' }
  });

  if (!res.data.results || res.data.results.length === 0) {
    console.log('No databases found or accessible.');
    return;
  }

  console.log('📚 Your Notion Databases:');
  res.data.results.forEach((db, i) => {
    const title = db.title?.[0]?.plain_text || db.id;
    console.log(`${i + 1}. ${title}`);
    console.log(`   ID: ${db.id}`);
  });
}

async function searchPages(query) {
  if (!TOKEN) throw new Error('NOTION_TOKEN not set in .env');
  
  const res = await makeRequest('POST', '/v1/search', {
    query,
    filter: { value: 'page', property: 'object' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' }
  });

  if (!res.data.results || res.data.results.length === 0) {
    console.log(`No pages found matching "${query}".`);
    return;
  }

  console.log(`🔍 Search results for "${query}":`);
  res.data.results.slice(0, 5).forEach((page, i) => {
    const title = page.properties?.title?.title?.[0]?.plain_text || 'Untitled';
    console.log(`${i + 1}. ${title}`);
    console.log(`   ID: ${page.id}`);
  });
}

async function readPage(pageId) {
  if (!TOKEN) throw new Error('NOTION_TOKEN not set in .env');
  
  const res = await makeRequest('GET', `/v1/pages/${pageId}`);
  
  if (res.status !== 200) {
    throw new Error(`Failed to read page: ${res.data.message || 'Unknown error'}`);
  }

  console.log('📄 Page:');
  const props = res.data.properties;
  if (props.title?.title?.[0]?.plain_text) {
    console.log(`Title: ${props.title.title[0].plain_text}`);
  }
  console.log(`Last edited: ${new Date(res.data.last_edited_time).toLocaleString()}`);
  console.log(`URL: ${res.data.url}`);
}

async function main() {
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case 'list-databases':
        await listDatabases();
        break;
      case 'search':
        if (!args[0]) throw new Error('Usage: notion.js search <query>');
        await searchPages(args.join(' '));
        break;
      case 'read-page':
        if (!args[0]) throw new Error('Usage: notion.js read-page <page-id>');
        await readPage(args[0]);
        break;
      default:
        console.error('Commands: list-databases, search <query>, read-page <page-id>');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
