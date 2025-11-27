# Backend Testing Guide

Comprehensive testing guide for the Club 100 backend API.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Manual Testing](#manual-testing)
3. [Automated Testing with Subagent](#automated-testing-with-subagent)
4. [Testing Scenarios](#testing-scenarios)
5. [Expected Responses](#expected-responses)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Setup

1. **Backend running:**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app:app --reload --port 8000
   ```

2. **Spotify credentials configured:**
   - `.env` file exists with valid credentials
   - Redirect URI added to Spotify dashboard

3. **Tools available:**
   - `curl` for command-line testing
   - Browser for OAuth flow
   - Or use FastAPI's `/docs` interface

---

## Manual Testing

### 1. Health Check (No Auth Required)

```bash
# Test server is running
curl http://localhost:8000/

# Expected output:
# {
#   "message": "Club 100 API",
#   "status": "running",
#   "authenticated": false,
#   "docs": "/docs"
# }
```

```bash
# Check health endpoint
curl http://localhost:8000/health

# Expected output:
# {
#   "status": "healthy",
#   "has_tokens": false,
#   "token_expired": true
# }
```

### 2. OAuth Flow (Browser Required)

**Step 1: Initiate login**
```bash
# Get authorization URL
curl -v http://localhost:8000/login

# Should return 307 redirect to Spotify
# Or visit in browser: http://localhost:8000/login
```

**Step 2: Complete OAuth in browser**
- Browser redirects to Spotify login
- Authorize the application
- Redirects back to `http://localhost:8000/callback?code=...`
- Backend exchanges code for tokens
- Redirects to frontend at `http://localhost:3000/`

**Step 3: Verify authentication**
```bash
curl http://localhost:8000/health

# Expected output (after auth):
# {
#   "status": "healthy",
#   "has_tokens": true,
#   "token_expired": false
# }
```

### 3. Token Endpoint (Requires Auth)

```bash
# Get access token for Web Playback SDK
curl http://localhost:8000/api/token

# Expected output (if authenticated):
# {
#   "access_token": "BQC4xY3..."
# }

# Expected output (if not authenticated):
# {
#   "detail": "Failed to get access token: No access token available..."
# }
```

### 4. Search Artists (Requires Auth)

```bash
# Search for Metallica
curl "http://localhost:8000/api/search?q=Metallica"

# Expected output:
# [
#   {
#     "id": "2ye2Wgw4gimLv2eAKyk1NB",
#     "name": "Metallica",
#     "image": "https://i.scdn.co/image/..."
#   },
#   ...
# ]
```

```bash
# Test with empty query (should fail)
curl "http://localhost:8000/api/search?q="

# Expected output:
# {
#   "detail": "Search query cannot be empty"
# }
```

### 5. Fetch Tracks (Requires Auth)

**First, get 10 artist IDs from search:**
```bash
# Search for artists and extract IDs
curl -s "http://localhost:8000/api/search?q=Metallica" | grep -o '"id":"[^"]*"' | head -1
curl -s "http://localhost:8000/api/search?q=Beatles" | grep -o '"id":"[^"]*"' | head -1
# ... repeat for 10 artists total
```

**Then fetch tracks:**
```bash
curl -X POST http://localhost:8000/api/tracks \
  -H "Content-Type: application/json" \
  -d '{
    "artist_ids": [
      "2ye2Wgw4gimLv2eAKyk1NB",
      "3WrFJ7ztbogyGnTHbHJFl2",
      "6vWDO969PvNqNYHIOW5v0m",
      "0YC192cP3KPCRWx8zr8MfZ",
      "699OTQXzgjhIYAHMy9RyPD",
      "1Xyo4u8uXC1ZmMpatF05PJ",
      "3fMbdgg4jU18AjLCKBhRSm",
      "66CXWjxzNUsdJxJ2JdwvnR",
      "4Z8W4fKeB5YxbusRsdQVPb",
      "0C8ZW7ezQVs4URX5aX7Kqx"
    ]
  }'

# Expected output: 10x10 array of tracks (or nulls)
# [[{track1}, {track2}, ..., null], [{track1}, ...], ...]
```

**Test with wrong number of artists:**
```bash
curl -X POST http://localhost:8000/api/tracks \
  -H "Content-Type: application/json" \
  -d '{"artist_ids": ["id1", "id2"]}'

# Expected output:
# {
#   "detail": "Expected exactly 10 artist IDs, got 2"
# }
```

### 6. Playback Control (Requires Auth + Device)

**Note:** This requires an active Spotify device and Premium account.

```bash
curl -X POST http://localhost:8000/api/play-minute \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "your_device_id_here",
    "track_uri": "spotify:track:2Fxmhks0bxGSBdJ92vM42m",
    "duration_ms": 240000
  }'

# Expected output (success):
# {
#   "status": "ok",
#   "position_ms": 144000,
#   "track_uri": "spotify:track:..."
# }

# Expected output (no device):
# {
#   "detail": "Device not found. Make sure Spotify player is active."
# }
```

**Test position calculation with short track:**
```bash
curl -X POST http://localhost:8000/api/play-minute \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "device_id",
    "track_uri": "spotify:track:...",
    "duration_ms": 30000
  }'

# Position should be max(0, min(18000, 20000)) = 18000
# Ensures at least 10 seconds remaining
```

---

## Automated Testing with Subagent

### Using the backend-tester Agent

```bash
# From Claude Code interface, use the Task tool:
Task with subagent_type: "backend-tester"
Prompt: "Test all backend endpoints and report results"
```

The agent will:
1. Check if server is running
2. Test all endpoints systematically
3. Report pass/fail for each
4. Indicate which require authentication

---

## Testing Scenarios

### Scenario 1: Cold Start (No Auth)

**Goal:** Verify basic endpoints work without authentication

```bash
# 1. Start server
cd backend && uvicorn app:app --reload --port 8000 &

# 2. Test root
curl http://localhost:8000/

# 3. Test health
curl http://localhost:8000/health

# 4. Test login redirect
curl -v http://localhost:8000/login | grep -i "location"
```

**Expected:**
- ✅ Root returns status
- ✅ Health shows `has_tokens: false`
- ✅ Login redirects to Spotify

### Scenario 2: Full OAuth Flow

**Goal:** Complete authentication and verify token storage

```bash
# 1. Visit login in browser
open http://localhost:8000/login

# 2. Complete Spotify auth
# (manual step in browser)

# 3. Verify authentication
curl http://localhost:8000/health
# Should show has_tokens: true

# 4. Get token for SDK
curl http://localhost:8000/api/token
# Should return access token
```

**Expected:**
- ✅ Redirect to Spotify works
- ✅ Callback stores tokens
- ✅ Health shows authenticated
- ✅ Token endpoint returns valid token

### Scenario 3: Artist Search to Track Matrix

**Goal:** Test complete data flow for game setup

```bash
# 1. Search for 10 different artists
ARTISTS=("Metallica" "Beatles" "Beyonce" "Drake" "Coldplay" "Adele" "Queen" "Nirvana" "Rihanna" "Eminem")

for artist in "${ARTISTS[@]}"; do
  curl -s "http://localhost:8000/api/search?q=$artist" | jq '.[0].id'
done

# 2. Collect IDs (manual or script)

# 3. Fetch tracks for all 10
curl -X POST http://localhost:8000/api/tracks \
  -H "Content-Type: application/json" \
  -d @artist_ids.json

# 4. Verify response structure
# - Should be 10x10 array
# - Each track has uri, name, duration_ms, artist_name, album_image
# - Some entries may be null (artists with < 10 tracks)
```

**Expected:**
- ✅ Search returns valid results
- ✅ Tracks endpoint returns 10×10 matrix
- ✅ Null padding for artists with < 10 tracks
- ✅ All track objects have required fields

### Scenario 4: Rate Limiting Resilience

**Goal:** Verify exponential backoff works

```bash
# Rapidly fetch tracks for multiple artists
for i in {1..20}; do
  curl -X POST http://localhost:8000/api/tracks \
    -H "Content-Type: application/json" \
    -d @artist_ids.json &
done

# Monitor for 429 errors and retry behavior
# Should see exponential backoff: 1s, 2s, 4s, 8s, 16s
```

**Expected:**
- ⚠️ May hit rate limit (429)
- ✅ Backend retries automatically
- ✅ Eventually succeeds or reports failure
- ✅ No crashes or hung requests

### Scenario 5: Token Refresh

**Goal:** Verify automatic token refresh works

```bash
# 1. Authenticate and note token expiry
curl http://localhost:8000/health
# Note expires_at value

# 2. Wait for token to expire (or force expiry)
# (tokens expire in ~3600 seconds with 60s buffer)

# 3. Make API call requiring token
curl "http://localhost:8000/api/search?q=test"

# 4. Verify health shows new token
curl http://localhost:8000/health
# expires_at should be updated
```

**Expected:**
- ✅ Expired token detected
- ✅ Refresh token used automatically
- ✅ New access token stored
- ✅ API call succeeds transparently

---

## Expected Responses

### Success Responses

#### Root Endpoint
```json
{
  "message": "Club 100 API",
  "status": "running",
  "authenticated": true,
  "docs": "/docs"
}
```

#### Health Check
```json
{
  "status": "healthy",
  "has_tokens": true,
  "token_expired": false
}
```

#### Artist Search
```json
[
  {
    "id": "2ye2Wgw4gimLv2eAKyk1NB",
    "name": "Metallica",
    "image": "https://i.scdn.co/image/ab6761610000e5eb69ca98dd3083f1082d740e44"
  }
]
```

#### Track Matrix (Abbreviated)
```json
[
  [
    {
      "uri": "spotify:track:2Fxmhks0bxGSBdJ92vM42m",
      "name": "Nothing Else Matters",
      "duration_ms": 388413,
      "artist_name": "Metallica",
      "album_image": "https://..."
    },
    // ... 9 more tracks or nulls
  ],
  // ... 9 more artists
]
```

#### Playback Control
```json
{
  "status": "ok",
  "position_ms": 144000,
  "track_uri": "spotify:track:2Fxmhks0bxGSBdJ92vM42m"
}
```

### Error Responses

#### Not Authenticated
```json
{
  "detail": "Failed to get access token: No access token available. User must authenticate first."
}
```

#### Invalid Input
```json
{
  "detail": "Expected exactly 10 artist IDs, got 5"
}
```

#### Spotify API Error
```json
{
  "detail": "Spotify API error: {...}"
}
```

#### Device Not Found
```json
{
  "detail": "Device not found. Make sure Spotify player is active."
}
```

#### Premium Required
```json
{
  "detail": "Playback forbidden. Ensure you have Spotify Premium."
}
```

---

## Troubleshooting

### Server Won't Start

**Error:** "Missing required environment variables"
```bash
# Solution: Create .env file
cp .env.example .env
# Edit with your Spotify credentials
```

**Error:** "Address already in use"
```bash
# Solution: Kill existing process
lsof -ti:8000 | xargs kill -9
# Or use different port
uvicorn app:app --reload --port 8080
```

### Authentication Issues

**401 on /api/token**
- Visit `/login` to authenticate first
- Check `.env` has correct credentials
- Verify redirect URI in Spotify dashboard

**Tokens expire immediately**
- Check system clock is correct
- Verify Spotify credentials are valid
- Check for network issues

### API Call Failures

**429 Rate Limited**
- Backend retries automatically
- Wait between rapid requests
- Check retry logic in logs

**404 on Spotify API**
- Artist ID may be invalid
- Track may not be available
- Check Spotify API status

### Playback Issues

**Device not found**
- Open Spotify on a device
- Play any song to activate device
- Use Web Playback SDK in frontend

**403 Forbidden**
- Requires Spotify Premium
- Check account status
- Verify scopes in authorization

---

## Next Steps

1. **Run automated tests:** Use `backend-tester` subagent
2. **Integration testing:** Test with frontend once built
3. **Load testing:** Test with multiple concurrent requests
4. **Production readiness:** Add logging, monitoring, proper secrets management

## Resources

- [FastAPI Testing Docs](https://fastapi.tiangolo.com/tutorial/testing/)
- [Spotify API Reference](https://developer.spotify.com/documentation/web-api)
- [Backend README](./README.md)
