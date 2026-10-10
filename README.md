# Teeto Labels — Dynamic Apparel Shopping Cart & WhatsApp Storefront

**Teeto Labels** is a full-stack **React + Node.js (Express)** shopping cart application tailored for selling **T-Shirts**, **Shirts**, and dynamic apparel categories with **zero-login WhatsApp checkout**, **multi-image & video galleries**, **0-cost JSON document storage**, and **Admin / Superadmin role management**.

---

## Quick Start

```bash 
# 1. Start the unified Production Server (serves both React UI + API on port 4000)
npm start
# Open http://localhost:4000

# OR run Vite Dev Server (port 5173) + Express API (port 4000) concurrently:
npm run dev
# Open http://localhost:5173
```

---

## Default Management Credentials

Customer orders do **not** require any customer login (orders are placed directly via WhatsApp).
Store management is restricted to **Admin** and **Superadmin** roles:

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `superadmin` | `superadmin123` | Full store management **PLUS** exclusive ability to create, activate/deactivate, reset passwords, or delete **Admin** login accounts. |
| **Admin** | `admin` | `admin123` | Manage dynamic Categories & Subcategories, Products, Multi-Image/Video uploads, WhatsApp phone configuration, and JSON backups. (Cannot create/delete login accounts). |

---

## Architectural Guide: Best Practice for $0-Cost Storage (NoSQL vs. Structured File)

### 1. Why a Structured JSON Document Store (`server/data/teeto-store-db.json`) is Best Right Now
- **Structured JSON vs. Plain Text (`.txt`)**: Raw `.txt` files require custom delimiters and break easily when storing nested subcategories or arrays of images/videos. Using a **JSON Document file** gives you the exact same hierarchical document structure as a NoSQL database (like MongoDB or Firestore) at **$0 cost** and with **zero cloud setup**.
- **Server-Side Atomic Writes**: Rather than loading static files only in the browser (where changes made by an Admin wouldn't appear for other shoppers), the Node.js backend reads and writes `server/data/teeto-store-db.json` using **atomic temp-file writes** (`writeFileSync` to `.tmp` followed by `renameSync`) to prevent data corruption.
- **Media Storage Best Practice (Lots of Images & Videos)**: Never base64-encode large images or `.mp4` videos inside your JSON/text file. Instead, **Teeto Labels** stores uploaded image and video files in `server/uploads/` (or external CDN URLs) and saves lightweight metadata references (`{ type: 'image' | 'video', url, caption }`) inside the JSON document.
- **Future Database Migration Ready**: All data operations are encapsulated inside [`server/storage.js`](./server/storage.js). When you are ready to add customer logins and a cloud database later, you can swap `JsonFileRepository` for **MongoDB Atlas (Free M0 Tier)** or **Firebase Firestore (Free Tier)** without changing any React components.
