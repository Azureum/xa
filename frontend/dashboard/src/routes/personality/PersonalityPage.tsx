import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import {
  fetchPersonality,
  upsertPersonality,
  type AIPersonalityResponse,
  type AIPersonalityUpdate,
} from "../../api/personality";
import { useAuth } from "../../auth/AuthContext";

export function PersonalityPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["personality", token];

  const personalityQuery = useQuery({
    queryKey,
    queryFn: () => fetchPersonality(token as string),
    enabled: token !== null,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: AIPersonalityUpdate) => upsertPersonality(token as string, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  return (
    <div>
      <h2 className="page-title">AI Personality</h2>
      <p className="page-placeholder-note">
        Define how your AI host introduces itself and talks to customers.
      </p>

      {personalityQuery.isLoading ? (
        <p className="page-placeholder-note">Loading…</p>
      ) : (
        <div className="card list-item">
          <PersonalityForm
            initial={personalityQuery.data ?? null}
            onSave={(payload) => saveMutation.mutate(payload)}
            isSaving={saveMutation.isPending}
            justSaved={saveMutation.isSuccess && !saveMutation.isPending}
            error={saveMutation.error}
          />
        </div>
      )}
    </div>
  );
}

interface PersonalityFormProps {
  initial: AIPersonalityResponse | null;
  onSave: (payload: AIPersonalityUpdate) => void;
  isSaving: boolean;
  justSaved: boolean;
  error: unknown;
}

function PersonalityForm({ initial, onSave, isSaving, justSaved, error }: PersonalityFormProps) {
  const [hostName, setHostName] = useState(initial?.host_name ?? "");
  const [brandVoice, setBrandVoice] = useState(initial?.brand_voice ?? "");
  const [focusAreas, setFocusAreas] = useState(initial?.focus_areas ?? "");
  const [avoidTopics, setAvoidTopics] = useState(initial?.avoid_topics ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      host_name: hostName || null,
      brand_voice: brandVoice || null,
      focus_areas: focusAreas || null,
      avoid_topics: avoidTopics || null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="host-name">Host name</label>
        <input
          id="host-name"
          placeholder="e.g. Sage"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="brand-voice">Brand voice</label>
        <textarea
          id="brand-voice"
          placeholder="e.g. Warm, witty, and a little proud of our wine list"
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="focus-areas">Focus areas</label>
        <textarea
          id="focus-areas"
          placeholder="What should the AI especially highlight?"
          value={focusAreas}
          onChange={(e) => setFocusAreas(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="avoid-topics">Topics to avoid</label>
        <textarea
          id="avoid-topics"
          placeholder="What should the AI steer away from?"
          value={avoidTopics}
          onChange={(e) => setAvoidTopics(e.target.value)}
        />
      </div>
      {error instanceof ApiError && <div className="form-error">{error.message}</div>}
      <button type="submit" className="btn btn-primary" disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </button>
      {justSaved && (
        <span className="badge" style={{ marginLeft: 12 }}>
          Saved
        </span>
      )}
    </form>
  );
}
