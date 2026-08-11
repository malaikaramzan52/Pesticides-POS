# Pesticides & Agro POS — Monorepo

> Production-grade POS + ERP system for Pesticides & Agro businesses

## Structure

```
Pesticides/             ← Monorepo Root
├── backend/            ← Node.js + Express + MongoDB API
├── ERP/                ← React + Vite + TailwindCSS Frontend
├── package.json        ← npm workspaces root
└── .gitignore
```

## Quick Start

```bash
# Install all dependencies (root + both workspaces)
npm run install:all

# Run both backend & ERP in dev mode
npm run dev

# Or run individually
npm run dev:backend
npm run dev:erp
```

## Workspaces

| Package | Tech Stack | Port |
|---------|-----------|------|
| `backend` | Node.js, Express, MongoDB, Mongoose | 5000 |
| `ERP` | React 19, Vite, TailwindCSS v4 | 5173 |

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```bash
copy backend\.env.example backend\.env
```

## Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start both backend & ERP |
| `npm run dev:backend` | Start backend only |
| `npm run dev:erp` | Start ERP frontend only |
| `npm run build:erp` | Build ERP for production |
| `npm run start:backend` | Start backend (production) |
