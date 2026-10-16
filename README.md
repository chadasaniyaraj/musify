# Spotify Clone • Full-Stack Music Streaming Platform

A modern, responsive, full-stack music streaming platform inspired by Spotify Web Player. Discover, search, stream, and manage an expansive catalog of millions of tracks across diverse languages and genres—including Bollywood, Gujarati & Garba Special, Punjabi Bangers, English Pop, Devotional & Bhakti, Romantic Melodies, and High-Energy Party hits.

---

## 🌟 Key Features

### 1. 🎵 Rich Music Catalog & Multi-Genre Discovery
- **Diverse Languages & Genres**: Native support for **Hindi / Bollywood**, **Gujarati & Garba Special** (Navratri & Folk hits), **Punjabi Bangers**, **English & Global Pop**, **Romantic**, **Devotional / Bhakti**, **Party & Dance**, and **New Releases 2026**.
- **Spotify Category Filter Chips**: One-click genre pills ("All", "Bollywood", "Garba Special", "Gujarati Folk", "Punjabi Hits", "Romantic", "Devotional", "English / Pop", "Party & Dance", "New Releases") that dynamically filter and browse rich catalogs.
- **Curated Home Sections**:
  - *Trending Hits* (Kesariya, Lover, Chaleya, Softly, Mahiye Jinna Sohna)
  - *Top Charts & Global Hits* (Starboy, Shape of You, 295, Apna Bana Le, Blinding Lights, Heeriye)
  - *Today's Biggest Blockbusters* (Illuminati, Tauba Tauba, Satranga, Believer, Pehle Bhi Main, Guli Mata)
  - *Garba Special & Gujarati Hits* (Khalasi, Chogada, Char Bangdi Vadi Gadi, Dholida, Rona Ser Ma, Odhani)
  - *Devotional & Spiritual* (Shree Hanuman Chalisa, Namo Namo Shankara, Achyutam Keshavam, Har Har Shambhu, Shiv Tandav Stotram, Radhe Radhe)

### 2. 🎛️ Complete Professional Music Player
- **Sequential Line-by-Line Playback**: Next song button (`#next-btn`) and audio track ending advance line by line through active playlists seamlessly.
- **Controls**: Play/Pause, Previous/Next skip, Replay (rewinds to 0:00 or jumps back), Scrub Seek progress bar with elapsed & total duration.
- **Volume & Audio Engine**: Real-time volume slider and one-click mute/unmute restoration.
- **Shuffle & Tri-State Repeat**:
  - Shuffle mode with active green dot indicators.
  - 3-state Repeat button: *Repeat Off* ➔ *Repeat All* ➔ *Repeat Current Track (1)*.
- **Slide-out Play Queue Drawer**: View currently playing song and line-by-line upcoming tracks with clear queue option.
- **Full Lyrics Overlay Modal**: Fullscreen synchronized lyrics panel displaying real-time scrolling lines and album artwork.
- **Spotify Connect Device Modal**: Switch audio output between Web Player, Smart TV, and Mobile Phone.
- **Picture-in-Picture Mini Player**: Floating mini-player synchronized with playback controls.
- **Fullscreen Mode**: Native browser fullscreen toggle.

### 3. 🔍 Smart Music Search
- **Instant Search**: Finds songs, artists, albums, and remixes with rich metadata, duration, view counts, and high-definition artwork.
- **Manual Play Intent**: Search does not auto-play tracks; users select exactly the track they want to stream.
- **Clean Input**: Autocomplete suggestions disabled for an unobtrusive, distraction-free search experience.

### 4. 👤 Full-Stack User Features (MongoDB Atlas)
- **User Authentication**: Register and Login with secure salted **PBKDF2** password hashing.
- **Instant Demo Login**: One-click demo profile ("Alex Rivera") with preloaded library and favorites.
- **Custom Playlists**: Create, name, describe, and manage personal playlists right from the sidebar.
- **Liked Songs System**: Persistent favorite songs synchronized across MongoDB Atlas and local browser cache, complete with animated heart feedback.
- **Listening History**: Automatically logs recently played tracks into MongoDB Atlas.
- **Personalized Recommendations**: Dynamic song suggestions tailored to the user's favorite artists and recent playback.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5 Semantic Architecture, Custom CSS3 Spotify Design System |
| **Backend** | Node.js, Express.js REST API with CORS, DNS Fallback & Async Child Process Execution |
| **Database** | MongoDB Atlas with Mongoose ODM (Schemas for Users, Custom Playlists, Songs, Favorites) |
| **Streaming Engine** | Python `yt-dlp` audio pipeline (fast metadata extraction & direct high-quality streaming) |
| **Cloud Storage** | Cloudinary integration for audio and image uploads via Multer |
| **Styling** | Spotify Dark Palette (`#121212`, `#181818`, `#282828`, Spotify Green `#1ed760`), Inter/Montserrat Typography |

