import OpenAI from "openai";

export type AnalysisOutput = {
  disclosureRiskScore: number; // 0-100
  sentimentScore: number; // -1 to 1 or 0-100
  riskFactorSentiment: string;
  regulatoryKeywordCount: number;
  litigationMentions: string[];
  riskyParagraphs: { excerpt: string; reason: string }[];
  executiveSummary: string;
};

const SYSTEM_PROMPT = `You are a financial disclosure analyst. Analyze the provided 10-K text and return a JSON object with exactly these keys (no markdown, no code block):
- disclosureRiskScore: number 0-100 (higher = riskier)
- sentimentScore: number 0-100 (higher = more negative risk tone)
- riskFactorSentiment: one short paragraph on overall risk factor tone
- regulatoryKeywordCount: number of distinct regulatory/legal keywords (e.g. SEC, litigation, compliance, regulatory, investigation)
- litigationMentions: array of up to 5 short phrases mentioning litigation or legal risk
- riskyParagraphs: array of up to 5 objects with "excerpt" (1-2 sentences) and "reason" (why it's risky)
- executiveSummary: 2-4 sentence executive summary of key disclosure risks

Be concise. Use only the given text. If the text is empty or not a 10-K, return low scores and empty arrays.`;

export async function analyze10kWithOpenAI(
  text: string,
  apiKey: string
): Promise<AnalysisOutput> {
  const openai = new OpenAI({ apiKey });
  const truncated = text.slice(0, 120_000); // ~30k tokens headroom

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this 10-K excerpt:\n\n${truncated}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<AnalysisOutput>;

  return {
    disclosureRiskScore: typeof parsed.disclosureRiskScore === "number" ? Math.min(100, Math.max(0, parsed.disclosureRiskScore)) : 50,
    sentimentScore: typeof parsed.sentimentScore === "number" ? Math.min(100, Math.max(0, parsed.sentimentScore)) : 50,
    riskFactorSentiment: typeof parsed.riskFactorSentiment === "string" ? parsed.riskFactorSentiment : "",
    regulatoryKeywordCount: typeof parsed.regulatoryKeywordCount === "number" ? parsed.regulatoryKeywordCount : 0,
    litigationMentions: Array.isArray(parsed.litigationMentions) ? parsed.litigationMentions.slice(0, 5) : [],
    riskyParagraphs: Array.isArray(parsed.riskyParagraphs) ? parsed.riskyParagraphs.slice(0, 5) : [],
    executiveSummary: typeof parsed.executiveSummary === "string" ? parsed.executiveSummary : "",
  };
}
