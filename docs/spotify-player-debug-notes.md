# Spotify Player Disconnect Issue (Club 100)

## Problem
- **Symptom**: Login and artist search worked, but music never played in the game screen.
- **Observation**: The Web Playback SDK device disappeared as soon as we left the artist selector, so `/api/play-minute` calls failed (no active device).

## Root Cause
- `ArtistSelector` disconnected the Spotify player in its cleanup effect. When the component unmounted, the Web Playback SDK device was torn down before `GameScreen` tried to play tracks.

## Fix
- Keep the player alive across screens; remove the disconnect in the cleanup.
- Code change: `frontend/src/components/ArtistSelector.jsx` — do not call `playerRef.current.disconnect()` on unmount (still clear the SDK poll interval).

## Efficient Debugging Routine (for future agents)
1) **Reproduce fast**: Use test mode (20 rounds × 10s) to shorten cycles; open browser console + network tab.  
2) **Check device lifecycle**:  
   - Confirm `ready` event fires and logs device_id.  
   - Call `/api/devices` to verify the Web Playback SDK device is registered; device name should match the player (e.g., "Club 100 Game Player").  
3) **Trace component unmounts**: Inspect `useEffect` cleanups for player teardown (`disconnect`, `pause`, `destroy`) when navigating screens. Ensure the player persists until playback is done.  
4) **Log backend hits**: Watch backend logs for `/api/play-minute` and Spotify playback errors (403 Premium, 404 device, 429 rate limit).  
5) **Token sanity**: Hit `/health` and `/api/token` to verify tokens are present and not expired.  
6) **Playback guardrails**: Confirm `position_ms` math stays within `[0, duration_ms - 10000]` and `duration_ms` is passed from the frontend.  
7) **Network sanity**: If playback fails, retry with a known-good device_id from `/api/devices`; ensure Spotify desktop/web app is open and active on the same account.  
8) **Keep logs minimal & specific**: Log device_id, track_uri, position_ms, and the active screen; avoid logging tokens.

Tip: If the Web Playback SDK says “ready” but the device isn’t visible yet, poll `/api/devices` for ~20–40s before failing; the SDK often lags registration.***

## Tests Added
- Backend: `backend/tests/test_playback.py` (position clamp for short/normal/long tracks; token refresh path). Run: `source backend/.venv/bin/activate && cd backend && pytest`.
- Frontend: `frontend/src/components/GameScreen.test.jsx` (one `playMinute` call per round, correct ordering). Run with Node 18+: `cd frontend && npm test` (uses `VITEST_WS_PORT=0`).
