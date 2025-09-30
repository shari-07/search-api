// utils/sendToDiscord.ts

const DISCORD_WEBHOOK_URL = process.env.DISCORD_LOGGING_WEBHOOK || 'https://discord.com/api/webhooks/1397818948740972584/UPN2yxyHWlsvudmXkBeyfiik2mgpa2i_VtnLzq9ag1A-DIALULvKZnnquXGHNG8rgWnd';

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number; // Decimal representation of hex color
  fields?: DiscordEmbedField[];
  timestamp?: string; // ISO8601 timestamp
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  url?: string; // URL for the title
}

/**
 * Sends a message or an embed to the configured Discord webhook.
 * @param options Either a simple string message or an object with message content and/or embeds.
 */
export async function sendDiscordLog(options: string | { content?: string; embeds?: DiscordEmbed[] }) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn("Discord webhook URL is not configured. Skipping Discord log.");
    return;
  }

  let payload: { content?: string; embeds?: DiscordEmbed[] };

  if (typeof options === 'string') {
    payload = { content: options };
  } else {
    payload = options;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to send log to Discord: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Discord API Error Response:', errorBody);
    }
  } catch (error) {
    console.error('Error sending log to Discord webhook:', error);
  }
}

// Helper for common embed colors
export const DiscordColors = {
  INFO: 0x3498db,    // Blue
  SUCCESS: 0x2ecc71, // Green
  WARNING: 0xf1c40f, // Yellow
  ERROR: 0xe74c3c,   // Red
  GRAY: 0x95a5a6,    // Gray
};