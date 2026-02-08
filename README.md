# Am I Underpaid?

"Am I Underpaid?" is a salary benchmarking tool that helps professionals compare their compensation against live market data and official government statistics (ONS for UK, BLS for USA).

## Features

- **Salary Search**: Check your salary against thousands of job listings and benchmarks.
- **Location Analysis**: Compare your salary against regional averages.
- **Salary Converter**: Convert hourly, daily, or weekly wages to an annual salary.
- **Negotiation Support**: Get custom email scripts and tips to negotiate a raise.
- **Admin Portal**:
  - **Data Seeder**: Upload CSV/XLSX files to seed Firestore with government data.
  - **Coding Index**: Manage job title mappings to SOC codes.

## Tech Stack

- **Framework**: [Nuxt 3](https://nuxt.com/) (Vue 3)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Authentication)
- **Search**: [Algolia](https://www.algolia.com/)
- **Icons**: [Lucide Vue](https://lucide.dev/)

## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd amiunderpaid
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Configure Environment Variables:**

    Create a `.env` file in the root directory and add your Firebase and Algolia credentials:

    ```env
    FIREBASE_API_KEY=your_api_key
    FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    FIREBASE_PROJECT_ID=your_project_id
    FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    FIREBASE_APP_ID=your_app_id
    FIREBASE_MEASUREMENT_ID=your_measurement_id

    ALGOLIA_APPLICATION_ID=your_algolia_app_id
    ALGOLIA_SEARCH_API_KEY=your_algolia_search_key

    NUXT_ADMIN_ACCESS_KEY=your_secret_access_key
    ```

4.  **Run the development server:**

    ```bash
    pnpm dev
    ```

    The app will be available at `http://localhost:3000`.

## Admin Access

To access the admin tools (`/admin/seed`, `/admin/coding-index`), you must be authenticated. The login page is protected and located at `/login?access=YOUR_SECRET_KEY` (matching the `NUXT_ADMIN_ACCESS_KEY` in your .env file).
