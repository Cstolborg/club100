# AGENT INSTRUCTIONS — Club 100 Project

These instructions tell a coding agent (e.g., Claude Code) how to work with and develop the Club 100 project.

---

## Project Status

**Current State**: ✅ FULLY FUNCTIONAL (Phases 1-8 Complete)

**Last Updated**: 2025-11-27

The repository currently contains:
- `CLAUDE.md` - This specification and instruction file
- `README.md` - Project documentation
- `backend/` - Python FastAPI backend ✅ COMPLETE & TESTED
- `frontend/` - React frontend ✅ COMPLETE & BUILT
- `.git/` - Git repository
- `.claude/` - Custom agents, hooks, and slash commands

**Implementation Status**:
- ✅ Backend API fully implemented (Phases 1-4)
- ✅ Spotify OAuth integration working
- ✅ All 6 API endpoints tested and functional
- ✅ Token refresh mechanism working
- ✅ Rate limiting with exponential backoff
- ✅ Comprehensive testing documentation
- ✅ Frontend UI fully implemented (Phases 5-6)
- ✅ Spotify Web Playback SDK integrated (Phase 7)
- ✅ Game logic with drift-corrected timer (Phase 8)
- ✅ Test mode (20 rounds × 10 seconds)
- ✅ All three screens: Login, Artist Selection, Game
- ⚠️  Phase 9 (Polish): Basic error handling present, can be enhanced

---

## Development Workflow

### Initial Setup (First Time)

1. **Create Backend Structure**:
   ```bash
   mkdir -p backend
   cd backend
   ```

2. **Create Frontend Structure**:
   ```bash
   mkdir -p frontend/src/components frontend/public
   ```

3. **Set Up Environment Variables**:
   - Copy `backend/.env.example` to `backend/.env`
   - Fill in Spotify credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

4. **Install Dependencies**:
   ```bash
   # Backend
   cd backend && pip install -r requirements.txt

   # Frontend
   cd frontend && npm install
   ```

### Daily Development Workflow

1. **Start Backend**:
   ```bash
   cd backend
   uvicorn app:app --reload --port 8000
   ```

