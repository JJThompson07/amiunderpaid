# Am I Underpaid?

"Am I Underpaid?" is a high-performance salary benchmarking tool that helps professionals compare their compensation against live market data and official government statistics (ONS for UK, BLS for USA).

## 🚀 Nuxt 4 Evolution

This project has been updated to Nuxt 4, leveraging the new directory structure and performance enhancements. Key updates include:

- **Unified App Directory**: All frontend logic (pages, components, composables, plugins) now resides in the `app/` folder, clearly separating client code from server configurations.
- **Tailwind CSS v4**: Powered by `@tailwindcss/vite` for lightning-fast builds, zero-runtime CSS, and simplified configuration.
- **SWR Caching**: Salary results are cached on the edge for 24 hours (`swr: 86400`) to ensure near-instant page loads for recurring searches.
- **Optimized Firebase Chunking**: Firebase dependencies are manually chunked to prevent main thread blocking, drastically improving Time-to-Interactive.

## Features

- **Salary Search**: Check your salary against 140,000+ job listings and benchmarks in real-time.
- **Location Analysis**: Compare your salary against regional and national averages.
- **Salary Converter**: Convert hourly, daily, or weekly wages to an annual equivalent.
- **Negotiation Support**: Get custom email scripts and actionable tips to negotiate a raise.

### Admin Portal

- **Data Seeder**: Upload CSV/XLSX files to seed Firestore with official government data.
- **Verified Cache**: Manually approve SOC code matches to bypass Algolia fuzzy searches for future users, improving both speed and accuracy.

## Tech Stack

- **Framework**: Nuxt 4 (Vue 3.5+)
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Firebase (Firestore, Authentication)
- **Search**: Algolia
- **Icons**: Lucide Vue Next

## Project Structure

```
├── app/                # Nuxt 4 Frontend Layer
│   ├── assets/         # Global CSS and Images
│   ├── components/     # Vue Components (Auto-imported)
│   ├── composables/    # Shared State & Logic (e.g., useAdzuna, useMarketData)
│   ├── layouts/        # Page Layout Wrappers
│   ├── middleware/     # Route Navigation Guards (e.g., Admin Auth)
│   ├── pages/          # File-based Routing
│   ├── plugins/        # Client/Server Plugins (e.g., Google Analytics)
│   └── app.vue         # Main Application Entry Point
├── server/             # Nitro Backend Layer (API & Server Utils)
│   ├── api/            # API Endpoints (Adzuna integrations, Admin routes)
│   ├── routes/         # Sitemap & Robots.txt generation
│   └── utils/          # Server Utilities (Firebase Admin Auth & DB)
├── public/             # Static Assets (favicon, OG images)
└── nuxt.config.ts      # Project Configuration & Runtime Config
```

## Setup & Local Development

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd amiunderpaid
    ```

2.  **Install dependencies:**

    This project uses pnpm for efficient package management.

    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**

    Create a `.env` file in the root directory. Ensure all private keys are kept secure.

    ```env
    # Firebase Config (Public & Private)
    FIREBASE_API_KEY=your_api_key
    FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    FIREBASE_PROJECT_ID=your_project_id
    FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    FIREBASE_APP_ID=your_app_id
    FIREBASE_MEASUREMENT_ID=your_measurement_id
    FIREBASE_SERVICE_ACCOUNT='{"project_id": "...", ...}' # Full JSON string for Admin SDK

    # Algolia Config
    ALGOLIA_APPLICATION_ID=your_algolia_app_id
    ALGOLIA_SEARCH_API_KEY=your_algolia_search_key

    # Adzuna Config
    ADZUNA_APP_ID=your_adzuna_app_id
    ADZUNA_APP_KEY=your_adzuna_app_key

    # Admin Access
    NUXT_ADMIN_ACCESS_KEY=your_secret_access_key
    ```

4.  **Run the development server:**

    ```bash
    pnpm dev
    ```

    The application will be available at `http://localhost:3000`.

## Admin Access

To access the administrative tools (`/admin/seed`, `/admin/coding-index`), you must be authenticated. The login page is protected and securely located at `/admin/login?access=YOUR_SECRET_KEY` (where the key matches `NUXT_ADMIN_ACCESS_KEY` in your environment variables). Authentication is persisted securely via Firebase Session Cookies.
