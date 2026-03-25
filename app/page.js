"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "issue-timer-app-v1";

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hrs = String(Math.floor(safe / 3600)).padStart(2, "0");
  const mins = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function getToday() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

function getPeriodKey(dateString) {
  const [day, month, year] = dateString.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  const quarter = Math.floor(date.getMonth() / 3) + 1;

  return {
    day: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`,
    week: `${year}-W${Math.ceil(day / 7)}`,
    month: `${year}-${String(month).padStart(2, "0")}`,
    quarter: `${year}-Q${quarter}`,
  };
}

function createIssue(date, link, type) {
  return {
    id: Date.now() + Math.random(),
    date,
    link,
    type,
    elapsedSeconds: 0,
    status: "Aguardando",
    startedAt: null,
    completedAt: null,
  };
}

function extractIssueId(url) {
  if (!url) return "";
  const azureMatch = url.match(/\/edit\/(\d+)/i);
  if (azureMatch) return azureMatch[1];

  const jiraMatch = url.match(/\/browse\/([A-Z]+-\d+)/i);
  if (jiraMatch) return jiraMatch[1];

  const finalNumber = url.match(/(\d+)(?!.*\d)/);
  return finalNumber ? finalNumber[1] : "";
}

function getDomainLabel(url) {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return hostname;
  } catch {
    return "link manual";
  }
}

function calculatePeriodStats(items, periodName) {
  const grouped = new Map();

  items.forEach((issue) => {
    const key = getPeriodKey(issue.date)[periodName];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(issue);
  });

  const periods = Array.from(grouped.values());
  const totalIssues = items.length;
  const totalSeconds = items.reduce(
    (acc, issue) => acc + (issue.displaySeconds || issue.elapsedSeconds || 0),
    0
  );

  return {
    issues: periods.length ? Math.round(totalIssues / periods.length) : 0,
    avgTime: totalIssues ? Math.floor(totalSeconds / totalIssues) : 0,
  };
}

export default function Page() {
  const [date, setDate] = useState(getToday());
  const [link, setLink] = useState("");
  const [type, setType] = useState("Teste");
  const [tick, setTick] = useState(Date.now());

  const [issues, setIssues] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  }, [issues]);

  const issuesWithLiveTime = useMemo(() => {
    return issues.map((issue) => {
      if (issue.status !== "Em andamento" || !issue.startedAt) {
        return {
          ...issue,
          displaySeconds: issue.elapsedSeconds || 0,
        };
      }

      const runningSeconds = Math.floor((tick - issue.startedAt) / 1000);

      return {
        ...issue,
        displaySeconds: (issue.elapsedSeconds || 0) + Math.max(0, runningSeconds),
      };
    });
  }, [issues, tick]);

  function pauseRunningIssues(currentIssues, now = Date.now()) {
    return currentIssues.map((issue) => {
      if (issue.status === "Em andamento" && issue.startedAt) {
        const extra = Math.floor((now - issue.startedAt) / 1000);
        return {
          ...issue,
          elapsedSeconds: issue.elapsedSeconds + Math.max(0, extra),
          startedAt: null,
          status: "Pausada",
        };
      }
      return issue;
    });
  }

  function handleAddIssue() {
    if (!link.trim()) return;

    setIssues((current) => {
      const paused = pauseRunningIssues(current);
      const nextIssue = createIssue(date, link.trim(), type);

      return [
        {
          ...nextIssue,
          status: "Em andamento",
          startedAt: Date.now(),
        },
        ...paused,
      ];
    });

    setLink("");
    setType("Teste");
  }

  function handleStart(id) {
    setIssues((current) => {
      const now = Date.now();
      const pausedOthers = pauseRunningIssues(current, now);

      return pausedOthers.map((issue) => {
        if (issue.id !== id) return issue;
        if (issue.status === "Encerrada") return issue;

        return {
          ...issue,
          status: "Em andamento",
          startedAt: now,
        };
      });
    });
  }

  function handlePause(id) {
    setIssues((current) => {
      const now = Date.now();

      return current.map((issue) => {
        if (issue.id === id && issue.status === "Em andamento" && issue.startedAt) {
          const extra = Math.floor((now - issue.startedAt) / 1000);
          return {
            ...issue,
            elapsedSeconds: issue.elapsedSeconds + Math.max(0, extra),
            startedAt: null,
            status: "Pausada",
          };
        }

        return issue;
      });
    });
  }

  function handleFinish(id) {
    setIssues((current) => {
      const now = Date.now();

      return current.map((issue) => {
        if (issue.id !== id) return issue;

        let finalSeconds = issue.elapsedSeconds || 0;

        if (issue.status === "Em andamento" && issue.startedAt) {
          finalSeconds += Math.max(0, Math.floor((now - issue.startedAt) / 1000));
        }

        return {
          ...issue,
          elapsedSeconds: finalSeconds,
          startedAt: null,
          status: "Encerrada",
          completedAt: now,
        };
      });
    });
  }

  function handleDelete(id) {
    setIssues((current) => current.filter((issue) => issue.id !== id));
  }

  const activeIssues = issuesWithLiveTime.filter(
    (issue) => issue.status !== "Encerrada"
  );
  const finishedIssues = issuesWithLiveTime.filter(
    (issue) => issue.status === "Encerrada"
  );

  const today = getToday();
  const todayIssues = issuesWithLiveTime.filter((issue) => issue.date === today);

  const totalTodaySeconds = todayIssues.reduce(
    (acc, issue) => acc + issue.displaySeconds,
    0
  );
  const totalTodayCount = todayIssues.length;
  const testToday = todayIssues.filter((issue) => issue.type === "Teste");
  const retestToday = todayIssues.filter((issue) => issue.type === "Reteste");
  const averageTodaySeconds = totalTodayCount
    ? Math.floor(totalTodaySeconds / totalTodayCount)
    : 0;

  const allTests = issuesWithLiveTime.filter((issue) => issue.type === "Teste");
  const allRetests = issuesWithLiveTime.filter((issue) => issue.type === "Reteste");

  const testStats = {
    day: {
      issues: testToday.length,
      avgTime: testToday.length
        ? Math.floor(
            testToday.reduce((acc, issue) => acc + issue.displaySeconds, 0) /
              testToday.length
          )
        : 0,
    },
    week: calculatePeriodStats(allTests, "week"),
    month: calculatePeriodStats(allTests, "month"),
    quarter: calculatePeriodStats(allTests, "quarter"),
  };

  const retestStats = {
    day: {
      issues: retestToday.length,
      avgTime: retestToday.length
        ? Math.floor(
            retestToday.reduce((acc, issue) => acc + issue.displaySeconds, 0) /
              retestToday.length
          )
        : 0,
    },
    week: calculatePeriodStats(allRetests, "week"),
    month: calculatePeriodStats(allRetests, "month"),
    quarter: calculatePeriodStats(allRetests, "quarter"),
  };

  const overallStats = {
    day: {
      issues: todayIssues.length,
      avgTime: averageTodaySeconds,
    },
    week: calculatePeriodStats(issuesWithLiveTime, "week"),
    month: calculatePeriodStats(issuesWithLiveTime, "month"),
    quarter: calculatePeriodStats(issuesWithLiveTime, "quarter"),
  };

  const statCards = [
    { label: "Total de horas", value: formatDuration(totalTodaySeconds) },
    { label: "Média/issue", value: formatDuration(averageTodaySeconds) },
    { label: "Testes", value: String(testToday.length) },
    { label: "Retestes", value: String(retestToday.length) },
    { label: "Issues dia", value: String(totalTodayCount) },
  ];

  function renderPeriodRows(data) {
    const labels = {
      day: "Dia",
      week: "Semana",
      month: "Mês",
      quarter: "Trimestre",
    };

    return Object.entries(data).map(([key, value]) => (
      <div
        key={key}
        className="flex items-center justify-between gap-3 py-2 border-b border-slate-200 last:border-0"
      >
        <span className="text-slate-600">{labels[key]}</span>
        <span className="font-semibold text-slate-800">{value.issues}</span>
        <span className="text-sm text-slate-500">
          {formatDuration(value.avgTime)}
        </span>
      </div>
    ));
  }

  const chip = (text) => (
    <span className="inline-flex items-center rounded-full bg-[#e6f2ec] px-3 py-1 text-xs font-semibold text-[#2f6f4f]">
      {text}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2f6f4f] via-[#3a7a58] to-[#2f6f4f] p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl rounded-[28px] bg-[#f6f8f4] shadow-[0_30px_80px_rgba(0,0,0,0.25)] p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2f6f4f]">
              ⏱️ Apontamentos
            </h1>
            <p className="text-sm text-[#6b705c] mt-1">
              Controle de tempo por issue
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-white px-3 py-2 text-sm text-[#6b705c] shadow-sm">
              {today}
            </span>
            <span className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#2f6f4f] shadow-sm">
              QA Timer
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 md:p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#2f6f4f]">Nova Issue</h2>
            {chip("Envio rápido")}
          </div>

          <div className="grid gap-3 md:grid-cols-[140px_1fr_140px_120px]">
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2f6f4f]"
            />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2f6f4f]"
              placeholder="Link da issue"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2f6f4f]"
            >
              <option>Teste</option>
              <option>Reteste</option>
            </select>
            <button
              onClick={handleAddIssue}
              className="h-11 rounded-xl bg-[#2f6f4f] text-white font-semibold shadow hover:opacity-90"
            >
              Enviar
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 md:p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#2f6f4f]">Issues do dia</h2>
            {chip("Alternar entre issues")}
          </div>

          <div className="space-y-3">
            {activeIssues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                Nenhuma issue em andamento. Adiciona uma nova para começar.
              </div>
            ) : (
              activeIssues.map((issue) => {
                const issueId = extractIssueId(issue.link);
                const issueLabel = issueId
                  ? `${getDomainLabel(issue.link)} • #${issueId}`
                  : getDomainLabel(issue.link);

                return (
                  <div
                    key={issue.id}
                    className={`rounded-2xl border p-4 transition shadow-sm ${
                      issue.status === "Em andamento"
                        ? "border-emerald-400 bg-emerald-50"
                        : issue.status === "Pausada"
                        ? "border-amber-300 bg-amber-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[120px_minmax(0,1fr)_130px_160px_170px] lg:items-center">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Data
                        </p>
                        <p className="font-medium text-slate-700">{issue.date}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Issue
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {issueLabel}
                        </p>
                        <p className="break-all text-xs text-slate-500 mt-1">
                          {issue.link}
                        </p>
                      </div>

                      <div className="min-w-0 lg:text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 lg:hidden">
                          Tipo
                        </p>
                        <span
                          className={`inline-flex text-xs px-2 py-1 rounded-full font-semibold ${
                            issue.type === "Teste"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {issue.type}
                        </span>
                      </div>

                      <div className="min-w-0 lg:text-center">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Tempo
                        </p>
                        <p className="font-mono text-xl font-bold text-[#2f6f4f]">
                          {formatDuration(issue.displaySeconds)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                          onClick={() => handleStart(issue.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white shadow"
                        >
                          ▶
                        </button>
                        <button
                          onClick={() => handlePause(issue.id)}
                          className="rounded-lg bg-amber-400 px-3 py-1.5 text-white shadow"
                        >
                          ⏸
                        </button>
                        <button
                          onClick={() => handleFinish(issue.id)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-white shadow"
                        >
                          ⛔
                        </button>
                        <button
                          onClick={() => handleDelete(issue.id)}
                          className="rounded-lg bg-slate-300 px-3 py-1.5 text-slate-700 shadow"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {statCards.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#2f6f4f]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#2f6f4f]">Dashboard</h2>
            {chip("Visão geral")}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[#eef5ef] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#2f6f4f]">Teste</h3>
                {chip("Desempenho")}
              </div>
              {renderPeriodRows(testStats)}
            </div>

            <div className="rounded-2xl bg-[#eef5ef] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#6b705c]">Reteste</h3>
                {chip("Desempenho")}
              </div>
              {renderPeriodRows(retestStats)}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(overallStats).map(([key, value]) => {
              const labelMap = {
                day: "Dia",
                week: "Semana",
                month: "Mês",
                quarter: "Trim",
              };

              return (
                <div
                  key={key}
                  className="rounded-xl bg-[#eef5ef] p-3 text-center"
                >
                  <p className="text-xs text-slate-400">{labelMap[key]}</p>
                  <p className="text-xl font-bold text-[#2f6f4f]">
                    {value.issues}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDuration(value.avgTime)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 md:p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#2f6f4f]">Issues encerradas</h2>
            {chip(`${finishedIssues.length} concluídas`)}
          </div>

          <div className="space-y-3">
            {finishedIssues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                Ainda não há issues encerradas.
              </div>
            ) : (
              finishedIssues.map((issue) => {
                const issueId = extractIssueId(issue.link);
                const issueLabel = issueId
                  ? `${getDomainLabel(issue.link)} • #${issueId}`
                  : getDomainLabel(issue.link);

                return (
                  <div
                    key={issue.id}
                    className="grid items-center gap-3 rounded-xl border p-3 md:grid-cols-[120px_minmax(0,1fr)_120px_140px_80px] bg-white shadow-sm"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Data
                      </p>
                      <p className="font-medium text-slate-700">{issue.date}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Issue
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {issueLabel}
                      </p>
                      <p className="break-all text-xs text-slate-500 mt-1">
                        {issue.link}
                      </p>
                    </div>

                    <div className="text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          issue.type === "Teste"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {issue.type}
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Tempo final
                      </p>
                      <p className="font-mono text-xl font-bold text-[#2f6f4f]">
                        {formatDuration(issue.displaySeconds)}
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDelete(issue.id)}
                        className="rounded-lg bg-slate-300 px-3 py-1.5 text-slate-700 shadow"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}