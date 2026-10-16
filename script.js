// Frontend environment check (prevents crashing if accidentally executed with Node.js/nodemon)
if (typeof document === 'undefined') {
    console.error("\n❌ ERROR: script.js is frontend browser code, not a Node.js server!");
    console.error("👉 To start your backend server, run: cd server && nodemon server.js");
    console.error("👉 To use script.js, open index.html in your browser.\n");
    if (typeof process !== 'undefined') process.exit(1);
}

const BACKEND_URL = "http://localhost:5000/api";

// ==========================================
// Player State & Interactive Controls
// ==========================================
let currentAudio = null;
let isPlaying = false;
let currentPlaylist = [];
let currentIndex = -1;
let isShuffle = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'
let lastVolume = 0.8;
let userQueue = [];
let currentPlayingVideoId = null;
let currentPlayingSongMeta = null;

// DOM Elements - Center Controls
const playPauseBtn = document.getElementById("play-pause-btn");
const playIcon = document.getElementById("play-icon");
const progressBar = document.getElementById("slider");
const currTimeSpan = document.getElementById("curr-time");
const totalTimeSpan = document.getElementById("total-time");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const repeatBtn = document.getElementById("repeat-btn");

// DOM Elements - Left Album Section
const currentCover = document.getElementById("current-cover");
const currentTitle = document.getElementById("current-title");
const currentArtist = document.getElementById("current-artist");
const likeBtn = document.getElementById("like-btn");
const pipBtn = document.getElementById("pip-btn");

// DOM Elements - Right Controls & Volume
const volumeSlider = document.getElementById("volume-slider");
const volumeIcon = document.getElementById("volume-icon");
const volumeIconBtn = document.getElementById("volume-icon-btn");
const lyricsBtn = document.getElementById("lyrics-btn");
const queueBtn = document.getElementById("queue-btn");
const deviceBtn = document.getElementById("device-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const searchInput = document.getElementById("search-input");

// DOM Elements - Overlays & Panels
const queuePanelOverlay = document.getElementById("queue-panel-overlay");
const queueCloseBtn = document.getElementById("queue-close-btn");
const queueClearBtn = document.getElementById("queue-clear-btn");
const queueUpcomingList = document.getElementById("queue-upcoming-list");

const lyricsOverlayPanel = document.getElementById("lyrics-overlay-panel");
const lyricsCloseBtn = document.getElementById("lyrics-close-btn");
const lyricsContentContainer = document.getElementById("lyrics-content-container");

const deviceModalOverlay = document.getElementById("device-modal-overlay");
const deviceModalClose = document.getElementById("device-modal-close");

const miniPlayerOverlay = document.getElementById("mini-player-overlay");
const miniCloseBtn = document.getElementById("mini-close-btn");
const miniPlayBtn = document.getElementById("mini-play-btn");
const miniPlayIcon = document.getElementById("mini-play-icon");
const miniPrevBtn = document.getElementById("mini-prev-btn");
const miniNextBtn = document.getElementById("mini-next-btn");

// ==========================================
// 1. Liked Songs Management (localStorage)
// ==========================================
const LIKED_SONGS_KEY = "spotify_clone_liked_songs";

function getLikedSongs() {
    try {
        const stored = localStorage.getItem(LIKED_SONGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error("Error reading liked songs:", e);
    }
    // Pre-seeded starter songs so user's liked library is populated right away
    return [
        { id: "BddP6PYo2gs", title: "Kesariya", artist: "Arijit Singh, Pritam", coverUrl: "https://i.ytimg.com/vi/BddP6PYo2gs/mqdefault.jpg", duration: "4:28" },
        { id: "VAdGW7QDJiU", title: "Chaleya", artist: "Arijit Singh, Shilpa Rao", coverUrl: "https://i.ytimg.com/vi/VAdGW7QDJiU/mqdefault.jpg", duration: "3:20" },
        { id: "mH_LFkWxpI0", title: "Lover", artist: "Diljit Dosanjh", coverUrl: "https://i.ytimg.com/vi/mH_LFkWxpI0/mqdefault.jpg", duration: "3:22" },
        { id: "UEvOsQBu1jY", title: "Apna Bana Le", artist: "Arijit Singh", coverUrl: "https://i.ytimg.com/vi/UEvOsQBu1jY/mqdefault.jpg", duration: "4:21" },
        { id: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran", coverUrl: "https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg", duration: "3:53" },
        { id: "RIPaQQ7u_os", title: "Tu Hai Kahan", artist: "AUR", coverUrl: "https://i.ytimg.com/vi/RIPaQQ7u_os/mqdefault.jpg", duration: "4:15" }
    ];
}

function saveLikedSongs(songs) {
    try {
        localStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(songs));
    } catch (e) {
        console.error("Error saving liked songs:", e);
    }
    updateLikedSongsSidebarCount();
}

function updateLikedSongsSidebarCount() {
    const list = getLikedSongs();
    const sub = document.querySelector("#sidebar-liked-songs .lib-item-subtitle");
    if (sub) {
        sub.innerHTML = `<i class="fa-solid fa-thumbtack pin-icon"></i> Playlist • ${list.length} songs`;
    }
}

function isSongLiked(id) {
    if (!id) return false;
    const list = getLikedSongs();
    return list.some(s => s.id === id);
}

function toggleLikeSong(meta) {
    if (!meta || !meta.id) {
        showToast("Play a song first to like it!");
        return false;
    }
    const list = getLikedSongs();
    const idx = list.findIndex(s => s.id === meta.id);
    let nowLiked = false;

    if (idx >= 0) {
        list.splice(idx, 1);
        nowLiked = false;
        showToast(`Removed "${meta.title || 'Track'}" from your Liked Songs`);
    } else {
        list.unshift({
            id: meta.id,
            title: meta.title || 'Unknown Track',
            artist: meta.artist || 'Featured Artist',
            coverUrl: meta.coverUrl || `https://i.ytimg.com/vi/${meta.id}/mqdefault.jpg`,
            duration: meta.duration || '3:30',
            addedAt: Date.now()
        });
        nowLiked = true;
        showToast(`Saved "${meta.title || 'Track'}" to your Liked Songs`);
    }

    saveLikedSongs(list);
    updateLikeButtonUI(meta.id, nowLiked);
    return nowLiked;
}

function updateLikeButtonUI(id, isLiked) {
    if (likeBtn) {
        if (isLiked) {
            likeBtn.className = "fa-solid fa-heart song-like album-in active";
            likeBtn.title = "Remove from Liked Songs";
        } else {
            likeBtn.className = "fa-regular fa-heart song-like album-in";
            likeBtn.title = "Save to Liked Songs";
        }
    }
    // Synchronize track-row and card heart icons
    document.querySelectorAll(`.track-row[data-id="${id}"] .track-row-like, .card[data-id="${id}"] .track-row-like`).forEach(heart => {
        heart.classList.toggle("fa-solid", isLiked);
        heart.classList.toggle("fa-regular", !isLiked);
        heart.classList.toggle("active", isLiked);
    });
}

// Initial count in sidebar
updateLikedSongsSidebarCount();

// ==========================================
// 2. Play / Pause & Global Icon Updates
// ==========================================
function updatePlayIcon(playing) {
    isPlaying = playing;
    if (playIcon) {
        if (playing) {
            playIcon.classList.remove("fa-play");
            playIcon.classList.add("fa-pause");
            if (playPauseBtn) {
                playPauseBtn.classList.add("playing");
                playPauseBtn.title = "Pause";
            }
        } else {
            playIcon.classList.remove("fa-pause");
            playIcon.classList.add("fa-play");
            if (playPauseBtn) {
                playPauseBtn.classList.remove("playing");
                playPauseBtn.title = "Play";
            }
        }
    }

    // Update Mini player play button
    if (miniPlayIcon) {
        miniPlayIcon.classList.toggle("fa-pause", playing);
        miniPlayIcon.classList.toggle("fa-play", !playing);
    }

    // Update Detail view play button & equalizer wave bars
    const detailPlayIcon = document.getElementById("detail-main-play-icon");
    const detailPlayBtn = document.getElementById("detail-main-play-btn");
    const eqBars = document.querySelectorAll(".eq-bar");

    if (detailPlayIcon) {
        detailPlayIcon.classList.toggle("fa-pause", playing);
        detailPlayIcon.classList.toggle("fa-play", !playing);
        if (detailPlayBtn) detailPlayBtn.title = playing ? "Pause Track" : "Play Track";
    }
    eqBars.forEach(bar => bar.classList.toggle("animating", playing));
}

function togglePlayPause() {
    if (currentAudio) {
        if (currentAudio.paused) {
            currentAudio.play().then(() => updatePlayIcon(true)).catch(console.error);
        } else {
            currentAudio.pause();
            updatePlayIcon(false);
        }
    } else {
        // If nothing is playing yet, play the first track in current playlist or homepage
        if (currentPlaylist.length > 0) {
            playTrackFromPlaylist(0);
        } else {
            const homeSongs = typeof getHomepagePlaylist === 'function' ? getHomepagePlaylist() : [];
            if (homeSongs.length > 0) {
                playTrack(homeSongs[0].id, homeSongs[0].title, homeSongs[0].artist, homeSongs[0].coverUrl, 0, homeSongs);
            } else {
                searchSongs("Hanuman Chalisa");
            }
        }
    }
}

if (playPauseBtn) {
    playPauseBtn.addEventListener("click", togglePlayPause);
}

// ==========================================
// 3. Playback Engine: Sequential Line by Line
// ==========================================
function updatePlayingTrackUI(videoId) {
    currentPlayingVideoId = videoId;
    document.querySelectorAll(".track-row").forEach(row => {
        row.classList.toggle("playing", row.dataset.id === videoId);
    });
    document.querySelectorAll(".card").forEach(card => {
        card.classList.toggle("playing", card.dataset.id === videoId);
    });
}

function playTrack(videoId, title, artist, coverUrl, index = -1, playlist = null) {
    if (playlist && Array.isArray(playlist) && playlist.length > 0) {
        currentPlaylist = playlist;
        currentIndex = index >= 0 ? index : currentPlaylist.findIndex(s => s.id === videoId);
    } else if (index >= 0) {
        currentIndex = index;
    } else if (currentPlaylist.length > 0) {
        const found = currentPlaylist.findIndex(s => s.id === videoId);
        if (found >= 0) currentIndex = found;
    }

    // Default to homepage catalog if playlist not set
    if (currentPlaylist.length === 0) {
        currentPlaylist = getHomepagePlaylist();
        currentIndex = currentPlaylist.findIndex(s => s.id === videoId);
        if (currentIndex < 0) {
            currentPlaylist.unshift({ id: videoId, title, artist, coverUrl, duration: '3:30' });
            currentIndex = 0;
        }
    }

    currentPlayingVideoId = videoId;
    currentPlayingSongMeta = { id: videoId, title, artist, coverUrl };

    // Update Player UI Info
    if (currentTitle) currentTitle.innerText = title;
    if (currentArtist) currentArtist.innerText = artist;
    if (currentCover && coverUrl) currentCover.src = coverUrl;

    // Update Mini-Player UI
    const miniThumb = document.getElementById("mini-thumb");
    const miniTitle = document.getElementById("mini-title");
    const miniArtist = document.getElementById("mini-artist");
    if (miniThumb && coverUrl) miniThumb.src = coverUrl;
    if (miniTitle) miniTitle.innerText = title;
    if (miniArtist) miniArtist.innerText = artist;

    // Update Liked Song state
    updateLikeButtonUI(videoId, isSongLiked(videoId));

    // Update Active Card / Row Highlights
    updatePlayingTrackUI(videoId);

    // Stop current audio if playing
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
    }

    // Reset progress slider & times
    updateSliderProgress(0);
    if (currTimeSpan) currTimeSpan.innerText = "00:00";
    if (totalTimeSpan) totalTimeSpan.innerText = "00:00";

    // Initialize new audio stream
    currentAudio = new Audio(`${BACKEND_URL}/stream/${videoId}`);
    if (volumeSlider) {
        currentAudio.volume = parseFloat(volumeSlider.value) / 100;
    }

    // Audio Event Listeners
    currentAudio.addEventListener("play", () => updatePlayIcon(true));
    currentAudio.addEventListener("pause", () => updatePlayIcon(false));

    currentAudio.addEventListener("loadedmetadata", () => {
        if (totalTimeSpan && currentAudio.duration) {
            totalTimeSpan.innerText = formatTime(currentAudio.duration);
        }
    });

    currentAudio.addEventListener("timeupdate", () => {
        if (currentAudio && currentAudio.duration) {
            const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
            updateSliderProgress(percent);
            if (currTimeSpan) currTimeSpan.innerText = formatTime(currentAudio.currentTime);
            if (totalTimeSpan) totalTimeSpan.innerText = formatTime(currentAudio.duration);
        }
    });

    // Auto next song playback (line by line)
    currentAudio.addEventListener("ended", () => {
        if (repeatMode === 'one') {
            currentAudio.currentTime = 0;
            currentAudio.play().then(() => updatePlayIcon(true)).catch(console.error);
        } else {
            playNextTrack();
        }
    });

    // Start playing
    currentAudio.play()
        .then(() => updatePlayIcon(true))
        .catch(err => {
            console.error("Playback failed:", err);
            updatePlayIcon(false);
        });

    // Update Queue panel & Lyrics if open
    renderQueueList();
    if (lyricsOverlayPanel && lyricsOverlayPanel.classList.contains("open")) {
        loadLyricsForCurrentSong();
    }
}

function playTrackFromPlaylist(idx) {
    if (!currentPlaylist || currentPlaylist.length === 0) {
        currentPlaylist = getHomepagePlaylist();
    }
    if (currentPlaylist.length === 0) return;

    if (idx < 0) idx = currentPlaylist.length - 1;
    if (idx >= currentPlaylist.length) idx = 0;

    currentIndex = idx;
    const song = currentPlaylist[currentIndex];
    if (song) {
        playTrack(song.id, song.title, song.artist, song.coverUrl, currentIndex);
    }
}

// Next song: advances line by line sequentially or pulls from queue
function playNextTrack() {
    // 1. Play from explicit user queue if present
    if (userQueue.length > 0) {
        const nextSong = userQueue.shift();
        playTrack(nextSong.id, nextSong.title, nextSong.artist, nextSong.coverUrl, -1, currentPlaylist);
        showToast(`Playing from Queue: ${nextSong.title}`);
        renderQueueList();
        return;
    }

    if (!currentPlaylist || currentPlaylist.length === 0) {
        currentPlaylist = getHomepagePlaylist();
        currentIndex = -1;
    }
    if (currentPlaylist.length === 0) return;

    if (repeatMode === 'one' && currentAudio) {
        currentAudio.currentTime = 0;
        currentAudio.play();
        return;
    }

    let nextIdx;
    if (isShuffle) {
        if (currentPlaylist.length > 1) {
            do {
                nextIdx = Math.floor(Math.random() * currentPlaylist.length);
            } while (nextIdx === currentIndex);
        } else {
            nextIdx = 0;
        }
    } else {
        // Line by line advancement
        nextIdx = currentIndex + 1;
        if (nextIdx >= currentPlaylist.length) {
            nextIdx = 0; // loops back to start line by line
        }
    }

    currentIndex = nextIdx;
    const song = currentPlaylist[currentIndex];
    if (song) {
        playTrack(song.id, song.title, song.artist, song.coverUrl, currentIndex);
        showToast(`Next Song: ${song.title}`);
    }
}

// Previous song: restarts if > 3s, else advances backward line by line
function playPrevTrack() {
    if (currentAudio && currentAudio.currentTime > 3) {
        currentAudio.currentTime = 0;
        updateSliderProgress(0);
        return;
    }

    if (!currentPlaylist || currentPlaylist.length === 0) {
        currentPlaylist = getHomepagePlaylist();
        currentIndex = 0;
    }
    if (currentPlaylist.length === 0) return;

    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
        prevIdx = currentPlaylist.length - 1;
    }

    currentIndex = prevIdx;
    const song = currentPlaylist[currentIndex];
    if (song) {
        playTrack(song.id, song.title, song.artist, song.coverUrl, currentIndex);
        showToast(`Previous Song: ${song.title}`);
    }
}

