Verify all project dependencies are properly installed:

1. **Backend Dependencies:**
   - Check if backend/requirements.txt exists
   - List required packages (fastapi, uvicorn, httpx, python-dotenv, pydantic)
   - Verify Python virtual environment exists
   - Check if packages are installed (try importing them)
   - Report any missing packages

2. **Frontend Dependencies:**
   - Check if frontend/package.json exists
   - Verify node_modules directory exists
   - Check for required dependencies (react, react-dom, axios)
   - Check for required dev dependencies (@vitejs/plugin-react, vite)
   - Report any missing packages

3. **Environment Setup:**
   - Verify backend/.env exists (not .env.example)
   - Check that required env vars are set (not empty)
   - Report overall readiness status
