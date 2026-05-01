import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

let vertexAi = null;

function initializeClient() {
  if (vertexAi) return;

  const credsPath = join(process.env.HOME, '.vertex-ai-mcp', 'credentials.json');
  const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));

  vertexAi = new VertexAI({
    project: creds.project_id,
    location: process.env.VERTEX_AI_REGION || 'us-central1',
  });
}

function ensureAttachmentDir() {
  const attachmentDir = '/workspace/group/attachments';
  mkdirSync(attachmentDir, { recursive: true });
  return attachmentDir;
}

async function generateImage(prompt, options = {}) {
  initializeClient();

  const imagenModel = vertexAi.preview.getGenerativeModel({
    model: 'imagen-3.0-generate-001',
  });

  const request = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  const response = await imagenModel.generateContent(request);
  const imageParts = response.response.candidates[0].content.parts.filter(
    part => part.inline_data?.mime_type?.startsWith('image/')
  );

  if (imageParts.length === 0) {
    throw new Error('No images generated');
  }

  const attachmentDir = ensureAttachmentDir();
  const timestamp = Date.now();
  const filePaths = [];

  imageParts.forEach((part, index) => {
    const imageData = part.inline_data.data;
    const buffer = Buffer.from(imageData, 'base64');
    const fileName = `imagen_${timestamp}_${index}.png`;
    const filePath = join(attachmentDir, fileName);

    writeFileSync(filePath, buffer);
    filePaths.push(filePath);
  });

  return filePaths;
}

export const tools = {
  async generateImage({ prompt, num_images = '1', image_size = '1024x768' }) {
    const filePaths = await generateImage(prompt, {
      temperature: 0.9,
    });

    return JSON.stringify({
      success: true,
      message: `Generated ${filePaths.length} image(s)`,
      file_paths: filePaths,
    });
  },

  async generateStyledImage({ prompt, style = 'photorealistic', num_images = '1' }) {
    const styledPrompt = `${prompt} (style: ${style})`;
    const filePaths = await generateImage(styledPrompt);

    return JSON.stringify({
      success: true,
      message: `Generated ${filePaths.length} ${style} image(s)`,
      file_paths: filePaths,
    });
  },
};
