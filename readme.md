# OJT DV Dashboard System

A React and Vite dashboard for monitoring disbursement vouchers (DVs), payment exposure, overdue obligations, and unpaid amounts by trade area.

The application is located in [`erp-dashboard-redesign`](erp-dashboard-redesign). It provides a responsive ERP-style interface with light, dark, and system theme modes.

## Features

- Dashboard overview of voucher activity and payment status
- Voucher list with search, sorting, pagination, status filters, and trade-area filters
- Voucher detail views for individual disbursement vouchers
- Payment exposure report
- Overdue voucher report
- Unpaid amounts grouped by trade area
- Payment register report with export support
- Trade-area summary view
- Light, dark, and system theme selection
- Responsive navigation for desktop and smaller screens

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router with hash-based routing
- Tailwind CSS 4
- Recharts
- SheetJS (`xlsx`)
- `oxfmt` for formatting

## Requirements

- Node.js 18 or newer
- pnpm, npm, or another Node package manager

## Getting Started

From the repository root, move into the application directory and install dependencies:

```bash
cd erp-dashboard-redesign
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Vite serves the app on port `8443` by default. Open the URL printed in the terminal. To use another port, set `PORT` before starting the server:

```bash
PORT=5173 pnpm dev
```

On Windows PowerShell, use:

```powershell
$env:PORT=5173; pnpm dev
```

## Available Scripts

Run these commands from `erp-dashboard-redesign`:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Create a production build in `dist` |
| `pnpm preview` | Preview the production build locally |
| `pnpm format` | Format the project with `oxfmt` |

## Application Routes

The app uses hash routing, so routes work when the built `index.html` is served from a static host.

| Route | View |
| --- | --- |
| `#/dashboard` | Dashboard overview |
| `#/vouchers` | Voucher list |
| `#/vouchers/:id` | Voucher details |
| `#/reports/exposure` | Payment exposure |
| `#/reports/overdue` | Overdue vouchers |
| `#/reports/by-area` | Unpaid amounts by area |
| `#/reports/register` | Payment register |
| `#/trade-areas` | Trade-area summary |
| `#/settings` | Application settings |

## Project Structure

```text
erp-dashboard-redesign/
├── src/
│   ├── App.tsx       # Application shell, pages, components, and sample voucher data
│   ├── index.css     # Tailwind entrypoint, theme tokens, and global styles
│   ├── main.tsx      # React entrypoint
│   ├── routes.tsx    # Hash router configuration
│   └── theme.tsx     # Theme state and localStorage persistence
├── index.html        # Vite HTML shell
├── package.json      # Scripts and dependencies
├── tsconfig.json     # TypeScript configuration
└── vite.config.ts    # Vite, React, and Tailwind configuration
```

## Data and Configuration

The current dashboard uses sample voucher data defined in `src/App.tsx`. It does not currently connect to an API, database, authentication provider, or external ERP system. Replace the local data layer with the project’s intended backend integration before using the dashboard with live financial records.

The selected theme is stored in the browser under the `dv-monitor-theme` localStorage key. The supported values are `light`, `dark`, and `system`.

## Production Build

Build and preview the application with:

```bash
cd erp-dashboard-redesign
pnpm build
pnpm preview
```

Because routing is hash-based, the generated `dist` directory can be deployed to a static hosting provider without server-side route rewrites.
