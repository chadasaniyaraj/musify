const mongoose = require('mongoose');
const crypto = require('crypto');

const songItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    coverUrl: { type: String, default: '' },
    duration: { type: String, default: '3:30' },
    playedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a display name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Please add a password']
    },
    passwordSalt: {
      type: String,
      required: true
    },
    avatarText: {
      type: String,
      default: 'U'
    },
    avatarColor: {
      type: String,
      default: '#1ed760'
    },
    plan: {
      type: String,
      enum: ['Spotify Free', 'Spotify Premium', 'Spotify Family'],
      default: 'Spotify Premium'
    },
    favorites: [songItemSchema],
    recentlyPlayed: [songItemSchema],
    preferences: {
      favoriteGenres: [{ type: String }],
      preferredLanguage: { type: String, default: 'Hindi' },
      audioQuality: { type: String, enum: ['Normal', 'High', 'Very High'], default: 'High' }
    }
  },
  {
    timestamps: true
  }
);

// Method to set password with secure PBKDF2 hash
userSchema.methods.setPassword = function (password) {
  this.passwordSalt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.passwordSalt, 1000, 64, 'sha512')
    .toString('hex');
};

// Method to validate password against PBKDF2 hash
userSchema.methods.validatePassword = function (password) {
  const hash = crypto
    .pbkdf2Sync(password, this.passwordSalt, 1000, 64, 'sha512')
    .toString('hex');
  return this.passwordHash === hash;
};

// Clean JSON representation (exclude password hashes)
userSchema.methods.toProfileJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatarText: this.avatarText,
    avatarColor: this.avatarColor,
    plan: this.plan,
    favoritesCount: this.favorites ? this.favorites.length : 0,
    favorites: this.favorites || [],
    recentlyPlayed: this.recentlyPlayed ? this.recentlyPlayed.slice(0, 20) : [],
    preferences: this.preferences,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
