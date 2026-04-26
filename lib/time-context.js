// Builds a natural-language "## Time Context" block for Angelica's system prompt.
// Tells her the user's local time of day, how long since they last spoke,
// and how long they've known each other — so returns feel acknowledged.

function partOfDay(hour) {
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function formatGap(ms) {
  if (ms == null || !isFinite(ms) || ms < 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 1) return "just moments ago";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.round(day / 7);
  if (wk < 9) return `${wk} week${wk === 1 ? "" : "s"} ago`;
  const mo = Math.round(day / 30);
  if (mo < 18) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.round(day / 365);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

function formatDuration(ms) {
  if (ms == null || !isFinite(ms) || ms < 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"}`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"}`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day} day${day === 1 ? "" : "s"}`;
  const wk = Math.round(day / 7);
  if (wk < 9) return `${wk} week${wk === 1 ? "" : "s"}`;
  const mo = Math.round(day / 30);
  if (mo < 18) return `${mo} month${mo === 1 ? "" : "s"}`;
  const yr = Math.round(day / 365);
  return `${yr} year${yr === 1 ? "" : "s"}`;
}

// Returns one of: 'continuing' | 'same-day-return' | 'returning' | 'first-ever' | 'first-of-session'
function classifyGap({ gapMs, isFirstTurn, hasPriorMessages }) {
  if (!hasPriorMessages) return "first-ever";
  if (!isFirstTurn) return "continuing";
  if (gapMs == null) return "first-of-session";
  if (gapMs < 30 * 60 * 1000) return "continuing"; // <30min, treat as same thread
  if (gapMs < 12 * 60 * 60 * 1000) return "same-day-return";
  return "returning";
}

/**
 * Build the time context block.
 *
 * @param {object} args
 * @param {string} [args.timezone]         IANA timezone from the client (e.g. "Europe/London")
 * @param {string} [args.clientTimeIso]    ISO timestamp from the client at request time
 * @param {Date|string} [args.lastMessageAt]  Timestamp of the user's most recent prior message
 * @param {Date|string} [args.userCreatedAt]  When the user account was created
 * @param {boolean} [args.isFirstTurnOfSession]  True if this is the first user turn in the current session
 * @returns {string} markdown block, or empty string if nothing meaningful
 */
export function buildTimeContext({
  timezone,
  clientTimeIso,
  lastMessageAt,
  userCreatedAt,
  isFirstTurnOfSession,
}) {
  const now = clientTimeIso ? new Date(clientTimeIso) : new Date();
  if (isNaN(now.getTime())) return "";

  const tz = timezone || "UTC";

  let weekday = "";
  let timeStr = "";
  let hour = now.getHours();
  try {
    weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz }).format(now);
    timeStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    }).format(now);
    const hourStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: tz,
    }).format(now);
    hour = parseInt(hourStr, 10);
    if (!isFinite(hour)) hour = now.getHours();
  } catch {
    weekday = now.toUTCString().slice(0, 3);
    timeStr = now.toISOString().slice(11, 16) + " UTC";
  }
  const tod = partOfDay(hour);

  const last = lastMessageAt ? new Date(lastMessageAt) : null;
  const created = userCreatedAt ? new Date(userCreatedAt) : null;
  const gapMs = last && !isNaN(last.getTime()) ? now.getTime() - last.getTime() : null;
  const knownMs = created && !isNaN(created.getTime()) ? now.getTime() - created.getTime() : null;

  const klass = classifyGap({
    gapMs,
    isFirstTurn: !!isFirstTurnOfSession,
    hasPriorMessages: !!last,
  });

  const lines = [
    "## Time Context",
    "",
    `It is ${weekday} ${tod}, ${timeStr} (${tz}) for the user.`,
  ];

  if (klass === "first-ever") {
    lines.push("This is your very first conversation with them.");
  } else if (klass === "continuing") {
    // mid-conversation: don't clutter with gap; they're already talking
    if (knownMs != null) {
      const known = formatDuration(knownMs);
      if (known) lines.push(`You've known them for ${known}.`);
    }
  } else if (klass === "same-day-return" || klass === "returning") {
    const gap = formatGap(gapMs);
    if (gap) lines.push(`They last spoke with you ${gap}.`);
    if (knownMs != null) {
      const known = formatDuration(knownMs);
      if (known) lines.push(`You've known them for ${known}.`);
    }
    lines.push(
      "Acknowledge the gap naturally if it feels right — don't force it, don't make a fuss, but don't pretend no time has passed."
    );
  } else if (klass === "first-of-session") {
    if (knownMs != null) {
      const known = formatDuration(knownMs);
      if (known) lines.push(`You've known them for ${known}.`);
    }
  }

  return lines.join("\n");
}
