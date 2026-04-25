# 🇵🇭 Pasalubong Protocol: Emergency Gift Agent

**Pasalubong Protocol** is an agentic AI savior designed for the classic Filipino "crisis": arriving from a trip empty-handed. This application leverages the power of Gemini AI to pinpoint nearby local shops, generate realistic shopping lists within your budget, and draft a "socially acceptable" backstory to explain why you *totally* didn't forget your family/friends.

![Pasalubong Protocol UI](https://img.shields.io/badge/Agentic-AI-red?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-cyan?style=for-the-badge)

## ✨ Features

- **🎯 Agentic Store Discovery**: Uses Gemini AI to find authentic local bakeries and specialty shops (e.g., Goldilocks, Red Ribbon, or local hidden gems) while avoiding generic convenience stores.
- **🗺️ GPS Integrated Mapping**: Real-time location detection with **Leaflet.js** and **OpenStreetMap**. No expensive Google Maps API project required.
- **🤖 Realistic Justification**: Generates a funny, Taglish "backstory" (script) you can use to explain your special find.
- **💰 Budget-Aware Logic**: AI-generated shopping lists tailored to your location and current PHP budget.
- **🔄 Alternative Scanning**: Don't like the first option? The "Re-scan" feature uses different reasoning parameters to find alternative nodes.

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS v4.0 (CSS-first engine)
- **AI Engine**: Google Gemini 1.5 Flash (stable reasoning)
- **Maps**: Leaflet + OpenStreetMap
- **Icons**: Lucide React

## 🚀 Getting Started

### 1. Prerequisites
- A **Gemini API Key** (Get one for free at [Google AI Studio](https://aistudio.google.com/)).

### 2. Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

### 3. Run Locally
```bash
npm run dev
```

## 🛡️ Security
- API keys are stored in environment variables (Vite) or secondary `localStorage` for privacy.
- The app uses No-Tracking OpenStreetMap layers.

---
*Created for the GDG Manila Build With AI 2026. "Orchestrate the Future. Ship the Agent."*
