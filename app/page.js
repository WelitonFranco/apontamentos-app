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
    day: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    week: `${year}-W${Math.ceil(day / 7)}`,
    month: `${year}-${String(month).padStart(2, "0")}`,
    quarter: `${year}-Q${quarter}`,
  };
}

function createIssue(date, link, type, elapsedSeconds = 0) {
  return {
    id: Date.now() + Math.random(),
    date,
    link,
    type,
    elapsedSeconds,
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

function parseTimeToSeconds(time) {
  const parts = (time || "").split(":").map(Number);

  if (parts.length !== 3 || parts.some((item) => Number.isNaN(item) || item < 0)) {
    return 0;
  }

  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s;
}

function secondsToTimeInput(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = String(Math.floor(safe / 3600)).padStart(2, "0");
  const mins = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const secs = String(safe % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export default function Page() {
  const [date, setDate] = useState(getToday());
  const [link, setLink] = useState("");
  const [type, setType] = useState("Teste");
  const [manualMinutes, setManualMinutes] = useState("");
  const [tick, setTick] = useState(Date.now());

  const [editingTimeId, setEditingTimeId] = useState(null);
  const [editingTimeValue, setEditingTimeValue] = useState("");

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
        displaySeconds:
          (issue.elapsedSeconds || 0) + Math.max(0, runningSeconds),
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

    const minutes = Number(manualMinutes) || 0;
    const manualSeconds = Math.max(0, minutes * 60);

    setIssues((current) => {
      const paused = pauseRunningIssues(current);
      const nextIssue = createIssue(date, link.trim(), type, manualSeconds);

      if (manualSeconds > 0) {
        return [
          {
            ...nextIssue,
            status: "Pausada",
            startedAt: null,
          },
          ...paused,
        ];
      }

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
    setManualMinutes("");
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
        if (
          issue.id === id &&
          issue.status === "Em andamento" &&
          issue.startedAt
        ) {
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
          finalSeconds += Math.max(
            0,
            Math.floor((now - issue.startedAt) / 1000)
          );
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

    if (editingTimeId === id) {
      setEditingTimeId(null);
      setEditingTimeValue("");
    }
  }

  function handleStartEditTime(issue) {
    setEditingTimeId(issue.id);
    setEditingTimeValue(
      secondsToTimeInput(issue.displaySeconds || issue.elapsedSeconds || 0)
    );
  }

  function handleCancelEditTime() {
    setEditingTimeId(null);
    setEditingTimeValue("");
  }

  function handleSaveEditTime(id) {
    const segundos = parseTimeToSeconds(editingTimeValue);

    setIssues((current) =>
      current.map((issue) =>
        issue.id === id
          ? {
              ...issue,
              elapsedSeconds: segundos,
              startedAt: null,
              status: issue.status === "Encerrada" ? "Encerrada" : "Pausada",
            }
          : issue
      )
    );

    setEditingTimeId(null);
    setEditingTimeValue("");
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
  const allRetests = issuesWithLiveTime.filter(
    (issue) => issue.type === "Reteste"
  );

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
      <div key={key} className="period-row">
        <span className="period-label">{labels[key]}</span>
        <span className="period-value">{value.issues}</span>
        <span className="period-time">{formatDuration(value.avgTime)}</span>
      </div>
    ));
  }

  function chip(text) {
    return <span className="chip">{text}</span>;
  }

  return (
    <div className="page-bg">
      <div className="app-shell">
        <div className="topbar">
          <div>
            <h1 className="page-title">⏱️ Apontamentos</h1>
            <p className="page-subtitle">Controle de tempo por issue</p>
          </div>

          <div className="topbar-badges">
            <span className="topbar-badge">{today}</span>
            <span className="topbar-badge topbar-badge-strong">QA Timer</span>
          </div>
        </div>

        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Nova Issue</h2>
            {chip("Envio rápido")}
          </div>

          <div className="new-issue-grid">
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field"
              placeholder="Data"
            />

            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="field"
              placeholder="Link da issue"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="field"
            >
              <option>Teste</option>
              <option>Reteste</option>
            </select>

            <input
              type="number"
              min="0"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              className="field"
              placeholder="Tempo (min)"
            />

            <button onClick={handleAddIssue} className="btn btn-primary">
              Enviar
            </button>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Issues do dia</h2>
            {chip("Alternar entre issues")}
          </div>

          <div className="issues-list">
            {activeIssues.length === 0 ? (
              <div className="empty-box">
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
                    className={`issue-card ${
                      issue.status === "Em andamento"
                        ? "issue-running"
                        : issue.status === "Pausada"
                        ? "issue-paused"
                        : ""
                    }`}
                  >
                    <div className="issue-grid">
                      <div>
                        <p className="mini-label">Data</p>
                        <p className="issue-text-strong">{issue.date}</p>
                      </div>

                      <div className="issue-main">
                        <p className="mini-label">Issue</p>
                        <p
                          className="issue-title-line ellipsis"
                          title={issueLabel}
                        >
                          {issueLabel}
                        </p>
                        <p className="issue-link ellipsis" title={issue.link}>
                          {issue.link}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`tag ${
                            issue.type === "Teste" ? "tag-test" : "tag-retest"
                          }`}
                        >
                          {issue.type}
                        </span>
                      </div>

                      <div className="issue-time-box">
                        <p className="mini-label">Tempo</p>

                        {editingTimeId === issue.id ? (
                          <div className="time-inline-editor">
                            <input
                              type="text"
                              value={editingTimeValue}
                              onChange={(e) => setEditingTimeValue(e.target.value)}
                              className="time-input"
                              placeholder="00:00:00"
                            />
                            <button
                              onClick={() => handleSaveEditTime(issue.id)}
                              className="btn btn-save-time"
                              title="Salvar tempo"
                            >
                              ✔
                            </button>
                            <button
                              onClick={handleCancelEditTime}
                              className="btn btn-cancel-time"
                              title="Cancelar edição"
                            >
                              ✖
                            </button>
                          </div>
                        ) : (
                          <p
                            className="timer-text"
                            title={formatDuration(issue.displaySeconds)}
                          >
                            {formatDuration(issue.displaySeconds)}
                          </p>
                        )}
                      </div>

                      <div className="issue-actions">
                        <button
                          onClick={() => handleStart(issue.id)}
                          className="btn btn-start"
                          title="Iniciar"
                        >
                          ▶
                        </button>

                        <button
                          onClick={() => handlePause(issue.id)}
                          className="btn btn-pause"
                          title="Pausar"
                        >
                          ⏸
                        </button>

                        <button
                          onClick={() => handleFinish(issue.id)}
                          className="btn btn-stop"
                          title="Encerrar"
                        >
                          ⛔
                        </button>

                        <button
                          onClick={() => handleStartEditTime(issue)}
                          className="btn"
                          title="Editar tempo"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => handleDelete(issue.id)}
                          className="btn btn-delete"
                          title="Excluir"
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
        </section>

        <section className="stats-grid">
          {statCards.map((item) => (
            <div key={item.label} className="stat-card">
              <p className="stat-label">{item.label}</p>
              <p className="stat-value">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Dashboard</h2>
            {chip("Visão geral")}
          </div>

          <div className="dashboard-panels">
            <div className="dashboard-panel">
              <div className="section-header">
                <h3 className="section-title">Teste</h3>
                {chip("Desempenho")}
              </div>
              {renderPeriodRows(testStats)}
            </div>

            <div className="dashboard-panel">
              <div className="section-header">
                <h3 className="section-title">Reteste</h3>
                {chip("Desempenho")}
              </div>
              {renderPeriodRows(retestStats)}
            </div>
          </div>

          <div className="overall-grid">
            {Object.entries(overallStats).map(([key, value]) => {
              const labelMap = {
                day: "Dia",
                week: "Semana",
                month: "Mês",
                quarter: "Trim",
              };

              return (
                <div key={key} className="overall-card">
                  <p className="overall-label">{labelMap[key]}</p>
                  <p className="overall-value">{value.issues}</p>
                  <p className="overall-time">{formatDuration(value.avgTime)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Issues encerradas</h2>
            {chip(`${finishedIssues.length} concluídas`)}
          </div>

          <div className="issues-list">
            {finishedIssues.length === 0 ? (
              <div className="empty-box">Ainda não há issues encerradas.</div>
            ) : (
              finishedIssues.map((issue) => {
                const issueId = extractIssueId(issue.link);
                const issueLabel = issueId
                  ? `${getDomainLabel(issue.link)} • #${issueId}`
                  : getDomainLabel(issue.link);

                return (
                  <div key={issue.id} className="issue-card">
                    <div className="issue-grid">
                      <div>
                        <p className="mini-label">Data</p>
                        <p className="issue-text-strong">{issue.date}</p>
                      </div>

                      <div className="issue-main">
                        <p className="mini-label">Issue</p>
                        <p
                          className="issue-title-line ellipsis"
                          title={issueLabel}
                        >
                          {issueLabel}
                        </p>
                        <p className="issue-link ellipsis" title={issue.link}>
                          {issue.link}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`tag ${
                            issue.type === "Teste" ? "tag-test" : "tag-retest"
                          }`}
                        >
                          {issue.type}
                        </span>
                      </div>

                      <div className="issue-time-box">
                        <p className="mini-label">Tempo final</p>

                        {editingTimeId === issue.id ? (
                          <div className="time-inline-editor">
                            <input
                              type="text"
                              value={editingTimeValue}
                              onChange={(e) => setEditingTimeValue(e.target.value)}
                              className="time-input"
                              placeholder="00:00:00"
                            />
                            <button
                              onClick={() => handleSaveEditTime(issue.id)}
                              className="btn btn-save-time"
                              title="Salvar tempo"
                            >
                              ✔
                            </button>
                            <button
                              onClick={handleCancelEditTime}
                              className="btn btn-cancel-time"
                              title="Cancelar edição"
                            >
                              ✖
                            </button>
                          </div>
                        ) : (
                          <p
                            className="timer-text"
                            title={formatDuration(issue.displaySeconds)}
                          >
                            {formatDuration(issue.displaySeconds)}
                          </p>
                        )}
                      </div>

                      <div className="issue-actions">
                        <button
                          onClick={() => handleStartEditTime(issue)}
                          className="btn"
                          title="Editar tempo"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => handleDelete(issue.id)}
                          className="btn btn-delete"
                          title="Excluir"
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
        </section>
      </div>
    </div>
  );
}