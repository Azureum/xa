import { api } from "./client";

export interface LandingResponse {
  business_name: string;
  location_name: string;
  host_name: string | null;
  landing_title: string | null;
  welcome_message: string | null;
  suggested_questions: string[];
  primary_color: string | null;
  secondary_color: string | null;
}

export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface SendMessageResponse {
  conversation_id: string;
  reply: ChatMessageResponse;
}

export interface ConversationHistoryResponse {
  conversation_id: string | null;
  messages: ChatMessageResponse[];
}

export function fetchLanding(businessSlug: string, locationSlug: string, sessionToken?: string) {
  return api.get<LandingResponse>(
    `/api/public/${businessSlug}/${locationSlug}/landing`,
    sessionToken,
  );
}

export function sendMessage(
  businessSlug: string,
  locationSlug: string,
  sessionToken: string,
  message: string,
) {
  return api.post<SendMessageResponse>(
    `/api/public/${businessSlug}/${locationSlug}/messages`,
    { message },
    sessionToken,
  );
}

export function fetchConversation(
  businessSlug: string,
  locationSlug: string,
  sessionToken: string,
) {
  return api.get<ConversationHistoryResponse>(
    `/api/public/${businessSlug}/${locationSlug}/conversation`,
    sessionToken,
  );
}
