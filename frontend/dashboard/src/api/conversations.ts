import { api } from "./client";

export interface ConversationListItem {
  id: string;
  location_name: string;
  started_at: string;
  last_message_at: string | null;
  is_ended: boolean;
  message_count: number;
  unanswered_count: number;
  first_question: string | null;
  last_message_preview: string | null;
}

export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  is_unanswered: boolean;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  location_name: string;
  session_token: string;
  started_at: string;
  last_message_at: string | null;
  is_ended: boolean;
  messages: ConversationMessage[];
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  total: number;
}

export interface ConversationListParams {
  unansweredOnly?: boolean;
  limit?: number;
  offset?: number;
}

export function fetchConversations(token: string, params: ConversationListParams = {}) {
  const search = new URLSearchParams();
  if (params.unansweredOnly) search.set("unanswered_only", "true");
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));
  const qs = search.toString();
  return api.get<ConversationListResponse>(
    `/api/dashboard/conversations${qs ? `?${qs}` : ""}`,
    token,
  );
}

export function fetchConversation(token: string, conversationId: string) {
  return api.get<ConversationDetail>(`/api/dashboard/conversations/${conversationId}`, token);
}

export function flagMessage(
  token: string,
  conversationId: string,
  messageId: string,
  isUnanswered: boolean,
) {
  return api.patch<ConversationMessage>(
    `/api/dashboard/conversations/${conversationId}/messages/${messageId}/flag`,
    { is_unanswered: isUnanswered },
    token,
  );
}
