# Module 5 — AI Response Engine

This module receives parsed GST notice data + reconciliation mismatches,
and returns a structured draft reply using OpenAI GPT-4o.

---

## Setup (do this once)

1. Install Node.js (v18+) from https://nodejs.org

2. Clone/copy this folder, then:
   npm install

3. Set up your API key:
   cp .env.example .env
   # Open .env and paste your OpenAI key

4. Start the server:
   npm start
   # Server runs at http://localhost:3000

---

## Files explained

| File          | What it does                                      |
|---------------|---------------------------------------------------|
| index.js      | Starts the Express server, registers the route    |
| controller.js | Calls OpenAI in 2 steps: summarize → draft        |
| prompts.js    | The actual instructions sent to GPT-4o            |
| .env.example  | Template for your secret API key                  |

---

## API Usage

POST /api/generate-response

Request body:
{
  "notice": {
    "type": "SCN",
    "gstin": "27AAPFU0939F1ZV",
    "sections": ["Section 73"],
    "date": "2024-01-15",
    "tax_period": "Oct 2023",
    "amount": "240000"
  },
  "mismatches": [
    {
      "field": "GSTR-1 vs 3B",
      "diff": "240000",
      "month": "Oct 2023"
    }
  ]
}

Response:
{
  "success": true,
  "gstin": "...",
  "summary": { ... },
  "draft": {
    "subject": "...",
    "full_draft_body": "...",
    "legal_references": [...]
  }
}

---

## Test with curl

curl -X POST http://localhost:3000/api/generate-response \
  -H "Content-Type: application/json" \
  -d '{
    "notice": { "type": "SCN", "gstin": "27AAPFU0939F1ZV", "sections": ["Section 73"] },
    "mismatches": [{ "field": "GSTR-1 vs 3B", "diff": "240000", "month": "Oct 2023" }]
  }'

---

## How it connects to other modules

- Module 4 (OCR) sends you the notice JSON
- Module 6 (GST Recon) sends you the mismatches array
- Module 7 (PDF Generator) calls your /api/generate-response endpoint
  and uses the draft_body to generate the final PDF
