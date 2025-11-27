"""
Club 100 - FastAPI Backend
Handles Spotify OAuth, data fetching, and playback control.
"""

import os
import asyncio
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from pydantic import BaseModel
import time
import httpx

# Import Spotify helper functions
from spotify import (
    get_authorization_url,
    exchange_code_for_tokens,
    get_fresh_token,
    search_artists,
    get_artist_top_tracks,
    start_playback,
)

# Load environment variables
load_dotenv()

# Environment variables
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/callback")
MARKET = os.getenv("MARKET", "US")

# Validate required environment variables
if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
    raise ValueError(
        "Missing required environment variables. "
        "Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in backend/.env"
    )

# Initialize FastAPI app
app = FastAPI(
    title="Club 100 API",
    description="Backend API for Club 100 Spotify drinking game",
    version="1.0.0"
)

# CORS middleware - allow multiple frontend ports
origins = [
    "http://localhost:3000",      # Create React App default
    "http://localhost:5173",      # Vite default
    "http://127.0.0.1:3000",      # Alternative localhost
    "http://127.0.0.1:5173",      # Alternative localhost
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Token storage structure (in-memory for MVP)
class TokenStorage:
    """Simple in-memory token storage."""

    def __init__(self):
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.expires_at: Optional[int] = None  # Unix timestamp

    def set_tokens(self, access_token: str, refresh_token: str, expires_in: int):
        """Store tokens and compute expiry time."""
        self.access_token = access_token
        self.refresh_token = refresh_token
        # Calculate expiry time (current time + expires_in - 60 second buffer)
        self.expires_at = int(time.time()) + expires_in - 60

    def is_expired(self) -> bool:
        """Check if access token is expired or about to expire."""
        if not self.expires_at:
            return True
        return int(time.time()) >= self.expires_at

    def clear(self):
        """Clear all stored tokens."""
        self.access_token = None
        self.refresh_token = None
        self.expires_at = None

# Global token storage instance
token_storage = TokenStorage()

# Pydantic models for request/response validation
class PlayMinuteRequest(BaseModel):
    device_id: str
    track_uri: str
    duration_ms: int

class ArtistIdsRequest(BaseModel):
    artist_ids: List[str]

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API status."""
    return {
        "message": "Club 100 API",
        "status": "running",
        "authenticated": token_storage.access_token is not None,
        "docs": "/docs"
    }

# Health check endpoint
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "has_tokens": token_storage.access_token is not None,
        "token_expired": token_storage.is_expired()
    }


# ============================================================================
# PHASE 2: SPOTIFY AUTHENTICATION ENDPOINTS
# ============================================================================

@app.get("/login")
async def login():
    """
    Redirect user to Spotify authorization page.
    This initiates the OAuth flow.
    """
    auth_url = get_authorization_url(SPOTIFY_CLIENT_ID, REDIRECT_URI)
    return RedirectResponse(url=auth_url)


@app.get("/callback")
async def callback(code: Optional[str] = Query(None), error: Optional[str] = Query(None)):
    """
    Handle Spotify OAuth callback.
    Exchange authorization code for access and refresh tokens.
    Redirect user to frontend after successful authentication.
    """
    if error:
        raise HTTPException(
            status_code=400,
            detail=f"Spotify authorization failed: {error}"
        )

    if not code:
        raise HTTPException(
            status_code=400,
            detail="No authorization code provided"
        )

    try:
        # Exchange code for tokens
        token_data = await exchange_code_for_tokens(
            code,
            SPOTIFY_CLIENT_ID,
            SPOTIFY_CLIENT_SECRET,
            REDIRECT_URI
        )

        # Store tokens
        token_storage.set_tokens(
            token_data["access_token"],
            token_data["refresh_token"],
            token_data["expires_in"]
        )

        # Redirect to frontend
        frontend_url = "http://localhost:3000/"
        return RedirectResponse(url=frontend_url)

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Failed to exchange code for tokens: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication error: {str(e)}"
        )


@app.get("/api/token")
async def get_token():
    """
    Return a fresh access token for the Spotify Web Playback SDK.
    Automatically refreshes the token if it's expired.
    """
    try:
        access_token = await get_fresh_token(
            token_storage,
            SPOTIFY_CLIENT_ID,
            SPOTIFY_CLIENT_SECRET
        )
        return {"access_token": access_token}

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Failed to get access token: {str(e)}"
        )


# ============================================================================
# PHASE 3: SPOTIFY DATA ENDPOINTS
# ============================================================================

@app.get("/api/search")
async def search(q: str = Query(..., description="Artist name to search for")):
    """
    Search for artists by name.
    Returns a list of matching artists with id, name, and image.
    """
    if not q or len(q.strip()) == 0:
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty"
        )

    try:
        access_token = await get_fresh_token(
            token_storage,
            SPOTIFY_CLIENT_ID,
            SPOTIFY_CLIENT_SECRET
        )

        artists = await search_artists(q, access_token)
        return artists

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized. Please log in again."
            )
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Spotify API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@app.post("/api/tracks")
async def get_tracks(request: ArtistIdsRequest):
    """
    Fetch top 10 tracks for each of 10 artists.
    Returns a 10x10 matrix of tracks.
    Implements exponential backoff for rate limiting.
    """
    artist_ids = request.artist_ids

    if len(artist_ids) != 10:
        raise HTTPException(
            status_code=400,
            detail=f"Expected exactly 10 artist IDs, got {len(artist_ids)}"
        )

    try:
        access_token = await get_fresh_token(
            token_storage,
            SPOTIFY_CLIENT_ID,
            SPOTIFY_CLIENT_SECRET
        )

        # Fetch tracks for all artists with exponential backoff for rate limiting
        all_tracks = []
        retry_delay = 1  # Start with 1 second delay

        for i, artist_id in enumerate(artist_ids):
            retry_count = 0
            max_retries = 5

            while retry_count < max_retries:
                try:
                    tracks = await get_artist_top_tracks(artist_id, access_token, MARKET)
                    all_tracks.append(tracks)
                    break  # Success, move to next artist

                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429:  # Rate limited
                        retry_count += 1
                        if retry_count >= max_retries:
                            # Max retries reached, return error
                            raise HTTPException(
                                status_code=429,
                                detail=f"Rate limited by Spotify API after {max_retries} retries"
                            )

                        # Exponential backoff: 1s, 2s, 4s, 8s, 16s
                        wait_time = retry_delay * (2 ** retry_count)
                        await asyncio.sleep(wait_time)

                    elif e.response.status_code == 401:
                        # Token expired mid-request, refresh and retry
                        access_token = await get_fresh_token(
                            token_storage,
                            SPOTIFY_CLIENT_ID,
                            SPOTIFY_CLIENT_SECRET
                        )
                        retry_count += 1

                    else:
                        # Other HTTP error, raise immediately
                        raise HTTPException(
                            status_code=e.response.status_code,
                            detail=f"Spotify API error for artist {i+1}: {e.response.text}"
                        )

        return all_tracks

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tracks: {str(e)}"
        )


# ============================================================================
# PHASE 4: PLAYBACK CONTROL ENDPOINT
# ============================================================================

@app.post("/api/play-minute")
async def play_minute(request: PlayMinuteRequest):
    """
    Start playback of a track at the calculated 'drop' position.
    Position is calculated as ~60% into the track with safety checks.
    """
    try:
        access_token = await get_fresh_token(
            token_storage,
            SPOTIFY_CLIENT_ID,
            SPOTIFY_CLIENT_SECRET
        )

        # Calculate position with safety checks
        # Start at 60% or 45 seconds before end (whichever comes first)
        position_ms = min(0.6 * request.duration_ms, request.duration_ms - 45000)

        # Ensure position is valid:
        # - Never negative
        # - At least 10 seconds of playback remaining
        position_ms = max(0, min(position_ms, request.duration_ms - 10000))
        position_ms = int(position_ms)

        # Start playback
        await start_playback(
            request.device_id,
            request.track_uri,
            position_ms,
            access_token
        )

        return {
            "status": "ok",
            "position_ms": position_ms,
            "track_uri": request.track_uri
        }

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Device not found. Make sure Spotify player is active."
            )
        elif e.response.status_code == 403:
            raise HTTPException(
                status_code=403,
                detail="Playback forbidden. Ensure you have Spotify Premium."
            )
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Playback failed: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Playback error: {str(e)}"
        )
