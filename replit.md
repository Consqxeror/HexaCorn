# HexaCorn

A centralized notes and notice management system for colleges.

## Overview

HexaCorn is a full-stack web application that allows educational institutions to manage and distribute notices, announcements, and content to students and staff.

## Project Architecture

### Frontend (React + Vite)
- **Location**: `frontend/`
- **Port**: 5000 (development)
- **Stack**: React 18, Vite, React Router, Axios
- **Entry**: `frontend/src/main.jsx`

### Backend (Express.js)
- **Location**: `backend/`
- **Port**: 3000 (development)
- **Stack**: Express, Sequelize ORM, PostgreSQL
- **Entry**: `backend/src/server.js`

### Database
- **Type**: PostgreSQL (Replit-managed)
- **ORM**: Sequelize
- **Models**: User, Department, Division, Content, ContentVersion, CRApplication, SystemSetting

## Key Features
- User authentication (JWT-based)
- Role-based access (Students, Class Representatives, Admins)
- Content/notice management with versioning
- Department and division organization
- File uploads
- System settings management

## Environment Variables

### Shared
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port (3000)
- `UPLOAD_DIR` - Directory for file uploads

## Development

### Running the App
Both frontend and backend run as separate workflows:
- **Frontend**: `cd frontend && npm run dev` (port 5000)
- **Backend**: `cd backend && npm start` (port 3000)

The frontend proxies API requests to the backend via Vite's proxy configuration.

## Recent Changes
- Migrated from SQLite to PostgreSQL for Replit compatibility
- Updated Vite config to allow all hosts for Replit proxy
- Configured CORS for development environment
- Added trust proxy setting for rate limiter
