<div align="center">

# 💸 Am I Underpaid?

**High-performance salary benchmarking for professionals.**

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4.0-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Algolia](https://img.shields.io/badge/Algolia-003DFF?style=for-the-badge&logo=algolia&logoColor=white)](https://www.algolia.com)

_"Am I Underpaid?" helps you compare your compensation against live market data and official government statistics._

</div>

---

## 🚀 Overview

**Am I Underpaid?** and **Benchmark My Role** are state-of-the-art platforms designed to bring transparency to the modern job market. By aggregating hundreds of thousands of live job listings and triangulating them against official government datasets, we deliver a highly accurate Market Compensation Alignment (MCA) Score in seconds.

Built with **Nuxt 4**, **Tailwind CSS v4**, and **Firebase**, the platform leverages advanced edge-caching and server-side rendering (SSR) to ensure near-instant page loads and seamless performance.

## ✨ Key Features

- **Domain-Level Localization**: Fully internationalized architecture mapping `en-GB` to `.co.uk` and `en-US` to `.com` for precise regional formatting and SEO indexing.
- **Smart Job Matching**: Uses a custom Job Dictionary with fuzzy-search capabilities to instantly handle ambiguous job titles.
- **Real-Time Benchmarking**: Check compensation against live market vacancies in real-time.
- **Multi-Tenant Architecture**: A single, robust codebase dynamically powers multiple branded platforms based on the requested host domain.
- **Privacy First**: Built-in cookie consent management and GDPR/CCPA compliant tracking.

## 🛠 Tech Stack

- **Framework**: Nuxt 4 (Vue 3.5+)
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Firebase (Firestore, Authentication)
- **Search Engine**: Algolia
- **Icons**: Lucide Vue Next
- **Localization**: @nuxtjs/i18n

## 📚 Technical Guidelines

For detailed internal documentation on our multi-tenant setup, regional orchestration logic, and strict coding conventions, please refer to the following internal guides:
- [Country & Tenant Guidelines](./COUNTRY_GUIDELINES.md)
- [Coding Standards & Rules](./CODE_STANDARDS.md)

## 💻 Local Development Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **pnpm**: v8 or higher

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd amiunderpaid
    ```

2.  **Install dependencies:**
    This project uses `pnpm` for efficient package management.
    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and configure the required keys.
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
    ```
    _(Additional external provider keys are required. See `nuxt.config.ts` for a full list of required `runtimeConfig` variables.)_

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application will be available at `http://localhost:3000`.

## 🧪 Testing & Code Quality

This project maintains strict test coverage requirements (80% minimum) using **Vitest** for unit testing and **Playwright** for End-to-End (E2E) testing. All code changes must pass validation before merging.

```bash
# Run unit tests
pnpm test

# Check test coverage
pnpm test:coverage

# Run End-to-End tests
pnpm test:e2e
```

## 🚀 Deployment

Optimized for deployment on serverless edge platforms such as Vercel, Netlify, or Cloudflare Pages, leveraging Nitro's `swr` caching rules for maximum performance.
