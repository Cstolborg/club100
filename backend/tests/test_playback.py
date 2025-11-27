import os
import sys
import pytest

# Ensure backend root is on sys.path when tests run from anywhere
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app import PlayMinuteRequest, TokenStorage, play_minute  # noqa: E402
from spotify import get_fresh_token  # noqa: E402


def _expected_position(duration_ms: int) -> int:
    """Mirror the backend position calculation."""
    position_ms = min(0.6 * duration_ms, duration_ms - 45000)
    position_ms = max(0, min(position_ms, duration_ms - 10000))
    return int(position_ms)


@pytest.mark.asyncio
async def test_play_minute_position_clamp(monkeypatch):
    captured = []

    async def fake_get_fresh_token(*_args, **_kwargs):
        return "token-123"

    async def fake_start_playback(device_id: str, track_uri: str, position_ms: int, access_token: str):
        captured.append(
            {
                "device_id": device_id,
                "track_uri": track_uri,
                "position_ms": position_ms,
                "access_token": access_token,
            }
        )

    monkeypatch.setattr("app.get_fresh_token", fake_get_fresh_token)
    monkeypatch.setattr("app.start_playback", fake_start_playback)

    test_cases = [
        ("short", 15000),     # Very short track
        ("medium", 50000),    # Normal track
        ("long", 300000),     # 5-minute track
    ]

    for label, duration in test_cases:
        req = PlayMinuteRequest(
            device_id=f"device-{label}",
            track_uri=f"spotify:track:{label}",
            duration_ms=duration,
        )
        response = await play_minute(req)
        assert response["status"] == "ok"
        assert response["position_ms"] == _expected_position(duration)

    assert len(captured) == len(test_cases)
    for call, (_, duration) in zip(captured, test_cases):
        assert call["position_ms"] == _expected_position(duration)
        assert call["access_token"] == "token-123"


@pytest.mark.asyncio
async def test_get_fresh_token_refresh(monkeypatch):
    storage = TokenStorage()
    storage.access_token = "stale-token"
    storage.refresh_token = "refresh-token"
    storage.expires_at = 0  # force expired

    async def fake_refresh(refresh_token: str, client_id: str, client_secret: str):
        assert refresh_token == "refresh-token"
        assert client_id == "client-id"
        assert client_secret == "client-secret"
        return {
            "access_token": "new-token",
            "refresh_token": "new-refresh",
            "expires_in": 3600,
        }

    monkeypatch.setattr("spotify.refresh_access_token", fake_refresh)

    token = await get_fresh_token(storage, "client-id", "client-secret")
    assert token == "new-token"
    assert storage.access_token == "new-token"
    assert storage.refresh_token == "new-refresh"
    assert storage.expires_at is not None and storage.expires_at > 0


@pytest.mark.asyncio
async def test_get_fresh_token_without_access_token_raises():
    storage = TokenStorage()
    with pytest.raises(Exception):
        await get_fresh_token(storage, "client-id", "client-secret")
