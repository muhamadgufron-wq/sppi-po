import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use Memory Storage for Vercel (Serverless)
const storage = multer.memoryStorage();

// File filter (Images & PDF)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  // Check mime type and extension
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file JPG, PNG, atau PDF yang diizinkan!'));
  }
};

// Initialize Multer
export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Helper to save file locally
const saveFileLocally = async (buffer: Buffer, originalname: string, folder: string): Promise<string> => {
  // Generate filename
  // Determine extension from originalname, default to .jpg if missing
  const ext = originalname ? path.extname(originalname) : '.jpg';
  const timestamp = Date.now();
  const folderPrefix = folder.replace('sppi_', '');
  const filename = `${folderPrefix}-${timestamp}-${Math.floor(Math.random() * 1000)}${ext}`;
  
  // Ensure uploads directory exists
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, filename);
  await fs.promises.writeFile(filepath, buffer);
  
  // Return relative path for DB (e.g. "uploads/filename.jpg")
  // Note: path.join uses backslashes on Windows, but URL should be forward slash
  return `uploads/${filename}`;
};

/**
 * Upload file buffer directly to Cloudinary (with local fallback)
 * @param buffer File buffer
 * @param folder Cloudinary folder name
 * @param originalname Original filename for local fallback
 * @returns Promise<string> Secure URL of uploaded file (or local path)
 */
export const uploadToCloudinary = async (buffer: Buffer, folder: string = 'sppi_uploads', originalname: string = 'file.jpg'): Promise<string> => {
  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('⚠️ Cloudinary not configured. Falling back to local storage.');
    return saveFileLocally(buffer, originalname, folder);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: folder,
        resource_type: 'auto' // Auto-detect (image/pdf)
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          // If Cloudinary fails (e.g. bad connection), fallback to local? 
          // For now, let's reject to be explicit about failure if config exists but upload fails.
          // But maybe we should fallback? Let's stick to reject for now unless it is config error.
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Cloudinary upload failed: No result'));
        }
        resolve(result.secure_url);
      }
    );

    // Write buffer to stream
    uploadStream.end(buffer);
  });
};
