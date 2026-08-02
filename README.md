# Wassit (وسيط)

Hyperlocal services marketplace : post a job in plain language, nearby
verified providers respond live, you pick one and get it done.

## Stack

- **Frontend:** React + Vite + Tailwind
- **Backend:** Node.js, Express, MongoDB
- **Real-time:** Socket.io
- **Auth:** JWT

## Local setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm run dev
```

Runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs on `http://localhost:5173`.

## Status

 In active development.