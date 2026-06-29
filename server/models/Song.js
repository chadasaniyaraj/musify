const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a song title'],
      trim: true
    },
    artist: {
      type: String,
      required: [true, 'Please add an artist name'],
      trim: true
    },
    album: {
      type: String,
      trim: true
    },
    audioUrl: {
      type: String,
      required: [true, 'Please add an audio URL']
    },
    coverUrl: {
      type: String,
      required: [true, 'Please add a cover image URL']
    },
    duration: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Song', songSchema);
