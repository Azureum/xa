import { api } from "./client";

export interface DayPoint {
  date: string;
  count: number;
}

export interface TopQuestion {
  question: string;
  count: number;
}

export interface LocationStat {
  location_name: string;
  conversation_count: number;
}

export interface RecentConversation {
  question: string | null;
  location_name: string;
  started_at: string;
  status: "resolved" | "open";
}

export interface OverviewStats {
  total_conversations: number;
  conversations_delta_pct: number | null;
  qr_scans: number;
  qr_scans_delta_pct: number | null;
  active_locations: number;
  total_locations: number;
  answer_rate: number | null;
  answered_count: number;
  question_count: number;
  conversations_over_time: DayPoint[];
  top_questions: TopQuestion[];
  location_performance: LocationStat[];
  recent_conversations: RecentConversation[];
}

export function fetchOverviewStats(token: string) {
  return api.get<OverviewStats>("/api/dashboard/overview/stats", token);
}
