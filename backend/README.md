# RBR backend (minimal)

Ovo je minimalni read-only REST API koji servira postojeće JSON datoteke iz root foldera repozitorija.

## Pokretanje
```bash
cd backend
npm i
npm run dev
```

## Endpointi
- GET /api/health
- GET /api/artists
- GET /api/artists/:key
- GET /api/releases
- GET /api/releases/:key
- GET /api/events
- GET /api/events/:key
