export function formatDateTime(value: string | number | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string | number | null | undefined) {
  if (!value) {
    return "No recent activity";
  }

  const date = new Date(value).getTime();
  const diffMs = date - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);

  return formatter.format(diffDays, "day");
}
