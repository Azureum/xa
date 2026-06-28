import { api } from "./client";

export interface AIPersonalityResponse {
  id: string;
  business_id: string;
  host_name: string | null;
  brand_voice: string | null;
  focus_areas: string | null;
  avoid_topics: string | null;
}

export interface AIPersonalityUpdate {
  host_name?: string | null;
  brand_voice?: string | null;
  focus_areas?: string | null;
  avoid_topics?: string | null;
}

export function fetchPersonality(token: string) {
  return api.get<AIPersonalityResponse | null>("/api/dashboard/personality", token);
}

export function upsertPersonality(token: string, payload: AIPersonalityUpdate) {
  return api.put<AIPersonalityResponse>("/api/dashboard/personality", payload, token);
}
