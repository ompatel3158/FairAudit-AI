# FairAudit AI - Algorithmic Fairness & Compliance Suite

FairAudit AI is a comprehensive, human-centric algorithmic fairness auditor and real-time compliance assistant. It empowers HR teams, data scientists, and enterprise compliance officers to build, audit, and deploy machine learning models and screening processes that are equitable, transparent, and fully compliant with global regulations.

---

## 🌟 Core Modules & Features

Our comprehensive suite is divided into specialized modules tailored for different stages of the algorithmic lifecycle:

### 1. Resume Screening Bias Auditing
Upload applicant resumes and compare them against Job Descriptions (JDs). This module automatically scans and redact potential demographic proxy information (names, gender identifiers, exact graduation dates) to ensure candidates are evaluated strictly on merit, skills, and experience.
* **Features:** Bias scoring, automated proxy redaction, JD-alignment metrics.

### 2. Dataset Bias Scanner
Ensure your training data isn't inherently biased before feeding it to your models. Upload your historical CSV datasets to run automated fairness benchmarks.
* **Features:** Disparate Impact verification (the 80% / 4/5ths rule), Demographic Parity checks, RBI compliance, and EEOC alignment scanning.

### 3. Counterfactual Decision Audit
An interactive "What-If" scenario builder. Alter protected demographic attributes (like age, gender, or zip code) on a sample application to verify if the AI's final decision or score changes.
* **Features:** Visual comparison graphs, automated sensitivity testing, feature importance visualizations.

### 4. Regulatory Compliance Checklists
Stay ahead of regulatory curves with interactive compliance panels covering regional and global algorithmic laws.
* **Features:** Step-by-step interactive audits for AI regulations (such as components of the EU AI Act or local employment laws).

### 5. Enterprise Integrations & Webhooks
Connect FairAudit AI directly into your existing Applicant Tracking Systems (ATS) or enterprise CI/CD pipelines.
* **Features:** Live API sandbox, dynamic webhook registration, secure API key generation, and administrative telemetry dashboards.

### 6. Chrome Extension Support
Bring fairness checks directly into your browser workspace to audit decisions live inside third-party HR and recruitment platforms.

---

## 🛠️ Technical Architecture

FairAudit AI is built as a robust, secure, and highly-responsive Single Page Application (SPA), utilizing modern web development standards.

### Tech Stack
* **Frontend Framework:** React 18 with TypeScript, powered by Vite for lightning-fast HMR and building.
* **Styling & UI:** Tailwind CSS for a utility-first, responsive design architecture.
* **Icons & Typography:** Lucide React for crisp, scalable vector iconography; custom web fonts tailored for a clean enterprise feel.
* **Animations:** Framer Motion (`motion/react`) for fluid layout transitions, micro-interactions, and engaging user feedback.
* **Database & Authentication:** Firebase (Firestore and Firebase Auth) handles secure user sessions, API key persistence, and telemetry data.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your system:
* [Node.js](https://nodejs.org/en/) (v16.0 or higher recommended)
* npm (comes with Node.js)
* A Firebase Project (if you intend to use the live database functions)

### 1. Cloning the Repository

```bash
git clone <repository_url>
cd <repository_folder>
```

### 2. Installing Dependencies

Install all the required NPM packages.

```bash
npm install
```

### 3. Environment Variables & Setup

For security reasons, sensitive credentials are not committed to source control.

1. Duplicate the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Populate the `.env` file with your relevant configuration variables (e.g., Firebase config properties).
3. **Database Config:** If using the JSON config fallback, place your authenticated `firebase-applet-config.json` in the root of the project. *Note: this file is completely ignored by Git to protect your database credentials.*

### 4. Running the Development Server

Boot up the Vite dev server for local development.

```bash
npm run dev
```

The application will start, and you can view it in your browser at `http://localhost:3000`. 

### 5. Production Build

To create an optimized, minified production build of your application:

```bash
npm run build
```

This will run TypeScript checks (`tsc`) and bundle the React application into the `dist` directory, ready to be deployed to any static hosting service or container configuration.

---

## 🔐 Security & Privacy

* **Zero-Trust Access:** API keys generated within the app are securely tied to authenticated user emails in Firestore.
* **Credential Protection:** `firebase-applet-config.json`, `.env`, and local database backups (`fairaudit_db.json`) are strictly ignored via `.gitignore` to prevent secret leakage.
* **Data Anonymization:** The architecture emphasizes processing demographic data securely, often wiping sensitive strings from the local state tree immediately after compliance checks are completed.

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
