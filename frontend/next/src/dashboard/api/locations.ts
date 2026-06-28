import { api } from "./client";

export interface LocationResponse {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description: string | null;
  purpose: string | null;
  goals: string | null;
  extra_knowledge: string | null;
  is_active: boolean;
}

export interface LocationCreate {
  name: string;
  description?: string | null;
  purpose?: string | null;
  goals?: string | null;
  extra_knowledge?: string | null;
}

export interface LocationUpdate {
  name?: string;
  description?: string | null;
  purpose?: string | null;
  goals?: string | null;
  extra_knowledge?: string | null;
  is_active?: boolean;
}

export function fetchLocations(token: string) {
  return api.get<LocationResponse[]>("/api/dashboard/locations", token);
}

export function createLocation(token: string, payload: LocationCreate) {
  return api.post<LocationResponse>("/api/dashboard/locations", payload, token);
}

export function updateLocation(token: string, locationId: string, payload: LocationUpdate) {
  return api.patch<LocationResponse>(`/api/dashboard/locations/${locationId}`, payload, token);
}
