# 💻 Local Development Setup

Welcome to the **Am I Underpaid?** and **Benchmark My Role** developer documentation.

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **pnpm**: v8 or higher

## 1. Getting Started

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
