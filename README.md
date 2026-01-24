# Emuy Pages

Main Yume Tools dashboard and utilities at emuy.gg.

## Features

- User authentication via Discord OAuth
- Dashboard with quick links
- Cruddy Panel (attendance tracking)
- Admin panel for user management
- DevOps status page

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Deployed to Cloudflare Pages:

```bash
npm run deploy
```

## Environment Variables

Create a `.env` file:

```
VITE_API_URL=https://api.emuy.gg
```

## Structure

```
src/
├── components/     # Shared UI components
├── contexts/       # React contexts (auth, etc.)
├── lib/           # Utilities and API client
├── pages/         # Page components
├── App.tsx        # Main app with routing
└── main.tsx       # Entry point
```

## Copying Pages from yume-pages

To migrate pages from the original yume-pages:

1. Copy the page component from `yume-pages/src/pages/`
2. Update imports to use `@/` alias
3. Add route in `App.tsx`
4. Copy any required components to `components/`

