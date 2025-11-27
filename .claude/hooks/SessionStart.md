Automatically orient the assistant when starting a new session on Club 100 project:

1. **Project Context:**
   - This is the Club 100 Spotify drinking game app
   - Stack: FastAPI backend + React frontend + Spotify Web Playback SDK
   - Architecture: 10 artists × 10 tracks = 100 minutes of gameplay

2. **Quick Status Check:**
   - Check if backend/ directory exists
   - Check if frontend/ directory exists
   - Check if .env is configured (exists and not empty)
   - Determine current implementation phase (1-9 from CLAUDE.md)

3. **Report to User:**
   - Current phase and what's implemented
   - Immediate next steps based on checklist
   - Any blockers or missing configuration

4. **Helpful Reminders:**
   - Available slash commands: /status, /check-deps, /start-dev, /test-backend, /test-spotify-auth
   - CLAUDE.md contains full specification and implementation checklist (Phases 1-4 ✅ complete)
   - Backend API docs: http://127.0.0.1:8000/docs (when running)
   - See Phase 5-9 checklist for frontend implementation

5. **Do NOT:**
   - Start implementing anything automatically
   - Make assumptions about what the user wants to work on
   - Be verbose - keep it concise and actionable
