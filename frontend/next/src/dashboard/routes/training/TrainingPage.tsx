import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import {
  createAdditionalKnowledge,
  createFAQ,
  deleteAdditionalKnowledge,
  deleteFAQ,
  fetchAdditionalKnowledge,
  fetchFAQs,
  updateAdditionalKnowledge,
  updateFAQ,
  type AdditionalKnowledgeCreate,
  type AdditionalKnowledgeResponse,
  type FAQCreate,
  type FAQResponse,
} from "../../api/knowledge";
import { useAuth } from "../../auth/AuthContext";

type Tab = "faqs" | "knowledge";

export function TrainingPage() {
  const [tab, setTab] = useState<Tab>("faqs");

  return (
    <div>
      <h2 className="page-title">Training Center</h2>
      <div className="tabs">
        <button
          type="button"
          className={`tab${tab === "faqs" ? " tab-active" : ""}`}
          onClick={() => setTab("faqs")}
        >
          FAQs
        </button>
        <button
          type="button"
          className={`tab${tab === "knowledge" ? " tab-active" : ""}`}
          onClick={() => setTab("knowledge")}
        >
          Additional Knowledge
        </button>
      </div>
      {tab === "faqs" ? <FAQsTab /> : <AdditionalKnowledgeTab />}
    </div>
  );
}

function FAQsTab() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["faqs", token];

  const faqsQuery = useQuery({
    queryKey,
    queryFn: () => fetchFAQs(token as string),
    enabled: token !== null,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: FAQCreate) => createFAQ(token as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FAQCreate }) =>
      updateFAQ(token as string, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFAQ(token as string, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <div>
      <div className="list-item-header">
        <h3>Frequently asked questions</h3>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreating((value) => !value)}
        >
          {isCreating ? "Cancel" : "Add FAQ"}
        </button>
      </div>

      {isCreating && (
        <div className="card list-item">
          <FAQForm
            submitLabel="Create FAQ"
            onSubmit={(payload) => createMutation.mutate(payload)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error}
          />
        </div>
      )}

      {faqsQuery.data?.length === 0 && !isCreating && (
        <p className="empty-state">No FAQs yet. Add the questions customers ask most.</p>
      )}

      <div className="list">
        {faqsQuery.data?.map((faq) => (
          <div key={faq.id} className="card list-item">
            {editingId === faq.id ? (
              <FAQForm
                initial={faq}
                submitLabel="Save changes"
                onSubmit={(payload) => updateMutation.mutate({ id: faq.id, payload })}
                isSubmitting={updateMutation.isPending}
                error={updateMutation.error}
              />
            ) : (
              <>
                <div className="list-item-header">
                  <h3>{faq.question}</h3>
                  <span className={`badge${faq.is_active ? "" : " badge-inactive"}`}>
                    {faq.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p>{faq.answer}</p>
              </>
            )}
            <div className="list-item-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingId(editingId === faq.id ? null : faq.id)}
              >
                {editingId === faq.id ? "Close" : "Edit"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => deleteMutation.mutate(faq.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FAQFormProps {
  initial?: FAQResponse;
  submitLabel: string;
  onSubmit: (payload: FAQCreate) => void;
  isSubmitting: boolean;
  error: unknown;
}

function FAQForm({ initial, submitLabel, onSubmit, isSubmitting, error }: FAQFormProps) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ question, answer });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="faq-question">Question</label>
        <input
          id="faq-question"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="faq-answer">Answer</label>
        <textarea id="faq-answer" required value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </div>
      {error instanceof ApiError && <div className="form-error">{error.message}</div>}
      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function AdditionalKnowledgeTab() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["additional-knowledge", token];

  const entriesQuery = useQuery({
    queryKey,
    queryFn: () => fetchAdditionalKnowledge(token as string),
    enabled: token !== null,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: AdditionalKnowledgeCreate) =>
      createAdditionalKnowledge(token as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdditionalKnowledgeCreate }) =>
      updateAdditionalKnowledge(token as string, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdditionalKnowledge(token as string, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <div>
      <div className="list-item-header">
        <h3>Additional knowledge</h3>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreating((value) => !value)}
        >
          {isCreating ? "Cancel" : "Add entry"}
        </button>
      </div>

      {isCreating && (
        <div className="card list-item">
          <AdditionalKnowledgeForm
            submitLabel="Create entry"
            onSubmit={(payload) => createMutation.mutate(payload)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error}
          />
        </div>
      )}

      {entriesQuery.data?.length === 0 && !isCreating && (
        <p className="empty-state">No additional knowledge yet. Add anything else the AI should know.</p>
      )}

      <div className="list">
        {entriesQuery.data?.map((entry) => (
          <div key={entry.id} className="card list-item">
            {editingId === entry.id ? (
              <AdditionalKnowledgeForm
                initial={entry}
                submitLabel="Save changes"
                onSubmit={(payload) => updateMutation.mutate({ id: entry.id, payload })}
                isSubmitting={updateMutation.isPending}
                error={updateMutation.error}
              />
            ) : (
              <>
                <div className="list-item-header">
                  <h3>{entry.title ?? "Untitled"}</h3>
                  <span className={`badge${entry.is_active ? "" : " badge-inactive"}`}>
                    {entry.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p>{entry.content}</p>
              </>
            )}
            <div className="list-item-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
              >
                {editingId === entry.id ? "Close" : "Edit"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => deleteMutation.mutate(entry.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AdditionalKnowledgeFormProps {
  initial?: AdditionalKnowledgeResponse;
  submitLabel: string;
  onSubmit: (payload: AdditionalKnowledgeCreate) => void;
  isSubmitting: boolean;
  error: unknown;
}

function AdditionalKnowledgeForm({
  initial,
  submitLabel,
  onSubmit,
  isSubmitting,
  error,
}: AdditionalKnowledgeFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ title: title || null, content });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="knowledge-title">Title (optional)</label>
        <input id="knowledge-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor="knowledge-content">Content</label>
        <textarea
          id="knowledge-content"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      {error instanceof ApiError && <div className="form-error">{error.message}</div>}
      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
