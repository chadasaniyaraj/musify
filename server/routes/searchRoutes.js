const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const https = require('https');

// In-memory search results cache for instant snappy searches
const searchCache = new Map();

// Helper to perform YouTube search using yt-dlp (bypasses play-dl's broken browseId bug)
function searchYouTube(query, limit = 16) {
  const cacheKey = `${query.toLowerCase().trim()}_${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 15 * 60 * 1000) {
    return Promise.resolve(cached.songs);
  }

  return new Promise((resolve, reject) => {
    execFile(
      'python',
      ['-m', 'yt_dlp', `ytsearch${limit}:${query}`, '--dump-json', '--flat-playlist', '--no-warnings'],
      { maxBuffer: 15 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }

        try {
          const lines = stdout.trim().split('\n').filter(Boolean);
          const songs = lines.map((line, idx) => {
            const video = JSON.parse(line);
            const coverUrl =
              video.thumbnails && video.thumbnails.length > 0
                ? video.thumbnails[video.thumbnails.length - 1].url
                : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

            let durationStr = video.duration_string;
            if (!durationStr && typeof video.duration === 'number') {
              const mins = Math.floor(video.duration / 60);
              const secs = video.duration % 60;
              durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            }

            return {
              id: video.id || '',
              title: video.title || 'Untitled Track',
              artist: video.uploader || video.channel || 'Unknown Artist',
              coverUrl: coverUrl,
              duration: durationStr || '3:45',
              views: video.view_count ? Number(video.view_count).toLocaleString() : null,
              index: idx + 1
            };
          });

          searchCache.set(cacheKey, { songs, time: Date.now() });
          resolve(songs);
        } catch (parseError) {
          reject(parseError);
        }
      }
    );
  });
}

// Regex for filtering out movies, films, trailers, video scenes, reviews, etc.
const MOVIE_OR_NON_MUSIC_REGEX = /\b(movie|movies|film|films|cinema|trailer|trailers|teaser|teasers|scene|scenes|dialogue|dialogues|review|reviews|reaction|reactions|interview|interviews|climax|ending explained|box office|budget|roast|spoiler|spoilers|episode|episodes|web series|season \d+|part \d+|chapter \d+|behind the scenes|shooting|vlog|vlogs|news|gameplay|walkthrough|drawing|planet|cartoon|serial|public review|theatre response|theatre reaction|short film|comedy show|standup comedy|prank|dance step|dance tutorial|dance cover|whatsapp status|status video)\b/i;

const MUSIC_MARKER_REGEX = /\b(song|songs|music|audio|track|soundtrack|ost|lyrics|lyric|remix|lofi|slowed|reverb|dj|bgm|theme|ringtone|acoustic|instrumental|unplugged|album|singer|band|mashup|bass boosted|tune|karaoke)\b/i;

const suggestionsCache = new Map();

// GET /suggestions (Mounted at /api/suggestions?q=...) - Pure Song Suggestions Only (No Movies)
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json([
        'Arijit Singh Songs',
        'Top 50 - Global Hits',
        'Diljit Dosanjh Songs',
        'Taylor Swift Songs',
        'Hanuman Chalisa Audio',
        'Bollywood Lo-Fi Hits',
        'Coke Studio Season 15 Songs',
        'Sidhu Moose Wala Songs'
      ]);
    }

    const cleanQ = q.trim();
    const cacheKey = cleanQ.toLowerCase();
    const cached = suggestionsCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      return res.status(200).json(cached.suggestions);
    }

    const hasSongWord = MUSIC_MARKER_REGEX.test(cleanQ);

    // Query both song-biased and raw query concurrently to capture artist & track variations
    const urls = [
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(cleanQ + (hasSongWord ? '' : ' song'))}`,
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(cleanQ)}`
    ];

    const fetchPromises = urls.map(url =>
      fetch(url)
        .then(r => r.json())
        .catch(() => [])
    );

    const [resSong, resRaw] = await Promise.all(fetchPromises);
    const listSong = (resSong && Array.isArray(resSong[1])) ? resSong[1] : [];
    const listRaw = (resRaw && Array.isArray(resRaw[1])) ? resRaw[1] : [];

    const candidates = [...listSong, ...listRaw];
    const seen = new Set();
    const filteredSuggestions = [];

    for (const rawItem of candidates) {
      if (typeof rawItem !== 'string') continue;
      let text = rawItem.trim();

      // Normalize 'movie songs' or 'movie song' -> 'songs' / 'song'
      text = text.replace(/\bmovie\s+songs?\b/gi, 'songs').replace(/\s+/g, ' ').trim();

      // 1. Strictly discard any suggestion containing movie, trailer, scene, or non-music terms
      if (MOVIE_OR_NON_MUSIC_REGEX.test(text)) {
        continue;
      }

      const hasMusicMarker = MUSIC_MARKER_REGEX.test(text);

      // 2. If the user didn't explicitly include a music keyword and this suggestion doesn't have one:
      if (!hasSongWord && !hasMusicMarker) {
        // If it equals the base query without music context (e.g. 'animal' or 'kgf'), convert to '${cleanQ} song'
        if (text.toLowerCase() === cleanQ.toLowerCase()) {
          text = `${cleanQ} song`;
        } else {
          // Omit ambiguous non-music terms like 'animal sounds' or 'animal attack'
          continue;
        }
      }

      const lowerKey = text.toLowerCase();
      if (!seen.has(lowerKey)) {
        seen.add(lowerKey);
        filteredSuggestions.push(text);
      }

      if (filteredSuggestions.length >= 8) {
        break;
      }
    }

    // Fallback if every candidate was filtered out
    if (filteredSuggestions.length === 0) {
      filteredSuggestions.push(`${cleanQ} song`, `${cleanQ} audio`, `${cleanQ} lofi remix`);
    }

    suggestionsCache.set(cacheKey, { suggestions: filteredSuggestions, time: Date.now() });
    res.status(200).json(filteredSuggestions);
  } catch (error) {
    console.error('Suggestions Error:', error);
    res.status(200).json([
      `${req.query.q || 'Song'} song`,
      `${req.query.q || 'Song'} audio track`,
      `${req.query.q || 'Song'} remix`
    ]);
  }
});

// GET /search (Mounted at /api in server.js -> http://localhost:PORT/api/search?q=...)
router.get('/search', async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter q is required.'
      });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 16, 5), 30);
    const songs = await searchYouTube(q.trim(), parsedLimit);
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

// GET /browse (Popular song collections for the user to explore)
router.get('/browse', async (req, res) => {
  try {
    const category = req.query.category || 'Top Bollywood Songs 2026';
    const songs = await searchYouTube(category, 12);
    res.status(200).json(songs);
  } catch (error) {
    console.error('Browse Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load browse tracks.',
      error: error.message
    });
  }
});

// Song Details Cache
const songDetailsCache = new Map();

// GET /song/:id (Get rich metadata and recommendations for a specific song)
router.get('/song/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: 'Valid song ID required.' });
    }

    // Check cache
    const cached = songDetailsCache.get(id);
    if (cached && Date.now() - cached.time < 30 * 60 * 1000) {
      return res.status(200).json(cached.data);
    }

    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
    execFile(
      'python',
      ['-m', 'yt_dlp', videoUrl, '--dump-json', '--flat-playlist', '--no-warnings'],
      { timeout: 15000, maxBuffer: 10 * 1024 * 1024 },
      async (error, stdout) => {
        let details = null;
        if (!error && stdout) {
          try {
            const raw = JSON.parse(stdout.trim().split('\n')[0]);
            let durationStr = raw.duration_string;
            if (!durationStr && typeof raw.duration === 'number') {
              const mins = Math.floor(raw.duration / 60);
              const secs = raw.duration % 60;
              durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            }

            const coverUrl =
              raw.thumbnails && raw.thumbnails.length > 0
                ? raw.thumbnails[raw.thumbnails.length - 1].url
                : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

            details = {
              id: id,
              title: raw.title || req.query.title || 'Unknown Track',
              artist: raw.uploader || raw.channel || req.query.artist || 'Unknown Artist',
              coverUrl: coverUrl,
              duration: durationStr || req.query.duration || '3:30',
              views: raw.view_count ? Number(raw.view_count).toLocaleString() : '1,500,000+ plays',
              likes: raw.like_count ? Number(raw.like_count).toLocaleString() : '85,000+',
              uploadDate: raw.upload_date ? `${raw.upload_date.slice(0, 4)}-${raw.upload_date.slice(4, 6)}-${raw.upload_date.slice(6, 8)}` : '2025',
              description: raw.description ? raw.description.slice(0, 320) + '...' : '',
              channelUrl: raw.uploader_url || `https://www.youtube.com/watch?v=${id}`,
              channelFollowers: raw.channel_follower_count ? Number(raw.channel_follower_count).toLocaleString() : null
            };
          } catch (e) {
            console.error('Error parsing yt-dlp details:', e);
          }
        }

        if (!details) {
          details = {
            id: id,
            title: req.query.title || 'Spotify Track',
            artist: req.query.artist || 'Featured Artist',
            coverUrl: req.query.coverUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            duration: req.query.duration || '3:45',
            views: '3,850,000+ plays',
            likes: '120,000+',
            uploadDate: '2025',
            description: 'High definition audio track streamed directly through Spotify Web Player clone.'
          };
        }

        // Fetch 5 related songs based on artist or title for recommendations
        try {
          const searchQuery = details.artist !== 'Unknown Artist' ? details.artist : details.title;
          const related = await searchYouTube(searchQuery, 7);
          details.recommendations = related.filter(s => s.id !== id).slice(0, 5);
        } catch (recErr) {
          details.recommendations = [];
        }

        songDetailsCache.set(id, { data: details, time: Date.now() });
        res.status(200).json(details);
      }
    );
  } catch (err) {
    console.error('Song Details Route Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// In-memory stream URL cache to make playback instant for recently requested songs
const streamCache = new Map();

// Helper to get direct streaming URL using yt-dlp
function getStreamUrl(videoId) {
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.time < 30 * 60 * 1000) {
    return Promise.resolve(cached.url);
  }

  return new Promise((resolve, reject) => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      '-m',
      'yt_dlp',
      '--no-warnings',
      '--no-playlist',
      '-g',
      '-f',
      'ba/b',
      videoUrl
    ];

    execFile('python', args, { timeout: 25000 }, (error, stdout) => {
      if (error) {
        // Fallback to -f best if ba/b fails
        const fallbackArgs = [
          '-m',
          'yt_dlp',
          '--no-warnings',
          '--no-playlist',
          '-g',
          '-f',
          'best',
          videoUrl
        ];
        return execFile('python', fallbackArgs, { timeout: 25000 }, (fallbackErr, fbStdout) => {
          if (fallbackErr) {
            return reject(error);
          }
          const lines = (fbStdout || '').trim().split('\n').filter(Boolean);
          const url = lines[lines.length - 1];
          if (!url || !url.startsWith('http')) {
            return reject(new Error('Invalid stream URL retrieved from fallback'));
          }
          streamCache.set(videoId, { url, time: Date.now() });
          resolve(url);
        });
      }

      const lines = (stdout || '').trim().split('\n').filter(Boolean);
      const url = lines[lines.length - 1];
      if (!url || !url.startsWith('http')) {
        return reject(new Error('Failed to retrieve a valid stream URL: ' + stdout));
      }
      streamCache.set(videoId, { url, time: Date.now() });
      resolve(url);
    });
  });
}

// GET /stream/:id (Streaming route -> redirects browser directly to high-quality audio stream)
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
    res.redirect(audioUrl);
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