const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer memory storage
const storage = multer.memoryStorage();

// File filter to check file types
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audioFile') {
    if (
      file.mimetype === 'audio/mpeg' ||
      file.mimetype === 'audio/mp3' ||
      file.mimetype === 'audio/wav' ||
      file.mimetype === 'audio/x-wav'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for audioFile. Only MP3 and WAV are allowed!'), false);
    }
  } else if (file.fieldname === 'imageFile') {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for imageFile. Only JPEG and PNG are allowed!'), false);
    }
  } else {
    cb(new Error('Unexpected field'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, resourceType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'spotify_clone'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  upload,
  uploadToCloudinary
};
