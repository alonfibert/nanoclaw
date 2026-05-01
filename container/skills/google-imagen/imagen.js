import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { GoogleAuth } from 'google-auth-library';

const server = new Server({
  name: 'imagen-vertexai',
  version: '1.0.0',
});

let authClient = null;
let projectId = null;
let region = null;

async function initializeAuth() {
  if (authClient) return;

  const credsPath = join(process.env.HOME, '.vertex-ai-mcp', 'credentials.json');
  const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));

  projectId = creds.project_id;
  region = process.env.VERTEX_AI_REGION || 'us-central1';

  authClient = new GoogleAuth({
    keyFilename: credsPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
}

function ensureAttachmentDir() {
  const attachmentDir = '/workspace/group/attachments';
  mkdirSync(attachmentDir, { recursive: true });
  return attachmentDir;
}

async function generateImage(prompt) {
  await initializeAuth();

  const client = await authClient.getClient();
  const accessToken = await client.getAccessToken();

  const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagegeneration@002:predict`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  if (!data.predictions?.length) {
    throw new Error('No images generated from API');
  }

  const attachmentDir = ensureAttachmentDir();
  const timestamp = Date.now();
  const filePaths = [];

  data.predictions.forEach((prediction, index) => {
    if (prediction.bytesBase64Encoded) {
      const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const fileName = `imagen_${timestamp}_${index}.png`;
      const filePath = join(attachmentDir, fileName);
      writeFileSync(filePath, buffer);
      filePaths.push(filePath);
    }
  });

  if (!filePaths.length) {
    throw new Error('No valid images in API response');
  }

  return filePaths;
}

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'generateImage',
      description: 'Generate an image from a text prompt using Vertex AI Imagen',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The text prompt for image generation',
          },
        },
        required: ['prompt'],
      },
    },
  ] as Tool[],
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'generateImage') {
    try {
      const filePaths = await generateImage(args.prompt);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully generated ${filePaths.length} image(s):\n${filePaths.join('\n')}`,
          } as TextContent,
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating image: ${err instanceof Error ? err.message : String(err)}`,
          } as TextContent,
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      } as TextContent,
    ],
    isError: true,
  };
});

server.connect();
