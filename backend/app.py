"""
Club 100 - FastAPI Backend
Handles Spotify OAuth, data fetching, and playback control.
"""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from pydantic import BaseModel
import time

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
