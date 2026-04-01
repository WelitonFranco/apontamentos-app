export function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hrs = String(Math.floor(safe / 3600)).padStart(2, "0");
  const mins = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export function formatBrDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseIssueDate(dateString) {
  if (!dateString || typeof dateString !== "string") return null;

  const normalized = dateString.trim();

  const brMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, dayStr, monthStr, yearStr] = brMatch;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getISOWeekInfo(date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const day = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const weekYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);

  return { weekYear, week };
}

export function getPeriodKey(dateInput) {
  const date =
    dateInput instanceof Date ? dateInput : parseIssueDate(String(dateInput || ""));

  if (!date) {
    return {
      day: "invalid-date",
      week: "invalid-date",
      month: "invalid-date",
      quarter: "invalid-date",
    };
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const { weekYear, week } = getISOWeekInfo(date);

  return {
    day: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`,
    week: `${weekYear}-W${String(week).padStart(2, "0")}`,
    month: `${year}-${String(month).padStart(2, "0")}`,
    quarter: `${year}-Q${quarter}`,
  };
}

export function calculatePeriodStats(items, periodName, referenceDate = new Date()) {
  const referenceKey = getPeriodKey(referenceDate)[periodName];

  const periodItems = items.filter((issue) => {
    const issueKey = getPeriodKey(issue.date)[periodName];
    return issueKey !== "invalid-date" && issueKey === referenceKey;
  });

  const totalIssues = periodItems.length;
  const totalSeconds = periodItems.reduce(
    (acc, issue) => acc + (issue.displaySeconds || issue.elapsedSeconds || 0),
    0
  );

  return {
    issues: totalIssues,
    avgTime: totalIssues ? Math.floor(totalSeconds / totalIssues) : 0,
  };
}

