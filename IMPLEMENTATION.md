# Club 100 - Implementation Summary

**Date**: 2025-11-27
**Status**: ✅ Fully Functional (Phases 1-8 Complete; tests added)

## Overview

Club 100 is a Spotify-powered drinking game application that plays 100 songs from 10 selected artists over 100 minutes, with each track starting around its "drop" (approximately 60% through the song).

The application is now **fully functional** with both backend and frontend complete.

---

## Architecture

```
club100/
├── backend/              # Python FastAPI server
│   ├── app.py           # Main API routes
│   ├── spotify.py       # Spotify API client
│   ├── requirements.txt # Dependencies
│   ├── .env            # Configuration (user-created)
│   └── .env.example    # Configuration template
│
├── frontend/            # React + Vite application
│   ├── src/
│   │   ├── App.jsx                      # Main app component
│   │   ├── api.js                       # Backend API client
│   │   ├── components/
│   │   │   ├── LoginScreen.jsx          # Spotify OAuth screen
│   │   │   ├── ArtistSelector.jsx       # 10-artist selection
│   │   │   └── GameScreen.jsx           # Game timer & playback
│   │   └── index.css                    # Global styles
│   ├── index.html      # HTML + Spotify SDK script
│   ├── package.json    # Dependencies
│   └── vite.config.js  # Vite configuration
│
├── .claude/             # Claude Code integration
│   ├── agents/         # Custom test agents
│   ├── commands/       # Slash commands
│   └── hooks/          # Session hooks
│
├── CLAUDE.md           # AI agent instructions
├── README.md           # User documentation
└── IMPLEMENTATION.md   # This file
```

---

## Implementation Status

### ✅ Phase 1-4: Backend (Complete)

**Endpoints Implemented:**
1. `GET /` - API status
2. `GET /health` - Health check with auth status
3. `GET /login` - Initiate Spotify OAuth
4. `GET /callback` - OAuth callback handler
5. `GET /api/token` - Get access token for Web Playback SDK
6. `GET /api/search?q=<query>` - Search artists
7. `POST /api/tracks` - Fetch 10×10 track matrix
8. `POST /api/play-minute` - Control playback with position

**Features:**
- ✅ Spotify Authorization Code Flow
- ✅ Token refresh mechanism (60s buffer)
- ✅ Rate limiting with exponential backoff
- ✅ CORS configured for `127.0.0.1` (Spotify requirement)
- ✅ Position calculation for "drop" playback
- ✅ Comprehensive error handling

**Testing:**
- All endpoints tested and verified functional
- See `backend/TEST_RESULTS.md` for detailed test report
- Interactive API docs at `http://127.0.0.1:8000/docs`

### ✅ Phase 5-8: Frontend (Complete)

**Components:**
1. **LoginScreen** - Spotify OAuth with branding
2. **ArtistSelector** - Search, select 10 artists, fetch tracks
3. **GameScreen** - Timer, playback control, visual feedback

**Features:**
- ✅ Spotify Web Playback SDK integration
- ✅ Device detection and player initialization
- ✅ Debounced artist search
- ✅ 10-artist selection with validation
- ✅ Track matrix fetch (10×10)
- ✅ Drift-corrected timer (setTimeout-based)
- ✅ Test mode: 20 rounds × 10 seconds
- ✅ Normal mode: 100 rounds × 60 seconds
- ✅ Pause/resume functionality
- ✅ Progress tracking
- ✅ Album artwork display
- ✅ Spotify-themed dark UI

**Timer Implementation:**
- Uses `setTimeout` with drift correction (not `setInterval`)
- Calculates elapsed time from start
- Adjusts next tick to account for drift
- Accurate over long durations (100 minutes)

### ⚠️ Phase 9: Polish (Partially Complete)

**Completed:**
- ✅ Spotify-themed UI design
- ✅ Responsive layout
- ✅ Pause/resume controls
- ✅ Loading states
- ✅ Error messages

**Optional Enhancements:**
- [ ] Device confirmation modal before game start
- [ ] Volume control slider
- [ ] React Error Boundary component
- [ ] LocalStorage state persistence
- [ ] Full 100-minute end-to-end test

---

## Technology Stack

### Backend
- **Python 3.10+**
- **FastAPI** - Modern async web framework
- **httpx** - Async HTTP client for Spotify API
- **python-dotenv** - Environment variable management
- **Pydantic** - Data validation
- **uvicorn** - ASGI server

### Frontend
- **React 18.2** - UI framework
- **Vite 5.0** - Build tool and dev server
- **Axios** - HTTP client for backend API
- **Spotify Web Playback SDK** - In-browser music playback

---

## Configuration

### Backend Environment Variables

File: `backend/.env`

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://127.0.0.1:8000/callback
MARKET=US
```

**Important:**
- Spotify requires `127.0.0.1` (not `localhost`) as of April 2025
- Add `http://127.0.0.1:8000/callback` to your Spotify app's Redirect URIs
- See [Spotify Redirect URI Documentation](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)

### Frontend Configuration

