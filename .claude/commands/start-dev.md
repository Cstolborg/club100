Start both backend and frontend development servers:

1. Check if backend/app.py exists
2. Start backend server on port 8000 in background:
   - Use `uvicorn app:app --reload --port 8000` from backend directory
3. Check if frontend/package.json exists
4. Start frontend dev server in background:
   - Use `npm run dev` from frontend directory
5. Wait 3 seconds and verify both servers are running
6. Report the URLs:
   - Backend: http://127.0.0.1:8000
   - Backend API Docs: http://127.0.0.1:8000/docs
   - Frontend: http://127.0.0.1:3000 or http://127.0.0.1:5173 (Vite default)
7. Provide instructions to stop servers when done
