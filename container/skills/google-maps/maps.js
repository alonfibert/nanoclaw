#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to get API key from env var, or read from .env file
let API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  const envPath = path.join(os.homedir(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GOOGLE_MAPS_API_KEY=(.+)/);
    if (match) API_KEY = match[1].trim();
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid response from Google Maps API'));
        }
      });
    }).on('error', reject);
  });
}

async function searchPlace(query) {
  if (!API_KEY) throw new Error('GOOGLE_MAPS_API_KEY not set in .env');
  
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
  const res = await makeRequest(url);
  
  if (!res.results || res.results.length === 0) {
    console.log(`No places found for "${query}"`);
    return;
  }
  
  console.log(`🗺️ Places matching "${query}":`);
  res.results.slice(0, 5).forEach((place, i) => {
    console.log(`${i + 1}. ${place.name}`);
    console.log(`   Address: ${place.formatted_address}`);
    console.log(`   Rating: ${place.rating || 'N/A'} ⭐`);
  });
}

async function getDirections(from, to) {
  if (!API_KEY) throw new Error('GOOGLE_MAPS_API_KEY not set in .env');
  
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&key=${API_KEY}`;
  const res = await makeRequest(url);
  
  if (!res.routes || res.routes.length === 0) {
    console.log('No route found');
    return;
  }
  
  const route = res.routes[0];
  const distance = route.legs[0].distance.text;
  const duration = route.legs[0].duration.text;
  
  console.log(`🧭 Directions from ${from} to ${to}:`);
  console.log(`   Distance: ${distance}`);
  console.log(`   Duration: ${duration}`);
  console.log(`\n📍 Steps:`);
  route.legs[0].steps.forEach((step, i) => {
    console.log(`${i + 1}. ${step.html_instructions.replace(/<[^>]*>/g, '')}`);
  });
}

async function main() {
  const [, , command, ...args] = process.argv;
  
  try {
    switch (command) {
      case 'search':
        if (!args[0]) throw new Error('Usage: maps.js search <place>');
        await searchPlace(args.join(' '));
        break;
      case 'directions':
        if (!args[1]) throw new Error('Usage: maps.js directions <from> <to>');
        const fromTo = args.join(' ').split(' to ');
        await getDirections(fromTo[0], fromTo.slice(1).join(' to '));
        break;
      default:
        console.error('Commands: search <place>, directions <from> to <to>');
        process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
