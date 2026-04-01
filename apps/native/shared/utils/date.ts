export function formatDateTime(value: string | number | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  try {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatRelativeTime(value: string | number | null | undefined) {
  if (!value) {
    return "No recent activity";
  }

  const date = new Date(value).getTime();
  const diffMs = date - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return formatUnit(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return formatUnit(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);

  return formatUnit(diffDays, "day");
}

function formatUnit(value: number, unit: "minute" | "hour" | "day") {
  const absoluteValue = Math.abs(value);
  const unitLabel = absoluteValue === 1 ? unit : `${unit}s`;

  if (absoluteValue === 0) {
    return "just now";
  }

  if (value < 0) {
    return `${absoluteValue} ${unitLabel} ago`;
  }

  return `in ${absoluteValue} ${unitLabel}`;
}
