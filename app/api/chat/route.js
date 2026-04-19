import { getSupabaseServer } from "@/lib/supabase";
import { ANGELICA_SYSTEM_PROMPT, PORTRAIT_ANALYSIS_PROMPT } from "@/lib/prompts";
import { buildPortraitContext } from "@/lib/portrait";
import { applyPortraitUpdate } from "@/lib/portrait-update";

// Cache the active prompt for 60 seconds to avoid a DB hit on every message
let _promptCache = null;
let _promptCachedAt = 0;
const PROMPT_CACHE_TTL_MS = 60_000;

async function getActiveAngelicaPrompt(supabase, userPromptVersionId) {
  // If the user has a specific prompt version assigned (via invite), use that
  if (userPromptVersionId) {
    const { data } = await supabase
      .from("prompt_versions")
      .select("content, label")
      .eq("id", userPromptVersionId)
      .single();
    if (data?.content) return { content: data.content, label: data.label || "pinned" };
  }

  // Otherwise use the globally active prompt (cached)
  const now = Date.now();
  if (_promptCache && now - _promptCachedAt < PROMPT_CACHE_TTL_MS) return _promptCache;

  const { data } = await supabase
    .from("prompt_versions")
    .select("content, label")
    .eq("prompt_key", "angelica")
    .eq("is_active", true)
    .single();

  const result = { content: data?.content || ANGELICA_SYSTEM_PROMPT, label: data?.label || "default" };
  _promptCache = result;
  _promptCachedAt = now;
  return result;
}

export async function POST(req) {
  const { messages, userId, sessionId } = await req.json();

  if (!userId) {
    return Response.json({ error: "No user ID provided" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  try {
    // Build portrait context from database
    const portraitContext = await buildPortraitContext(supabase, userId);

    // Check if user has a specific prompt version assigned
    const { data: userData } = await supabase
      .from("users")
      .select("prompt_version_id")
      .eq("id", userId)
      .single();

    // Get current session number
    const { count } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const sessionNumber = count || 1;

    // Build full system prompt with portrait context
    const activePrompt = await getActiveAngelicaPrompt(supabase, userData?.prompt_version_id);
    const systemPrompt = activePrompt.content + "\n\n## Portrait & Memory\n\n" + portraitContext;
    const promptLabel = activePrompt.label;

    // Call Anthropic API for conversation
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages.slice(-30),
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Anthropic API error:", JSON.stringify(data.error));
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const reply = data.content?.[0]?.text || "...";

    // Store messages in database
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && sessionId) {
      await supabase.from("messages").insert([
        { session_id: sessionId, user_id: userId, role: "user", content: lastUserMsg.content },
        { session_id: sessionId, user_id: userId, role: "assistant", content: reply },
      ]);
      // Keep ended_at current so admin shows accurate session duration
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    // Run portrait analysis in background (non-blocking)
    runPortraitAnalysis(supabase, userId, sessionNumber, messages, reply).catch(
      (e) => console.error("Portrait analysis failed:", e)
    );

    return Response.json({ text: reply, promptVersion: promptLabel });
  } catch (e) {
    console.error("Chat API error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

async function runPortraitAnalysis(supabase, userId, sessionNumber, messages, lastReply) {
  const recentMessages = messages.slice(-8);
  const snippet = [
    ...recentMessages.map((m) => `${m.role}: ${m.content}`),
    `assistant: ${lastReply}`,
  ].join("\n");

  // Get current portrait state (summary)
  const portraitContext = await buildPortraitContext(supabase, userId);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `${PORTRAIT_ANALYSIS_PROMPT}\n\nCurrent portrait context:\n${portraitContext}\n\nRecent conversation:\n${snippet}`,
        },
      ],
    }),
  });

  const data = await response.json();
  const analysisText = data.content?.[0]?.text || "{}";
  const cleaned = analysisText.replace(/```json|```/g, "").trim();

  try {
    const analysis = JSON.parse(cleaned);
    await applyPortraitUpdate(supabase, userId, sessionNumber, analysis);
  } catch (e) {
    console.error("Portrait analysis parse failed:", e.message);
  }
}