File: `frontend/vite.config.js`

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1'
  }
})
```

---

## Running the Application

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies with uv
uv pip install -r requirements.txt

# Configure Spotify credentials
cp .env.example .env
# Edit .env with your credentials

# Start the server
uv run uvicorn app:app --reload --port 8000
```

**Backend will be available at:**
- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Frontend will be available at:**
- App: http://127.0.0.1:5173

### 3. Play the Game

1. Visit http://127.0.0.1:5173
2. Click "Login with Spotify"
3. Authorize the app (Premium account required)
4. Search and select 10 artists
5. Wait for Spotify Player to connect
6. Toggle test mode if desired (20 rounds × 10 seconds)
7. Click "Start Game"
8. Drink responsibly! 🍺

---

## Game Mechanics

### Artist/Track Mapping

```javascript
artist_index = (round - 1) % 10
song_index = Math.floor((round - 1) / 10)
```

**Example:**
- Round 1: Artist 1, Song 1
- Round 2: Artist 2, Song 1
- Round 10: Artist 10, Song 1
- Round 11: Artist 1, Song 2
- Round 100: Artist 10, Song 10

### Playback Position ("Drop")

```python
position_ms = min(0.6 * duration_ms, duration_ms - 45000)
position_ms = max(0, min(position_ms, duration_ms - 10000))
```

This ensures:
- Start around 60% into the track
- Leave at least 10 seconds to play
- Handle short tracks gracefully

### Timer Accuracy

Uses drift correction with `setTimeout`:
```javascript
const startTime = Date.now();
const tick = () => {
  const elapsed = Date.now() - startTime;
  const currentRound = Math.floor(elapsed / intervalMs) + 1;
  // ... update UI ...
  const nextTick = (currentRound * intervalMs) - elapsed;
  setTimeout(tick, nextTick);
};
```

This prevents drift that occurs with `setInterval` over long periods.

---

## Key Files

### Backend Core Files
- `backend/app.py` (398 lines) - FastAPI routes and CORS
- `backend/spotify.py` (265 lines) - Spotify API client
- `backend/TEST_RESULTS.md` - Test report from 2025-11-27

### Frontend Core Files
- `frontend/src/App.jsx` - Main component with screen routing
- `frontend/src/api.js` - Backend API client wrapper
- `frontend/src/components/LoginScreen.jsx` - OAuth screen
- `frontend/src/components/ArtistSelector.jsx` - Artist selection with Spotify Player init
- `frontend/src/components/GameScreen.jsx` - Game timer and playback control
- `frontend/index.html` - Includes Spotify Web Playback SDK

### Documentation
- `CLAUDE.md` (837 lines) - Complete specification and agent instructions
- `README.md` - User-facing documentation
- `backend/README.md` - Backend setup guide
- `backend/TESTING.md` - Testing guide

---

## Requirements

### Spotify Requirements
- ✅ Spotify Premium account (Web Playback SDK requirement)
- ✅ Spotify Developer app (Client ID + Secret)
- ✅ Redirect URI registered: `http://127.0.0.1:8000/callback`

### System Requirements
- Python 3.10+ with `uv` package manager
- Node.js 18+ with npm
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Active Spotify device for playback

---

## Known Limitations

1. **Single-user system**: No multi-user support or session management
2. **In-memory tokens**: Backend tokens reset on server restart
3. **No persistence**: Game state not saved to localStorage yet
4. **Premium only**: Spotify Web Playback SDK requires Premium
5. **Local only**: Designed for local use, not production-ready

---

## Testing Checklist

### Automated Tests
- Backend (pytest): `backend/tests/test_playback.py`  
  - Position clamping for short/normal/long tracks  
  - Token refresh path updates stored tokens when expired  
  - No-access-token path raises
- Frontend (vitest, Node 18+): `frontend/src/components/GameScreen.test.jsx`  
  - Timer cadence: exactly one `playMinute` call per round, correct ordering

### Manual Checks (still recommended)
- Login/OAuth flow
- Device availability and playback on real Spotify device
- Full 100-minute or test-mode run-through

---

## Next Steps (Optional Enhancements)

### Phase 9 Completion
1. Add device confirmation modal
2. Implement volume control
3. Add React Error Boundary
4. Full localStorage state persistence
5. End-to-end testing (100 minutes)

### Future Enhancements
1. **User Accounts**: Save playlists and game history
2. **Multiplayer**: Sync game across multiple devices
3. **Custom Rules**: Configure shots per round, skip rounds, etc.
4. **Statistics**: Track artists played, favorites, etc.
5. **Mobile App**: Native iOS/Android with Spotify SDK
6. **Production Deploy**: Session management, database, HTTPS

---

## Credits

- **Implementation**: Claude Code (Anthropic)
- **Date**: November 27, 2025
- **Music Platform**: Spotify
- **Framework**: FastAPI + React + Vite

---

## Disclaimer

**This is a drinking game.**

Please drink responsibly. Know your limits, stay hydrated, and never drink and drive. You can also play with non-alcoholic beverages or use it as a music discovery tool.

The developers are not responsible for any consequences of alcohol consumption. This application is provided for entertainment purposes only.

---

## License

For personal use only. Not for commercial distribution.

Spotify® is a registered trademark of Spotify AB.
