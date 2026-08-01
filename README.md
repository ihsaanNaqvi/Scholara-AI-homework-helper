# ISM Homework — AI GCSE Tutor

An advanced AI-powered homework help system for GCSE Science and Mathematics students.

## Features

- **4 input types:** Type a question, upload an image, upload a PDF, or upload a video (auto frame-extracts)
- **Smart diagram generation:** Automatically detects when a diagram is needed and renders it as SVG
- **LaTeX math rendering:** All equations rendered beautifully using KaTeX
- **Subject detection:** Automatically detects Maths vs Science questions
- **Question history:** Last 10 questions saved in session
- **Follow-up questions:** Ask follow-ups without leaving the page
- **Copy answers:** One-click copy of any explanation
- **Zoom diagrams:** Zoom in/out on generated diagrams + SVG download
- **Free to use:** Powered by Gemini 1.5 Flash (free tier)

## Setup (5 minutes)

### 1. Get a free Gemini API key
Go to https://aistudio.google.com/app/apikey — sign in with Google, create a key. It's free.

### 2. Install dependencies
```
npm install
```

### 3. Add your API key
```
cp .env.local.example .env.local
```
Edit `.env.local` and replace `your_gemini_api_key_here` with your actual key.

### 4. Run locally
```
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel (2 minutes)

1. Push this repo to GitHub
2. Go to vercel.com → Add New Project → import the repo
3. In Environment Variables, add: `GEMINI_API_KEY` = your key
4. Click Deploy

## Upgrading to paid models

When you're ready to upgrade from the free tier, change one line in `src/lib/gemini.ts`:

```ts
const MODEL = "gemini-1.5-pro";     // Better quality, still affordable
// or
const MODEL = "gemini-2.0-flash";   // Faster + better, small cost
```

## Architecture

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **AI:** Google Gemini 1.5 Flash (multimodal — handles text, images, PDFs)
- **Diagram fix:** Model outputs SVG wrapped in [DIAGRAM_START]...[DIAGRAM_END] tags
  → Extracted, sanitized, and rendered directly in the browser
  → Zoomable and downloadable
- **Math rendering:** KaTeX via remark-math + rehype-katex
- **Deployment:** Vercel (free tier works perfectly)
