import { api } from "./client";

export interface DayPoint {
  date: string;
  count: number;
}

export interface HourPoint {
  hour: number;
  count: number;
}

export interface LocationScan {
  location_name: string;
  count: number;
}

export interface QuestionCount {
  question: string;
  count: number;
}

export interface AnalyticsStats {
  range_days: number;

  total_scans: number;
  scans_delta_pct: number | null;
  conversations_started: number;
  conversations_delta_pct: number | null;
  unique_visitors: number;
  visitors_delta_pct: number | null;
  conversion_rate: number | null;
  unanswered_questions: number;
  answer_rate: number | null;

  scans_over_time: DayPoint[];
  hourly_traffic: HourPoint[];
  scans_by_location: LocationScan[];
  top_questions: QuestionCount[];
  unanswered_list: QuestionCount[];
}

export function fetchAnalyticsStats(token: string, days: number) {
  return api.get<AnalyticsStats>(`/api/dashboard/analytics/stats?days=${days}`, token);
}
