const mongoose = require('mongoose');

const playlistSongSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    coverUrl: { type: String, default: '' },
    duration: { type: String, default: '3:30' },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a playlist name'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    coverUrl: {
      type: String,
      default: ''
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ownerName: {
      type: String,
      default: 'Spotify User'
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    songs: [playlistSongSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Playlist', playlistSchema);
