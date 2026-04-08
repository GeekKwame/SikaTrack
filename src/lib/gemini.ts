/**
 * Client-side Gemini helper.
 *
 * Calls the /api/ask serverless function — the actual GEMINI_API_KEY
 * lives there (server-side only) and is never exposed in the browser bundle.
 */

const MAX_RETRIES = 1; // retry once on transient network failures

type AskResponse = { reply: string; error?: never } | { error: string; reply?: never };

async function postWithRetry(prompt: string, attempt = 0): Promise<AskResponse> {
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = (await res.json()) as AskResponse;

    // On server-reported error, don't retry — return the message as-is
    if (!res.ok) {
      return { error: (data as { error: string }).error ?? "Sika is unavailable right now. Please try again." };
    }

    return data;
  } catch (networkErr) {
    // Retry once on genuine network failures (offline, DNS, etc.)
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000));
      return postWithRetry(prompt, attempt + 1);
    }
    return { error: "Could not reach Sika. Please check your internet connection and try again." };
  }
}

/**
 * Send a prompt to Ask Sika via the secure /api/ask endpoint.
 * Throws a user-friendly Error string if something goes wrong.
 */
export async function askGemini(prompt: string): Promise<string> {
  const result = await postWithRetry(prompt);

  if (result.error) {
    throw new Error(result.error);
  }

  return result.reply!;
}

/**
 * Ask Sika is always "configured" from the browser's perspective —
 * the API key is managed server-side. This function exists for
 * backwards compatibility with AskSika.tsx.
 */
export function isGeminiConfigured(): boolean {
  return true;
}
