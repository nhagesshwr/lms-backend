/**
 * File-upload proxy — handles multipart/form-data for video & PDF uploads.
 * Routes:
 *   POST /api/upload/:lessonId/video  → /lessons/:lessonId/upload-video
 *   POST /api/upload/:lessonId/pdf    → /lessons/:lessonId/upload-pdf
 */

import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BASE_URL   = 'https://lms-backend-22qp.onrender.com';
const TIMEOUT_MS = 120_000;

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '60mb',
  },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 55 * 1024 * 1024,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method Not Allowed' });

  const { lessonId, type } = req.query;
  if (!['video', 'pdf'].includes(type)) return res.status(400).json({ detail: 'Invalid type' });

  const endpoint = type === 'video'
    ? `/lessons/${lessonId}/upload-video`
    : `/lessons/${lessonId}/upload-pdf`;

  // Parse incoming multipart
  let files;
  try {
    ({ files } = await parseForm(req));
  } catch (err) {
    return res.status(400).json({ detail: `Parse error: ${err.message}` });
  }

  const fileEntry = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!fileEntry) return res.status(400).json({ detail: 'No file field found in form data.' });

  // Re-build multipart for upstream using Node 18 native FormData + Blob
  const fileBuffer = fs.readFileSync(fileEntry.filepath);
  const blob = new Blob([fileBuffer], { type: fileEntry.mimetype || 'application/octet-stream' });
  const fd = new FormData();
  fd.append('file', blob, fileEntry.originalFilename || 'upload');

  // Forward auth only
  const fwdHeaders = {};
  const auth = req.headers['authorization'];
  if (auth) fwdHeaders['Authorization'] = auth;

  let upstream;
  try {
    upstream = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: fwdHeaders,
      body: fd,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    try { fs.unlinkSync(fileEntry.filepath); } catch {}
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return res.status(504).json({
      detail: isTimeout ? 'Upload timed out — please try again.' : `Network error: ${err.message}`,
    });
  }

  try { fs.unlinkSync(fileEntry.filepath); } catch {}

  res.status(upstream.status);
  const buf = await upstream.arrayBuffer();
  res.end(Buffer.from(buf));
}
