import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { GoogleAuth } from 'google-auth-library';

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

async function generateImage(prompt, options = {}) {
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
      instances: [
        {
          prompt: prompt,
        },
      ],
      parameters: {
        sampleCount: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI API error: ${response.status} ${error}`);
  }

  const data = await response.json();

  if (!data.predictions || data.predictions.length === 0) {
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

  if (filePaths.length === 0) {
    throw new Error('No valid images in API response');
  }

  return filePaths;
}

export const tools = {
  async generateImage({ prompt }) {
    try {
      const filePaths = await generateImage(prompt);
      return JSON.stringify({
        success: true,
        message: `Generated ${filePaths.length} image(s): ${filePaths.join(', ')}`,
        file_paths: filePaths,
      });
    } catch (err) {
      throw new Error(`Image generation failed: ${err.message}`);
    }
  },

  async generateStyledImage({ prompt, style = 'photorealistic' }) {
    try {
      const styledPrompt = `${prompt}, style: ${style}`;
      const filePaths = await generateImage(styledPrompt);
      return JSON.stringify({
        success: true,
        message: `Generated ${filePaths.length} ${style} image(s): ${filePaths.join(', ')}`,
        file_paths: filePaths,
      });
    } catch (err) {
      throw new Error(`Image generation failed: ${err.message}`);
    }
  },
};
