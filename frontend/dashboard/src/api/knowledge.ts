import { api } from "./client";

export interface FAQResponse {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

export interface FAQCreate {
  question: string;
  answer: string;
  display_order?: number;
  is_active?: boolean;
}

export interface FAQUpdate {
  question?: string;
  answer?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface AdditionalKnowledgeResponse {
  id: string;
  business_id: string;
  title: string | null;
  content: string;
  display_order: number;
  is_active: boolean;
}

export interface AdditionalKnowledgeCreate {
  title?: string | null;
  content: string;
  display_order?: number;
  is_active?: boolean;
}

export interface AdditionalKnowledgeUpdate {
  title?: string | null;
  content?: string;
  display_order?: number;
  is_active?: boolean;
}

export function fetchFAQs(token: string) {
  return api.get<FAQResponse[]>("/api/dashboard/training/faqs", token);
}

export function createFAQ(token: string, payload: FAQCreate) {
  return api.post<FAQResponse>("/api/dashboard/training/faqs", payload, token);
}

export function updateFAQ(token: string, faqId: string, payload: FAQUpdate) {
  return api.patch<FAQResponse>(`/api/dashboard/training/faqs/${faqId}`, payload, token);
}

export function deleteFAQ(token: string, faqId: string) {
  return api.delete<void>(`/api/dashboard/training/faqs/${faqId}`, token);
}

export function fetchAdditionalKnowledge(token: string) {
  return api.get<AdditionalKnowledgeResponse[]>("/api/dashboard/training/additional-knowledge", token);
}

export function createAdditionalKnowledge(token: string, payload: AdditionalKnowledgeCreate) {
  return api.post<AdditionalKnowledgeResponse>(
    "/api/dashboard/training/additional-knowledge",
    payload,
    token,
  );
}

export function updateAdditionalKnowledge(
  token: string,
  entryId: string,
  payload: AdditionalKnowledgeUpdate,
) {
  return api.patch<AdditionalKnowledgeResponse>(
    `/api/dashboard/training/additional-knowledge/${entryId}`,
    payload,
    token,
  );
}

export function deleteAdditionalKnowledge(token: string, entryId: string) {
  return api.delete<void>(`/api/dashboard/training/additional-knowledge/${entryId}`, token);
}
