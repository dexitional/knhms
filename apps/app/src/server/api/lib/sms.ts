// Two swappable SMS gateways, both common for Ghanaian numbers — mNotify
// (default) and smsonlinegh.com. SMS_PROVIDER selects which one is active;
// switching providers is a one-line env change, no code change. Each
// provider falls back to logging instead of sending when its own API key
// isn't set, so PIN reset stays testable in local dev without real SMS
// credentials — never rely on that fallback in production.
type SmsProvider = "mnotify" | "smsonlinegh";

function activeProvider(): SmsProvider {
  const configured = process.env.SMS_PROVIDER?.toLowerCase();
  return configured === "smsonlinegh" ? "smsonlinegh" : "mnotify";
}

async function sendViaMnotify(to: string, message: string): Promise<void> {
  const apiKey = process.env.MNOTIFY_API_KEY;
  const senderId = process.env.MNOTIFY_SENDER_ID ?? "KNH";

  if (!apiKey) {
    console.warn(`[sms:dev-fallback:mnotify] MNOTIFY_API_KEY not set — would send to ${to}: ${message}`);
    return;
  }

  const url = new URL("https://api.mnotify.com/api/sms/quick");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("sender", senderId);
  url.searchParams.set("message", message);
  url.searchParams.append("recipient[]", to);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`mNotify request failed with status ${res.status}`);
  }
}

interface SmsOnlineGhResponse {
  handshake: { id: number; label: string };
}

async function sendViaSmsOnlineGh(to: string, message: string): Promise<void> {
  const apiKey = process.env.SMSONLINEGH_API_KEY;
  const senderId = process.env.SMSONLINEGH_SENDER_ID ?? "KNHALL";

  if (!apiKey) {
    console.warn(
      `[sms:dev-fallback:smsonlinegh] SMSONLINEGH_API_KEY not set — would send to ${to}: ${message}`,
    );
    return;
  }

  // smsonlinegh's destinations are bare local-format numbers ("233241234567"
  // or "0241234567" per their own docs), not "+"-prefixed E.164 — strip the
  // leading "+" our toE164() helper adds.
  const destination = to.replace(/^\+/, "");

  const res = await fetch("https://api.smsonlinegh.com/v5/message/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Host: "api.smsonlinegh.com",
      Authorization: `key ${apiKey}`,
    },
    body: JSON.stringify({
      text: message,
      type: 0, // GSM default
      sender: senderId,
      destinations: [destination],
    }),
  });

  if (!res.ok) {
    throw new Error(`smsonlinegh request failed with status ${res.status}`);
  }

  // A 200 only means the request was understood, not that it was accepted —
  // smsonlinegh's own docs say the handshake must also be checked for
  // id 0 / label "HSHK_OK".
  const body = (await res.json()) as SmsOnlineGhResponse;
  if (body.handshake.id !== 0 || body.handshake.label !== "HSHK_OK") {
    throw new Error(`smsonlinegh request rejected: ${JSON.stringify(body.handshake)}`);
  }
}

export async function sendSms(to: string, message: string): Promise<void> {
  const provider = activeProvider();
  if (provider === "smsonlinegh") return sendViaSmsOnlineGh(to, message);
  return sendViaMnotify(to, message);
}

// Registration stores country code ("+233") and local number separately,
// and the local number is often entered with a leading 0 (domestic dialing
// convention) — that leading 0 must be dropped when concatenated with the
// country code, or the resulting number is invalid.
export function toE164(countryCode: string, localNumber: string): string {
  const digitsOnly = localNumber.replace(/\D/g, "").replace(/^0+/, "");
  const code = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
  return `${code}${digitsOnly}`;
}

// e.g. "+233241234567" -> "+233*******67", so the reset-request UI can
// confirm where a code was sent without displaying the full number.
export function maskPhone(e164: string): string {
  if (e164.length <= 4) return e164;
  const visible = e164.slice(-2);
  return `${e164.slice(0, 3)}${"*".repeat(e164.length - 5)}${visible}`;
}
