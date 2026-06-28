import { useState, type ComponentType, type SVGProps } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchAnalyticsStats,
  type AnalyticsStats,
  type DayPoint,
  type HourPoint,
  type LocationScan,
} from "../../api/analytics";
import { useAuth } from "../../auth/AuthContext";
import {
  ConversationsIcon,
  ConversionIcon,
  ScanIcon,
  VisitorsIcon,
} from "../../components/icons";

const RANGE_OPTIONS = [7, 14, 30];
const DONUT_PALETTE = [
  "var(--color-primary)",
  "var(--color-accent)",
  "#c2a878",
  "var(--color-danger)",
  "#5b7065",
  "#a9b79e",
];

export function AnalyticsPage() {
  const { token } = useAuth();
  const [days, setDays] = useState(30);

  const statsQuery = useQuery({
    queryKey: ["analytics", token, days],
    queryFn: () => fetchAnalyticsStats(token as string, days),
    enabled: token !== null,
  });

  return (
    <div>
      <h2 className="page-title">Analytics</h2>
      <p className="page-placeholder-note">Scans, visitors, and questions for your AI Host.</p>

      <div className="tabs">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`tab${days === option ? " tab-active" : ""}`}
            onClick={() => setDays(option)}
          >
            Last {option} days
          </button>
        ))}
      </div>

      {statsQuery.isLoading && <p className="page-placeholder-note">Loading…</p>}
      {statsQuery.data && <AnalyticsContent stats={statsQuery.data} />}
    </div>
  );
}

function AnalyticsContent({ stats }: { stats: AnalyticsStats }) {
  return (
    <>
      <div className="stat-grid">
        <StatCard
          label="Total Scans"
          value={stats.total_scans.toLocaleString()}
          deltaPct={stats.scans_delta_pct}
          icon={ScanIcon}
        />
        <StatCard
          label="Conversations Started"
          value={stats.conversations_started.toLocaleString()}
          deltaPct={stats.conversations_delta_pct}
          icon={ConversationsIcon}
        />
        <StatCard
          label="Unique Visitors"
          value={stats.unique_visitors.toLocaleString()}
          deltaPct={stats.visitors_delta_pct}
          icon={VisitorsIcon}
        />
        <StatCard
          label="Conversion Rate"
          value={stats.conversion_rate === null ? "—" : `${stats.conversion_rate}%`}
          subtext={
            stats.unique_visitors === 0 ? "No visitors yet" : "scans that started a chat"
          }
          icon={ConversionIcon}
        />
      </div>

      <div className="panel-grid">
        <section className="card panel panel-wide">
          <div className="panel-header">
            <h3>Scan Trends</h3>
            <span className="page-placeholder-note">Last {stats.range_days} days</span>
          </div>
          <LineChart points={stats.scans_over_time} />
        </section>

        <section className="card panel">
          <div className="panel-header">
            <h3>Hourly Traffic</h3>
          </div>
          <BarChart points={stats.hourly_traffic} />
        </section>

        <section className="card panel">
          <div className="panel-header">
            <h3>Scans by Location</h3>
          </div>
          <DonutChart points={stats.scans_by_location} />
        </section>

        <section className="card panel">
          <div className="panel-header">
            <h3>Most Asked Questions</h3>
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
            <h3>Unanswered Questions</h3>
          </div>
          {stats.unanswered_list.length === 0 ? (
            <p className="empty-state">Nothing unanswered — nice work.</p>
          ) : (
            <ol className="ranked-list">
              {stats.unanswered_list.map((q, i) => (
                <li key={q.question}>
                  <span className="ranked-index">{i + 1}</span>
                  <span className="ranked-label">{q.question}</span>
                  <span className="ranked-count">{q.count}</span>
                </li>
              ))}
            </ol>
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
          {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}% vs previous period
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

  if (total === 0) {
    return <p className="empty-state">No scans in the selected range yet.</p>;
  }

  const x = (i: number) =>
    padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - (v / max) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.count)}`).join(" ");
  const areaPath =
    `M ${x(0)} ${padding.top + innerH} ` +
    points.map((p, i) => `L ${x(i)} ${y(p.count)}`).join(" ") +
    ` L ${x(points.length - 1)} ${padding.top + innerH} Z`;

  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const showDots = points.length <= 14;

  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Scans over time">
      <path d={areaPath} className="line-chart-area" />
      <path d={linePath} className="line-chart-line" />
      {points.map((p, i) => (
        <g key={p.date}>
          {showDots && <circle cx={x(i)} cy={y(p.count)} r={3.5} className="line-chart-dot" />}
          {i % labelEvery === 0 && (
            <text x={x(i)} y={height - 8} className="line-chart-label" textAnchor="middle">
              {formatDayLabel(p.date)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function BarChart({ points }: { points: HourPoint[] }) {
  const width = 320;
  const height = 160;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const counts = points.map((p) => p.count);
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return <p className="empty-state">No traffic in the selected range yet.</p>;
  }

  const barGap = 2;
  const barWidth = innerW / points.length - barGap;

  return (
    <svg className="bar-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Hourly traffic">
      {points.map((p, i) => {
        const barHeight = (p.count / max) * innerH;
        const xPos = padding.left + i * (barWidth + barGap);
        return (
          <g key={p.hour}>
            <rect
              x={xPos}
              y={padding.top + innerH - barHeight}
              width={Math.max(barWidth, 1)}
              height={Math.max(barHeight, 0)}
              className="bar-chart-bar"
            />
            {p.hour % 3 === 0 && (
              <text
                x={xPos + barWidth / 2}
                y={height - 8}
                className="bar-chart-label"
                textAnchor="middle"
              >
                {formatHourLabel(p.hour)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ points }: { points: LocationScan[] }) {
  const total = points.reduce((a, p) => a + p.count, 0);

  if (total === 0) {
    return <p className="empty-state">No scans by location yet.</p>;
  }

  const size = 140;
  const radius = 52;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  type Segment = LocationScan & {
    color: string;
    dasharray: string;
    dashoffset: number;
    pct: number;
    cumulative: number;
  };

  const segments = points.reduce<Segment[]>((acc, p, i) => {
    const before = acc.length === 0 ? 0 : acc[acc.length - 1].cumulative;
    const fraction = p.count / total;
    const dash = fraction * circumference;
    acc.push({
      ...p,
      color: DONUT_PALETTE[i % DONUT_PALETTE.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -before,
      cumulative: before + dash,
      pct: Math.round(fraction * 100),
    });
    return acc;
  }, []);

  return (
    <div className="donut-chart-wrap">
      <svg
        className="donut-chart"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Scans by location"
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          {segments.map((s) => (
            <circle
              key={s.location_name}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </g>
      </svg>
      <ul className="donut-legend">
        {segments.map((s) => (
          <li key={s.location_name}>
            <span className="donut-legend-swatch" style={{ background: s.color }} />
            <span className="ranked-label">{s.location_name}</span>
            <span className="ranked-count">
              {s.count} ({s.pct}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${period}`;
}
