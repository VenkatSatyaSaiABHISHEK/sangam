import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure Cloudinary if credentials exist
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface UploadResult {
  url: string;
  key: string;
  sizeBytes: number;
}

export async function uploadImageFile(
  buffer: Buffer,
  filename: string,
  mimeType = 'image/jpeg'
): Promise<UploadResult> {
  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // 1. Primary: Cloudinary Live CDN Upload
  if (cloudinaryConfigured) {
    try {
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'summitconnect',
            public_id: safeFilename.replace(/\.[^/.]+$/, ''),
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Cloudinary upload returned empty result'));
            }
            resolve({
              url: result.secure_url,
              key: result.public_id,
              sizeBytes: result.bytes || buffer.length,
            });
          }
        );
        stream.end(buffer);
      });

      const res = await uploadPromise;
      return res;
    } catch (err) {
      console.error('Cloudinary upload error, checking fallback options:', err);
    }
  }

  // 2. Secondary: Cloudflare R2 / S3
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
  const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = process.env.R2_BUCKET_NAME;
  const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (r2AccountId && r2AccessKey && r2SecretKey && r2Bucket) {
    try {
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      });

      const key = `photos/${safeFilename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      const publicUrl = r2PublicDomain
        ? `${r2PublicDomain.replace(/\/$/, '')}/${key}`
        : `https://${r2Bucket}.${r2AccountId}.r2.cloudflarestorage.com/${key}`;

      return {
        url: publicUrl,
        key,
        sizeBytes: buffer.length,
      };
    } catch (err) {
      console.error('Cloudflare R2 upload error, falling back to persistent local storage:', err);
    }
  }

  // 3. Fallback: Persistent local disk driver (public/uploads/)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, safeFilename);
  await fs.promises.writeFile(filePath, buffer);

  const publicUrl = `/uploads/${safeFilename}`;
  return {
    url: publicUrl,
    key: safeFilename,
    sizeBytes: buffer.length,
  };
}

export async function uploadDocumentFile(
  buffer: Buffer,
  filename: string,
  mimeType = 'application/pdf'
): Promise<UploadResult> {
  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // For files larger than 10MB, store directly to persistent disk to prevent Cloudinary payload timeouts
  const isLargeFile = buffer.length > 10 * 1024 * 1024;

  if (cloudinaryConfigured && !isLargeFile) {
    try {
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Cloudinary upload timed out')), 6000);
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'summitconnect/documents',
            public_id: safeFilename.replace(/\.[^/.]+$/, ''),
            resource_type: 'auto',
          },
          (error, result) => {
            clearTimeout(timeout);
            if (error || !result) {
              return reject(error || new Error('Cloudinary upload returned empty result'));
            }
            resolve({
              url: result.secure_url,
              key: result.public_id,
              sizeBytes: result.bytes || buffer.length,
            });
          }
        );
        stream.end(buffer);
      });

      const res = await uploadPromise;
      return res;
    } catch (err) {
      console.warn('Cloudinary document upload skipped/failed, saving directly to local disk:', err);
    }
  }

  // 2. High-speed local filesystem storage in public/uploads/ (supports up to 100MB+)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, safeFilename);
  await fs.promises.writeFile(filePath, buffer);

  return {
    url: `/uploads/${safeFilename}`,
    key: safeFilename,
    sizeBytes: buffer.length,
  };
}

