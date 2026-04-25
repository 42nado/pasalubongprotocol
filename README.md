# Pasalubong Protocol: Emergency Gift Agent

Pasalubong Protocol is an agentic AI assistant designed to help travelers find local shops, generate shopping lists within a set budget, and draft a backstory for why they are bringing specific gifts home. This application leverages the power of Gemini AI to pinpoint nearby establishments and provide socially acceptable justifications for the gifts purchased.

## Features

- Agentic Store Discovery: Uses Gemini AI to find authentic local bakeries and specialty shops while avoiding generic convenience stores.
- GPS Integrated Mapping: Real-time location detection with Leaflet.js and OpenStreetMap. No Google Maps API requirement.
- Realistic Justification: Generates a Taglish script explaining the specific local significance of the items.
- Budget-Aware Logic: AI-generated shopping lists tailored to the user's location and PHP budget.
- Alternative Scanning: The re-scan feature uses different reasoning parameters to find alternative shopping nodes.

## Tech Stack

- Frontend: React 19 + Vite
- Styling: Tailwind CSS v4.0
- AI Engine: Google Gemini AI
- Maps: Leaflet + OpenStreetMap
- Icons: Lucide React

## Getting Started

### 1. Prerequisites
- A Gemini API Key from Google AI Studio.

### 2. Setup
1. Clone the repository.
2. Install dependencies:
   npm install
3. Create a .env file in the root directory and add your key:
   VITE_GEMINI_API_KEY=your_api_key_here

### 3. Run Locally
npm run dev

## Security
- API keys are handled via environment variables or secondary browser local storage.
- The application uses open-source Map layers.

---
Created for the GDG Manila Build With AI 2026. "Orchestrate the Future. Ship the Agent."
