<div align="center">

# 💸 Am I Underpaid?

**High-performance salary benchmarking for professionals.**

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4.0-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Algolia](https://img.shields.io/badge/Algolia-003DFF?style=for-the-badge&logo=algolia&logoColor=white)](https://www.algolia.com)

_"Am I Underpaid?" helps you compare your compensation against live market data and official government statistics (ONS for UK, BLS for USA)._

</div>

---

## 🚀 Nuxt 4 Evolution

This project has been updated to **Nuxt 4**, leveraging the new directory structure and performance enhancements.

| Feature                   | Description                                                                                                                                            |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unified App Directory** | All frontend logic (`pages`, `components`, `composables`, `plugins`) now resides in `app/`, clearly separating client code from server configurations. |
| **Tailwind CSS v4**       | Powered by `@tailwindcss/vite` for lightning-fast builds, zero-runtime CSS, and simplified configuration.                                              |
| **SWR Caching**           | Salary results are cached on the edge for 24 hours (`swr: 86400`) to ensure near-instant page loads for recurring searches.                            |
| **Optimized Firebase**    | Dependencies are manually chunked to prevent main thread blocking, drastically improving Time-to-Interactive.                                          |

## ✨ Features

### 🌍 Core Functionality

- **Domain-Level i18n & SEO**: Fully internationalized architecture mapping `en-GB` to `.co.uk` and `en-US` to `.com` for precise regional formatting and Google indexing.
- **Smart Job Matching**: Uses a custom Job Dictionary with Algolia fuzzy-search fallbacks to handle ambiguous job titles and map them to official SOC codes.
- **Privacy First**: Built-in cookie consent management and GDPR/CCPA compliant tracking.
- **Salary Search**: Check your salary against 700,000+ job listings and benchmarks in real-time.
- **Location Analysis**: Compare your salary against regional and national averages.
- **Salary Converter**: Convert hourly, daily, or weekly wages to an annual equivalent.
- **Negotiation Support**: Get custom email scripts and actionable tips to negotiate a raise.
- **Multi-Tenant Architecture**: Dynamic branding and tenant resolution via `app/plugins/tenant.ts`. A single codebase seamlessly powers both the **Am I Underpaid?** and **Benchmark My Role** domains, serving customized logos, meta tags, and privacy policies based on the requested host.

### 🛡️ Admin Portal

- **Data Seeder**: Upload CSV/XLSX files to seed Firestore with official government data.
- **Verified Cache**: Manually approve SOC code matches to bypass Algolia fuzzy searches for future users, improving both speed and accuracy.
- **Crowdsourced Suggestions**: Review, approve, or reject user-resolved job titles to continuously train and improve the search dictionary.

### 🏢 Recruiter Portal (B2B)

- **Dedicated Dashboards**: Secure login and onboarding flow for recruitment agencies.
- **Territory Management**: Visual map-based territory selection (e.g., UK regions, US non-contiguous regions) to manage market data.
- **Custom Access**: Specific middleware and auth logic separating general users, admins, and recruiters.

## 🛠 Tech Stack

- **Framework**: Nuxt 4 (Vue 3.5+)
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Firebase (Firestore, Authentication)
- **Search**: Algolia
- **Icons**: Lucide Vue Next
- **Localization**: @nuxtjs/i18n

## 📂 Project Structure

```bash
├── app/                # Nuxt 4 Frontend Layer
│   ├── assets/         # Global CSS and Images
│   ├── components/     # Vue Components (Auto-imported)
│   ├── composables/    # Shared State & Logic (e.g., useAdzuna, useMarketData)
│   ├── layouts/        # Page Layout Wrappers
│   ├── middleware/     # Route Navigation Guards (e.g., Admin Auth)
│   ├── pages/          # File-based Routing
│   ├── plugins/        # Client/Server Plugins
│   └── app.vue         # Main Application Entry Point
├── server/             # Nitro Backend Layer (API & Server Utils)
│   ├── api/            # API Endpoints
│   ├── routes/         # Sitemap & Robots.txt
│   └── utils/          # Server Utilities
├── public/             # Static Assets (favicon, OG images)
└── nuxt.config.ts      # Project Configuration & Runtime Config
```

## Setup & Local Development

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **pnpm**: v8 or higher

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

## 🧪 Testing & Code Quality

This project uses **Vitest** for unit testing, particularly to ensure the accuracy of the complex salary math and regional tax engines.

```bash
# Run unit tests
pnpm test

# Run tests with UI
pnpm test:ui

# Check i18n translation keys for missing values
pnpm ts-node scripts/check-i18n.ts
```

## Admin Access

To access the administrative tools (`/admin/seed`, `/admin/coding-index`), you must be authenticated. The login page is protected and securely located at `/admin/login?access=YOUR_SECRET_KEY` (where the key matches `NUXT_ADMIN_ACCESS_KEY` in your environment variables). Authentication is persisted securely via Firebase Session Cookies.

## Deployment

Because this project uses Nuxt Server-Side Rendering (SSR) and Nitro edge-caching rules (`swr`), it is optimized for deployment on serverless platforms such as Vercel, Netlify, or Cloudflare Pages.

```

```
