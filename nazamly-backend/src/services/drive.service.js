// src/services/drive.service.js
const drive = require('../config/drive');
const { Readable } = require('stream');

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID;

/**
 * Create a subfolder inside a parent folder on Google Drive.
 * @param {string} name - Folder name
 * @param {string} parentFolderId - Parent Drive folder ID (defaults to root)
 * @returns {{ id: string, webViewLink: string }}
 */
async function createFolder(name, parentFolderId = ROOT_FOLDER_ID) {
  if (!drive) throw new Error('Google Drive is not configured');

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, webViewLink',
  });

  // Make folder accessible to anyone with the link
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return response.data;
}

/**
 * Upload a file to a specific Google Drive folder.
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} parentFolderId - Drive folder ID to upload into
 * @returns {{ id: string, webViewLink: string }}
 */
async function uploadFile(fileBuffer, fileName, mimeType, parentFolderId) {
  if (!drive) throw new Error('Google Drive is not configured');

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, webViewLink',
  });

  // Make file viewable by anyone with the link
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return response.data;
}

/**
 * Delete a file or folder from Google Drive.
 * @param {string} fileId - Drive file/folder ID
 */
async function deleteFile(fileId) {
  if (!drive) throw new Error('Google Drive is not configured');
  await drive.files.delete({ fileId });
}

/**
 * List files inside a Google Drive folder.
 * @param {string} folderId - Drive folder ID
 * @returns {Array} List of files
 */
async function listFiles(folderId) {
  if (!drive) throw new Error('Google Drive is not configured');

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, size, createdTime)',
  });

  return response.data.files;
}

/**
 * List only folders inside a Google Drive folder.
 * @param {string} folderId - Drive folder ID
 * @returns {Array} List of folders
 */
async function listFolders(folderId) {
  if (!drive) throw new Error('Google Drive is not configured');

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, webViewLink, createdTime)',
  });

  return response.data.files;
}

module.exports = { createFolder, uploadFile, deleteFile, listFiles, listFolders };
