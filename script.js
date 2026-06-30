const BACKEND_URL = "http://localhost:5000/api";
let currentAudio = null;

// 1. Function to search for songs dynamically
async function searchSongs(query) {
    if (!query) return;

    try {
        const response = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(query)}`);
        const songs = await response.json();

        displaySearchResults(songs);
    } catch (error) {
        console.error("Error searching for tracks:", error);
    }
}

// 2. Function to update your Spotify card layout with real search results
function displaySearchResults(songs) {
    // We target the main content container to inject our cards dynamically
    const container = document.querySelector(".cards-containr");
    container.innerHTML = ""; // Clear existing placeholder cards

    songs.forEach(song => {
        const cardHTML = `
            <div class="card" onclick="playTrack('${song.id}', '${song.title}', '${song.artist}', '${song.coverUrl}')" style="cursor: pointer;">
                <img src="${song.coverUrl}" class="card-img">
                <p class="card-tital">${song.title.substring(0, 20)}...</p>
                <p class="card-info">${song.artist}</p>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", cardHTML);
    });
}

// 3. Function to handle audio playback, progress bars, and the bottom track layout
function playTrack(videoId, title, artist, coverUrl) {
    // If a song is already playing, stop it first
    if (currentAudio) {
        currentAudio.pause();
    }

    // Set the audio stream source to our backend piping route
    currentAudio = new Audio(`${BACKEND_URL}/stream/${videoId}`);
    currentAudio.play();

    // Update bottom player layout with current track information
    document.querySelector(".curr-sing-info .curr-song-name:nth-child(1)").innerText = title;
    document.querySelector(".curr-sing-info .curr-song-name:nth-child(2)").innerText = artist;
    document.querySelector(".curr-img").src = coverUrl;

    // Track timeline progress and link it up to your green range slider
    const progressBar = document.getElementById("slider");
    currentAudio.ontimeupdate = () => {
        if (currentAudio.duration) {
            const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
            progressBar.value = progress;

            // Format timestamps (e.g., 03:30)
            document.querySelector(".curr-time").innerText = formatTime(currentAudio.currentTime);
            document.querySelector(".total-time").innerText = formatTime(currentAudio.duration);
        }
    };

    // Allow user to click anywhere on the progress bar to skip through the song
    progressBar.oninput = (e) => {
        const newTime = (e.target.value / 100) * currentAudio.duration;
        currentAudio.currentTime = newTime;
    };
}

// Helper utility to convert raw seconds to MM:SS formatting
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 4. Hook up the search bar to execute whenever a user clicks search or presses enter
document.querySelector(".nav-option:nth-child(2)").addEventListener("click", () => {
    const query = prompt("What song do you want to listen to?");
    if (query) searchSongs(query);
});