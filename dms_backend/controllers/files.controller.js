import {
  createPatientDriveFolders,
  uploadFileToDrive,
  deleteFileFromDrive,
  SUBFOLDER_KEY,
  DRIVE_SUBFOLDERS,
  getDriveStorageInfo,
} from '../services/googleDrive.service.js';

// GET /api/files/all
export async function getAllFiles(req, res) {
  try {
    const { Patient } = req.tenantModels;
    
    // Find all patients that have files
    const patients = await Patient.find({ 'files.0': { $exists: true } })
      .select('first_name last_name files')
      .lean();

    let allFiles = [];

    patients.forEach(p => {
      const patientName = `${p.first_name} ${p.last_name || ''}`.trim();
      p.files.forEach(file => {
        allFiles.push({
          ...file,
          patient_name: patientName,
          patient_id: p._id,
        });
      });
    });

    // Sort by most recent (assuming uploaded_at exists or falling back to creation time if possible, but actually we have uploaded_at in the model. Let's just sort by uploaded_at)
    allFiles.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

    res.json(allFiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/files/upload
export async function uploadFile(req, res) {
  try {
    const { patient_id, category, visit_id } = req.body;
    const { Patient } = req.tenantModels;
    const credentials = req.tenantConfig;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
    if (!DRIVE_SUBFOLDERS.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${DRIVE_SUBFOLDERS.join(', ')}` });
    }

    const patient = await Patient.findById(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (!patient.drive_folders?.root) {
      const fullName = `${patient.first_name} ${patient.last_name || ''}`.trim();
      try {
        patient.drive_folders = await createPatientDriveFolders(credentials, patient.patientId, fullName);
        await patient.save();
      } catch (driveErr) {
        return res.status(500).json({ error: `Drive folder setup failed: ${driveErr.message}` });
      }
    }

    const folderId = patient.drive_folders[SUBFOLDER_KEY[category]];
    const fileBuffer = req.file.buffer;

    const driveFile = await uploadFileToDrive(
      credentials,
      folderId,
      fileBuffer,
      req.file.originalname,
      req.file.mimetype,
    );

    const fileRecord = {
      file_name:     driveFile.name,
      category,
      drive_file_id: driveFile.id,
      web_view_link: driveFile.webViewLink,
      mime_type:     driveFile.mimeType,
      ...(visit_id ? { visit_id } : {}),
    };

    patient.files.push(fileRecord);
    await patient.save();

    res.status(201).json({ success: true, file: patient.files[patient.files.length - 1] });
  } catch (err) {
    console.error('[Files] Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/files/patient/:patientId
export async function getPatientFiles(req, res) {
  try {
    const { Patient } = req.tenantModels;

    const patient = await Patient.findById(req.params.patientId)
      .select('files drive_folders patientId first_name last_name');

    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const grouped = {
      'Clinical Notes': [],
      'Scans':          [],
      'Photographs':    [],
      'Lab Reports':    [],
    };

    for (const file of patient.files) {
      if (grouped[file.category]) grouped[file.category].push(file);
    }

    res.json({
      patient_id:    patient._id,
      patientId:     patient.patientId,
      drive_folders: patient.drive_folders,
      files:         grouped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/files/:fileRecordId
export async function deleteFile(req, res) {
  try {
    const { fileRecordId } = req.params;
    const { patient_id } = req.body;
    const { Patient } = req.tenantModels;
    const credentials = req.tenantConfig;

    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

    const patient = await Patient.findById(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const fileRecord = patient.files.id(fileRecordId);
    if (!fileRecord) return res.status(404).json({ error: 'File record not found' });

    await deleteFileFromDrive(credentials, fileRecord.drive_file_id);

    patient.files.pull(fileRecordId);
    await patient.save();

    res.json({ success: true });
  } catch (err) {
    console.error('[Files] Delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/files/setup-folder/:patientId
export async function setupPatientFolder(req, res) {
  try {
    const { Patient } = req.tenantModels;
    const credentials = req.tenantConfig;

    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (patient.drive_folders?.root) {
      return res.json({ message: 'Folders already exist', drive_folders: patient.drive_folders });
    }

    const fullName = `${patient.first_name} ${patient.last_name || ''}`.trim();
    patient.drive_folders = await createPatientDriveFolders(credentials, patient.patientId, fullName);
    await patient.save();

    res.json({ success: true, drive_folders: patient.drive_folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/files/storage
export async function getStorageInfo(req, res) {
  try {
    const credentials = req.tenantConfig;
    const storageInfo = await getDriveStorageInfo(credentials);
    res.json(storageInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/files/bulk-delete
export async function bulkDeleteFile(req, res) {
  try {
    const { fileRecords } = req.body; // Array of { fileRecordId, patient_id }
    const { Patient } = req.tenantModels;
    const credentials = req.tenantConfig;

    if (!fileRecords || !Array.isArray(fileRecords)) {
      return res.status(400).json({ error: 'fileRecords array is required' });
    }

    for (const record of fileRecords) {
      const patient = await Patient.findById(record.patient_id);
      if (patient) {
        const fileRecord = patient.files.id(record.fileRecordId);
        if (fileRecord) {
          try {
            await deleteFileFromDrive(credentials, fileRecord.drive_file_id);
          } catch (driveErr) {
            console.error(`Drive delete failed for ${fileRecord.drive_file_id}:`, driveErr.message);
          }
          patient.files.pull(record.fileRecordId);
          await patient.save();
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Files] Bulk Delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