function addToQueue(song) {
    if (!song || !song.id) return;
    userQueue.push({
        id: song.id,
        title: song.title || 'Track',
        artist: song.artist || 'Artist',
        coverUrl: song.coverUrl || `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`,
        duration: song.duration || '3:30'
    });
    renderQueueList();
    showToast(`Added "${song.title}" to play queue`);
}

if (nextBtn) nextBtn.addEventListener("click", playNextTrack);
if (prevBtn) prevBtn.addEventListener("click", playPrevTrack);

// ==========================================
// 4. Slider Progress Fill & Scrubbing
// ==========================================
function updateSliderProgress(percent) {
    if (!progressBar) return;
    progressBar.value = percent;
    progressBar.style.setProperty("--progress-percent", `${percent}%`);
}

if (progressBar) {
    progressBar.addEventListener("input", (e) => {
        const percent = e.target.value;
        progressBar.style.setProperty("--progress-percent", `${percent}%`);
        if (currentAudio && currentAudio.duration) {
            const previewTime = (percent / 100) * currentAudio.duration;
            if (currTimeSpan) currTimeSpan.innerText = formatTime(previewTime);
        }
    });

    progressBar.addEventListener("change", (e) => {
        if (currentAudio && currentAudio.duration) {
            const newTime = (e.target.value / 100) * currentAudio.duration;
            currentAudio.currentTime = newTime;
        }
    });
}

// ==========================================
// 5. Volume Control & Mute Toggle
// ==========================================
function updateVolumeFill(val) {
    if (!volumeSlider) return;
    volumeSlider.value = val;
    volumeSlider.style.setProperty("--volume-percent", `${val}%`);
}

function updateVolumeIcon(val) {
    if (!volumeIcon) return;
    volumeIcon.className = "fa-solid control-side-icon";
    if (val === 0) {
        volumeIcon.classList.add("fa-volume-xmark");
        if (volumeIconBtn) volumeIconBtn.title = "Unmute";
    } else if (val < 50) {
        volumeIcon.classList.add("fa-volume-low");
        if (volumeIconBtn) volumeIconBtn.title = "Mute";
    } else {
        volumeIcon.classList.add("fa-volume-high");
        if (volumeIconBtn) volumeIconBtn.title = "Mute";
    }
}

if (volumeSlider) {
    updateVolumeFill(volumeSlider.value);

    volumeSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        updateVolumeFill(val);
        updateVolumeIcon(val);
        if (currentAudio) {
            currentAudio.volume = val / 100;
        }
    });
}

if (volumeIconBtn) {
    volumeIconBtn.addEventListener("click", () => {
        if (!volumeSlider) return;
        const currentVal = parseFloat(volumeSlider.value);
        if (currentVal > 0) {
            lastVolume = currentVal;
            updateVolumeFill(0);
            updateVolumeIcon(0);
            if (currentAudio) currentAudio.volume = 0;
            showToast("Muted");
        } else {
            const restored = lastVolume > 0 ? lastVolume : 80;
            updateVolumeFill(restored);
            updateVolumeIcon(restored);
            if (currentAudio) currentAudio.volume = restored / 100;
            showToast(`Volume ${Math.round(restored)}%`);
        }
    });
}

// ==========================================
// 6. Playbar Controls: Shuffle, Repeat, Like & Options
// ==========================================
// Shuffle Button
if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle("active", isShuffle);
        shuffleBtn.title = isShuffle ? "Disable shuffle" : "Enable shuffle";
        showToast(isShuffle ? "Shuffle ON" : "Shuffle OFF");
    });
}

// Repeat Button (Tri-state: Off -> Repeat All -> Repeat One)
if (repeatBtn) {
    repeatBtn.addEventListener("click", () => {
        if (repeatMode === 'off') {
            repeatMode = 'all';
            repeatBtn.classList.add("active");
            repeatBtn.title = "Repeat Playlist (Click for Repeat Track)";
            repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            showToast("Repeat Playlist ON");
        } else if (repeatMode === 'all') {
            repeatMode = 'one';
            repeatBtn.classList.add("active");
            repeatBtn.title = "Repeat Track (Click to turn off)";
            repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i><span class="repeat-one-badge">1</span>';
            showToast("Repeat Current Track ON");
        } else {
            repeatMode = 'off';
            repeatBtn.classList.remove("active");
            repeatBtn.title = "Enable repeat";
            repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            showToast("Repeat OFF");
        }
    });
}

// Like Button in Playbar
if (likeBtn) {
    likeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentPlayingSongMeta && currentPlayingSongMeta.id) {
            toggleLikeSong(currentPlayingSongMeta);
        } else if (currentPlaylist.length > 0 && currentIndex >= 0) {
            toggleLikeSong(currentPlaylist[currentIndex]);
        } else {
            showToast("Play a song first to like it!");
        }
    });
}

