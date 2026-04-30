import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

function configure(tenantConfig) {
  cloudinary.config({
    cloud_name: tenantConfig.cloudinaryCloudName,
    api_key:    tenantConfig.cloudinaryApiKey,
    api_secret: tenantConfig.cloudinaryApiSecret,
    secure:     true,
  });
}

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer}   fileBuffer
 * @param {string}   fileName
 * @param {string}   folder      Cloudinary folder path e.g. 'dms/whatsapp-media'
 * @param {string[]} tags
 * @param {object}   tenantConfig  from req.tenantConfig
 * @returns {{ publicId, url, type, fileName }}
 */
export async function uploadFile(fileBuffer, fileName, folder, tags, tenantConfig) {
  configure(tenantConfig);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        tags,
        resource_type: 'auto',
        public_id: `${Date.now()}_${fileName.replace(/\s+/g, '_')}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          publicId: result.public_id,
          url:      result.secure_url,
          type:     result.resource_type === 'image' ? 'image' : 'document',
          fileName,
        });
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

/**
 * Deletes a file from Cloudinary by its public_id.
 */
export async function deleteFile(publicId, tenantConfig) {
  configure(tenantConfig);
  return cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
}
