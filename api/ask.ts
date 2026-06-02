import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Constants ────────────────────────────────────────────────────────────────
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_PROMPT_CHARS = 4000;
const MAX_RETRIES = 2;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15;  // per IP per minute

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// Works per-instance (Vercel Edge keeps instances warm briefly).
// For production at scale, swap this for Upstash Redis or similar.
const ipMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ── Gemini caller with retry ──────────────────────────────────────────────────
async function callGemini(prompt: string, apiKey: string, attempt = 0): Promise<string> {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  // Retry once on rate-limit (429) or server errors (5xx)
  if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
    const backoffMs = (attempt + 1) * 1500; // 1.5s, 3s
    await new Promise((r) => setTimeout(r, backoffMs));
    return callGemini(prompt, apiKey, attempt + 1);
  }

  type GeminiJson = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string; status?: string };
  };
  const data = (await res.json()) as GeminiJson;

  if (!res.ok) {
    const msg = data?.error?.message ?? "Gemini request failed.";
    const status = data?.error?.status ?? "";

    if (res.status === 429 || status === "RESOURCE_EXHAUSTED") {
      throw new Error("AI quota reached. Please try again in a moment.");
    }
    if (res.status === 400) {
      throw new Error("The question was too long or contained unsupported content.");
    }
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

function getAllowedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
  ]);

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionUrl) {
    origins.add(productionUrl.startsWith("http") ? productionUrl : `https://${productionUrl}`);
  }

  if (process.env.ALLOWED_ORIGINS) {
    for (const entry of process.env.ALLOWED_ORIGINS.split(",")) {
      const trimmed = entry.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  return [...origins];
}

// ── Request handler ───────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? "";
  const allowed = getAllowedOrigins();

  if (allowed.includes(origin) || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  // Rate limiting
  const ip =
    (Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"]) ??
    req.socket?.remoteAddress ??
    "unknown";

  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment before asking again." });
    return;
  }

  // Validate prompt
  const { prompt } = (req.body ?? {}) as { prompt?: string };
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    res.status(400).json({ error: "Missing or empty prompt." });
    return;
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    res.status(400).json({ error: "Prompt too long. Try a shorter question." });
    return;
  }

  // API key — server-side only, never sent to browser
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Helpful message for developers who haven't set the key yet
    res
      .status(503)
      .json({ error: "Ask Sika AI is not configured yet. Add GEMINI_API_KEY to your Vercel environment variables." });
    return;
  }

  try {
    const reply = await callGemini(prompt.trim(), apiKey);
    res.status(200).json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    res.status(500).json({ error: message });
  }
}
