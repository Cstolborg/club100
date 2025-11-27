# AGENT INSTRUCTIONS — Club 100 Project

These instructions tell a coding agent (e.g., Codex) how to generate the project.

---

## 1. Objective

Build a complete working application using:

- Backend: Python + FastAPI  
- Frontend: React  
- Playback: Spotify Web Playback SDK in the browser  
- Music Data and Control: Spotify Web API  

The app must:

1. Authenticate with Spotify using Authorization Code Flow.
2. Create a Spotify Web Playback SDK device in the browser.
3. Let the user pick exactly 10 artists.
4. Fetch the top 10 tracks for each of the 10 artists.
5. Run a 100-minute timer.
6. For each minute, select and play the correct track based on the mapping.
7. Start track playback around the drop (approximately 60% into the track).

---

## 2. Backend Requirements (FastAPI)

### Tech Stack

- Python 3.10+
- FastAPI
- httpx (async HTTP client)
- python-dotenv (for environment variables)

### Environment Variables

Read from `backend/.env`:

    SPOTIFY_CLIENT_ID
    SPOTIFY_CLIENT_SECRET
    REDIRECT_URI

The default `REDIRECT_URI` should be:

    http://localhost:8000/callback

### Token Management

- Use Spotify Authorization Code Flow.
- Store the following in memory:
  - `access_token`
  - `refresh_token`
  - `expires_at` (unix timestamp when access token expires)
- Implement a helper function to get a fresh access token:
  - If the token is close to expiry, use the refresh token to obtain a new one.
- Never expose `refresh_token` or client secret to the frontend.

### Required Endpoints

Implement these endpoints:

1. `GET /login`  
   - Redirect the user to Spotify authorization page.
   - Include the scopes:
     - `streaming`
     - `user-read-email`
     - `user-read-private`
     - `user-modify-playback-state`
     - `user-read-playback-state`

2. `GET /callback`  
   - Receive `code` from Spotify.
   - Exchange `code` for `access_token`, `refresh_token`, and `expires_in`.
   - Store tokens and compute `expires_at`.
   - Redirect user to frontend at `http://localhost:3000/`.

3. `GET /api/token`  
   - Return a JSON object with a fresh access token:
     
         { "access_token": "..." }
     
   - Use the token management helper to refresh when needed.

4. `GET /api/search?q=artist_name`  
   - Proxy to Spotify Search API with type `artist`.
   - Return an array of artists, each with:
     - `id`
     - `name`
     - `image` (optional, first or best image URL)

5. `POST /api/tracks`  
   - Input: JSON array of exactly 10 Spotify artist IDs.
   - For each artist, fetch their top tracks (up to 10) for a given market (e.g. `US`).
   - Construct a 10×10 structure: 10 artists × 10 tracks.
   - Each track object must include:
     - `uri`
     - `name`
     - `duration_ms`
     - `artist_name`
     - `album_image` (if available)
   - Return this structure in JSON.

6. `POST /api/play-minute`  
   - Input JSON:
     
         {
           "device_id": "...",
           "track_uri": "...",
           "duration_ms": 200000
         }
     
   - Compute:
     
         position_ms = min(0.6 * duration_ms, duration_ms - 45000)
     
   - Issue a PUT request to:
     
         /v1/me/player/play?device_id=<device_id>
     
     with JSON body:
     
         {
           "uris": [track_uri],
           "position_ms": position_ms
         }
     
   - Return a simple JSON response, e.g. `{ "status": "ok" }`.

---

## 3. Frontend Requirements (React)

### Tech Stack

- React (functional components)
- Hooks: `useState`, `useEffect`
- axios for HTTP calls
- Tooling: Vite or Create React App (either is acceptable)

### Loading the Spotify Web Playback SDK

In `frontend/public/index.html`, the SDK script must be included:

    <script src="https://sdk.scdn.co/spotify-player.js"></script>

### Player Initialization

In the main React app:

- Wait for `window.onSpotifyWebPlaybackSDKReady`.
- Create a new `Spotify.Player` with:
  - `name`: e.g. "Club 100 Game Player"
  - `getOAuthToken`: function that calls backend `/api/token` and supplies the `access_token` to the callback.
- Listen for the `ready` event to get the `device_id`.
- Store `device_id` in React state.
- Call `player.connect()`.

### Application Screens / Components

Implement at least these logical components/screens:

1. `LoginScreen`
   - Shows a button: “Login with Spotify”.
   - Button calls backend `/login` (full page redirect).
   - After successful login and callback, the user is returned to the frontend root.

2. `ArtistSelector`
   - Shows a search box.
   - On every (debounced) change, calls `GET /api/search?q=...`.
   - Displays a list of matching artists with a button to “Select”.
   - User can select exactly 10 artists; enforce the limit.
   - When 10 are selected, show a “Confirm Artists” / “Continue” button.
   - On confirmation, POST the array of 10 artist IDs to `/api/tracks`.
   - Store the returned 10×10 tracks in frontend state.

3. `GameScreen`
   - Uses the 10×10 tracks and `device_id`.
   - Shows:
     - Current minute (1–100).
     - Current artist name and track name.
     - Big “DRINK!” text per minute.
   - Provides a “Start Game” button.
   - On start:
     - Set `minute = 1`.
     - Immediately call `/api/play-minute` for minute 1:
       
           artist_index = (minute - 1) % 10
           song_index   = (minute - 1) // 10
       
     - Start an interval of 60 seconds.
   - On each tick:
     - Increment `minute`.
     - If `minute > 100`:
       - Clear interval and stop game.
     - Else:
       - Compute `artist_index` and `song_index`.
       - Look up the corresponding track.
       - Call `/api/play-minute` with `device_id`, `track_uri`, and `duration_ms`.

---

## 4. Game Logic Summary

Mapping minutes to artist/track:

    artist_index = (minute - 1) % 10
    song_index   = (minute - 1) // 10

Timer:

- Runs in the frontend.
- Minute 1 to 100.
- 60 seconds per minute tick.
- Each tick triggers a call to `/api/play-minute`.

---

## 5. Coding Rules for the Agent

1. Use clean, modular, and readable code.
2. Use async FastAPI endpoints and httpx for Spotify calls.
3. Do not expose `SPOTIFY_CLIENT_SECRET` or refresh tokens to the frontend.
4. The frontend must use React functional components and hooks (no class components).
5. All playback must go through the Web Playback SDK (not the desktop client).
6. Respect the file structure described in `README.md`.
7. When generating code, place backend code under `backend/` and frontend code under `frontend/`.

---

## 6. Deliverables

The agent should be able to generate:

- Backend:
  - `backend/app.py`
  - `backend/spotify.py`
  - `backend/requirements.txt`
  - `backend/.env.example` (template)
- Frontend:
  - `frontend/public/index.html`
  - `frontend/src/App.jsx`
  - `frontend/src/components/*`
  - `frontend/package.json`

The result should be a project that can be started with:

    uvicorn app:app --reload --port 8000
    npm run dev

and accessed at:

    http://localhost:3000

---

# END OF SPEC
