# TourHelpDesk (GlobeDesk)

A minimal, fast tourism & travel helpdesk chatbot built with React 19, TypeScript, Tailwind CSS v4, and Google Gemini.

It is designed specifically to help users plan trips, build itineraries, understand visa requirements, discover local food, and explore destinations across any country.

---

## Features

- **Context-Aware Chat**: Remembers previous messages in the current conversation, so you can ask natural follow-up questions (e.g., *"Can we adjust day 3 for rain?"* or *"What would the budget be for that?"*).
- **Strict Tourism Guardrails**: Built with system prompt rules to stay strictly focused on travel, geography, and vacation planning. Off-topic questions (coding, homework, finance, etc.) are politely redirected back to travel.
- **Resilient Model Failover**: Uses a multi-model fallback waterfall (`gemini-flash-lite-latest`, `gemini-flash-latest`, `gemini-3.6-flash`, etc.) so temporary 503 capacity spikes on Google's free tier don't drop user queries.
- **Minimal UI**: Clean dark layout without unnecessary clutter, featuring starter prompts, auto-scrolling, formatted itinerary blocks, and a one-click prompt retry on network errors.
- **Onboarding Guide**: First-time visitors get a quick modal explaining what the bot can do and how to get the best recommendations.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Lucide React
- **AI**: Google Gemini API (`v1beta`)

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ installed
- A Google Gemini API key (available free at [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Installation
Clone the repo and install dependencies:

```bash
git clone https://github.com/palaksinghal28/TourHelpDesk.git
cd TourHelpDesk
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

Add your Gemini API key:

```env
VITE_GEMINI_API_KEY="your_gemini_api_key_here"
```

*(Note: You can also paste your API key directly in the web UI using the "Set API Key" button in the header.)*

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Scripts

- `npm run dev` – Starts the local Vite development server
- `npm run build` – Type-checks with TypeScript and compiles the production bundle
- `npm run preview` – Serves the production build locally

---

## Project Structure

```
├── src/
│   ├── services/
│   │   └── gemini.ts      # Gemini API calls, system prompt & fallback waterfall
│   ├── App.tsx            # Main chat interface, onboarding modal & state
│   ├── index.css          # Tailwind CSS v4 setup & base styles
│   └── main.tsx           # React root mount
├── .env.example           # Template for required environment variables
├── index.html             # HTML entry with Google Fonts
├── vite.config.ts         # Vite config with React & Tailwind plugins
└── package.json
```

---

## License

MIT