2. **Start Frontend** (in separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Git Workflow

- **Branch naming**: Use descriptive names like `feature/artist-search`, `fix/token-refresh`, `docs/setup-guide`
- **Commit messages**: Follow conventional commits format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `refactor:` for code refactoring
  - `test:` for adding tests
  - `chore:` for maintenance tasks

### Testing Strategy

- **Backend**: Use pytest for unit and integration tests
- **Frontend**: Use Vitest/Jest and React Testing Library
- **Manual Testing**: Test with actual Spotify Premium account
- **Key Test Cases**:
  - Token refresh mechanism
  - Artist selection (exactly 10)
  - Track fetching (10×10 matrix)
  - Playback positioning (60% drop calculation)
  - Timer accuracy over 100 minutes

---

## Key Conventions & Best Practices

### Backend Conventions

1. **Error Handling**:
   - Always handle Spotify API rate limits (429 errors)
   - Implement exponential backoff for retries
   - Return meaningful error messages to frontend

2. **Security**:
   - NEVER log access tokens or refresh tokens
   - NEVER expose `SPOTIFY_CLIENT_SECRET` in responses
   - Use CORS middleware with multiple allowed origins:
     ```python
     origins = [
         "http://localhost:3000",
         "http://localhost:5173",  # Vite default
         "http://127.0.0.1:3000",
         "http://127.0.0.1:5173",
     ]
     ```
   - Validate all input parameters

3. **Token Management**:
   - Check token expiry before each Spotify API call
   - Implement at least 60-second buffer before expiry
   - Store tokens in memory (no database for MVP)
   - Handle token refresh failures gracefully

4. **Code Organization**:
   - Keep Spotify API logic in `spotify.py`
   - Keep FastAPI routes in `app.py`
   - Use type hints for all function parameters
   - Use Pydantic models for request/response validation

### Frontend Conventions

1. **Component Structure**:
   - One component per file
   - Use functional components only (no classes)
   - Keep components small and focused
   - Extract reusable logic into custom hooks

2. **State Management**:
   - Use React hooks (`useState`, `useEffect`, `useCallback`)
   - Lift state up when shared between components
   - Consider Context API for global state (device_id, tracks)

3. **API Calls**:
   - Centralize API calls in a service file (e.g., `api.js`)
   - Handle loading and error states for all API calls
   - Implement proper error boundaries

4. **Spotify Player**:
   - Initialize player only once
   - Store player instance in ref, not state
   - Always check if SDK is loaded before using
   - Handle player errors and disconnections

### Common Pitfalls to Avoid

1. **Web Playback SDK Issues**:
   - SDK requires Premium account
   - Must call `player.connect()` after initialization
   - Device may take 2-3 seconds to appear in Spotify
   - Browser autoplay policies require user interaction first
   - **Fix**: Show device name to user and confirm before starting game

2. **Timer Accuracy**:
   - `setInterval` can drift over time (could be off by seconds after 100 minutes)
   - **Fix**: Use `setTimeout` with drift correction:
     ```javascript
     const startTime = Date.now();
     const tick = () => {
       const elapsed = Date.now() - startTime;
       const currentMinute = Math.floor(elapsed / intervalDuration) + 1;
       // Update state and schedule next tick
       const nextTick = (currentMinute * intervalDuration) - elapsed;
       setTimeout(tick, nextTick);
     };
     ```
   - Account for network latency in playback calls

3. **Track Playback**:
   - Some tracks may not be playable in certain markets
   - Artists may have < 10 top tracks available
   - **Fix**: Pad track matrix with nulls, handle gracefully in frontend
   - Ensure `position_ms` doesn't exceed `duration_ms` and has minimum play time
   - **Fix**: `position_ms = max(0, min(position_ms, duration_ms - 10000))`

4. **CORS Issues**:
   - Backend must enable CORS for multiple frontend ports (Vite uses 5173 by default)
   - **Fix**: Allow `localhost:3000`, `localhost:5173`, and `127.0.0.1` variants
   - Spotify API calls must be server-side (no CORS on Spotify API)

5. **Error Handling**:
   - Spotify API may be down or rate-limited
   - Network connection may drop mid-game
   - Device may disconnect
   - **Fix**: Pause game on errors, show retry modal, save state to localStorage

---

## Implementation Checklist

When building from scratch, implement in this order:

### Phase 1: Backend Foundation ✅ COMPLETE
- [x] Create `backend/.gitignore` (exclude .env, venv, __pycache__)
- [x] Create `backend/requirements.txt` with dependencies
- [x] Create `backend/.env.example` template
- [x] Implement basic FastAPI app in `backend/app.py`
- [x] Implement token storage structure
- [x] Add CORS middleware for multiple ports (3000, 5173, 127.0.0.1 variants)

### Phase 2: Spotify Authentication ✅ COMPLETE
- [x] Implement `GET /login` endpoint
- [x] Implement `GET /callback` endpoint
- [x] Implement token refresh logic in `spotify.py`
- [x] Implement `GET /api/token` endpoint
- [x] Test full OAuth flow manually
- [x] Update redirect URI to use `127.0.0.1` (Spotify security requirement)

### Phase 3: Spotify Data Endpoints ✅ COMPLETE
- [x] Implement `GET /api/search` for artist search
- [x] Implement `POST /api/tracks` for fetching top tracks
- [x] Test with real Spotify data
- [x] Handle edge cases: pad to 10 tracks if artist has fewer, handle null tracks
- [x] Implement exponential backoff for rate limiting (429 errors)

### Phase 4: Playback Control ✅ COMPLETE
- [x] Implement `POST /api/play-minute` endpoint
- [x] Fix position calculation: `max(0, min(position_ms, duration_ms - 10000))`
- [x] Test position calculation with short tracks (< 75 seconds)
- [x] Verify playback starts at correct position

### Phase 5: Frontend Foundation ✅ COMPLETE
- [x] Create `frontend/.gitignore` (exclude node_modules, dist, .env.local)
- [x] Create React app structure (Vite recommended)
- [x] Add Spotify SDK script to `index.html`
- [x] Create basic routing/navigation structure
- [x] Set up API service module with error handling

### Phase 6: Frontend Components ✅ COMPLETE
- [x] Build `LoginScreen` component
- [x] Build `ArtistSelector` component with search
- [x] Build `GameScreen` component with timer
- [x] Add error handling and loading states

### Phase 7: Spotify Player Integration ✅ COMPLETE
- [x] Initialize Spotify Player in React
- [x] Store `device_id` when player is ready
- [x] Test player connection and playback

### Phase 8: Game Logic ✅ COMPLETE
- [x] Implement timer with drift correction (setTimeout not setInterval)
- [x] Add test mode: 20 rounds × 10 seconds (configurable)
- [x] Implement minute-to-track mapping
- [x] Integrate playback API calls with error handling
- [x] Add visual feedback (DRINK! message, progress bar, album art)
- [x] Save game state to localStorage for recovery (basic)

### Phase 9: Polish ⚠️ PARTIALLY COMPLETE
- [x] Add styling and UI improvements (Spotify-themed design)
- [x] Implement pause/resume functionality
- [ ] Add device confirmation dialog before starting (player status shown)
- [ ] Add volume control (set to consistent level)
- [ ] Add error boundary component for graceful failures
- [ ] Test full 100-minute flow and test mode (20 rounds)

---

## Troubleshooting Guide

### Backend Issues

**Problem**: "Module not found" errors
- **Solution**: Ensure virtual environment is activated and dependencies installed

**Problem**: Token refresh failing
- **Solution**: Check `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are correct

**Problem**: 401 Unauthorized from Spotify API
- **Solution**: Token may be expired or invalid; check token refresh logic

### Frontend Issues

**Problem**: "Spotify is not defined"
- **Solution**: Ensure SDK script is loaded before initializing player

**Problem**: Device not appearing
- **Solution**: Call `player.connect()` and wait for `ready` event

**Problem**: "Premium required" error
- **Solution**: Spotify Web Playback SDK only works with Premium accounts

**Problem**: Playback not starting
- **Solution**: Ensure user has interacted with page (clicked button)

### Integration Issues

**Problem**: CORS errors
- **Solution**: Add CORS middleware to FastAPI with correct origin

**Problem**: Token not refreshing in frontend
- **Solution**: Check `/api/token` endpoint returns fresh token

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
   - **Important**: If an artist has fewer than 10 tracks, pad with `null` values to maintain array structure.
   - Each track object must include:
     - `uri`
     - `name`
     - `duration_ms`
     - `artist_name`
     - `album_image` (if available)
   - Return this structure in JSON.
   - Implement exponential backoff for rate limiting (429 errors).

6. `POST /api/play-minute`
   - Input JSON:

         {
           "device_id": "...",
           "track_uri": "...",
           "duration_ms": 200000
         }

   - Compute position with safety checks:

         position_ms = min(0.6 * duration_ms, duration_ms - 45000)
         position_ms = max(0, min(position_ms, duration_ms - 10000))

     This ensures:
     - Never negative
     - At least 10 seconds of playback remaining
     - Handles short tracks (< 75 seconds) gracefully

   - Issue a PUT request to:

         /v1/me/player/play?device_id=<device_id>

     with JSON body:

         {
           "uris": [track_uri],
           "position_ms": position_ms
         }

   - Return a simple JSON response, e.g. `{ "status": "ok" }`.
   - Handle errors (rate limits, network issues) with proper status codes.

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
     - Current round (1–100 or 1–20 in test mode)
     - Current artist name and track name
     - Big "DRINK!" text per round
     - Progress bar showing completion
     - Album artwork
   - Provides a "Start Game" button with optional test mode toggle.
   - On start:
     - Confirm device with user ("Play on [Device Name]?")
     - Set `round = 1`.
     - Immediately call `/api/play-minute` for round 1:

           artist_index = (round - 1) % 10
           song_index   = (round - 1) // 10

     - Start timer with drift correction (use `setTimeout` not `setInterval`):
       ```javascript
       const startTime = Date.now();
       const tick = () => {
         const elapsed = Date.now() - startTime;
         const currentRound = Math.floor(elapsed / intervalMs) + 1;
         if (currentRound > maxRounds) return; // Game complete
         // Update UI and trigger playback
         const nextTick = (currentRound * intervalMs) - elapsed;
         setTimeout(tick, nextTick);
       };
       ```
   - On each tick:
     - Compute `artist_index` and `song_index`.
     - Look up the corresponding track.
     - If track is `null`, show skip message.
     - Otherwise call `/api/play-minute` with `device_id`, `track_uri`, and `duration_ms`.
     - Handle errors: pause game, show retry modal, save state to localStorage.

---

## 4. Game Logic Summary

Mapping minutes to artist/track:

    artist_index = (minute - 1) % 10
    song_index   = (minute - 1) // 10

Timer:

- Runs in the frontend.
- Normal mode: 100 rounds × 60 seconds = 100 minutes
- Test mode: 20 rounds × 10 seconds = 200 seconds (~3.3 minutes)
- Each tick triggers a call to `/api/play-minute`.

### Test Mode

For practical testing and development, implement a configurable test mode:

**Configuration:**
- **Rounds**: 20 (instead of 100)
- **Interval**: 10 seconds (instead of 60)
- **Total Duration**: 3 minutes 20 seconds

**Implementation:**
- Add toggle or parameter in frontend to enable test mode
- Use same game logic, just different constants:
  ```javascript
  const config = testMode
    ? { rounds: 20, intervalMs: 10000 }
    : { rounds: 100, intervalMs: 60000 };
  ```
- Artist/track mapping stays the same, just cycles through first 20 combinations
- All other functionality remains identical (playback position, API calls, etc.)

**Benefits:**
- Quick end-to-end testing (3 minutes vs 100 minutes)
- Easier to debug timer logic and playback synchronization
- Faster iteration during development

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

## 7. Spotify API Reference

### Required Scopes
```
streaming                    # Web Playback SDK
user-read-email             # User profile
user-read-private           # User profile
user-modify-playback-state  # Control playback
user-read-playback-state    # Read playback state
```

### Key API Endpoints Used

1. **Token Exchange**:
   - `POST https://accounts.spotify.com/api/token`
   - Used for: Getting access/refresh tokens, refreshing tokens

2. **Search Artists**:
   - `GET https://api.spotify.com/v1/search?q={query}&type=artist`
   - Returns: Artist objects with id, name, images, etc.

3. **Get Artist's Top Tracks**:
   - `GET https://api.spotify.com/v1/artists/{id}/top-tracks?market={market}`
   - Returns: Array of track objects (usually 10 tracks)

4. **Start/Resume Playback**:
   - `PUT https://api.spotify.com/v1/me/player/play?device_id={device_id}`
   - Body: `{ "uris": ["spotify:track:..."], "position_ms": 12345 }`

### Rate Limiting
- Spotify API has rate limits (typically 180 requests per minute)
- Implement exponential backoff on 429 responses
- Cache results where possible (especially top tracks)

---

## 8. File Structure Reference

Expected final structure:

```
club100/
├── backend/
│   ├── app.py                 # FastAPI application and routes
│   ├── spotify.py             # Spotify API client and helpers
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables (not in git)
│   └── .env.example          # Template for .env
│
├── frontend/
│   ├── public/
│   │   ├── index.html        # Includes Spotify SDK script
│   │   └── favicon.ico
│   ├── src/
│   │   ├── App.jsx           # Main app component
│   │   ├── main.jsx          # Entry point
│   │   ├── api.js            # API service functions
│   │   ├── components/
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── ArtistSelector.jsx
│   │   │   └── GameScreen.jsx
│   │   └── styles/
│   │       └── App.css
│   ├── package.json
│   ├── vite.config.js        # Vite configuration
│   └── .gitignore
│
├── .gitignore
├── README.md                  # User-facing documentation
└── CLAUDE.md                  # This file - AI assistant instructions
```

---

## 9. Dependencies Reference

### Backend (requirements.txt)
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
python-dotenv==1.0.0
pydantic==2.5.0
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## 10. Quick Reference Commands

### Setup Commands
```bash
# Clone and initialize
git clone <repo-url>
cd club100

# Create directories
mkdir -p backend frontend/src/components frontend/public

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Spotify credentials

# Frontend setup
cd ../frontend
npm install
```

### Running the Application
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # If not already activated
uvicorn app:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Useful Development Commands
```bash
# Backend - Run with different port
uvicorn app:app --reload --port 8080

# Backend - Check Python version
python --version

# Frontend - Build for production
npm run build

# Frontend - Preview production build
npm run preview

# Check running processes
lsof -i :8000  # Check what's using port 8000
lsof -i :3000  # Check what's using port 3000
```

---

## 11. Environment Variables

### Backend (.env)
```bash
# Spotify Application Credentials
# Get these from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# OAuth Redirect URI (must match Spotify app settings)
REDIRECT_URI=http://localhost:8000/callback

# Optional: Market for track availability (default: US)
MARKET=US
```

### Frontend (.env.local) - Optional
```bash
# Backend API URL (useful for different environments)
VITE_API_URL=http://localhost:8000
```

---

## 12. Important Notes for AI Assistants

### When Implementing

1. **Start with Backend First**: The frontend depends on backend API endpoints
2. **Test Each Endpoint**: Use FastAPI's `/docs` (Swagger UI) to test endpoints
3. **Use Type Hints**: Python type hints help catch errors early
4. **Handle Errors Gracefully**: Always return meaningful error messages
5. **Don't Overthink**: This is an MVP - keep it simple

### Code Style

- **Python**: Follow PEP 8, use type hints, async/await for I/O
- **JavaScript**: Use ES6+, prefer const/let over var, use arrow functions
- **React**: Functional components, hooks, destructuring props

### Security Reminders

- Store secrets in `.env`, never commit to git
- Add `backend/.env` to `.gitignore`
- CORS should only allow `http://localhost:3000` in development
- Never expose refresh tokens or client secret to frontend

### Testing During Development

1. **Test OAuth Flow**: Ensure you can login and get redirected back
2. **Test Token Refresh**: Verify tokens refresh before expiry
3. **Test Artist Search**: Search for known artists
4. **Test Track Fetching**: Verify 10×10 matrix structure
5. **Test Playback**: Ensure tracks play at correct position
6. **Test Full Game**: Run abbreviated version (10 minutes instead of 100)

### Common Questions

**Q: Why not use a database?**
A: This is a single-user MVP running locally. In-memory storage is sufficient.

**Q: Why FastAPI over Flask?**
A: FastAPI has better async support, automatic API docs, and built-in validation.

**Q: Why Vite over Create React App?**
A: Vite is faster and more modern, but CRA works too.

**Q: Can this be deployed to production?**
A: Not as-is. You'd need session management, proper token storage, HTTPS, etc.

---

# END OF SPEC
