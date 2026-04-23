const { getSummarizerPrompt, getDraftGeneratorPrompt } = require("./prompts");

// ─────────────────────────────────────────────
//  Helper: call Ollama with simple output
// ─────────────────────────────────────────────
async function callOllama(prompt) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tinyllama",
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 1000,
      }
    }),
  });

  const data = await response.json();
  return data.response || "";
}

// ─────────────────────────────────────────────
//  MAIN CONTROLLER
//  POST /api/generate-response
// ─────────────────────────────────────────────
async function generateResponse(req, res) {
  try {
    const { notice, mismatches } = req.body;

    if (!notice || !notice.type || !notice.gstin) {
      return res.status(400).json({
        error: "Missing required fields: notice.type and notice.gstin",
      });
    }

    console.log(`Processing GSTIN: ${notice.gstin}`);

    // Build mismatch text
    const mismatchText = (mismatches || [])
      .map((m, i) => `${i + 1}. ${m.field}: ₹${m.diff} difference in ${m.month}`)
      .join("\n") || "No mismatches found.";

    // Simple prompt — tinyllama works better with simple instructions
    const prompt = `You are a GST expert. Write a formal reply to this GST notice.

Notice Type: ${notice.type}
GSTIN: ${notice.gstin}
Sections: ${(notice.sections || []).join(", ")}
Tax Period: ${notice.tax_period || "Not specified"}
Amount: ₹${notice.amount || "Not specified"}

Data Mismatches:
${mismatchText}

Write a short professional reply letter explaining the discrepancy.`;

    console.log("Calling Ollama...");
    const draftBody = await callOllama(prompt);
    console.log("Ollama responded!");

    return res.status(200).json({
      success: true,
      gstin: notice.gstin,
      notice_type: notice.type,
      summary: {
        allegation_summary: `GST notice type ${notice.type} issued for GSTIN ${notice.gstin} under ${(notice.sections || []).join(", ")}`,
        severity: "Medium",
        key_defense_points: [
          "Discrepancy may be due to timing differences",
          "ITC claims are legitimate and supported by documents",
          "Ready to provide all supporting documents"
        ]
      },
      draft: {
        subject: `Reply to ${notice.type} Notice - GSTIN: ${notice.gstin}`,
        full_draft_body: draftBody,
        legal_references: notice.sections || ["Section 73 CGST Act"]
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      error: "AI processing failed",
      details: error.message,
    });
  }
}

module.exports = { generateResponse };
