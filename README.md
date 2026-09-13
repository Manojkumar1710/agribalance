# AgriBalance

AgriBalance is a React agricultural field-survey and decision-support application. It collects farmer, farm, fertilizer, pesticide, soil-testing, training, challenge, and GPS data, then produces screening-level risk assessments, recommendations, village analytics, hotspots, reports, and follow-up information.

## Architecture

The existing Vite/React application remains the frontend. A separate Express API is provided under `backend/`:

```text
React + Vite -> Express -> Mongoose -> MongoDB
```

The frontend still supports its localStorage workflow and draft-style browser persistence. The API client in `src/services/api.js` is ready for authenticated backend integration through `VITE_API_URL`.

## Requirements

- Node.js 20+
- MongoDB locally or MongoDB Atlas

## Local Setup

Frontend:

```text
npm install
copy .env.example .env
npm run dev
```

Backend:

```text
cd backend
npm install
copy .env.example .env
npm run dev
```

The backend starts on `http://localhost:5000` by default and exposes `GET /api/health`.

## Seed Demo Data

MongoDB must be running and configured in `backend/.env` before seeding:

```text
cd backend
npm run seed
```

The seed creates 18 surveys across 5 villages and demo users. Demo password: `AgriBalanceDemo2026!`. These credentials are for development only.

## Environment Variables

Frontend `.env`:

```text
VITE_API_URL=http://localhost:5000/api
```

Backend `.env`:

```text
MONGODB_URI=mongodb://localhost:27017/agribalance
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Never commit `.env` files or real secrets. For Atlas, set `MONGODB_URI` to the `mongodb+srv://...` connection string in the deployment environment.

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health`
- `GET/POST /api/surveys`
- `GET/PUT/DELETE /api/surveys/:id`
- `GET /api/farmers`
- `GET /api/farmers/:id`
- `GET /api/farmers/:id/surveys`
- `GET /api/dashboard/summary`
- `GET /api/villages`
- `GET /api/villages/:village`
- `GET /api/villages/compare`
- `GET/POST /api/followups`
- `PUT /api/followups/:id`

Protected endpoints use `Authorization: Bearer <JWT>`. Coordinator and admin permissions are required for dashboard and village analytics.

## Deployment

Deploy the frontend to Vercel with `VITE_API_URL` pointing to the deployed backend. Deploy `backend/` to Render or Railway with the backend environment variables configured. Use MongoDB Atlas for production and restrict `FRONTEND_URL` to the deployed frontend origin.

Complete survey submission uses a MongoDB transaction. The MongoDB deployment must support transactions, such as an Atlas replica set or a local replica-set configuration. The seed script itself is explicit and must be run manually; it is never executed on server startup.

## Current Limitations

The existing UI still defaults to its localStorage data path and does not yet include a login screen or replace dashboard calculations with API responses. The backend and centralized API client are in place for that next migration step while preserving current field workflows.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