// Clicking Album Cover or Song Title in Playbar opens Song Details
function openNowPlayingDetails() {
    if (currentPlayingVideoId) {
        const meta = currentPlayingSongMeta || {
            id: currentPlayingVideoId,
            title: currentTitle?.innerText || 'Now Playing',
            artist: currentArtist?.innerText || 'Artist',
            coverUrl: currentCover?.src || ''
        };
        openSongDetails(currentPlayingVideoId, meta);
    }
}
if (currentCover) currentCover.addEventListener("click", openNowPlayingDetails);
if (currentTitle) currentTitle.addEventListener("click", openNowPlayingDetails);

// ==========================================
// 7. Playbar Side Options: Queue, Lyrics, Devices, PIP & Fullscreen
// ==========================================

// Queue Drawer / Side Panel
function renderQueueList() {
    if (!queueUpcomingList) return;
    const currThumb = document.getElementById("queue-curr-thumb");
    const currT = document.getElementById("queue-curr-title");
    const currA = document.getElementById("queue-curr-artist");

    if (currentPlayingSongMeta) {
        if (currThumb) currThumb.src = currentPlayingSongMeta.coverUrl;
        if (currT) currT.innerText = currentPlayingSongMeta.title;
        if (currA) currA.innerText = currentPlayingSongMeta.artist;
    }

    let html = "";
    // User Queue
    if (userQueue.length > 0) {
        userQueue.forEach((song, i) => {
            html += `
                <div class="queue-track-row" data-source="user" data-index="${i}">
                    <span class="queue-track-num"><i class="fa-solid fa-list-ol" style="color: #1ed760; font-size: 0.75rem;"></i></span>
                    <img src="${song.coverUrl}" class="queue-track-thumb" alt="${escapeHtml(song.title)}">
                    <div class="queue-track-meta">
                        <div class="queue-track-title">${escapeHtml(song.title)} <span style="font-size: 0.68rem; color: #1ed760;">[Queued]</span></div>
                        <div class="queue-track-artist">${escapeHtml(song.artist)}</div>
                    </div>
                </div>
            `;
        });
    }

    // Playlist upcoming tracks line by line
    if (currentPlaylist && currentPlaylist.length > 0) {
        const total = currentPlaylist.length;
        const upcomingCount = Math.min(12, total - 1);
        for (let step = 1; step <= upcomingCount; step++) {
            const nextIdx = (currentIndex + step) % total;
            const song = currentPlaylist[nextIdx];
            if (song) {
                html += `
                    <div class="queue-track-row" data-source="playlist" data-index="${nextIdx}">
                        <span class="queue-track-num">${step}</span>
                        <img src="${song.coverUrl}" class="queue-track-thumb" alt="${escapeHtml(song.title)}">
                        <div class="queue-track-meta">
                            <div class="queue-track-title">${escapeHtml(song.title)}</div>
                            <div class="queue-track-artist">${escapeHtml(song.artist)}</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    if (!html) {
        html = `<div style="color: #8c8c8c; font-size: 0.85rem; padding: 10px 0;">No upcoming tracks in queue.</div>`;
    }

    queueUpcomingList.innerHTML = html;

    // Attach row clicks
    queueUpcomingList.querySelectorAll(".queue-track-row").forEach(row => {
        row.addEventListener("click", () => {
            const src = row.dataset.source;
            const idx = parseInt(row.dataset.index, 10);
            if (src === "user") {
                const song = userQueue.splice(idx, 1)[0];
                if (song) playTrack(song.id, song.title, song.artist, song.coverUrl, -1, currentPlaylist);
            } else {
                playTrackFromPlaylist(idx);
            }
            renderQueueList();
        });
    });
}

if (queueBtn) {
    queueBtn.addEventListener("click", () => {
        const isOpen = queuePanelOverlay?.classList.toggle("open");
        queueBtn.classList.toggle("active", isOpen);
        if (isOpen) renderQueueList();
    });
}
if (queueCloseBtn) {
    queueCloseBtn.addEventListener("click", () => {
        queuePanelOverlay?.classList.remove("open");
        queueBtn?.classList.remove("active");
    });
}
if (queueClearBtn) {
    queueClearBtn.addEventListener("click", () => {
        userQueue = [];
        renderQueueList();
        showToast("Queue cleared");
    });
}

// Lyrics Full Overlay Panel
async function loadLyricsForCurrentSong() {
    if (!lyricsContentContainer) return;
    const headerThumb = document.getElementById("lyrics-header-thumb");
    const headerTitle = document.getElementById("lyrics-header-title");
    const headerArtist = document.getElementById("lyrics-header-artist");

    const title = currentPlayingSongMeta?.title || currentTitle?.innerText || 'Track';
    const artist = currentPlayingSongMeta?.artist || currentArtist?.innerText || 'Artist';
    const coverUrl = currentPlayingSongMeta?.coverUrl || currentCover?.src || '';

    if (headerThumb) headerThumb.src = coverUrl;
    if (headerTitle) headerTitle.innerText = title;
    if (headerArtist) headerArtist.innerText = artist;

    lyricsContentContainer.innerHTML = `
        <div style="color: #a7a7a7; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Loading lyrics...
        </div>
    `;

    try {
        let lyrics = null;
        if (currentDetailSong && currentDetailSong.id === currentPlayingVideoId && currentDetailSong.lyrics) {
            lyrics = currentDetailSong.lyrics;
        } else if (currentPlayingVideoId) {
            const res = await fetch(`${BACKEND_URL}/song/${currentPlayingVideoId}`);
            const data = await res.json();
            lyrics = data.lyrics;
        }

        if (!lyrics || lyrics.trim() === "") {
            lyrics = `♪ (Music Playing: ${title}) ♪\n\nExperience high-fidelity sound on Spotify Web Player.\nFeel every beat and melody.`;
        }

        const lines = lyrics.split('\n').filter(l => l.trim() !== "");
        lyricsContentContainer.innerHTML = lines.map((l, i) => `
            <div class="lyrics-line ${i === 0 ? 'active' : ''}">${escapeHtml(l)}</div>
        `).join('');
    } catch (err) {
        lyricsContentContainer.innerHTML = `
            <div class="lyrics-line active">♪ (Music Playing: ${escapeHtml(title)}) ♪</div>
            <div class="lyrics-line">${escapeHtml(artist)}</div>
        `;
    }
}

if (lyricsBtn) {
    lyricsBtn.addEventListener("click", () => {
        const isOpen = lyricsOverlayPanel?.classList.toggle("open");
        lyricsBtn.classList.toggle("active", isOpen);
        if (isOpen) loadLyricsForCurrentSong();
    });
}
if (lyricsCloseBtn) {
    lyricsCloseBtn.addEventListener("click", () => {
        lyricsOverlayPanel?.classList.remove("open");
        lyricsBtn?.classList.remove("active");
    });
}

// Spotify Connect Device Modal
if (deviceBtn) {
    deviceBtn.addEventListener("click", () => {
        deviceModalOverlay?.classList.add("open");
        deviceBtn.classList.add("active");
    });
}
if (deviceModalClose) {
    deviceModalClose.addEventListener("click", () => {
        deviceModalOverlay?.classList.remove("open");
        deviceBtn?.classList.remove("active");
    });
}
if (deviceModalOverlay) {
    deviceModalOverlay.addEventListener("click", (e) => {
        if (e.target === deviceModalOverlay) {
            deviceModalOverlay.classList.remove("open");
            deviceBtn?.classList.remove("active");
        }
    });
}
document.querySelectorAll(".device-item").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".device-item").forEach(it => it.classList.remove("active"));
        item.classList.add("active");
        const devName = item.querySelector(".device-name")?.innerText || 'Device';
        showToast(`Connected to ${devName}`);
        setTimeout(() => {
            deviceModalOverlay?.classList.remove("open");
            deviceBtn?.classList.remove("active");
        }, 500);
    });
});

// Picture-in-Picture Mini-Player
if (pipBtn) {
    pipBtn.addEventListener("click", () => {
        miniPlayerOverlay?.classList.toggle("open");
        pipBtn.classList.toggle("active", miniPlayerOverlay?.classList.contains("open"));
    });
}
if (miniCloseBtn) {
    miniCloseBtn.addEventListener("click", () => {
        miniPlayerOverlay?.classList.remove("open");
        pipBtn?.classList.remove("active");
    });
}
if (miniPlayBtn) miniPlayBtn.addEventListener("click", togglePlayPause);
if (miniPrevBtn) miniPrevBtn.addEventListener("click", playPrevTrack);
if (miniNextBtn) miniNextBtn.addEventListener("click", playNextTrack);

// Fullscreen Button
if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                fullscreenBtn.classList.add("active");
                showToast("Entered Fullscreen");
            }).catch(() => {
                showToast("Fullscreen mode toggled");
            });
        } else {
            document.exitFullscreen().then(() => {
                fullscreenBtn.classList.remove("active");
                showToast("Exited Fullscreen");
            });
        }
    });
}

// ==========================================
// 6. Search Functionality & Dynamic Cards
// ==========================================
// ==========================================
// 6. View Routing, Real Songs & Song Details
// ==========================================
const homeView = document.getElementById("home-view");
const searchView = document.getElementById("search-view");
const songDetailView = document.getElementById("song-detail-view");
const navHomeBtn = document.getElementById("nav-home-btn");
const navSearchBtn = document.getElementById("nav-search-btn");
const navHistoryBack = document.getElementById("nav-history-back");

let lastActiveView = "home";
let currentDetailSong = null;

function showToast(msg) {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
}

function showView(view) {
    if (view === "song-detail") {
        if (homeView) homeView.style.display = "none";
        if (searchView) searchView.style.display = "none";
        if (songDetailView) songDetailView.style.display = "block";
        if (navHomeBtn) navHomeBtn.style.opacity = "0.7";
        if (navSearchBtn) navSearchBtn.style.opacity = "0.7";
    } else if (view === "search") {
        lastActiveView = "search";
        if (homeView) homeView.style.display = "none";
        if (searchView) searchView.style.display = "block";
        if (songDetailView) songDetailView.style.display = "none";
        if (navHomeBtn) navHomeBtn.style.opacity = "0.7";
        if (navSearchBtn) navSearchBtn.style.opacity = "1";
    } else {
        lastActiveView = "home";
        if (homeView) homeView.style.display = "block";
        if (searchView) searchView.style.display = "none";
        if (songDetailView) songDetailView.style.display = "none";
        if (navHomeBtn) navHomeBtn.style.opacity = "1";
        if (navSearchBtn) navSearchBtn.style.opacity = "0.7";
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ------------------------------------------
// Dedicated Song Details Page View
// ------------------------------------------
async function openSongDetails(songId, fallbackMeta = {}) {
    if (!songId) return;
    showView("song-detail");

    try {
        history.pushState({ view: "song-detail", songId }, "", `?song=${songId}`);
    } catch (e) {}

    if (!songDetailView) return;

    songDetailView.innerHTML = `
        <div class="search-loading-container">
            <i class="fa-solid fa-circle-notch search-spinner"></i>
            <div class="search-loading-text">Loading Song Details...</div>
            <div class="search-loading-subtext">Fetching master metadata, lyrics and recommendations</div>
        </div>
    `;

    try {
        const queryParams = new URLSearchParams({
            title: fallbackMeta.title || '',
            artist: fallbackMeta.artist || '',
            coverUrl: fallbackMeta.coverUrl || '',
            duration: fallbackMeta.duration || ''
        });
        const res = await fetch(`${BACKEND_URL}/song/${songId}?${queryParams.toString()}`);
        const data = await res.json();
        currentDetailSong = data;
        renderSongDetailsView(data);
    } catch (err) {
        console.error("Failed to load song details:", err);
        const fallback = {
            id: songId,
            title: fallbackMeta.title || 'Track Details',
            artist: fallbackMeta.artist || 'Featured Artist',
            coverUrl: fallbackMeta.coverUrl || `https://i.ytimg.com/vi/${songId}/mqdefault.jpg`,
            duration: fallbackMeta.duration || '3:30',
            views: '2,500,000+ plays',
            likes: '75,000+',
            uploadDate: '2025',
            recommendations: []
        };
        currentDetailSong = fallback;
        renderSongDetailsView(fallback);
    }
}

function renderSongDetailsView(data) {
    if (!songDetailView || !data) return;

    const isThisPlaying = (currentPlayingVideoId === data.id) && isPlaying;

    let html = `
        <div class="song-detail-container">
            <!-- Top Navigation Bar -->
            <div class="detail-top-nav">
                <button class="detail-back-btn" id="detail-back-btn">
                    <i class="fa-solid fa-arrow-left"></i> Back to ${lastActiveView === 'search' ? 'Search' : 'Home'}
                </button>
                <div class="detail-breadcrumb">
                    Songs / <span>${escapeHtml(data.title)}</span>
                </div>
            </div>

            <!-- Hero Section -->
            <div class="song-detail-hero">
                <div class="detail-cover-wrapper">
                    <img src="${data.coverUrl}" class="detail-cover-img" alt="${escapeHtml(data.title)}">
                </div>
                <div class="song-detail-info">
                    <div class="detail-badge-row">
                        <span class="detail-type-badge">Song</span>
                        <span class="detail-quality-badge"><i class="fa-solid fa-bolt"></i> High Fidelity 320 kbps</span>
                    </div>
                    <h1 class="detail-song-title">${escapeHtml(data.title)}</h1>
                    <div class="detail-artist-row">
                        <div class="detail-artist-avatar"><i class="fa-solid fa-microphone"></i></div>
                        <span>${escapeHtml(data.artist)}</span>
                        <i class="fa-solid fa-circle-check verified-icon" title="Verified Artist"></i>
                    </div>
                    <div class="detail-meta-row">
                        <div class="detail-meta-item"><i class="fa-regular fa-clock"></i> <span>${data.duration || '3:30'}</span></div>
                        <div class="detail-meta-item"><i class="fa-solid fa-play"></i> <span>${data.views || '1,500,000+'} plays</span></div>
                        <div class="detail-meta-item"><i class="fa-regular fa-thumbs-up"></i> <span>${data.likes || '85K+'} likes</span></div>
                        <div class="detail-meta-item"><i class="fa-regular fa-calendar"></i> <span>${data.uploadDate || '2025'}</span></div>
                    </div>
                </div>
            </div>

            <!-- Action Bar (Play, Like, Add to Playlist, Share, Download, More Options) -->
            <div class="detail-actions-bar">
                <button class="detail-play-btn" id="detail-main-play-btn" title="${isThisPlaying ? 'Pause Track' : 'Play Track'}">
                    <i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}" id="detail-main-play-icon"></i>
                </button>

                <button class="detail-action-icon-btn" id="detail-like-btn" title="Save to Liked Songs">
                    <i class="fa-regular fa-heart"></i>
                </button>

                <button class="detail-action-icon-btn" id="detail-playlist-btn" title="Add to Playlist">
                    <i class="fa-solid fa-circle-plus"></i>
                </button>

                <button class="detail-action-icon-btn" id="detail-share-btn" title="Copy Song Link">
                    <i class="fa-solid fa-arrow-up-from-bracket"></i>
                </button>

                <button class="detail-action-icon-btn" id="detail-download-btn" title="Download Audio Stream">
                    <i class="fa-solid fa-circle-down"></i>
                </button>

                <div class="detail-dropdown-wrapper">
                    <button class="detail-action-icon-btn" id="detail-more-btn" title="More Options">
                        <i class="fa-solid fa-ellipsis"></i>
                    </button>
                    <div class="detail-menu-dropdown" id="detail-menu-dropdown">
                        <button class="dropdown-item" id="menu-queue-btn"><i class="fa-solid fa-list-ul"></i> Add to queue</button>
                        <button class="dropdown-item" id="menu-copy-btn"><i class="fa-regular fa-copy"></i> Copy song link</button>
                        <button class="dropdown-item" id="menu-yt-btn"><i class="fa-brands fa-youtube"></i> Open on YouTube</button>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item" id="menu-credits-btn"><i class="fa-solid fa-circle-info"></i> View audio specs</button>
                    </div>
                </div>
            </div>

            <!-- Content Grid: Left (Lyrics & Credits), Right (Recommended) -->
            <div class="detail-content-grid">
                <div class="detail-left-col">
                    <!-- Lyrics & Waveform Box -->
                    <div class="detail-card-box">
                        <div class="detail-box-title">
                            <span><i class="fa-solid fa-lines-leaning" style="color: #1ed760;"></i> Live Audio Waves & Lyrics</span>
                            <div class="equalizer-wave-container" id="eq-waves">
                                <div class="eq-bar ${isPlaying && currentPlayingVideoId === data.id ? 'animating' : ''}"></div>
                                <div class="eq-bar ${isPlaying && currentPlayingVideoId === data.id ? 'animating' : ''}"></div>
                                <div class="eq-bar ${isPlaying && currentPlayingVideoId === data.id ? 'animating' : ''}"></div>
                                <div class="eq-bar ${isPlaying && currentPlayingVideoId === data.id ? 'animating' : ''}"></div>
                                <div class="eq-bar ${isPlaying && currentPlayingVideoId === data.id ? 'animating' : ''}"></div>
                                <div class="eq-bar ${isPlaying && currentPlayingVideoId === data.id ? 'animating' : ''}"></div>
                            </div>
                        </div>
                        <div class="lyrics-preview-content">
"${escapeHtml(data.title)}" by ${escapeHtml(data.artist)}
Playing in ultra-clear stereo audio.
Enjoy high-fidelity streaming directly from Spotify Web Player.
                        </div>
                    </div>

                    <!-- Song Information & Credits Box -->
                    <div class="detail-card-box" id="credits-box">
                        <div class="detail-box-title">
                            <span><i class="fa-solid fa-circle-info" style="color: #1ed760;"></i> Song Information & Credits</span>
                        </div>
                        <div class="credits-table">
                            <div class="credit-row">
                                <span class="credit-label">Song Title</span>
                                <span class="credit-value">${escapeHtml(data.title)}</span>
                            </div>
                            <div class="credit-row">
                                <span class="credit-label">Artist / Performer</span>
                                <span class="credit-value">${escapeHtml(data.artist)}</span>
                            </div>
                            <div class="credit-row">
                                <span class="credit-label">Audio Quality</span>
                                <span class="credit-value" style="color: #1ed760;">Master Audio (320 kbps Opus/AAC)</span>
                            </div>
                            <div class="credit-row">
                                <span class="credit-label">Streaming Source</span>
                                <span class="credit-value">High Quality Direct YouTube Stream</span>
                            </div>
                            <div class="credit-row">
                                <span class="credit-label">Release Info</span>
                                <span class="credit-value">${data.uploadDate || '2025'}</span>
                            </div>
                            <div class="credit-row">
                                <span class="credit-label">Track ID</span>
                                <span class="credit-value" style="font-family: monospace;">${data.id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Up Next & Recommended Songs -->
                <div class="detail-right-col">
                    <div class="detail-card-box">
                        <div class="detail-box-title">
                            <span><i class="fa-solid fa-sparkles" style="color: #1ed760;"></i> Recommended Tracks</span>
                        </div>
                        <div class="recommended-list" id="detail-rec-list">
    `;

    if (data.recommendations && data.recommendations.length > 0) {
        data.recommendations.forEach((rec, idx) => {
            html += `
                <div class="track-row" data-id="${rec.id}" data-index="${idx}" title="Play ${escapeHtml(rec.title)}">
                    <span class="track-row-num">${idx + 1}</span>
                    <i class="fa-solid fa-play track-row-play-icon"></i>
                    <img src="${rec.coverUrl}" class="track-row-thumb" alt="${escapeHtml(rec.title)}">
                    <div class="track-row-info">
                        <div class="track-row-title">${escapeHtml(rec.title)}</div>
                        <div class="track-row-artist">${escapeHtml(rec.artist)}</div>
                    </div>
                    <div class="track-row-duration">${rec.duration || '3:30'}</div>
                    <i class="fa-regular fa-heart track-row-like" title="Save to Library"></i>
                </div>
            `;
        });
    } else {
        html += `<div style="color: #8c8c8c; font-size: 0.88rem; padding: 12px 0;">No similar songs found.</div>`;
    }

    html += `
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    songDetailView.innerHTML = html;

    // Attach Event Listeners
    // 1. Back button
    const backBtn = document.getElementById("detail-back-btn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            showView(lastActiveView || "home");
        });
    }

    // 2. Play / Pause Button in Details
    const playBtn = document.getElementById("detail-main-play-btn");
    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (currentPlayingVideoId === data.id && currentAudio) {
                togglePlayPause();
            } else {
                playTrack(data.id, data.title, data.artist, data.coverUrl, 0, [data, ...(data.recommendations || [])]);
            }
        });
    }

    // 3. Like Button in details view
    const likeDetailBtn = document.getElementById("detail-like-btn");
    if (likeDetailBtn) {
        const isLiked = isSongLiked(data.id);
        const icon = likeDetailBtn.querySelector("i");
        if (icon) {
            icon.className = isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";
        }
        likeDetailBtn.classList.toggle("active", isLiked);
        likeDetailBtn.style.color = isLiked ? "#1ed760" : "";

        likeDetailBtn.addEventListener("click", () => {
            const nowLiked = toggleLikeSong(data);
            if (icon) {
                icon.className = nowLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";
            }
            likeDetailBtn.classList.toggle("active", nowLiked);
            likeDetailBtn.style.color = nowLiked ? "#1ed760" : "";
        });
    }

    // 4. Add to Playlist Button
    const playlistBtn = document.getElementById("detail-playlist-btn");
    if (playlistBtn) {
        playlistBtn.addEventListener("click", () => {
            showToast("Added to Playlist: 'My Favorites'");
        });
    }

    // 5. Share Button
    const shareBtn = document.getElementById("detail-share-btn");
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            const songUrl = `${window.location.origin}/song/${data.id}`;
            navigator.clipboard.writeText(songUrl).then(() => {
                showToast("Song link copied to clipboard!");
            }).catch(() => {
                showToast("Link: " + songUrl);
            });
        });
    }

    // 6. Download / Stream Button
    const downloadBtn = document.getElementById("detail-download-btn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
            window.open(`${BACKEND_URL}/stream/${data.id}`, '_blank');
            showToast("Opening direct high-quality audio stream");
        });
    }

    // 7. More Options Dropdown
    const moreBtn = document.getElementById("detail-more-btn");
    const dropdown = document.getElementById("detail-menu-dropdown");
    if (moreBtn && dropdown) {
        moreBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("open");
        });

        document.addEventListener("click", () => {
            dropdown.classList.remove("open");
        });

        document.getElementById("menu-queue-btn")?.addEventListener("click", () => {
            addToQueue(data);
        });

        document.getElementById("menu-copy-btn")?.addEventListener("click", () => {
            const songUrl = `${window.location.origin}/song/${data.id}`;
            navigator.clipboard.writeText(songUrl);
            showToast("Song link copied to clipboard!");
        });

        document.getElementById("menu-yt-btn")?.addEventListener("click", () => {
            window.open(`https://www.youtube.com/watch?v=${data.id}`, '_blank');
        });

        document.getElementById("menu-credits-btn")?.addEventListener("click", () => {
            document.getElementById("credits-box")?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // 8. Attach Recommendation Clicks
    songDetailView.querySelectorAll(".recommended-list .track-row").forEach(row => {
        row.addEventListener("click", (e) => {
            if (e.target.classList.contains("track-row-like")) {
                e.stopPropagation();
                e.target.classList.toggle("fa-regular");
                e.target.classList.toggle("fa-solid");
                e.target.classList.toggle("active");
                return;
            }
            const idx = parseInt(row.dataset.index, 10);
            const rec = data.recommendations[idx];
            if (rec) {
                openSongDetails(rec.id, rec);
                playTrack(rec.id, rec.title, rec.artist, rec.coverUrl, idx, data.recommendations);
            }
        });
    });
}

// ------------------------------------------
// Search Functionality
// ------------------------------------------
async function searchSongs(query) {
    closeSuggestionsDropdown();

    if (!query || query.trim() === "") {
        showBrowseCategories();
        return;
    }

    const cleanQuery = query.trim();
    showView("search");

    if (searchView) {
        searchView.innerHTML = `
            <div class="search-loading-container">
                <i class="fa-solid fa-circle-notch search-spinner"></i>
                <div class="search-loading-text">Searching all available songs for "${escapeHtml(cleanQuery)}"...</div>
                <div class="search-loading-subtext">Fetching high-quality tracks directly from YouTube</div>
            </div>
        `;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(cleanQuery)}&limit=18`);
        const songs = await response.json();

        if (Array.isArray(songs) && songs.length > 0) {
            currentPlaylist = songs;
            displaySearchResults(songs, cleanQuery);
            // Search will NOT automatically play any song.
            // User must click a particular song to play it.
        } else {
            if (searchView) {
                searchView.innerHTML = `
                    <div class="search-loading-container">
                        <i class="fa-solid fa-music" style="font-size: 2.5rem; color: #b3b3b3; margin-bottom: 8px;"></i>
                        <div class="search-loading-text">No songs found for "${escapeHtml(cleanQuery)}"</div>
                        <div class="search-loading-subtext">Please make sure words are spelled correctly or try searching a different artist.</div>
                        <button class="badge" style="margin-top: 12px; cursor: pointer;" onclick="showBrowseCategories()">Browse Popular Categories</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error("Error searching tracks:", error);
        if (searchView) {
            searchView.innerHTML = `
                <div class="search-loading-container">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #ff5555; margin-bottom: 8px;"></i>
                    <div class="search-loading-text">Failed to fetch search results</div>
                    <div class="search-loading-subtext">${error.message || 'Server error occurred'}</div>
                    <button class="badge" style="margin-top: 12px; cursor: pointer;" onclick="showBrowseCategories()">Back to Browse</button>
                </div>
            `;
        }
    }
}

