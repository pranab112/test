# Casino Royal - Frontend

Modern React + TypeScript frontend for the Casino Royal multi-tenant casino platform.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Routing
- **TanStack Query (React Query)** - Server state management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Tailwind CSS** - Styling
- **React Hot Toast** - Notifications

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

The `.env.development` file is already configured for local development:
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENVIRONMENT=development
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at: http://localhost:5173

## Project Structure

```
src/
├── api/              # API client and endpoints
├── assets/           # Static assets (styles, images)
├── components/       # Reusable components
│   ├── common/      # Generic components (Button, Input, etc.)
│   ├── layout/      # Layout components
│   └── ...          # Feature-specific components
├── contexts/         # React Context providers
├── hooks/            # Custom React hooks
├── pages/            # Page components
│   ├── auth/        # Login, Register
│   ├── admin/       # Admin dashboard
│   ├── client/      # Client dashboard
│   └── player/      # Player dashboard
├── routes/           # Routing configuration
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── config/           # Configuration files
├── App.tsx           # Root component
└── main.tsx          # Entry point
```

## Features

### Implemented (Phase 2)
- ✅ Project setup with Vite + React + TypeScript
- ✅ Tailwind CSS with casino theme
- ✅ API client with Axios interceptors
- ✅ Authentication flow (login/register)
- ✅ Role-based routing (Admin, Client, Player)
- ✅ Protected routes
- ✅ Form validation with React Hook Form + Zod
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

### Coming in Phase 3
- 🔨 Full Admin Dashboard
- 🔨 Full Client Dashboard
- 🔨 Full Player Dashboard
- 🔨 Chat system with WebSocket
- 🔨 Friends management
- 🔨 Promotions & offers
- 🔨 Game library
- 🔨 Wallet management
- 🔨 Reviews & ratings
- 🔨 Report system

## Available Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

## API Integration

The frontend communicates with the FastAPI backend at `http://localhost:8000/api/v1`.

All API endpoints are versioned under `/api/v1/`:
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- And more...

## Authentication

- JWT tokens stored in localStorage
- Automatic token injection via Axios interceptors
- Auto-redirect on 401 (Unauthorized)
- Role-based access control

## Styling

Casino-themed design with:
- Gold primary color (`#FFD700`)
- Dark background (`#0a0a0a`)
- Neon accent colors
- Custom animations and glows
- Responsive design

## Notes

- Uses Vite proxy for API calls in development
- TypeScript strict mode enabled
- Path aliases configured (`@/` = `src/`)
