export { EmailDraftCard, EmailSentCard } from "./email-draft";
export { CalendarEventCard, CalendarEventCreatedCard } from "./calendar-event";
export { ConnectPromptCard } from "./connect-prompt";

/**
 * Parses assistant message content for special card blocks.
 * Returns the card type and data if found.
 */
export function parseCardFromContent(content: string | null): CardData | null {
  if (!content) return null;

  // Email draft: ```email-draft\n{...}\n```
  const emailMatch = content.match(/```email-draft\s*\n([\s\S]*?)\n```/);
  if (emailMatch && emailMatch[1]) {
    try {
      const data = JSON.parse(emailMatch[1]);
      return { type: "email-draft", data, remainingContent: content.replace(emailMatch[0], "").trim() };
    } catch {}
  }

  // Calendar event: ```calendar-event\n{...}\n```
  const calendarMatch = content.match(/```calendar-event\s*\n([\s\S]*?)\n```/);
  if (calendarMatch && calendarMatch[1]) {
    try {
      const data = JSON.parse(calendarMatch[1]);
      return { type: "calendar-event", data, remainingContent: content.replace(calendarMatch[0], "").trim() };
    } catch {}
  }

  // Connect prompt: detect auth-missing pattern or connect link
  const connectMatch = content.match(/\[Authorize (?:Integration|Gmail|Google Calendar)\]\(.*?\/api\/corsair\/connect\?plugin=(\w+)/);
  if (connectMatch) {
    return { type: "connect-prompt", data: { plugin: connectMatch[1] }, remainingContent: content.replace(connectMatch[0], "").trim() };
  }

  return null;
}

export interface CardData {
  type: "email-draft" | "calendar-event" | "connect-prompt";
  data: Record<string, any>;
  remainingContent: string;
}
