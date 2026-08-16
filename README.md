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
- **Search & Market Data**: Algolia, Adzuna, Reed, Jooble
- **Icons**: Lucide Vue Next
- **Localization**: @nuxtjs/i18n

## 📚 Technical Guidelines & Development

If you are a developer looking to contribute or run the project locally, please refer to the dedicated developer documentation:
- [Local Setup & Testing Guide](./DEV.md)
- [Country & Tenant Guidelines](./COUNTRY_GUIDELINES.md)
- [Coding Standards & Rules](./CODE_STANDARDS.md)

## 🚀 Deployment

Optimized for deployment on serverless edge platforms such as Vercel, Netlify, or Cloudflare Pages, leveraging Nitro's `swr` caching rules for maximum performance.