function displaySearchResults(songs, query) {
    if (!searchView || !songs || songs.length === 0) return;

    const topSong = songs[0];
    const topTracks = songs.slice(0, 4);

    let html = `
        <div class="search-view-header">
            <div class="search-title-row">
                <div class="search-main-title">
                    <span>Search results for "${escapeHtml(query)}"</span>
                    <span class="search-count-badge">${songs.length} songs available</span>
                </div>
                <button class="back-home-badge" id="search-back-home-btn" title="Return to home view">
                    <i class="fa-solid fa-house"></i> Home View
                </button>
            </div>
            <div class="search-filter-pills">
                <button class="filter-pill active" data-filter="all">All</button>
                <button class="filter-pill" data-filter="songs">Songs (${songs.length})</button>
                <button class="filter-pill" data-filter="top">Top Result</button>
            </div>
        </div>

        <!-- Hero Section: Top Result + Songs Table -->
        <div class="search-hero-layout" id="search-hero-layout">
            <!-- Top Result -->
            <div class="top-result-wrapper" id="top-result-section">
                <div class="section-label">Top result</div>
                <div class="top-result-card" data-id="${topSong.id}" title="Play ${escapeHtml(topSong.title)}">
                    <img src="${topSong.coverUrl}" class="top-result-img" alt="${escapeHtml(topSong.title)}">
                    <div class="top-result-info">
                        <div class="top-result-title">${escapeHtml(topSong.title)}</div>
                        <div class="top-result-artist">
                            <span class="top-result-tag">Song</span>
                            <span>${escapeHtml(topSong.artist)}</span>
                        </div>
                    </div>
                    <button class="top-result-play-btn" title="Play track">
                        <i class="fa-solid fa-play"></i>
                    </button>
                </div>
            </div>

            <!-- Top Tracks List -->
            <div class="tracklist-wrapper" id="top-tracks-section">
                <div class="section-label">Songs</div>
                <div class="tracklist-container">
    `;

    topTracks.forEach((song, idx) => {
        const isLiked = isSongLiked(song.id);
        const isCurrentPlaying = (currentPlayingVideoId === song.id) && isPlaying;
        html += `
            <div class="track-row ${isCurrentPlaying ? 'playing' : ''}" data-id="${song.id}" data-index="${idx}" title="Play ${escapeHtml(song.title)}">
                <span class="track-row-num">${idx + 1}</span>
                <i class="fa-solid ${isCurrentPlaying ? 'fa-pause' : 'fa-play'} track-row-play-icon"></i>
                <img src="${song.coverUrl}" class="track-row-thumb" alt="${escapeHtml(song.title)}">
                <div class="track-row-info">
                    <div class="track-row-title">${escapeHtml(song.title)}</div>
                    <div class="track-row-artist">${escapeHtml(song.artist)}</div>
                </div>
                <div class="track-row-duration">${song.duration || '3:30'}</div>
                <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart track-row-like ${isLiked ? 'active' : ''}" title="${isLiked ? 'Remove from Library' : 'Save to Library'}"></i>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>

        <!-- All Available Songs Grid -->
        <div class="all-songs-section" id="all-songs-section">
            <div class="section-label" style="display: flex; align-items: center; justify-content: space-between;">
                <span>All Available Songs (${songs.length})</span>
                <span style="font-size: 0.82rem; font-weight: 500; color: #a7a7a7;">Click card for details, click play to listen</span>
            </div>
            <div class="all-songs-grid">
    `;

    songs.forEach((song, idx) => {
        html += `
            <div class="card real-song-card" data-id="${song.id}" data-index="${idx}" data-title="${escapeHtml(song.title)}" data-artist="${escapeHtml(song.artist)}" data-cover="${song.coverUrl}" data-duration="${song.duration || '3:30'}" title="${escapeHtml(song.title)} • ${escapeHtml(song.artist)}">
                <div class="card-img-wrapper">
                    <img src="${song.coverUrl}" class="card-img" alt="${escapeHtml(song.title)}">
                    <button class="song-card-play-btn" title="Play ${escapeHtml(song.title)}" data-play-id="${song.id}">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="card-more-btn" title="View details" data-id="${song.id}">
                        <i class="fa-solid fa-ellipsis"></i>
                    </button>
                </div>
                <div class="card-content-meta">
                    <p class="card-tital">${escapeHtml(song.title)}</p>
                    <p class="card-info">${escapeHtml(song.artist)}</p>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    searchView.innerHTML = html;

    // Attach Top Result Click - Plays the top song when clicked
    const topResultCard = searchView.querySelector(".top-result-card");
    if (topResultCard) {
        topResultCard.addEventListener("click", () => {
            playTrack(topSong.id, topSong.title, topSong.artist, topSong.coverUrl, 0, songs);
        });
        topResultCard.querySelector(".top-result-play-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            playTrack(topSong.id, topSong.title, topSong.artist, topSong.coverUrl, 0, songs);
        });
    }

    // Attach Top Tracks Row Clicks - Plays the clicked track row
    searchView.querySelectorAll(".track-row").forEach(row => {
        row.addEventListener("click", (e) => {
            const idx = parseInt(row.dataset.index, 10);
            const song = songs[idx];
            if (e.target.classList.contains("track-row-like")) {
                e.stopPropagation();
                if (song) toggleLikeSong(song);
                return;
            }
            if (song) {
                playTrack(song.id, song.title, song.artist, song.coverUrl, idx, songs);
            }
        });
    });

    // Attach All Songs Grid Card Clicks
    searchView.querySelectorAll(".all-songs-grid .card").forEach(card => {
        const idx = parseInt(card.dataset.index, 10);
        const song = songs[idx];

        // 3-dots more button opens detailed song view
        const moreBtn = card.querySelector(".card-more-btn");
        if (moreBtn) {
            moreBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (song) openSongDetails(song.id, song);
            });
        }

        // Green Play Button on card plays immediately
        const playBtn = card.querySelector(".song-card-play-btn");
        if (playBtn) {
            playBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (song) playTrack(song.id, song.title, song.artist, song.coverUrl, idx, songs);
            });
        }

        // Clicking card opens song details
        card.addEventListener("click", () => {
            if (song) openSongDetails(song.id, song);
        });
    });

    // Back to Home Button
    const backBtn = document.getElementById("search-back-home-btn");
    if (backBtn) {
        backBtn.addEventListener("click", () => showView("home"));
    }

    // Filter Pills Click
    searchView.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            searchView.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");

            const filter = pill.dataset.filter;
            const heroLayout = document.getElementById("search-hero-layout");
            const topResultSection = document.getElementById("top-result-section");
            const topTracksSection = document.getElementById("top-tracks-section");
            const allSongsSection = document.getElementById("all-songs-section");

            if (filter === "all") {
                if (heroLayout) heroLayout.style.display = "grid";
                if (topResultSection) topResultSection.style.display = "flex";
                if (topTracksSection) topTracksSection.style.display = "flex";
                if (allSongsSection) allSongsSection.style.display = "block";
            } else if (filter === "songs") {
                if (heroLayout) heroLayout.style.display = "none";
                if (allSongsSection) allSongsSection.style.display = "block";
            } else if (filter === "top") {
                if (heroLayout) heroLayout.style.display = "grid";
                if (topResultSection) topResultSection.style.display = "flex";
                if (topTracksSection) topTracksSection.style.display = "flex";
                if (allSongsSection) allSongsSection.style.display = "none";
            }
        });
    });

    if (currentPlayingVideoId) {
        updatePlayingTrackUI(currentPlayingVideoId);
    }
}

function showBrowseCategories() {
    showView("search");
    if (!searchView) return;

    const categories = [
        { name: "Bollywood Hits", gradient: "linear-gradient(135deg, #e13300, #ff652f)", icon: "fa-fire", query: "Top Bollywood Songs 2026" },
        { name: "English Pop", gradient: "linear-gradient(135deg, #1e3264, #2e77d0)", icon: "fa-compact-disc", query: "Billboard Top 50 English Pop" },
        { name: "Punjabi Vibes", gradient: "linear-gradient(135deg, #8400e7, #b028ff)", icon: "fa-bolt", query: "Top Punjabi Songs 2026" },
        { name: "Lo-Fi & Chill", gradient: "linear-gradient(135deg, #006450, #1ed760)", icon: "fa-headphones", query: "Bollywood Lo-Fi Chill Hits" },
        { name: "Devotional & Bhakti", gradient: "linear-gradient(135deg, #e8115b, #ff5a84)", icon: "fa-om", query: "Hanuman Chalisa Bhakti Songs" },
        { name: "Global Top 50", gradient: "linear-gradient(135deg, #503750, #8c568c)", icon: "fa-globe", query: "Global Top 50 Songs" },
        { name: "Arijit Singh Best", gradient: "linear-gradient(135deg, #bc5900, #e87a1e)", icon: "fa-microphone", query: "Arijit Singh Best Songs" },
        { name: "Acoustic & Relax", gradient: "linear-gradient(135deg, #148a08, #21bf12)", icon: "fa-guitar", query: "Acoustic Relaxing Songs" }
    ];

    let html = `
        <div class="search-view-header">
            <div class="search-title-row">
                <div class="search-main-title">
                    <span><i class="fa-solid fa-compass" style="color: #1ed760;"></i> Browse All Songs & Genres</span>
                </div>
                <button class="back-home-badge" id="search-back-home-btn" title="Return to home view">
                    <i class="fa-solid fa-house"></i> Home View
                </button>
            </div>
        </div>

        <div class="browse-categories-section">
            <div class="section-label">Explore Popular Collections</div>
            <div class="browse-categories-grid">
    `;

    categories.forEach(cat => {
        html += `
            <div class="browse-category-card" style="background: ${cat.gradient};" data-query="${escapeHtml(cat.query)}">
                <div class="browse-category-title">${escapeHtml(cat.name)}</div>
                <i class="fa-solid ${cat.icon} browse-category-icon"></i>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    searchView.innerHTML = html;

    searchView.querySelectorAll(".browse-category-card").forEach(card => {
        card.addEventListener("click", () => {
            const query = card.dataset.query;
            if (searchInput) searchInput.value = query;
            if (searchClearBtn) searchClearBtn.style.display = "flex";
            searchSongs(query);
        });
    });

    const backBtn = document.getElementById("search-back-home-btn");
    if (backBtn) {
        backBtn.addEventListener("click", () => showView("home"));
    }
}

// ==========================================
// Search Input & Suggestions (Suggestions OFF)
// ==========================================
const searchClearBtn = document.getElementById("search-clear-btn");
const searchSuggestionsDropdown = document.getElementById("search-suggestions-dropdown");
const searchContainer = document.getElementById("search-container");
const searchLeadingIcon = document.querySelector(".search-leading-icon");

// Feature Flag: Suggestions OFF as per user request ("any one search to suggetion is off")
const ENABLE_SEARCH_SUGGESTIONS = false;

let suggestionDebounceTimer = null;
let activeSuggestionIndex = -1;
let currentSuggestions = [];

// Close suggestions dropdown
function closeSuggestionsDropdown() {
    if (searchSuggestionsDropdown) {
        searchSuggestionsDropdown.classList.remove("open");
        searchSuggestionsDropdown.innerHTML = "";
        searchSuggestionsDropdown.style.display = "none";
    }
    activeSuggestionIndex = -1;
    currentSuggestions = [];
}

// Render song suggestions (No-op when suggestions are off)
function renderSuggestions(suggestions, queryText) {
    if (!ENABLE_SEARCH_SUGGESTIONS) {
        closeSuggestionsDropdown();
        return;
    }
    if (!searchSuggestionsDropdown) return;
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        closeSuggestionsDropdown();
        return;
    }

    currentSuggestions = suggestions;
    activeSuggestionIndex = -1;

    const isPopularDefault = !queryText || queryText.trim() === "";
    let html = `
        <div class="suggestions-header">
            <i class="fa-solid fa-music"></i>
            <span>${isPopularDefault ? 'Popular Song Searches' : 'Song Suggestions'}</span>
        </div>
    `;

    suggestions.forEach((item, idx) => {
        let formattedText = escapeHtml(item);
        if (queryText && queryText.trim()) {
            const regex = new RegExp(`(${queryText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            formattedText = formattedText.replace(regex, '<strong>$1</strong>');
        }

        html += `
            <div class="suggestion-item" data-index="${idx}" data-query="${escapeHtml(item)}">
                <i class="fa-solid fa-music suggestion-icon"></i>
                <div class="suggestion-text">${formattedText}</div>
                <i class="fa-solid fa-arrow-up-right-from-square suggestion-arrow"></i>
            </div>
        `;
    });

    searchSuggestionsDropdown.innerHTML = html;
    searchSuggestionsDropdown.classList.add("open");

    // Click on suggestion
    searchSuggestionsDropdown.querySelectorAll(".suggestion-item").forEach(el => {
        el.addEventListener("click", () => {
            const chosen = el.dataset.query;
            selectSuggestion(chosen);
        });
    });
}

function selectSuggestion(query) {
    if (!query) return;
    if (searchInput) searchInput.value = query;
    if (searchClearBtn) searchClearBtn.style.display = "flex";
    closeSuggestionsDropdown();
    searchSongs(query);
}

// Fetch suggestions from backend (Only if suggestions are explicitly enabled)
async function fetchSongSuggestions(q) {
    if (!ENABLE_SEARCH_SUGGESTIONS) {
        closeSuggestionsDropdown();
        return;
    }
    try {
        const url = `${BACKEND_URL}/suggestions?q=${encodeURIComponent((q || '').trim())}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const suggestions = await res.json();
        renderSuggestions(suggestions, q);
    } catch (err) {
        console.error("Suggestions fetch error:", err);
    }
}

// Input event handlers
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const val = e.target.value;
        if (searchClearBtn) {
            searchClearBtn.style.display = val.length > 0 ? "flex" : "none";
        }

        if (ENABLE_SEARCH_SUGGESTIONS) {
            clearTimeout(suggestionDebounceTimer);
            suggestionDebounceTimer = setTimeout(() => {
                fetchSongSuggestions(val);
            }, 180);
        } else {
            closeSuggestionsDropdown();
        }
    });

    searchInput.addEventListener("focus", () => {
        if (ENABLE_SEARCH_SUGGESTIONS) {
            fetchSongSuggestions(searchInput.value || "");
        } else {
            closeSuggestionsDropdown();
        }
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const q = searchInput.value.trim();
            if (q) {
                closeSuggestionsDropdown();
                searchSongs(q);
            }
        } else if (e.key === "Escape") {
            closeSuggestionsDropdown();
        }
    });
}

// Search leading icon click triggers search if text entered, or focuses input
if (searchLeadingIcon) {
    searchLeadingIcon.addEventListener("click", () => {
        if (searchInput) {
            const q = searchInput.value.trim();
            if (q) {
                closeSuggestionsDropdown();
                searchSongs(q);
            } else {
                searchInput.focus();
            }
        }
    });
}

// Clear button handler
if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
        }
        searchClearBtn.style.display = "none";
        closeSuggestionsDropdown();
        showBrowseCategories();
    });
}

