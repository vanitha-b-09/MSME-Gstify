// ─────────────────────────────────────────────
//  PROMPT TEMPLATES for GST Notice AI Engine
//  Module 5 — AI Response Engine
// ─────────────────────────────────────────────

/**
 * PROMPT 1: SUMMARIZER
 * Takes raw parsed notice data from OCR (Module 4)
 * Returns a plain-English summary of what the GST officer is claiming
 */
function getSummarizerPrompt(noticeData) {
  return `
You are a senior GST consultant in India with 15 years of experience.

A GST officer has issued the following notice. Analyze it and produce a clear summary.

NOTICE DATA:
- Notice Type: ${noticeData.type}
- GSTIN: ${noticeData.gstin}
- Sections Invoked: ${(noticeData.sections || []).join(", ")}
- Notice Date: ${noticeData.date || "Not specified"}
- Tax Period: ${noticeData.tax_period || "Not specified"}
- Amount Disputed: ${noticeData.amount || "Not specified"}
- Raw Text: ${noticeData.raw_text || "Not provided"}

Your task:
1. Identify what the officer is alleging (in simple terms)
2. Identify which GST rules/sections are being cited
3. Assess the severity: Low / Medium / High
4. Identify what the taxpayer needs to prove to respond

Respond ONLY with a valid JSON object in this exact format, no extra text:
{
  "allegation_summary": "Clear 2-3 sentence summary of what the officer claims",
  "sections_explained": [
    { "section": "Section 73", "meaning": "What this section means for the taxpayer" }
  ],
  "severity": "Low | Medium | High",
  "key_defense_points": ["Point 1", "Point 2", "Point 3"],
  "documents_needed": ["Document 1", "Document 2"]
}
`;
}

/**
 * PROMPT 2: DRAFT GENERATOR
 * Takes the summary + mismatch list from GST Reconciliation (Module 6)
 * Returns a complete formal legal reply in CA letter format
 */
function getDraftGeneratorPrompt(summary, mismatches, noticeData) {
  const mismatchText = (mismatches || [])
    .map(
      (m, i) =>
        `${i + 1}. Field: ${m.field}, Discrepancy: ₹${m.diff}, Period: ${m.month}`
    )
    .join("\n");

  return `
You are a Chartered Accountant drafting a formal reply to a GST Show Cause Notice on behalf of your client.

NOTICE SUMMARY:
${summary.allegation_summary}

KEY DEFENSE POINTS:
${(summary.key_defense_points || []).join("\n")}

DATA MISMATCHES IDENTIFIED:
${mismatchText || "No mismatches found — taxpayer records are clean."}

NOTICE DETAILS:
- GSTIN: ${noticeData.gstin}
- Notice Type: ${noticeData.type}
- Sections: ${(noticeData.sections || []).join(", ")}

Your task: Draft a professional, legally sound reply letter that:
1. Acknowledges the notice politely
2. Explains each discrepancy with a reasonable business justification
3. Cites relevant sections of the CGST Act to support the taxpayer
4. Requests withdrawal of the notice OR asks for additional time
5. Uses formal legal language appropriate for GST tribunal correspondence

Respond ONLY with a valid JSON object, no extra text:
{
  "subject": "Subject line for the reply letter",
  "opening": "Opening paragraph acknowledging the notice",
  "mismatch_explanations": [
    {
      "mismatch": "Description of the discrepancy",
      "explanation": "Business reason / justification",
      "supporting_rule": "Relevant CGST/IGST rule that supports this"
    }
  ],
  "legal_arguments": ["Argument 1 citing section X", "Argument 2"],
  "closing": "Closing paragraph requesting relief",
  "full_draft_body": "The complete formatted letter body as a single string with \\n for line breaks",
  "legal_references": ["Section 73 CGST Act", "Rule 142"]
}
`;
}

module.exports = { getSummarizerPrompt, getDraftGeneratorPrompt };
