Test the complete Spotify OAuth authentication flow:

1. Verify backend server is running on port 8000
2. Check .env has SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and REDIRECT_URI
3. Verify the /login endpoint exists and generates correct Spotify auth URL
4. Check the /callback endpoint handles OAuth code exchange properly
5. Test the /api/token endpoint returns fresh access tokens
6. Verify token refresh logic works (if refresh_token exists)
7. Report detailed results of each step