// Close suggestions dropdown on outside click
document.addEventListener("click", (e) => {
    if (searchContainer && !searchContainer.contains(e.target)) {
        closeSuggestionsDropdown();
    }
});

// Sidebar nav buttons
if (navHomeBtn) {
    navHomeBtn.addEventListener("click", () => showView("home"));
}
if (navSearchBtn) {
    navSearchBtn.addEventListener("click", () => {
        showBrowseCategories();
        searchInput?.focus();
    });
}
if (navHistoryBack) {
    navHistoryBack.addEventListener("click", () => showView("home"));
}

const searchBrowseBtn = document.getElementById("search-browse-btn");
if (searchBrowseBtn) {
    searchBrowseBtn.addEventListener("click", () => {
        showBrowseCategories();
        searchInput?.focus();
    });
}



const navPremiumBtn = document.getElementById("nav-premium-btn");
if (navPremiumBtn) {
    navPremiumBtn.addEventListener("click", () => {
        showToast("Spotify Premium: All features unlocked!");
    });
}


// ------------------------------------------
// Real Homepage Songs Setup & Playback
// ------------------------------------------
function getHomepagePlaylist() {
    const list = [];
    document.querySelectorAll("#home-view .real-song-card").forEach(card => {
        list.push({
            id: card.dataset.id,
            title: card.dataset.title,
            artist: card.dataset.artist,
            coverUrl: card.dataset.cover,
            duration: card.dataset.duration || '3:30'
        });
    });
    return list;
}

