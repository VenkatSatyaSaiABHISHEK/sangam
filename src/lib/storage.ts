import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure Cloudflare R2 (Primary Storage)
const r2AccessKey = process.env.R2_ACCESS_KEY_ID?.trim().replace(/^["']|["']$/g, '');
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY?.trim().replace(/^["']|["']$/g, '');
const r2Bucket = process.env.R2_BUCKET_NAME?.trim().replace(/^["']|["']$/g, '') || 'vs-game';
const r2Endpoint =
  process.env.R2_ENDPOINT?.trim().replace(/^["']|["']$/g, '') ||
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);
const r2PublicPrefix = (
  process.env.R2_PUBLIC_URL_PREFIX ||
  process.env.R2_PUBLIC_DOMAIN ||
  ''
).trim().replace(/^["']|["']$/g, '');

const r2Configured = Boolean(r2AccessKey && r2SecretKey && r2Bucket && r2Endpoint);

// Singleton reusable S3 Client for Cloudflare R2 (connection reuse, keep-alive, socket pool)
let r2ClientInstance: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (!r2Configured) return null;
  if (!r2ClientInstance) {
    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint!,
      credentials: {
        accessKeyId: r2AccessKey!,
        secretAccessKey: r2SecretKey!,
      },
      maxAttempts: 3,
    });
  }
  return r2ClientInstance;
}

// Configure Cloudinary (Secondary Backup Storage)
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

  // 1. PRIMARY: Cloudflare R2 (Ultra-fast, zero-egress S3 compatible storage)
  if (r2Configured) {
    try {
      const s3 = getR2Client();
      if (!s3) throw new Error('R2 client not initialized');

      const key = `photos/${safeFilename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      const publicUrl = r2PublicPrefix
        ? `${r2PublicPrefix.replace(/\/$/, '')}/${key}`
        : `${r2Endpoint!.replace(/\/$/, '')}/${r2Bucket}/${key}`;

      return {
        url: publicUrl,
        key,
        sizeBytes: buffer.length,
      };
    } catch (err) {
      console.error('Cloudflare R2 primary upload failed, falling back to Cloudinary:', err);
    }
  }

  // 2. SECONDARY BACKUP: Cloudinary Live CDN Upload
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
      console.error('Cloudinary backup upload error, falling back to local storage:', err);
    }
  }

  // 3. TERTIARY FALLBACK: Persistent local disk driver (public/uploads/)
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

  // 1. PRIMARY: Cloudflare R2
  if (r2Configured) {
    try {
      const s3 = getR2Client();
      if (!s3) throw new Error('R2 client not initialized');

      const key = `documents/${safeFilename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      const publicUrl = r2PublicPrefix
        ? `${r2PublicPrefix.replace(/\/$/, '')}/${key}`
        : `${r2Endpoint!.replace(/\/$/, '')}/${r2Bucket}/${key}`;

      return {
        url: publicUrl,
        key,
        sizeBytes: buffer.length,
      };
    } catch (err) {
      console.warn('Cloudflare R2 document upload error, attempting fallback:', err);
    }
  }

  // 2. SECONDARY: Cloudinary (for files <= 10MB)
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

  // 3. TERTIARY: Local filesystem storage in public/uploads/
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


