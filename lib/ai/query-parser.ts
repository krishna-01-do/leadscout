import OpenAI from "openai";
import { businessSearchQuerySchema } from "@/schemas/search";
import type { BusinessSearchQuery } from "@/types";

const SYSTEM_PROMPT = `You are a search query parser for a local business prospect discovery tool.

Your job: convert the user's natural language description into a structured search query.

Rules:
- Extract the business category (e.g., "dental clinic", "gym", "restaurant", "salon").
- Extract the location (city, state, country if mentioned).
- Extract rating thresholds (e.g., "rated above 4.2" → minRating: 4.2).
- Extract review count thresholds (e.g., "more than 100 reviews" → minReviews: 100).
- Extract website conditions: "no website" or "without website" → MISSING; "with website" → PRESENT; "weak website" or "poor website" → MISSING_OR_POOR.
- Extract phone/email requirements if explicitly mentioned.
- If the user mentions a number of results (e.g., "find 50"), set resultLimit accordingly, capped at 100.
- If business category or location cannot be determined, leave them as empty strings (validation will catch this).
- Never invent fields the user didn't mention. Use null for unspecified numeric fields.
- keywords: extract any additional descriptive terms that don't fit other fields.

Output ONLY valid JSON matching the schema. No explanations, no markdown.`;

export interface ParseResult {
  query: BusinessSearchQuery | null;
  error: string | null;
}

export async function parseSearchPrompt(prompt: string): Promise<ParseResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      query: null,
      error: "OpenAI API key is not configured. Please set OPENAI_API_KEY.",
    };
  }

  try {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { query: null, error: "No response from AI model." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { query: null, error: "AI returned invalid JSON." };
    }

    const result = businessSearchQuerySchema.safeParse(parsed);
    if (!result.success) {
      return {
        query: null,
        error: "AI response did not match expected schema.",
      };
    }

    if (!result.data.businessCategory || !result.data.location) {
      return {
        query: null,
        error:
          "Could not determine the business category or location from your prompt. Please specify both (e.g., 'Find dental clinics in Hyderabad without a website').",
      };
    }

    return { query: result.data as BusinessSearchQuery, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    return { query: null, error: `AI parsing failed: ${message}` };
  }
}
