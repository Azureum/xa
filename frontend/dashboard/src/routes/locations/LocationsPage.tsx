import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import {
  createLocation,
  fetchLocations,
  updateLocation,
  type LocationCreate,
  type LocationResponse,
  type LocationUpdate,
} from "../../api/locations";
import { useAuth } from "../../auth/AuthContext";

export function LocationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["locations", token];

  const locationsQuery = useQuery({
    queryKey,
    queryFn: () => fetchLocations(token as string),
    enabled: token !== null,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: LocationCreate) => createLocation(token as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LocationUpdate }) =>
      updateLocation(token as string, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
    },
  });

  return (
    <div>
      <div className="list-item-header">
        <h2 className="page-title">Locations</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreating((value) => !value)}
        >
          {isCreating ? "Cancel" : "New location"}
        </button>
      </div>

      {isCreating && (
        <div className="card list-item">
          <LocationForm
            submitLabel="Create location"
            onSubmit={(payload) => createMutation.mutate(payload)}
            isSubmitting={createMutation.isPending}
            error={createMutation.error}
          />
        </div>
      )}

      {locationsQuery.isLoading && <p className="page-placeholder-note">Loading locations…</p>}

      {locationsQuery.data?.length === 0 && !isCreating && (
        <p className="empty-state">No locations yet. Add your first one to get started.</p>
      )}

      <div className="list">
        {locationsQuery.data?.map((location) => (
          <div key={location.id} className="card list-item">
            <div className="list-item-header">
              <h3>
                {location.name} <span className="page-placeholder-note">/{location.slug}</span>
              </h3>
              <span className={`badge${location.is_active ? "" : " badge-inactive"}`}>
                {location.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            {editingId === location.id ? (
              <LocationForm
                initial={location}
                submitLabel="Save changes"
                onSubmit={(payload) => updateMutation.mutate({ id: location.id, payload })}
                isSubmitting={updateMutation.isPending}
                error={updateMutation.error}
              />
            ) : (
              location.description && <p>{location.description}</p>
            )}

            <div className="list-item-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingId(editingId === location.id ? null : location.id)}
              >
                {editingId === location.id ? "Close" : "Edit"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  updateMutation.mutate({
                    id: location.id,
                    payload: { is_active: !location.is_active },
                  })
                }
              >
                {location.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LocationFormProps {
  initial?: LocationResponse;
  submitLabel: string;
  onSubmit: (payload: LocationCreate) => void;
  isSubmitting: boolean;
  error: unknown;
}

function LocationForm({ initial, submitLabel, onSubmit, isSubmitting, error }: LocationFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [goals, setGoals] = useState(initial?.goals ?? "");
  const [extraKnowledge, setExtraKnowledge] = useState(initial?.extra_knowledge ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      name,
      description: description || null,
      purpose: purpose || null,
      goals: goals || null,
      extra_knowledge: extraKnowledge || null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="location-name">Name</label>
        <input id="location-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor="location-description">Description</label>
        <textarea
          id="location-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="location-purpose">Purpose</label>
        <textarea
          id="location-purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="location-goals">Goals</label>
        <textarea id="location-goals" value={goals} onChange={(e) => setGoals(e.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor="location-extra-knowledge">Extra knowledge</label>
        <textarea
          id="location-extra-knowledge"
          value={extraKnowledge}
          onChange={(e) => setExtraKnowledge(e.target.value)}
        />
      </div>
      {error instanceof ApiError && <div className="form-error">{error.message}</div>}
      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
