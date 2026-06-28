import { api } from "./client";

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  business_id: string;
}

export interface BusinessResponse {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface MeResponse {
  user: UserResponse;
  business: BusinessResponse;
}

export function fetchMe(token: string) {
  return api.get<MeResponse>("/api/dashboard/auth/me", token);
}

export function setupBusiness(token: string, businessName: string) {
  return api.post<MeResponse>(
    "/api/dashboard/auth/setup-business",
    { business_name: businessName },
    token,
  );
}
