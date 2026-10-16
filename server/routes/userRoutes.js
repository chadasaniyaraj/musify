const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const { execFile } = require('child_process');

// Helper to find user by email or ID from headers or query/body
async function resolveUser(req) {
  const email =
    req.headers['x-user-email'] ||
    (req.query && req.query.userEmail) ||
    (req.body && req.body.userEmail);
  const userId =
    req.headers['x-user-id'] ||
    (req.query && req.query.userId) ||
    (req.body && req.body.userId);

  if (userId) {
    const user = await User.findById(userId);
    if (user) return user;
  }

  if (email) {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) return user;
  }

  // Fallback to demo user if no user specified
  return await User.findOne({ email: 'alex.rivera@spotify.user' });
}

// --------------------------------------------------------------------------
// 1. Favorites / Liked Songs
// --------------------------------------------------------------------------

// GET /api/user/favorites
router.get('/favorites', async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(200).json({ success: true, favorites: [] });
    }
    res.status(200).json({
      success: true,
      favorites: user.favorites || []
    });
  } catch (error) {
    console.error('Get Favorites Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/user/favorites - Toggle like/unlike
router.post('/favorites', async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { song } = req.body;
    if (!song || !song.id || !song.title) {
      return res.status(400).json({ success: false, message: 'Valid song object with id and title required.' });
    }

    const existingIndex = user.favorites.findIndex(f => f.id === song.id);
    let isLiked = false;

    if (existingIndex > -1) {
      // Remove from favorites
      user.favorites.splice(existingIndex, 1);
      isLiked = false;
    } else {
      // Add to favorites
      user.favorites.unshift({
        id: song.id,
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        coverUrl: song.coverUrl || `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`,
        duration: song.duration || '3:30',
        playedAt: new Date()
      });
      isLiked = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      isLiked,
      favoritesCount: user.favorites.length,
      favorites: user.favorites
    });
  } catch (error) {
    console.error('Toggle Favorite Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --------------------------------------------------------------------------
// 2. Recently Played
// --------------------------------------------------------------------------

// GET /api/user/recently-played
router.get('/recently-played', async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(200).json({ success: true, recentlyPlayed: [] });
    }

    res.status(200).json({
      success: true,
      recentlyPlayed: user.recentlyPlayed || []
    });
  } catch (error) {
    console.error('Get Recently Played Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/user/recently-played - Log song listen
router.post('/recently-played', async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(200).json({ success: true, message: 'No user session to log.' });
    }

    const { song } = req.body;
    if (!song || !song.id) {
      return res.status(400).json({ success: false, message: 'Song required.' });
    }

    // Filter out existing occurrence if present to bump to top
    user.recentlyPlayed = user.recentlyPlayed.filter(s => s.id !== song.id);

    user.recentlyPlayed.unshift({
      id: song.id,
      title: song.title || 'Unknown Track',
      artist: song.artist || 'Unknown Artist',
      coverUrl: song.coverUrl || `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`,
      duration: song.duration || '3:30',
      playedAt: new Date()
    });

    // Keep max 50 entries
    if (user.recentlyPlayed.length > 50) {
      user.recentlyPlayed = user.recentlyPlayed.slice(0, 50);
    }

    await user.save();

    res.status(200).json({
      success: true,
      recentlyPlayed: user.recentlyPlayed.slice(0, 20)
    });
  } catch (error) {
    console.error('Log Recently Played Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --------------------------------------------------------------------------
// 3. Playlists CRUD
// --------------------------------------------------------------------------

// GET /api/user/playlists - Get all playlists owned by user
router.get('/playlists', async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(200).json({ success: true, playlists: [] });
    }

    const playlists = await Playlist.find({ owner: user._id }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      playlists: playlists || []
    });
  } catch (error) {
    console.error('Get Playlists Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/user/playlists - Create new custom playlist
router.post('/playlists', async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account required to create playlists.' });
    }

    const { name, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Playlist name is required.' });
    }

    const newPlaylist = new Playlist({
      name: name.trim(),
      description: description ? description.trim() : 'Personal playlist created on Spotify Web Player',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
      owner: user._id,
      ownerName: user.name,
      songs: []
    });

    await newPlaylist.save();

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully.',
      playlist: newPlaylist
    });
  } catch (error) {
    console.error('Create Playlist Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/user/playlists/:id/songs - Add song to playlist
router.post('/playlists/:id/songs', async (req, res) => {
  try {
    const { id } = req.params;
    const { song } = req.body;

    if (!song || !song.id) {
      return res.status(400).json({ success: false, message: 'Song data is required.' });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }

    // Check if song already in playlist
    if (!playlist.songs.some(s => s.id === song.id)) {
      playlist.songs.push({
        id: song.id,
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        coverUrl: song.coverUrl || `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`,
        duration: song.duration || '3:30',
        addedAt: new Date()
      });

      // Update cover to latest song cover if default
      if (song.coverUrl && (!playlist.coverUrl || playlist.coverUrl.includes('unsplash'))) {
        playlist.coverUrl = song.coverUrl;
      }

      await playlist.save();
    }

    res.status(200).json({
      success: true,
      message: 'Song added to playlist.',
      playlist
    });
  } catch (error) {
    console.error('Add Song to Playlist Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/user/playlists/:id/songs/:songId - Remove song from playlist
router.delete('/playlists/:id/songs/:songId', async (req, res) => {
  try {
    const { id, songId } = req.params;
    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }

    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    await playlist.save();

    res.status(200).json({
      success: true,
      message: 'Song removed from playlist.',
      playlist
    });
  } catch (error) {
    console.error('Remove Song Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/user/playlists/:id - Delete whole playlist
router.delete('/playlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Playlist.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Playlist deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Playlist Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --------------------------------------------------------------------------
// 4. Personalized Music Recommendations
// --------------------------------------------------------------------------

// GET /api/user/recommendations - Smart song recommendations based on preferences
router.get('/recommendations', async (req, res) => {
  try {
    const user = await resolveUser(req);
    let sampleQuery = 'Top Bollywood Songs 2026';

    if (user && user.favorites && user.favorites.length > 0) {
      const randomFav = user.favorites[Math.floor(Math.random() * user.favorites.length)];
      sampleQuery = `${randomFav.artist} songs`;
    } else if (user && user.recentlyPlayed && user.recentlyPlayed.length > 0) {
      sampleQuery = `${user.recentlyPlayed[0].artist} hits`;
    }

    // Call ytsearch for recommendation candidates
    execFile(
      'python',
      ['-m', 'yt_dlp', `ytsearch10:${sampleQuery}`, '--dump-json', '--flat-playlist', '--no-warnings'],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error || !stdout) {
          return res.status(200).json({
            success: true,
            recommendations: []
          });
        }

        try {
          const lines = stdout.trim().split('\n').filter(Boolean);
          const recs = lines.map((line, idx) => {
            const video = JSON.parse(line);
            return {
              id: video.id,
              title: video.title || 'Recommended Track',
              artist: video.uploader || video.channel || 'Featured Artist',
              coverUrl: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
              duration: video.duration_string || '3:30',
              index: idx + 1
            };
          });

          res.status(200).json({
            success: true,
            basis: sampleQuery,
            recommendations: recs
          });
        } catch (pe) {
          res.status(200).json({ success: true, recommendations: [] });
        }
      }
    );
  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