---

## 📂 Project Structure

```
Spotify clone/
├── css/
│   ├── style.css           # Full Spotify web player design system & components
│   └── login.css           # Spotify authentication & registration styling
├── server/
│   ├── config/
│   │   ├── db.js           # MongoDB Atlas Mongoose connection
│   │   └── cloudinary.js   # Cloudinary storage and Multer file upload setup
│   ├── models/
│   │   ├── User.js         # User model with PBKDF2 auth, favorites & history
│   │   ├── Playlist.js     # User custom playlist model
│   │   └── Song.js         # Uploaded song schema
│   ├── routes/
│   │   ├── authRoutes.js   # Register, Login, Demo auth & Profile endpoints
│   │   ├── userRoutes.js   # Favorites, Playlists CRUD, Recently Played & Recs
│   │   ├── searchRoutes.js # Music search, Streaming, Categories & Song details
│   │   └── songRoutes.js   # Cloudinary audio/image upload route
│   ├── .env                # Environment variables (Mongo URI, Cloudinary keys)
│   ├── package.json        # Node.js dependencies
│   └── server.js           # Express application entry point
├── templates/
│   ├── index.html          # Main Spotify web player single-page interface
│   ├── login.html          # Full-featured Spotify login & signup page
│   └── song-details.html   # Dedicated song details, credits & recommendations
├── script.js               # Core client-side player logic, state & UI controllers
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or later)
- **Python 3.8+** with `yt-dlp` installed:
  ```bash
  pip install -U yt-dlp
  ```
- **MongoDB Atlas** account (free tier works out-of-the-box)

### 2. Installation
Clone the repository and install backend dependencies:
```bash
git clone https://github.com/chadasaniyaraj/musify.git
cd "Spotify clone/server"
npm install
```

### 3. Environment Variables
Create or verify `server/.env` with your credentials:
```ini
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.obmgvzr.mongodb.net/spotify_clone?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Run the Development Server
From the `server` directory:
```bash
npm start
# or with live reloading:
nodemon server.js
```

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new account with name, email, password |
| `POST` | `/api/auth/login` | Authenticate existing user |
| `POST` | `/api/auth/demo` | Quick instant demo login (`Alex Rivera`) |
| `GET` | `/api/auth/me?email=...` | Retrieve user profile data |

### User Management (`/api/user`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/user/favorites` | Fetch user's liked songs |
| `POST` | `/api/user/favorites` | Toggle favorite song (like / unlike) |
| `GET` | `/api/user/recently-played` | Get listening history |
| `POST` | `/api/user/recently-played` | Log recently played track |
| `GET` | `/api/user/playlists` | Fetch all playlists created by the user |
| `POST` | `/api/user/playlists` | Create a new custom playlist |
| `POST` | `/api/user/playlists/:id/songs` | Add a track to a custom playlist |
| `DELETE` | `/api/user/playlists/:id/songs/:songId` | Remove a track from a custom playlist |
| `GET` | `/api/user/recommendations` | Get personalized song suggestions |

### Music Discovery & Streaming (`/api`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/search?q=...&limit=16` | Search YouTube Music catalog |
| `GET` | `/api/genres` | List available genres and languages |
| `GET` | `/api/browse?category=...` | Browse songs by genre/language |
| `GET` | `/api/stream/:id` | Direct high-quality audio stream redirect |
| `GET` | `/api/song/:id` | Full song metadata, views, likes & recommendations |
| `POST` | `/api/songs/upload` | Upload audio and cover to Cloudinary & MongoDB |

---

## 🎨 Design & Aesthetic Excellence
- **100% Spotify Web Player Alignment**: Authentic Spotify dark theme (`#121212`, `#181818`), emerald green highlights (`#1ed760`), and circular play buttons.
- **Whole-Card Smooth Hover**: Subtle 2px lift on song cards without distortion, preserving natural edge-to-edge album covers.
- **Responsive Layout**: Designed for seamless playback on desktop, laptop, tablet, and mobile viewport sizes.

---

## 📄 License
This project is open-source and intended for educational and portfolio demonstration purposes. Music streaming is powered through legitimate YouTube and YouTube Music catalog streams.
