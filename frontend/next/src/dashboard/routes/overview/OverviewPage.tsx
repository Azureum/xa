import type { ComponentType, SVGProps } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchOverviewStats,
  type DayPoint,
  type OverviewStats,
} from "../../api/overview";
import { useAuth } from "../../auth/AuthContext";
import { CheckIcon, ConversationsIcon, LocationsIcon, ScanIcon } from "../../components/icons";

export function OverviewPage() {
  const { token, business } = useAuth();

  const statsQuery = useQuery({
    queryKey: ["overview", token],
    queryFn: () => fetchOverviewStats(token as string),
    enabled: token !== null,
  });

  const greeting = getGreeting();

  return (
    <div>
      <h2 className="page-title">{greeting}</h2>
      <p className="page-placeholder-note">
        Here&apos;s what&apos;s happening with {business?.name ?? "your"} AI Host.
      </p>

      {statsQuery.isLoading && <p className="page-placeholder-note">Loading…</p>}
      {statsQuery.data && <OverviewContent stats={statsQuery.data} />}
    </div>
  );
}

function OverviewContent({ stats }: { stats: OverviewStats }) {
  return (
    <>
      <div className="stat-grid">
        <StatCard
          label="Total Conversations"
          value={stats.total_conversations.toLocaleString()}
          deltaPct={stats.conversations_delta_pct}
          icon={ConversationsIcon}
        />
        <StatCard
          label="QR Scans"
          value={stats.qr_scans.toLocaleString()}
          deltaPct={stats.qr_scans_delta_pct}
          icon={ScanIcon}
        />
        <StatCard
          label="Active Locations"
          value={stats.active_locations.toLocaleString()}
          subtext={`of ${stats.total_locations} total`}
          icon={LocationsIcon}
        />
        <StatCard
          label="Answer Rate"
          value={stats.answer_rate === null ? "—" : `${stats.answer_rate}%`}
          subtext={
            stats.question_count === 0
              ? "No questions yet"
              : `${stats.answered_count} of ${stats.question_count} answered`
          }
          icon={CheckIcon}
        />
      </div>

      <div className="panel-grid">
        <section className="card panel panel-wide">
          <div className="panel-header">
            <h3>Conversations Over Time</h3>
            <span className="page-placeholder-note">Last 7 days</span>
          </div>
          <LineChart points={stats.conversations_over_time} />
        </section>

        <section className="card panel">
          <div className="panel-header">
            <h3>Top Questions</h3>
          </div>
          {stats.top_questions.length === 0 ? (
            <p className="empty-state">No questions asked yet.</p>
          ) : (
            <ol className="ranked-list">
              {stats.top_questions.map((q, i) => (
                <li key={q.question}>
                  <span className="ranked-index">{i + 1}</span>
                  <span className="ranked-label">{q.question}</span>
                  <span className="ranked-count">{q.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card panel">
          <div className="panel-header">
            <h3>Location Performance</h3>
          </div>
          {stats.location_performance.length === 0 ? (
            <p className="empty-state">No conversations by location yet.</p>
          ) : (
            <div className="bar-list">
              {stats.location_performance.map((loc) => {
                const max = stats.location_performance[0].conversation_count || 1;
                return (
                  <div key={loc.location_name} className="bar-row">
                    <div className="bar-row-head">
                      <span>{loc.location_name}</span>
                      <span className="page-placeholder-note">{loc.conversation_count}</span>
                    </div>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{ width: `${(loc.conversation_count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card panel">
          <div className="panel-header">
            <h3>Recent Conversations</h3>
          </div>
          {stats.recent_conversations.length === 0 ? (
            <p className="empty-state">No conversations yet.</p>
          ) : (
            <div className="list">
              {stats.recent_conversations.map((c, i) => (
                <div key={i} className="recent-row">
                  <div>
                    <div className="recent-question">{c.question ?? "(no message)"}</div>
                    <div className="page-placeholder-note">
                      {c.location_name} · {formatRelativeTime(c.started_at)}
                    </div>
                  </div>
                  <span className={`badge${c.status === "open" ? " badge-inactive" : ""}`}>
                    {c.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  deltaPct?: number | null;
  subtext?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

function StatCard({ label, value, deltaPct, subtext, icon: Icon }: StatCardProps) {
  return (
    <div className="card stat-card">
      <div className="stat-card-top">
        <span className="stat-icon">
          <Icon />
        </span>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-value">{value}</div>
      {deltaPct !== undefined && deltaPct !== null ? (
        <div className={`stat-delta ${deltaPct >= 0 ? "up" : "down"}`}>
          {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}% vs yesterday
        </div>
      ) : (
        <div className="stat-delta muted">{subtext ?? ""}</div>
      )}
    </div>
  );
}

function LineChart({ points }: { points: DayPoint[] }) {
  const width = 640;
  const height = 200;
  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const counts = points.map((p) => p.count);
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  const x = (i: number) =>
    padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - (v / max) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.count)}`).join(" ");
  const areaPath =
    `M ${x(0)} ${padding.top + innerH} ` +
    points.map((p, i) => `L ${x(i)} ${y(p.count)}`).join(" ") +
    ` L ${x(points.length - 1)} ${padding.top + innerH} Z`;

  if (total === 0) {
    return <p className="empty-state">No conversations in the last 7 days yet.</p>;
  }

  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Conversations over time">
      <path d={areaPath} className="line-chart-area" />
      <path d={linePath} className="line-chart-line" />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.count)} r={3.5} className="line-chart-dot" />
          <text x={x(i)} y={height - 8} className="line-chart-label" textAnchor="middle">
            {formatDayLabel(p.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning 👋";
  if (hour < 18) return "Good afternoon 👋";
  return "Good evening 👋";
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
