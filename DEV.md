# 💻 Local Development Setup

Welcome to the **Am I Underpaid?** and **Benchmark My Role** developer documentation.

### Prerequisites

- **Node.js**: v24.0.0 or higher
- **pnpm**: v9 or higher

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
    Copy the `.env.example` file to `.env` and configure the required keys.

    ```bash
    cp .env.example .env
    ```

    _Important: For the `FIREBASE_SERVICE_ACCOUNT_BASE64` variable, you must base64 encode your service account JSON file so it can be safely passed as a single-line string without escaping issues._

    ```bash
    cat service-account.json | base64
    ```

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```

## 2. Multi-Tenant Domain Setup

To test the routing across the different tenant domains locally, map the following in your `/etc/hosts` file:

```
127.0.0.1 ami-uk.localhost
127.0.0.1 bmr.localhost
127.0.0.1 ami-us.localhost
127.0.0.1 bmr.us.localhost
```

You can then access the different apps at e.g., `http://ami-us.localhost:3000`.

## 🧪 Testing & Code Quality

This project maintains strict test coverage requirements (80% minimum) using **Vitest** for unit testing and **Playwright** for End-to-End (E2E) testing. All code changes must pass validation before merging.

_Note: Server API routes (`server/**`) currently have a relaxed starting threshold of 0%. When modifying or adding new server endpoints, developers MUST write corresponding unit tests to establish coverage._

```bash
# Run unit tests
pnpm test

# Check test coverage
pnpm test:coverage

# Run End-to-End tests
pnpm test:e2e
```