// Attach listeners to real songs cards on homepage
function initHomepageSongCards() {
    const playlist = getHomepagePlaylist();

    document.querySelectorAll("#home-view .real-song-card").forEach((card, idx) => {
        card.style.cursor = "pointer";

        // Green Play Button on card: plays immediately
        const playBtn = card.querySelector(".song-card-play-btn");
        if (playBtn) {
            playBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                playTrack(card.dataset.id, card.dataset.title, card.dataset.artist, card.dataset.cover, idx, playlist);
            });
        }

        // 3-dots more button opens details
        const moreBtn = card.querySelector(".card-more-btn");
        if (moreBtn) {
            moreBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openSongDetails(card.dataset.id, {
                    title: card.dataset.title,
                    artist: card.dataset.artist,
                    coverUrl: card.dataset.cover,
                    duration: card.dataset.duration
                });
            });
        }

        // Clicking card body opens detailed song page
        card.addEventListener("click", () => {
            openSongDetails(card.dataset.id, {
                title: card.dataset.title,
                artist: card.dataset.artist,
                coverUrl: card.dataset.cover,
                duration: card.dataset.duration
            });
        });
    });
}

initHomepageSongCards();

// ------------------------------------------
// Spotify Quick Picks Grid (6-card interactive row)
// ------------------------------------------
function initQuickPicks() {
    const quickCards = Array.from(document.querySelectorAll(".quick-card"));
    const quickPlaylist = quickCards.map(c => ({
        id: c.dataset.id,
        title: c.dataset.title,
        artist: c.dataset.artist,
        coverUrl: c.dataset.cover || `https://i.ytimg.com/vi/${c.dataset.id}/mqdefault.jpg`,
        duration: '3:30'
    }));

    quickCards.forEach((card, idx) => {
        const id = card.dataset.id;
        const playBtn = card.querySelector(".quick-play-btn");

        function handlePlay(e) {
            if (e) e.stopPropagation();
            if (card.id === "quick-liked-songs" || card.dataset.title === "Liked Songs") {
                openLikedSongsView();
                return;
            }
            if (id) {
                playTrack(id, card.dataset.title, card.dataset.artist, card.dataset.cover, idx, quickPlaylist);
            }
        }

        if (playBtn) {
            playBtn.addEventListener("click", handlePlay);
        }
        card.addEventListener("click", handlePlay);
    });
}

