# FairAudit AI

FairAudit AI is a React + Vite web app for auditing AI bias across hiring, lending, healthcare, and other high-impact decision workflows.

It provides guided checks for:

- **Resume/Hiring Bias Detector**: anonymizes resumes and scores candidate fit based on objective criteria.
- **Dataset Bias Scanner**: analyzes CSV datasets for bias indicators, risk scores, and fairness metrics.
- **Decision Audit**: audits model decisions for potential discrimination and supports side-by-side what-if comparisons.
- **Pre-Deployment Checklist**: runs a readiness assessment before AI systems go live.

The app uses Gemini for AI analysis and supports Firebase-backed storage/auth with localStorage fallback when Firebase is not configured.

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Firebase (Auth + Firestore, optional)
- Gemini via `@google/genai`

## Prerequisites

- Node.js 18+ (required)
- npm
- Gemini API key

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file:

   ```bash
   cp .env.example .env.local
   ```

3. Set required environment variables in `.env.local`:

   - `GEMINI_API_KEY` (required for AI features; use this exact key name as defined in `.env.example`)
   - Firebase client vars (optional but recommended):
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_DATABASE_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_MEASUREMENT_ID`

4. Start the dev server:

   ```bash
   npm run dev
   ```

   App runs on the local URL printed in your terminal after startup.

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run preview` - preview production build locally
- `npm run lint` - run TypeScript type-check (`tsc --noEmit`)
- `npm run clean` - remove `dist` folder

## Notes

- If Firebase is not configured, auth and persistence automatically fall back to localStorage simulation.
- Some features (report sharing, timeline persistence, multi-session interactions) are enhanced when Firebase is configured.
