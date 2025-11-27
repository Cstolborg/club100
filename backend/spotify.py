"""
Spotify API helper functions.
Handles all interactions with the Spotify Web API.
"""

import httpx
import time
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode

# Spotify API URLs
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"

# Required OAuth scopes for the application
SCOPES = [
    "streaming",                    # Web Playback SDK
    "user-read-email",             # User profile
    "user-read-private",           # User profile
    "user-modify-playback-state",  # Control playback
    "user-read-playback-state",    # Read playback state
]


def get_authorization_url(client_id: str, redirect_uri: str) -> str:
    """
    Generate Spotify authorization URL for OAuth flow.

    Args:
        client_id: Spotify application client ID
        redirect_uri: OAuth callback URL

    Returns:
        Complete authorization URL to redirect user to
    """
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": " ".join(SCOPES),
        "show_dialog": "false",
    }
    return f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str
) -> Dict[str, Any]:
    """
    Exchange authorization code for access and refresh tokens.

    Args:
        code: Authorization code from Spotify callback
        client_id: Spotify application client ID
        client_secret: Spotify application client secret
        redirect_uri: OAuth callback URL (must match authorization request)

    Returns:
        Dictionary containing access_token, refresh_token, expires_in

    Raises:
        httpx.HTTPStatusError: If token exchange fails
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(
    refresh_token: str,
    client_id: str,
    client_secret: str
) -> Dict[str, Any]:
    """
    Refresh an expired access token.

    Args:
        refresh_token: Refresh token from previous authorization
        client_id: Spotify application client ID
        client_secret: Spotify application client secret

    Returns:
        Dictionary containing new access_token and expires_in

    Raises:
        httpx.HTTPStatusError: If refresh fails
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
        response.raise_for_status()
        return response.json()


async def get_fresh_token(
    token_storage,
    client_id: str,
    client_secret: str
) -> str:
    """
    Get a fresh access token, refreshing if necessary.

    Args:
        token_storage: TokenStorage instance
        client_id: Spotify application client ID
        client_secret: Spotify application client secret

    Returns:
        Valid access token

    Raises:
        Exception: If no tokens are available or refresh fails
    """
    if not token_storage.access_token:
        raise Exception("No access token available. User must authenticate first.")

    if token_storage.is_expired():
        if not token_storage.refresh_token:
            raise Exception("No refresh token available. User must re-authenticate.")

        # Refresh the token
        token_data = await refresh_access_token(
            token_storage.refresh_token,
            client_id,
            client_secret
        )

        # Update storage (refresh_token may not be returned, keep existing one)
        new_refresh_token = token_data.get("refresh_token", token_storage.refresh_token)
        token_storage.set_tokens(
            token_data["access_token"],
            new_refresh_token,
            token_data["expires_in"]
        )

    return token_storage.access_token


async def search_artists(
    query: str,
    access_token: str,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Search for artists by name.

    Args:
        query: Artist name to search for
        access_token: Valid Spotify access token
        limit: Maximum number of results to return

    Returns:
        List of artist objects with id, name, and image

    Raises:
        httpx.HTTPStatusError: If search fails
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPOTIFY_API_BASE}/search",
            params={
                "q": query,
                "type": "artist",
                "limit": limit,
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()

        data = response.json()
        artists = data.get("artists", {}).get("items", [])

        # Format artist data
        return [
            {
                "id": artist["id"],
                "name": artist["name"],
                "image": artist["images"][0]["url"] if artist.get("images") else None,
            }
            for artist in artists
        ]


async def get_artist_top_tracks(
    artist_id: str,
    access_token: str,
    market: str = "US"
) -> List[Dict[str, Any]]:
    """
    Get an artist's top tracks.

    Args:
        artist_id: Spotify artist ID
        access_token: Valid Spotify access token
        market: Market for track availability (e.g., 'US')

    Returns:
        List of track objects with uri, name, duration_ms, artist_name, album_image
        Padded to 10 tracks with null if artist has fewer than 10

    Raises:
        httpx.HTTPStatusError: If request fails
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPOTIFY_API_BASE}/artists/{artist_id}/top-tracks",
            params={"market": market},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()

        data = response.json()
        tracks = data.get("tracks", [])

        # Format track data
        formatted_tracks = [
            {
                "uri": track["uri"],
                "name": track["name"],
                "duration_ms": track["duration_ms"],
                "artist_name": track["artists"][0]["name"] if track.get("artists") else "Unknown",
                "album_image": track["album"]["images"][0]["url"] if track.get("album", {}).get("images") else None,
            }
            for track in tracks[:10]  # Take max 10 tracks
        ]

        # Pad to 10 tracks with null if necessary
        while len(formatted_tracks) < 10:
            formatted_tracks.append(None)

        return formatted_tracks


async def start_playback(
    device_id: str,
    track_uri: str,
    position_ms: int,
    access_token: str
) -> None:
    """
    Start playback of a track at a specific position.

    Args:
        device_id: Spotify device ID
        track_uri: Spotify track URI
        position_ms: Position in milliseconds to start playback
        access_token: Valid Spotify access token

    Raises:
        httpx.HTTPStatusError: If playback control fails
    """
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{SPOTIFY_API_BASE}/me/player/play",
            params={"device_id": device_id},
            json={
                "uris": [track_uri],
                "position_ms": position_ms,
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
