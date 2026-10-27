# 🚀 Vantage Project Management Dashboard & API

Vantage is a modern project management dashboard built with **React** (frontend) and **Node.js** (backend).

## ✨ Features

- Real-time project tracking
- Kanban boards
- Filtering capabilities
- Integrated AI Assistant (powered by Groq)
- Detailed spec views

## 🧰 Tech Stack

| Layer          | Technology        |
| -------------- | ----------------- |
| Frontend       | React             |
| Backend        | Node.js           |
| Authentication | Supabase          |
| AI Assistant   | Groq API          |

## 📁 Project Structure

```
.
├── vantage-dashboard/   # Frontend (React)
└── vantage-api/         # Backend (Node.js)
```

## 🛠️ Prerequisites

Make sure you have the following installed on your local machine:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Git](https://git-scm.com/)

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

## ⚙️ Environment Variables

To make all backend features work (including Authentication and the AI Assistant), create a `.env` file inside the `vantage-api` folder:

```env
PORT=5000

# Supabase credentials for authentication
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Groq API key for Vantage Assistant
GROQ_API_KEY=your_groq_api_key
```

> ⚠️ Never commit your `.env` file. Make sure it is listed in `.gitignore`.

## ▶️ Running the Project

The frontend and backend run separately, so you will need **two terminal windows**.

### 1. Backend (`vantage-api`)

```bash
cd vantage-api
npm install
npx nodemon server.js
```

The API will run on `http://localhost:5000` (or the `PORT` you set in `.env`).

### 2. Frontend (`vantage-dashboard`)

```bash
cd vantage-dashboard
npm install
npm run dev
```

Then open the local URL shown in your terminal.

## 🔑 Default Credentials (Development Only)

Use the following account to log in during development and testing:

| Field    | Value             |
| -------- | ----------------- |
| Username | `admin@gmail.com` |
| Password | `123456789`       |

> ⚠️ These credentials are for local development only. Do not use them in production.
