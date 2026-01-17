# VinFast Dashboard - Frontend

This is the client-side application for the VinFast Dashboard, built with **Astro**, **React**, and **Tailwind CSS**.

## 🛠 Tech Stack

- **Framework**: [Astro 5.0](https://astro.build) (Server-Side Rendering + Static Site Generation)
- **UI Library**: [React 19](https://react.dev)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com)
- **State Management**: [Nano Stores](https://github.com/nanostores/nanostores) (Lightweight, framework-agnostic)
- **Icons**: Heroicons / Inline SVGs

## 📂 Project Structure

```text
/src
├── components/    # Reusable React components (Widgets, Charts)
├── layouts/       # Logic for common page layouts (Sidebar, Header)
├── pages/         # Astro Routing (File-based: index.astro, login.astro)
├── stores/        # Shared state (vehicleStore.js)
└── styles/        # Global CSS and Tailwind directives
```

## 🚀 Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start Dev Server**:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:4321`

## 📦 Build

To create a production build:

```bash
npm run build
```

The output will be in the `dist/` folder.
