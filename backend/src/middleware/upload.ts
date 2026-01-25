import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

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

/**
 * Upload file buffer directly to Cloudinary
 * @param buffer File buffer
 * @param folder Cloudinary folder name
 * @returns Promise<string> Secure URL of uploaded file
 */
export const uploadToCloudinary = async (buffer: Buffer, folder: string = 'sppi_uploads'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: folder,
        resource_type: 'auto' // Auto-detect (image/pdf)
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
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
