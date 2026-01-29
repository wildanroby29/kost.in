# E-commerce Mobile-style UI (React + Vite + Tailwind)

This project is a mobile-first web UI built with React + Vite + Tailwind. It's designed to look like a mobile app layout but runs in the browser, and it's prepared for later integration with WooCommerce REST API.

## Quick start

1. Node.js (>=18) recommended.
2. Install dependencies:
```bash
npm install
```

3. Start dev server:
```bash
npm run dev
```

4. Open http://localhost:5173

## WooCommerce integration notes

- Update environment variable `VITE_WC_BASE` in an `.env` file to point to your WooCommerce REST base URL (e.g. `https://your-site.com/wp-json/wc/v3`).
- Use API keys or JWT for authenticated endpoints. The helper `src/api/woo.js` shows how to create an axios instance.

## What I built for you

- Mobile header with avatar & notification
- Search input and banner promo
- Featured & Most Popular sections with horizontal scroll
- Bottom navigation bar (Home, Products, Cart, Profile)
- Placeholder assets in `src/assets/`
- Example pages: Home, Products, ProductDetail, Cart, Orders, Profile
- `src/api/woo.js` helper (placeholder)

If you want, I can now:
- Integrate real WooCommerce product data (show me API keys or a test store), or
- Polish spacing/colors/fonts to perfectly match your mockup.
