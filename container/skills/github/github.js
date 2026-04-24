#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to get token from env var, or read from .env file
let TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  const envPath = path.join(os.homedir(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GITHUB_TOKEN=(.+)/);
    if (match) TOKEN = match[1].trim();
  }
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'NanoClaw'
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

async function listRepos() {
  if (!TOKEN) throw new Error('GITHUB_TOKEN not set in .env');
  
  const res = await makeRequest('GET', '/user/repos?sort=updated&per_page=10');
  if (!res.data.length) {
    console.log('No repositories found.');
    return;
  }

  console.log('📚 Your Repositories:');
  res.data.forEach((repo, i) => {
    console.log(`${i + 1}. ${repo.full_name}`);
    console.log(`   Description: ${repo.description || '(no description)'}`);
    console.log(`   URL: ${repo.html_url}`);
    console.log(`   Stars: ⭐ ${repo.stargazers_count}`);
  });
}

async function searchRepos(query) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN not set in .env');
  
  const res = await makeRequest('GET', `/search/repositories?q=${encodeURIComponent(query)}&per_page=5`);
  if (!res.data.items || res.data.items.length === 0) {
    console.log(`No repositories found for "${query}".`);
    return;
  }

  console.log(`🔍 Search results for "${query}":`);
  res.data.items.forEach((repo, i) => {
    console.log(`${i + 1}. ${repo.full_name}`);
    console.log(`   ${repo.description || '(no description)'}`);
    console.log(`   ⭐ ${repo.stargazers_count} stars`);
  });
}

async function listIssues(repo) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN not set in .env');
  
  const res = await makeRequest('GET', `/repos/${repo}/issues?state=open&per_page=10`);
  if (!res.data.length) {
    console.log(`No open issues in ${repo}.`);
    return;
  }

  console.log(`📋 Open Issues in ${repo}:`);
  res.data.forEach((issue, i) => {
    console.log(`${i + 1}. #${issue.number} - ${issue.title}`);
    console.log(`   Created by: ${issue.user.login}`);
    console.log(`   URL: ${issue.html_url}`);
  });
}

async function createIssue(repo, title, body) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN not set in .env');
  
  const res = await makeRequest('POST', `/repos/${repo}/issues`, { title, body });
  
  if (res.status === 201) {
    console.log(`✅ Issue created: #${res.data.number}`);
    console.log(`   URL: ${res.data.html_url}`);
  } else {
    throw new Error(`Failed to create issue: ${res.data.message || 'Unknown error'}`);
  }
}

async function main() {
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case 'repos':
        await listRepos();
        break;
      case 'search':
        if (!args[0]) throw new Error('Usage: github.js search <query>');
        await searchRepos(args.join(' '));
        break;
      case 'issues':
        if (!args[0]) throw new Error('Usage: github.js issues <owner/repo>');
        await listIssues(args[0]);
        break;
      case 'create-issue':
        if (!args[2]) throw new Error('Usage: github.js create-issue <owner/repo> "title" "body"');
        await createIssue(args[0], args[1], args[2]);
        break;
      default:
        console.error('Commands: repos, search <query>, issues <owner/repo>, create-issue <repo> "title" "body"');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
