# Library Management FE (MERN) — Vite + React (JS) + Ant Design + Redux Toolkit + RTK Query

This is the **JavaScript/JSX** version (no TypeScript).
- React + Vite
- Ant Design 5
- Redux Toolkit + RTK Query
- React Router v6
- Token saved in localStorage (simple demo)

## Quick start

```bash
npm i
cp .env.example .env
# Set VITE_API_BASE_URL to your backend (e.g., http://localhost:3000/api)
npm run dev
```

### Expected API
- POST `/auth/login` → `{ accessToken, user }`
- GET `/auth/me`
- GET `/books?page=1&pageSize=10&q=` → `{ items, total, page, pageSize }`
- POST `/books`, PUT `/books/:id`, DELETE `/books/:id`
