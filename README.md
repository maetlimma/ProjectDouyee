# Dou Yee Clone Catalog Engine

A premium fullstack corporate catalog and product taxonomy engine built to mirror the design aesthetics and capabilities of the official Dou Yee Enterprises website. Powered by a high-performance **Bun + ElysiaJS** backend and a responsive **React (TSX)** frontend.

---

## 🚀 Key Features

### 1. Unified Fullstack Architecture
- **ElysiaJS Backend:** Fast REST API routes with type-safe schema validation, JWT authentication, and native high-speed file upload endpoints.
- **On-the-fly TSX Compilation:** Uses Bun's fast bundling capabilities to compile and serve React TSX modules directly to the client browser without a separate Webpack/Vite build step.
- **Mock JSON Database:** Zero complex database configurations. Catalogs, categories, and user credentials are saved in flat JSON files inside the `/database` directory.

### 2. Deep Content & Specifications Builders
- **WYSIWYG Paragraph Blocks:** Custom uncontrolled `contentEditable` editors formatting paragraphs, sizes, fonts, and inline styles in real-time.
- **Flexible Data Tables:** Dynamic table structure supporting localized table headers and customizable cell configurations.
- **Advanced Technical Matrix:** Fully-fledged hierarchical specs sheet builder featuring Section Headers, Standard Key-Value pairs, and Split/Nested columns. Supports sequence reordering (ArrowUp/Down) to format spec sheets.

### 3. Localization & Multi-Language Support
- **Simultaneous Input:** Admins can write translations for **English (EN)**, **Chinese (简体中文 - ZH)**, and **Thai (ภาษาไทย - TH)** side-by-side on a single workspace, bypassing repetitive tab toggles.
- **Dynamic Context Switcher:** The client-facing website changes language dynamically without page reloads using a centralized React context translator.

### 4. Interactive UX Enhancements
- **Breadcrumbs Trail:** Automatic hierarchical pathway context matching (`Home > Products > [Sector] > [Subcategory] > [Title]`).
- **Tabbed Detail Sheets:** Interactive switching tabs (`Overview`, `Specifications`, `Downloads & Documents`) to structure catalog details neatly.
- **Sales Funnel CTA:** Prominent inquiry button pre-populating contact forms with SKU code and localized product titles on redirection.
- **Lightbox Image Viewer:** Fullscreen zoom overlays for high-resolution gallery inspects.
- **Related Products Showcase:** Smart dynamic cards showing similar products sharing the same subcategory.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime & Package Manager:** Bun (v1.3.14+)
- **Server Framework:** ElysiaJS
- **Frontend library:** React 19 (TypeScript)
- **UI Icons:** Lucide-React
- **State & Routing:** React Router DOM (v7)

---

## 📂 Codebase Directory Layout

```text
ProjectDouyee/
├── .agents/             # Agentic settings and project rules
├── database/            # Local JSON database storage files
│   ├── products.json    # Catalog records and specifications
│   ├── taxonomy.json    # Nested Sector & Sub-category settings
│   └── users.json       # Admin credentials
├── public/              # Client SPA resources (Vite-free)
│   ├── App.tsx          # Main Client Router & layout
│   ├── adminApp.tsx     # Admin Dashboard SPA Router
│   ├── index.css        # Vanilla CSS style system
│   ├── i18n.tsx         # Translation utilities
│   ├── views/           # Client and Admin views components
│   └── uploads/         # Local folder storing media uploads
├── src/                 # ElysiaJS Backend Server
│   ├── index.ts         # Main server router & asset delivery
│   └── db.ts            # Local database query models
├── tests/               # Backend REST & frontend validation tests
└── package.json         # Scripts and project configurations
```

---

## 🚦 Getting Started

### 1. Installation
Install project dependencies with Bun:
```bash
bun install
```

### 2. Run in Development Mode
Start the development server with automatic file watching:
```bash
bun run dev
```
The application will start on: `http://localhost:3000`

### 3. Run Test Suite
To run the automated suite of REST API and Translation unit tests:
```bash
bun test
```

---

## 🔐 Administrative Access & OTP
To log into the Admin Workspace (`http://localhost:3000/admin`):
1. Enter the admin credentials:
   - **Email:** `admin@douyee.com`
2. Submit the form to generate a One-Time Passcode (OTP).
3. Check the **Bun Server Console Log** where the 6-digit OTP will be printed:
   ```text
   ======================================================
   [ADMIN AUTH] OTP for admin@douyee.com: 123456
   ======================================================
   ```
4. Enter the code to verify your session and obtain your JWT access token.
