# Club 100 – Web Playback Spotify Game

A local web application that runs the “Club 100” drinking game:
**100 minutes, 100 shots of beer, 100 songs**, each played around its drop.

This app runs entirely on your Mac and uses:

- Frontend: React (browser-based UI)
- Backend: Python (FastAPI)
- Music Playback: Spotify Web Playback SDK (inside browser)
- Data & Control: Spotify Web API

Playback happens directly in the browser tab, using your Spotify Premium account.

---

## 1. Game Concept

The user selects 10 artists.  
For each artist, the backend retrieves their top 10 tracks → 100 total tracks.

During the 100-minute game:

- Minute 1 → Artist A, Song 1  
- Minute 2 → Artist B, Song 1  
- …  
- Minute 10 → Artist J, Song 1  
- Minute 11 → Artist A, Song 2  
- …  
- Minute 100 → Artist J, Song 10  

Mapping from minute to artist/song (1-indexed minutes):

    artist_index = (minute - 1) % 10
    song_index   = (minute - 1) // 10

Each track is played around its drop, using a simple heuristic:

    position_ms = min(0.60 * duration_ms, duration_ms - 45000)

This starts playback at about 60% into the track but ensures at least ~45 seconds remain.

---

## 2. Architecture Overview

Project layout:

    project/
    │
    ├── backend/                # Python / FastAPI
    │   ├── app.py
    │   ├── spotify.py
    │   ├── requirements.txt
    │   └── .env
    │
    ├── frontend/               # React
    │   ├── public/index.html   # Loads Spotify Web Playback SDK
    │   ├── src/App.jsx
    │   ├── src/components/
    │   └── package.json
    │
    ├── README.md
    └── AGENT.md

---

## 3. Backend Responsibilities (FastAPI)

The backend:

- Implements Spotify Authorization Code Flow (server-side).
- Manages access and refresh tokens (and token refresh).
- Talks to the Spotify Web API for search, track retrieval, and playback control.
- Exposes a small REST API used by the React frontend.

### Core Endpoints

- `GET /login`  
  Redirects the user to the Spotify authorization page with required scopes.

- `GET /callback`  
  Handles Spotify’s redirect, exchanges authorization code for access and refresh tokens, stores them in memory, and redirects the user to the React frontend (e.g., `http://localhost:3000/`).

- `GET /api/token`  
  Returns a fresh access token (refreshing if necessary). Used by the Web Playback SDK.

- `GET /api/search?q=...`  
  Searches for artists by name and returns a list with basic metadata (id, name, image).

- `POST /api/tracks`  
  Input: array of 10 artist IDs.  
  Behavior: fetch each artist’s top 10 tracks and return them as a 10×10 matrix (by artist, then track).

- `POST /api/play-minute`  
  Input: JSON with `device_id`, `track_uri`, and `duration_ms`.  
  Behavior: computes `position_ms` as described above and calls Spotify’s playback endpoint to start that track at the desired position on the given device.

### Environment Variables

In `backend/.env`:

    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    REDIRECT_URI=http://localhost:8000/callback

---

## 4. Frontend Responsibilities (React)

The frontend:

- Loads the Spotify Web Playback SDK in `public/index.html`.
- Initializes a Spotify player in the browser and obtains a `device_id`.
- Provides UI for:
  - Logging in with Spotify (via backend `/login`).
  - Searching and selecting exactly 10 artists.
  - Starting and running the 100-minute game.
- Maintains the game timer and calls the backend each minute to trigger playback.

### Spotify Web Playback SDK

In `frontend/public/index.html`, include:

    <script src="https://sdk.scdn.co/spotify-player.js"></script>

In React, when the SDK is ready:

- Create a `Spotify.Player` with a `getOAuthToken` callback that calls `GET /api/token`.
- Listen for the `ready` event to get the `device_id`.
- Store `device_id` in React state for use when calling `/api/play-minute`.

---

## 5. Game Loop (Frontend)

The 100-minute timer runs in the frontend:

1. When the user starts the game:
   - Set `minute = 1`.
   - Immediately request playback for minute 1 via `/api/play-minute`.
2. Set an interval that fires every 60,000 ms (60 seconds).
3. On each tick:
   - Increment `minute`.
   - If `minute > 100`, clear the interval and end the game.
   - Otherwise:
     - Compute `artist_index` and `song_index`.
     - Select the corresponding track from the 10×10 track matrix.
     - Call `/api/play-minute` with `device_id`, `track_uri`, and `duration_ms`.

The frontend also displays:

- Current minute (1–100).
- Current artist and track.
- A large “DRINK!” cue each minute.

---

## 6. Running the App

### Backend

    cd backend
    pip install -r requirements.txt
    uvicorn app:app --reload --port 8000

### Frontend

    cd frontend
    npm install
    npm run dev

Open in your browser:

    http://localhost:3000

Make sure:

- The backend (`http://localhost:8000`) is running.
- Your Spotify app settings have `http://localhost:8000/callback` registered as a valid redirect URI.
- You are logged in with a Spotify Premium account.

---

## 7. Notes and Limitations

- Spotify Web Playback SDK requires a Premium account.
- Browsers often require a user interaction (click) before audio can autoplay; the “Start Game” button satisfies this.
- This app is intended for personal use on a single machine and does not handle multi-user sessions or persistence.

---

## 8. Drinking Disclaimer

This is a drinking game.  
Please drink responsibly, hydrate, and know your limits.  
You can also use non-alcoholic beer or other beverages if you prefer.
