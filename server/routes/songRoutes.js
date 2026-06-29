const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { upload, uploadToCloudinary } = require('../config/cloudinary');

// POST /api/songs/upload
router.post(
  '/upload',
  upload.fields([
    { name: 'audioFile', maxCount: 1 },
    { name: 'imageFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Validate that both files are present
      if (!req.files || !req.files['audioFile'] || !req.files['imageFile']) {
        return res.status(400).json({
          success: false,
          message: 'Both audioFile and imageFile are required.'
        });
      }

      const { title, artist, album, duration } = req.body;

      // Validate required metadata fields
      if (!title || !artist) {
        return res.status(400).json({
          success: false,
          message: 'Title and artist are required metadata fields.'
        });
      }

      const audioFile = req.files['audioFile'][0];
      const imageFile = req.files['imageFile'][0];

      // Upload files to Cloudinary in parallel
      // Cloudinary treats audio uploads as 'video' resource type
      const audioUploadPromise = uploadToCloudinary(audioFile.buffer, 'video');
      const imageUploadPromise = uploadToCloudinary(imageFile.buffer, 'image');

      const [audioResult, imageResult] = await Promise.all([
        audioUploadPromise,
        imageUploadPromise
      ]);

      // Save to database
      const newSong = new Song({
        title,
        artist,
        album: album || '',
        audioUrl: audioResult.secure_url,
        coverUrl: imageResult.secure_url,
        duration: duration || ''
      });

      await newSong.save();

      res.status(201).json({
        success: true,
        message: 'Song uploaded and created successfully.',
        data: newSong
      });
    } catch (error) {
      console.error('Song Upload Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload song files or save to database.',
        error: error.message
      });
    }
  }
);

module.exports = router;
