import assert from "node:assert/strict";
import {
  calculatePeriodStats,
  formatBrDate,
  formatDuration,
  getISOWeekInfo,
  getPeriodKey,
  parseIssueDate,
} from "../lib/timeStats.js";

function run() {
  assert.equal(formatDuration(0), "00:00:00");
  assert.equal(formatDuration(3661), "01:01:01");

  const parsedBr = parseIssueDate("01/04/2026");
  assert.ok(parsedBr instanceof Date);
  assert.equal(parsedBr.getFullYear(), 2026);
  assert.equal(parsedBr.getMonth(), 3);
  assert.equal(parsedBr.getDate(), 1);

  assert.equal(parseIssueDate("31/02/2026"), null);

  const parsedIso = parseIssueDate("2026-04-01");
  assert.ok(parsedIso instanceof Date);

  const weekInfo = getISOWeekInfo(new Date("2026-01-01T12:00:00Z"));
  assert.equal(weekInfo.weekYear, 2026);
  assert.equal(weekInfo.week, 1);

  const keys = getPeriodKey("01/04/2026");
  assert.equal(keys.day, "2026-04-01");
  assert.equal(keys.month, "2026-04");
  assert.equal(keys.quarter, "2026-Q2");
  assert.match(keys.week, /^2026-W\d{2}$/);

  const referenceDate = new Date("2026-04-01T12:00:00Z");
  const issues = [
    { date: "01/04/2026", elapsedSeconds: 3600, displaySeconds: 3600 },
    { date: "2026-04-01", elapsedSeconds: 1800, displaySeconds: 1800 },
    { date: "25/03/2026", elapsedSeconds: 900, displaySeconds: 900 },
    { date: "31/02/2026", elapsedSeconds: 999, displaySeconds: 999 },
  ];

  const dayStats = calculatePeriodStats(issues, "day", referenceDate);
  assert.equal(dayStats.issues, 2);
  assert.equal(dayStats.avgTime, 2700);

  const monthStats = calculatePeriodStats(issues, "month", referenceDate);
  assert.equal(monthStats.issues, 2);
  assert.equal(monthStats.avgTime, 2700);

  const brToday = formatBrDate(new Date("2026-04-01T12:00:00Z"));
  assert.equal(brToday, "01/04/2026");
}

run();
console.log("timeStats smoke tests: ok");

