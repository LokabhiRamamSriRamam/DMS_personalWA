import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

export const DRIVE_SUBFOLDERS = ['Clinical Notes', 'Scans', 'Photographs', 'Lab Reports'];

export const SUBFOLDER_KEY = {
  'Clinical Notes': 'clinical_notes',
  'Scans':          'scans',
  'Photographs':    'photographs',
  'Lab Reports':    'lab_reports',
};

/**
 * Builds an OAuth2 client using the provided tenant credentials.
 * @param {{ clientId, clientSecret, refreshToken }} credentials
 */
function getAuth(credentials) {
  if (!credentials.refreshToken) {
    throw new Error('Google Drive not configured for this clinic. Contact your administrator.');
  }
  const oauth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    'http://localhost:5000/auth/google/callback', // redirectUri — not used for refresh flow
  );
  oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });
  return oauth2Client;
}

function drive(credentials) {
  return google.drive({ version: 'v3', auth: getAuth(credentials) });
}

/**
 * Creates a patient root folder and 4 subfolders inside the tenant's root Drive folder.
 * Returns: { root, clinical_notes, scans, photographs, lab_reports }
 */
export async function createPatientDriveFolders(credentials, patientId, fullName) {
  const d = drive(credentials);
  const rootFolderId = credentials.driveFolderId;

  if (!rootFolderId) {
    throw new Error('Google Drive root folder not configured for this clinic.');
  }

  const patientFolder = await d.files.create({
    requestBody: {
      name:     `${patientId} - ${fullName}`,
      mimeType: FOLDER_MIME,
      parents:  [rootFolderId],
    },
    fields: 'id',
  });

  const patientFolderId = patientFolder.data.id;

  const subResults = await Promise.all(
    DRIVE_SUBFOLDERS.map(name =>
      d.files.create({
        requestBody: { name, mimeType: FOLDER_MIME, parents: [patientFolderId] },
        fields: 'id, name',
      })
    )
  );

  const folders = { root: patientFolderId };
  subResults.forEach(res => {
    const key = SUBFOLDER_KEY[res.data.name];
    if (key) folders[key] = res.data.id;
  });

  return folders;
}

/**
 * Uploads a file buffer to a Drive folder.
 * Returns: { id, name, webViewLink, mimeType }
 */
export async function uploadFileToDrive(credentials, folderId, fileBuffer, fileName, mimeType) {
  const d = drive(credentials);

  const res = await d.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media:       { mimeType, body: Readable.from(fileBuffer) },
    fields:      'id, name, webViewLink, mimeType',
  });

  // Make the file viewable by anyone with the link
  await d.permissions.create({
    fileId:      res.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return res.data;
}

/**
 * Permanently deletes a file from Drive.
 */
export async function deleteFileFromDrive(credentials, driveFileId) {
  const d = drive(credentials);
  await d.files.delete({ fileId: driveFileId });
}

/**
 * Lists files inside a Drive folder.
 */
export async function listFilesInFolder(credentials, folderId) {
  const d = drive(credentials);
  const res = await d.files.list({
    q:       `'${folderId}' in parents and trashed = false`,
    fields:  'files(id, name, webViewLink, mimeType, createdTime)',
    orderBy: 'createdTime desc',
  });
  return res.data.files || [];
}

/**
 * Creates a subfolder within a parent folder.
 */
export async function createSubfolder(credentials, parentId, folderName) {
  const d = drive(credentials);
  const res = await d.files.create({
    requestBody: {
      name: folderName,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: 'id',
  });
  return res.data.id;
}

/**
 * Gets storage quota information from Google Drive.
 */
export async function getDriveStorageInfo(credentials) {
  const d = drive(credentials);
  const res = await d.about.get({ fields: 'storageQuota' });
  return res.data.storageQuota;
}
