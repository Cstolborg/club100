# Club 100 Backend

FastAPI backend for the Club 100 Spotify drinking game.

## Overview

This backend handles:
- Spotify OAuth authentication
- Artist search via Spotify Web API
- Top tracks fetching (10×10 matrix)
- Playback control with position calculation

## Quick Start

### 1. Prerequisites

- Python 3.10+
- Spotify Developer Account
- Spotify Premium (for playback features)

### 2. Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Spotify credentials
# Get credentials from: https://developer.spotify.com/dashboard
```

**Required environment variables:**
```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:8000/callback
MARKET=US  # Optional, defaults to US
```

**Important:** Add `http://localhost:8000/callback` to your Spotify app's Redirect URIs in the dashboard.

### 4. Run the Server

```bash
# Make sure virtual environment is activated
uvicorn app:app --reload --port 8000
```

Server will start at: `http://localhost:8000`

**Endpoints:**
- API Docs: `http://localhost:8000/docs` (interactive Swagger UI)
- Root: `http://localhost:8000/`
- Health: `http://localhost:8000/health`

## API Endpoints

### Authentication

#### `GET /login`
Redirects to Spotify authorization page.

**Usage:** Visit in browser to start OAuth flow.

#### `GET /callback`
Handles Spotify OAuth callback. Automatically redirects to frontend.

**Query Parameters:**
- `code`: Authorization code from Spotify
- `error`: Error message if auth failed

#### `GET /api/token`
Returns fresh access token for Web Playback SDK.

**Response:**
```json
{
  "access_token": "BQC..."
}
```

### Data Endpoints

#### `GET /api/search`
Search for artists by name.

**Query Parameters:**
- `q`: Artist name to search for (required)

**Example:**
```bash
curl "http://localhost:8000/api/search?q=Metallica"
```

**Response:**
```json
[
  {
    "id": "2ye2Wgw4gimLv2eAKyk1NB",
    "name": "Metallica",
    "image": "https://..."
  }
]
```

#### `POST /api/tracks`
Fetch top 10 tracks for each of 10 artists.

**Request Body:**
```json
{
  "artist_ids": ["id1", "id2", "id3", "id4", "id5", "id6", "id7", "id8", "id9", "id10"]
}
```

**Response:** 10×10 array of track objects (or null)
```json
[
  [  // Artist 1's tracks
    {
      "uri": "spotify:track:...",
      "name": "Track Name",
      "duration_ms": 240000,
      "artist_name": "Artist Name",
      "album_image": "https://..."
    },
    // ... 9 more tracks (or null if < 10 available)
  ],
  // ... 9 more artists
]
```

**Features:**
- Pads to 10 tracks per artist with `null` if fewer available
- Implements exponential backoff for rate limiting
- Auto-refreshes expired tokens

### Playback Control

#### `POST /api/play-minute`
Start playback at calculated drop position.

**Request Body:**
```json
{
  "device_id": "spotify_device_id",
  "track_uri": "spotify:track:...",
  "duration_ms": 240000
}
```

**Response:**
```json
{
  "status": "ok",
  "position_ms": 144000,
  "track_uri": "spotify:track:..."
}
```

**Position Calculation:**
- Starts at ~60% into track
- Ensures at least 10 seconds remaining
- Never negative
- Formula: `max(0, min(0.6 * duration, duration - 10000))`

**Error Codes:**
- `404`: Device not found
- `403`: Premium required
- `401`: Authentication needed

## Development

### Project Structure

```
backend/
├── app.py              # Main FastAPI application
├── spotify.py          # Spotify API helpers
├── requirements.txt    # Python dependencies
├── .env               # Configuration (not in git)
├── .env.example       # Template
└── .gitignore         # Git ignore patterns
```

### Testing

See [TESTING.md](./TESTING.md) for detailed testing instructions.

**Quick test:**
```bash
# Health check
curl http://localhost:8000/health

# Interactive API docs
open http://localhost:8000/docs
```

### Code Style

- Uses async/await for all I/O operations
- Type hints on all functions
- Pydantic models for request/response validation
- Comprehensive error handling
- 60-second token expiry buffer

### Common Issues

**"Missing required environment variables"**
- Make sure `.env` file exists (not `.env.example`)
- Check that `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set

**"Module not found" errors**
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

**401 Unauthorized from Spotify**
- Visit `/login` to authenticate
- Check credentials in `.env` are correct
- Verify redirect URI matches Spotify dashboard

**403 Forbidden on playback**
- Requires Spotify Premium account
- Ensure device is active and connected

**Rate limiting (429 errors)**
- Backend implements automatic exponential backoff
- Wait a few seconds between repeated requests

## Dependencies

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **httpx** - Async HTTP client for Spotify API
- **python-dotenv** - Environment variable management
- **pydantic** - Data validation

## Security Notes

- **Never commit `.env`** - Contains sensitive credentials
- Tokens stored in memory only (cleared on restart)
- CORS restricted to localhost ports
- No token logging
- Refresh tokens never exposed to frontend

## Next Steps

1. **Authenticate:** Visit `http://localhost:8000/login`
2. **Test endpoints:** Use `/docs` for interactive testing
3. **Build frontend:** See `../frontend/README.md`
4. **Integration test:** Run full OAuth → search → tracks → playback flow

## Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Project CLAUDE.md](../CLAUDE.md) - Full specification
