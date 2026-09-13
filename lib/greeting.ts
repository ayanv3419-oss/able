/**
 * The empty chat screen greets the student: "Good evening, Ayan". The name is
 * the nickname from Settings, else the first name on the account. With
 * neither, the greeting stands alone.
 */

const DAWN = 5;
const NOON = 12;
const EVENING = 17;
const WHITESPACE = /\s+/;

/** The nickname from Settings, else the account's first name, else "". */
export function greetingName({
  accountName,
  nickname,
}: {
  accountName?: string | null;
  nickname?: string | null;
}): string {
  const chosen = nickname?.trim();
  if (chosen) {
    return chosen;
  }
  return accountName?.trim().split(WHITESPACE)[0] ?? "";
}

/** Morning from 5:00, afternoon from 12:00, evening from 17:00 until 5:00. */
export function timeOfDayGreeting(hour: number): string {
  if (hour >= DAWN && hour < NOON) {
    return "Good morning";
  }
  if (hour >= NOON && hour < EVENING) {
    return "Good afternoon";
  }
  return "Good evening";
}

/** "Good evening, Ayan", or just "Good evening" without a name. */
export function greetingText(hour: number, name: string): string {
  const greeting = timeOfDayGreeting(hour);
  return name ? `${greeting}, ${name}` : greeting;
}
