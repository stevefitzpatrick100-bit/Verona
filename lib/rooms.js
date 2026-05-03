// Verona — rooms runtime (v3, five rooms)
//
// Rooms are admin-side architecture; the user never hears the names.
// This module lets the chat route read the user's *current* room (from the
// most recent Observer reading) and inject the matching room block into
// Angelica's system prompt.
//
// Therapy is the only receptive room: substrate analysis is suppressed
// and the turn is written to receptive_material instead. The lounge is
// the entrance for new users; the studio is home (where the work lives).

export const ROOMS = [
  "lounge", "therapy", "studio", "dating_admin", "matchmaker",
];

export const RECEPTIVE_ROOMS = new Set(["therapy"]);

export function isReceptiveRoom(room) {
  return RECEPTIVE_ROOMS.has(room);
}

// Cache for room prompt blocks: prompt_versions can change in admin so we
// keep this short. Same TTL as the angelica prompt cache.
const ROOM_BLOCK_TTL_MS = 60_000;
const _roomBlockCache = new Map(); // room -> { content, label, cachedAt }

export async function getRoomPromptBlock(supabase, room) {
  if (!ROOMS.includes(room)) return null;

  const cached = _roomBlockCache.get(room);
  if (cached && Date.now() - cached.cachedAt < ROOM_BLOCK_TTL_MS) {
    return cached;
  }

  const { data } = await supabase
    .from("prompt_versions")
    .select("content, label")
    .eq("prompt_key", `room_${room}`)
    .eq("is_active", true)
    .maybeSingle();

  const result = data?.content
    ? { content: data.content, label: data.label || room, cachedAt: Date.now() }
    : { content: null, label: null, cachedAt: Date.now() };
  _roomBlockCache.set(room, result);
  return result;
}

// The current room is normally the room the Observer last classified for this
// user. An admin "pin" is a cq_dimensions row whose delta_summary starts with
// "[PIN]" — when present and newer than any "[UNPIN]" row, it wins over the
// Observer's reads, so Angelica stays put until the operator clears it.
export async function getCurrentRoom(supabase, userId, { isFirstSession = false } = {}) {
  // Latest pin / unpin marker
  const { data: marker } = await supabase
    .from("cq_dimensions")
    .select("room, delta_summary, measured_at")
    .eq("user_id", userId)
    .or("delta_summary.ilike.[PIN]%,delta_summary.ilike.[UNPIN]%")
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (marker && /^\[PIN\]/i.test(marker.delta_summary || "") && ROOMS.includes(marker.room)) {
    return marker.room;
  }

  const { data } = await supabase
    .from("cq_dimensions")
    .select("room")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.room && ROOMS.includes(data.room)) return data.room;
  return "lounge";
}

// Format a room block for inclusion in the system prompt.
// Wrapped with explicit boundary so the model can see where it starts/ends.
export function formatRoomBlock(room, blockContent) {
  if (!blockContent) return null;
  return [
    "## Room context",
    "",
    `You are currently in the ${room.replace(/_/g, " ")} room. The user does not know this room exists; never name it. Behave as the room calls for:`,
    "",
    blockContent.trim(),
  ].join("\n");
}
