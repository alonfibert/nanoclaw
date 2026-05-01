import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';

const server = new Server({
  name: 'imagen-vertexai',
  version: '1.0.0',
});

const CREDS_PATH = '/home/node/.vertex-ai-mcp/credentials.json';
let authClient = null;
let projectId = null;
let region = null;

async function initializeAuth() {
  if (authClient) return;

  try {
    const creds = JSON.parse(readFileSync(CREDS_PATH, 'utf-8'));
    projectId = creds.project_id;
    region = process.env.VERTEX_AI_REGION || 'us-central1';

    authClient = new GoogleAuth({
      keyFilename: CREDS_PATH,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  } catch (err) {
    throw new Error(`Failed to load credentials from ${CREDS_PATH}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function ensureAttachmentDir() {
  const dir = '/workspace/group/attachments';
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function generateImage(prompt) {
  await initializeAuth();

  const client = await authClient.getClient();
  const accessToken = await client.getAccessToken();
  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagegeneration@002:predict`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }

  const data = await response.json();
  if (!data.predictions?.length) {
    throw new Error('No predictions in response');
  }

  const dir = ensureAttachmentDir();
  const timestamp = Date.now();
  const filePaths = [];

  data.predictions.forEach((pred, idx) => {
    if (pred.bytesBase64Encoded) {
      const buf = Buffer.from(pred.bytesBase64Encoded, 'base64');
      const file = `imagen_${timestamp}_${idx}.png`;
      const path = `${dir}/${file}`;
      writeFileSync(path, buf);
      filePaths.push(path);
    }
  });

  if (!filePaths.length) {
    throw new Error('No valid images');
  }

  return filePaths;
}

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'generateImage',
      description: 'Generate an image from a text prompt using Google Vertex AI Imagen',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image description' },
        },
        required: ['prompt'],
      },
    },
  ],
}));

server.setRequestHandler('tools/call', async (req) => {
  const { name, arguments: args } = req.params;

  if (name !== 'generateImage') {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const paths = await generateImage(args.prompt);
    return {
      content: [
        {
          type: 'text',
          text: `Generated ${paths.length} image(s):\n${paths.join('\n')}`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

server.connect();