// ------------------------------------------
// Dedicated Liked Songs View & Playlist Playback
// ------------------------------------------
function openLikedSongsView() {
    const songs = getLikedSongs();
    currentPlaylist = songs;
    currentIndex = 0;

    showView("search");
    if (!searchView) return;

    let html = `
        <div class="song-detail-container" style="padding-top: 0;">
            <!-- Hero Section -->
            <div class="song-detail-hero" style="background: linear-gradient(180deg, #450af5 0%, #181818 100%);">
                <div class="detail-cover-wrapper" style="background: linear-gradient(135deg, #450af5 0%, #8e8ee5 100%); display: flex; align-items: center; justify-content: center; font-size: 5rem; color: #ffffff; box-shadow: 0 16px 36px rgba(69, 10, 245, 0.4);">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <div class="song-detail-info">
                    <div class="detail-badge-row">
                        <span class="detail-type-badge" style="background-color: #ffffff; color: #000000;">Playlist</span>
                        <span class="detail-quality-badge"><i class="fa-solid fa-thumbtack"></i> Pinned to Library</span>
                    </div>
                    <h1 class="detail-song-title" style="font-size: 3rem; margin: 4px 0;">Liked Songs</h1>
                    <div class="detail-artist-row">
                        <div class="detail-artist-avatar" style="background-color: #1ed760; color: #000000;"><i class="fa-solid fa-user"></i></div>
                        <span style="font-weight: 700; color: #ffffff;">${escapeHtml(document.getElementById("profile-display-name")?.innerText || 'User')}</span>
                        <span style="color: #a7a7a7;">• ${songs.length} songs saved</span>
                    </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="detail-actions-bar">
                <button class="detail-play-btn" id="liked-playlist-play-btn" title="Play All Liked Songs (Line by line)">
                    <i class="fa-solid fa-play"></i>
                </button>
                <button class="badge dark-badge" id="liked-clear-btn" style="margin-left: 10px;" title="Reset Liked Songs">
                    <i class="fa-regular fa-trash-can"></i> Reset Library
                </button>
            </div>

            <!-- Table of Liked Songs -->
            <div class="all-songs-section">
                <div class="section-label" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>Songs in Your Library (${songs.length})</span>
                    <span style="font-size: 0.8rem; color: #a7a7a7;">Plays line by line sequentially</span>
                </div>
                <div class="tracklist-container">
    `;

    songs.forEach((s, i) => {
        const isCurrentPlaying = (currentPlayingVideoId === s.id) && isPlaying;
        html += `
            <div class="track-row ${isCurrentPlaying ? 'playing' : ''}" data-id="${s.id}" data-index="${i}" title="Play ${escapeHtml(s.title)}">
                <span class="track-row-num">${i + 1}</span>
                <i class="fa-solid ${isCurrentPlaying ? 'fa-pause' : 'fa-play'} track-row-play-icon"></i>
                <img src="${s.coverUrl}" class="track-row-thumb" alt="${escapeHtml(s.title)}">
                <div class="track-row-info">
                    <div class="track-row-title">${escapeHtml(s.title)}</div>
                    <div class="track-row-artist">${escapeHtml(s.artist)}</div>
                </div>
                <div class="track-row-duration">${s.duration || '3:30'}</div>
                <i class="fa-solid fa-heart track-row-like active" title="Remove from Liked Songs"></i>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    searchView.innerHTML = html;

    // Play all liked songs button
    document.getElementById("liked-playlist-play-btn")?.addEventListener("click", () => {
        if (songs.length > 0) {
            playTrack(songs[0].id, songs[0].title, songs[0].artist, songs[0].coverUrl, 0, songs);
            showToast("Playing Liked Songs line by line");
        }
    });

    // Reset liked songs button
    document.getElementById("liked-clear-btn")?.addEventListener("click", () => {
        localStorage.removeItem(LIKED_SONGS_KEY);
        updateLikedSongsSidebarCount();
        openLikedSongsView();
        showToast("Liked songs reset to defaults");
    });

    // Row clicks
    searchView.querySelectorAll(".track-row").forEach(row => {
        row.addEventListener("click", (e) => {
            const i = parseInt(row.dataset.index, 10);
            const s = songs[i];
            if (e.target.classList.contains("track-row-like")) {
                e.stopPropagation();
                if (s) {
                    toggleLikeSong(s);
                    openLikedSongsView();
                }
                return;
            }
            if (s) {
                playTrack(s.id, s.title, s.artist, s.coverUrl, i, songs);
            }
        });
    });
}

// ------------------------------------------
// Sidebar Library Items & Library Filter Chips
// ------------------------------------------
function initLibraryItems() {
    document.querySelectorAll(".library-item").forEach(item => {
        item.addEventListener("click", () => {
            if (item.id === "sidebar-liked-songs" || item.dataset.query === "Liked Songs") {
                openLikedSongsView();
                return;
            }
            const query = item.dataset.query;
            if (query) {
                if (searchInput) searchInput.value = query;
                if (searchClearBtn) searchClearBtn.style.display = "flex";
                searchSongs(query);
            }
        });
    });

    document.querySelectorAll(".lib-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".lib-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            const filter = chip.dataset.filter;
            if (filter === "artists") {
                searchSongs("Top Artists Arijit Diljit Pritam");
            } else if (filter === "albums") {
                searchSongs("Top Albums 2026");
            } else {
                showView("home");
            }
        });
    });
}

// ------------------------------------------
// Home Header Filter Pills (All, Bollywood, Garba, Punjabi, Romantic, Devotional, English, Party, Latest)
// ------------------------------------------
function initHomeFilterPills() {
    document.querySelectorAll(".home-filter-pill").forEach(pill => {
        pill.addEventListener("click", async () => {
            document.querySelectorAll(".home-filter-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const filter = pill.dataset.filter;
            const quickPicks = document.querySelector(".quick-picks-section");
            const allSections = document.querySelectorAll("#home-view .section-header-row, #home-view .cards-containr");

            if (filter === "all") {
                if (quickPicks) quickPicks.style.display = "block";
                allSections.forEach(s => s.style.display = "");
                showView("home");
            } else if (filter === "podcasts") {
                searchSongs("The Joe Rogan Experience Ranveer Allahbadia Podcasts");
            } else {
                // Fetch dynamic curated genre from backend
                try {
                    showToast(`Loading ${pill.innerText}...`);
                    const res = await fetch(`/api/browse?category=${encodeURIComponent(filter)}&limit=16`);
                    const data = await res.json();
                    if (data.success && data.songs && data.songs.length > 0) {
                        renderSearchResults(data.title || pill.innerText, data.songs);
                        showView("search");
                        return;
                    }
                } catch (e) {
                    console.warn("Category browse failed, searching fallback:", e);
                }
                searchSongs(`${pill.innerText} songs`);
            }
        });
    });

    document.querySelectorAll(".section-show-all-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const genre = link.dataset.browseGenre;
            if (genre) {
                const pill = document.querySelector(`.home-filter-pill[data-filter="${genre}"]`);
                if (pill) {
                    pill.click();
                    return;
                }
            }
            const heading = link.closest(".section-header-row")?.querySelector(".section-heading")?.innerText || "Top Trending Songs";
            if (searchInput) searchInput.value = heading;
            if (searchClearBtn) searchClearBtn.style.display = "flex";
            searchSongs(heading);
        });
    });
}

// ------------------------------------------
// Custom Playlist Management (MongoDB Synced)
// ------------------------------------------
function initCustomPlaylists() {
    const createBtn = document.getElementById("lib-create-playlist-btn");
    const modal = document.getElementById("playlist-modal-overlay");
    const closeBtn = document.getElementById("playlist-modal-close");
    const cancelBtn = document.getElementById("playlist-btn-cancel");
    const saveBtn = document.getElementById("playlist-btn-save");
    const nameInput = document.getElementById("playlist-name-input");
    const descInput = document.getElementById("playlist-desc-input");

    if (createBtn && modal) {
        createBtn.addEventListener("click", () => {
            modal.classList.add("open");
            if (nameInput) {
                nameInput.value = "";
                nameInput.focus();
            }
            if (descInput) descInput.value = "";
        });
    }

    const closeModal = () => modal && modal.classList.remove("open");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const name = nameInput ? nameInput.value.trim() : "";
            const desc = descInput ? descInput.value.trim() : "";
            if (!name) {
                showToast("Please enter a playlist name!");
                return;
            }

            const user = JSON.parse(localStorage.getItem("spotify_user") || "null");
            try {
                const res = await fetch("/api/user/playlists", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-email": user ? user.email : "alex.rivera@spotify.user"
                    },
                    body: JSON.stringify({ name, description: desc })
                });
                const data = await res.json();
                if (data.success && data.playlist) {
                    addPlaylistToSidebar(data.playlist);
                    showToast(`Playlist "${name}" created!`);
                    closeModal();
                    return;
                }
            } catch (err) {
                console.warn("Backend playlist save failed, using local:", err);
            }

            // Local fallback
            addPlaylistToSidebar({
                name,
                description: desc,
                coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60"
            });
            showToast(`Playlist "${name}" created!`);
            closeModal();
        });
    }

    loadUserPlaylists();
}

function addPlaylistToSidebar(pl) {
    const list = document.getElementById("library-items-list");
    if (!list) return;
    const item = document.createElement("div");
    item.className = "library-item";
    item.setAttribute("data-query", pl.name);
    item.innerHTML = `
        <img src="${pl.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60'}" class="lib-item-thumb" alt="${escapeHtml(pl.name)}">
        <div class="lib-item-info">
            <div class="lib-item-title">${escapeHtml(pl.name)}</div>
            <div class="lib-item-subtitle">Playlist • ${escapeHtml(pl.ownerName || 'You')}</div>
        </div>
    `;
    item.addEventListener("click", () => {
        searchSongs(pl.name);
    });
    list.appendChild(item);
}

async function loadUserPlaylists() {
    const user = JSON.parse(localStorage.getItem("spotify_user") || "null");
    if (!user || !user.email) return;
    try {
        const res = await fetch("/api/user/playlists", {
            headers: { "x-user-email": user.email }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.playlists)) {
            data.playlists.forEach(pl => addPlaylistToSidebar(pl));
        }
    } catch (e) {
        console.warn("Error loading user playlists:", e);
    }
}

initQuickPicks();
initLibraryItems();
initHomeFilterPills();
initCustomPlaylists();


// In bottom playbar: clicking the current song info opens its details page
const albumDesc = document.querySelector(".album .curr-desc");
const albumCover = document.getElementById("current-cover");
if (albumDesc) {
    albumDesc.style.cursor = "pointer";
    albumDesc.title = "View song details";
    albumDesc.addEventListener("click", () => {
        if (currentPlayingVideoId) {
            openSongDetails(currentPlayingVideoId, {
                title: currentTitle?.innerText || 'Track Details',
                artist: currentArtist?.innerText || 'Artist',
                coverUrl: currentCover?.src || ''
            });
        }
    });
}
if (albumCover) {
    albumCover.style.cursor = "pointer";
    albumCover.title = "View song details";
    albumCover.addEventListener("click", () => {
        if (currentPlayingVideoId) {
            openSongDetails(currentPlayingVideoId, {
                title: currentTitle?.innerText || 'Track Details',
                artist: currentArtist?.innerText || 'Artist',
                coverUrl: currentCover?.src || ''
            });
        }
    });
}

// History back navigation
window.addEventListener("popstate", (e) => {
    if (e.state && e.state.view === "song-detail" && e.state.songId) {
        openSongDetails(e.state.songId);
    } else {
        showView("home");
    }
});

// Check if URL has ?song=ID on initial load
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const songParam = params.get("song") || params.get("id");
    if (songParam) {
        openSongDetails(songParam);
    }
});

// Helper utility to convert raw seconds to MM:SS formatting
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// ==========================================
// 7. Profile Menu, Authentication & Settings
// ==========================================
const profileContainer = document.getElementById("profile-container");
const profileBtn = document.getElementById("profile-btn");
const profileDropdown = document.getElementById("profile-dropdown");
const profileAvatarCircle = document.getElementById("profile-avatar-circle");
const profileDefaultIcon = document.getElementById("profile-default-icon");
const profileInitials = document.getElementById("profile-initials");
const profileDisplayName = document.getElementById("profile-display-name");

// Modal Elements
const profileModalOverlay = document.getElementById("profile-modal-overlay");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalSaveBtn = document.getElementById("modal-save-btn");
const editDisplayName = document.getElementById("edit-display-name");
const editEmail = document.getElementById("edit-email");
const modalAvatarPreview = document.getElementById("modal-avatar-preview");
const modalPlanBadge = document.getElementById("modal-plan-badge");
const toastNotification = document.getElementById("toast-notification");

let selectedAvatarColor = "#1ed760";

function getUserSession() {
    try {
        const stored = localStorage.getItem("spotify_user");
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error("Error reading user session:", e);
    }
    return null;
}

function updateProfileUI() {
    const user = getUserSession();

    if (user && user.isLoggedIn) {
        // User is Logged In
        if (profileDisplayName) profileDisplayName.innerText = user.name;
        if (profileDefaultIcon) profileDefaultIcon.style.display = "none";
        if (profileInitials) {
            profileInitials.style.display = "block";
            profileInitials.innerText = user.avatarText || user.name.charAt(0).toUpperCase();
        }
        if (profileAvatarCircle) {
            profileAvatarCircle.style.backgroundColor = user.avatarColor || "#1ed760";
            profileAvatarCircle.style.color = "#000000";
        }

        renderLoggedInDropdown(user);
    } else {
        // User is NOT Logged In (Guest)
        if (profileDisplayName) profileDisplayName.innerText = "Log In";
        if (profileDefaultIcon) profileDefaultIcon.style.display = "block";
        if (profileInitials) profileInitials.style.display = "none";
        if (profileAvatarCircle) {
            profileAvatarCircle.style.backgroundColor = "#535353";
            profileAvatarCircle.style.color = "#ffffff";
        }

        renderGuestDropdown();
    }
}

function renderLoggedInDropdown(user) {
    if (!profileDropdown) return;
    profileDropdown.innerHTML = `
        <div class="dropdown-user-header">
            <div class="dropdown-avatar" style="background-color: ${user.avatarColor || '#1ed760'};">
                ${user.avatarText || user.name.charAt(0).toUpperCase()}
            </div>
            <div class="dropdown-user-info">
                <span class="dropdown-user-name">${user.name}</span>
                <span class="dropdown-user-email">${user.email || 'user@spotify.com'}</span>
            </div>
        </div>
        <button class="dropdown-item" id="open-settings-item">
            <span>Profile Settings</span>
            <i class="fa-solid fa-gear"></i>
        </button>
        <button class="dropdown-item" id="account-item">
            <span>Account</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </button>
        <button class="dropdown-item" id="premium-item">
            <span>${user.plan || 'Spotify Premium'}</span>
            <i class="fa-solid fa-gem" style="color: #1ed760;"></i>
        </button>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" id="logout-item" style="color: #ff5e5e;">
            <span>Log out</span>
            <i class="fa-solid fa-arrow-right-from-bracket" style="color: #ff5e5e;"></i>
        </button>
    `;

    document.getElementById("open-settings-item")?.addEventListener("click", () => {
        closeDropdown();
        openProfileSettingsModal();
    });

    document.getElementById("account-item")?.addEventListener("click", () => {
        closeDropdown();
        openProfileSettingsModal();
    });

    document.getElementById("logout-item")?.addEventListener("click", () => {
        logoutUser();
    });
}

function renderGuestDropdown() {
    if (!profileDropdown) return;
    profileDropdown.innerHTML = `
        <div style="padding: 10px 12px; font-size: 0.85rem; color: #a7a7a7;">
            Sign in to customize your profile, save playlists, and enjoy personalized music.
        </div>
        <a href="login.html" class="dropdown-item login-highlight">
            Log In
        </a>
        <a href="login.html?mode=signup" class="dropdown-item">
            <span>Sign Up</span>
            <i class="fa-solid fa-user-plus"></i>
        </a>
    `;
}

function toggleDropdown() {
    if (!profileDropdown) return;
    const isOpen = profileDropdown.classList.contains("open");
    if (isOpen) {
        closeDropdown();
    } else {
        profileDropdown.classList.add("open");
        profileContainer?.classList.add("open");
    }
}

function closeDropdown() {
    profileDropdown?.classList.remove("open");
    profileContainer?.classList.remove("open");
}

if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
    });
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
    if (profileContainer && !profileContainer.contains(e.target)) {
        closeDropdown();
    }
});

// Modal Logic
function openProfileSettingsModal() {
    const user = getUserSession();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (editDisplayName) editDisplayName.value = user.name;
    if (editEmail) editEmail.value = user.email || "";
    if (modalPlanBadge) modalPlanBadge.innerText = user.plan || "Spotify Premium";
    
    selectedAvatarColor = user.avatarColor || "#1ed760";
    if (modalAvatarPreview) {
        modalAvatarPreview.innerText = user.avatarText || user.name.charAt(0).toUpperCase();
        modalAvatarPreview.style.backgroundColor = selectedAvatarColor;
    }

    // Highlight active color dot
    document.querySelectorAll(".color-dot").forEach(dot => {
        dot.classList.toggle("active", dot.dataset.color === selectedAvatarColor);
    });

    profileModalOverlay?.classList.add("open");
}

function closeProfileSettingsModal() {
    profileModalOverlay?.classList.remove("open");
}

if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeProfileSettingsModal);
if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeProfileSettingsModal);

if (profileModalOverlay) {
    profileModalOverlay.addEventListener("click", (e) => {
        if (e.target === profileModalOverlay) {
            closeProfileSettingsModal();
        }
    });
}

// Color picker dots
document.querySelectorAll(".color-dot").forEach(dot => {
    dot.addEventListener("click", () => {
        document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
        dot.classList.add("active");
        selectedAvatarColor = dot.dataset.color;
        if (modalAvatarPreview) {
            modalAvatarPreview.style.backgroundColor = selectedAvatarColor;
        }
    });
});

// Save Settings
if (modalSaveBtn) {
    modalSaveBtn.addEventListener("click", () => {
        const user = getUserSession();
        if (!user) return;

        const newName = editDisplayName.value.trim();
        if (!newName) {
            alert("Please enter a valid display name.");
            return;
        }

        user.name = newName;
        user.avatarColor = selectedAvatarColor;
        user.avatarText = newName.charAt(0).toUpperCase();

        localStorage.setItem("spotify_user", JSON.stringify(user));
        closeProfileSettingsModal();
        updateProfileUI();
        showToast("Profile settings saved successfully!");
    });
}

function logoutUser() {
    localStorage.removeItem("spotify_user");
    closeDropdown();
    updateProfileUI();
    showToast("Logged out successfully.");
}

function showToast(msg) {
    if (!toastNotification) return;
    toastNotification.innerText = msg;
    toastNotification.classList.add("show");
    setTimeout(() => {
        toastNotification.classList.remove("show");
    }, 3000);
}

// Initialize Profile UI on page load
updateProfileUI();

