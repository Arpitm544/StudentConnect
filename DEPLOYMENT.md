# StudentConnect Deployment Guide

This guide explains how to prepare and deploy your StudentConnect application to a production server (AWS, Render, DigitalOcean, etc.).

## 1. Prepare the Frontend
Before deploying, you must build the frontend into a set of optimized static files.

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. This will create a `dist` folder. Copy this `dist` folder into the `backend` directory so the Go server can serve it:
   ```bash
   cp -r dist ../backend/
   ```

## 2. Configure environment variables (Backend)
Your production server needs several environment variables to run securely. Do NOT use the same `.env` values as development.

| Variable | Description |
| :--- | :--- |
| `GIN_MODE` | Set to `release` for production performance & security (enables Secure cookies). |
| `DATABASE_URL` | Your production CockroachDB/PostgreSQL connection string. |
| `JWT_SECRET` | A long, random string (e.g., `openssl rand -base64 32`). |
| `PRODUCTION_DOMAIN` | Your actual domain (e.g., `studentconnect.app`) to allow CORS. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Path to your production Firebase credentials. |
| `PORT` | (Optional) The port your server will listen on (defaults to 8080). |

## 3. Run the Server
Once you have the `dist` folder inside your backend and your environment variables set, you can start the server:

```bash
cd backend
go run main.go
```

The Go backend is now a **unified binary**:
- It serves your React frontend at `http://YOUR_DOMAIN/`
- It handles your API calls at `http://YOUR_DOMAIN/api/...`
- It properly manages `SameSite` and `Secure` cookies because they are now on the same domain.

## 4. Database Setup
Ensure that your production CockroachDB clusters have the necessary tables. The backend will automatically run migrations (creating tables) on startup, so just ensure the `DATABASE_URL` has write permissions.

## 5. Security Checklist
- [ ] Ensure `GIN_MODE=release` is set to prevent debug logs and enable HTTPS cookie security.
- [ ] Use a strong `JWT_SECRET`.
- [ ] Ensure your server is behind an SSL certificate (HTTPS). Cookies will NOT work in production mode without HTTPS.
