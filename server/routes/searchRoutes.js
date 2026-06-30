const express = require('express');
const router = express.Router();
const play = require('play-dl');
const { exec } = require('child_process');
const https = require('https');

// GET /search (Mounted at /api or /api/songs in server.js)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter q is required.'
      });
    }

    const searchResults = await play.search(q, { limit: 5 });

    const songs = searchResults.map((video) => {
      const coverUrl =
        video.thumbnails && video.thumbnails.length > 0
          ? video.thumbnails[video.thumbnails.length - 1].url
          : '';
      return {
        title: video.title || '',
        artist: video.channel ? video.channel.name : 'Unknown Artist',
        id: video.id || '',
        coverUrl: coverUrl
      };
    });

    res.status(200).json(songs);
  } catch (error) {
    console.error('YouTube Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search YouTube.',
      error: error.message
    });
  }
});

// Helper to get direct streaming URL using yt-dlp
function getStreamUrl(videoId) {
  return new Promise((resolve, reject) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    exec(`python -m yt_dlp -g -f bestaudio "${videoUrl}"`, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      const lines = stdout.trim().split('\n');
      const url = lines[lines.length - 1];
      if (!url || !url.startsWith('http')) {
        return reject(new Error('Failed to retrieve a valid stream URL: ' + stdout));
      }
      resolve(url);
    });
  });
}

// GET /stream/:id (Streaming via yt-dlp to bypass play-dl cipher issues)
router.get('/stream/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'A valid Video ID parameter is required.'
      });
    }

    const audioUrl = await getStreamUrl(id);

    // Forward range headers from the client if present
    const options = {};
    if (req.headers.range) {
      options.headers = {
        'range': req.headers.range
      };
    }

    const streamRequest = https.get(audioUrl, options, (streamResponse) => {
      // Forward headers and status code back to the client
      res.writeHead(streamResponse.statusCode, streamResponse.headers);
      streamResponse.pipe(res);
    });

    streamRequest.on('error', (error) => {
      console.error('YouTube Stream Request Error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to stream audio from YouTube.',
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error('YouTube Stream Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to stream audio from YouTube.',
        error: error.message
      });
    }
  }
});

module.exports = router;