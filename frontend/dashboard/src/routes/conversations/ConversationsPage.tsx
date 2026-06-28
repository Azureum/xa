import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchConversation,
  fetchConversations,
  flagMessage,
  type ConversationDetail,
  type ConversationListItem,
  type ConversationMessage,
} from "../../api/conversations";
import { useAuth } from "../../auth/AuthContext";

const PAGE_SIZE = 20;

export function ConversationsPage() {
  const { token } = useAuth();
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["conversations", token, unansweredOnly, offset],
    queryFn: () =>
      fetchConversations(token as string, { unansweredOnly, limit: PAGE_SIZE, offset }),
    enabled: token !== null,
  });

  const setFilter = (value: boolean) => {
    setUnansweredOnly(value);
    setOffset(0);
    setSelectedId(null);
  };

  const total = listQuery.data?.total ?? 0;
  const items = listQuery.data?.items ?? [];

  return (
    <div>
      <h2 className="page-title">Conversations</h2>
      <p className="page-placeholder-note">
        Review what guests asked your AI Host, and flag any questions it didn&apos;t answer well.
      </p>

      <div className="tabs">
        <button
          type="button"
          className={`tab${unansweredOnly ? "" : " tab-active"}`}
          onClick={() => setFilter(false)}
        >
          All
        </button>
        <button
          type="button"
          className={`tab${unansweredOnly ? " tab-active" : ""}`}
          onClick={() => setFilter(true)}
        >
          Has unanswered
        </button>
      </div>

      <div className="conversations-layout">
        <div>
          {listQuery.isLoading && <p className="page-placeholder-note">Loading…</p>}

          {!listQuery.isLoading && items.length === 0 && (
            <p className="empty-state">
              {unansweredOnly
                ? "No flagged conversations — nice work."
                : "No conversations yet. They'll show up here once guests start chatting."}
            </p>
          )}

          <div className="list">
            {items.map((item) => (
              <ConversationCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="pager">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={offset === 0}
                onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
              >
                Previous
              </button>
              <span className="page-placeholder-note">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((value) => value + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div>
          {selectedId === null ? (
            <div className="card panel">
              <p className="empty-state">Select a conversation to read the full thread.</p>
            </div>
          ) : (
            <ConversationThread conversationId={selectedId} />
          )}
        </div>
      </div>
    </div>
  );
}

interface ConversationCardProps {
  item: ConversationListItem;
  isSelected: boolean;
  onSelect: () => void;
}

function ConversationCard({ item, isSelected, onSelect }: ConversationCardProps) {
  return (
    <button
      type="button"
      className={`card list-item convo-card${isSelected ? " convo-card-active" : ""}`}
      onClick={onSelect}
    >
      <div className="list-item-header">
        <h3 className="convo-question">
          {item.first_question ?? <span className="page-placeholder-note">No customer message yet</span>}
        </h3>
        <span className="badge">{item.location_name}</span>
      </div>
      {item.last_message_preview && <p className="convo-preview">{item.last_message_preview}</p>}
      <div className="convo-meta">
        <span className="page-placeholder-note">{formatRelative(item.last_message_at)}</span>
        <span className="page-placeholder-note">
          {item.message_count} message{item.message_count === 1 ? "" : "s"}
        </span>
        {item.unanswered_count > 0 && (
          <span className="badge badge-danger">{item.unanswered_count} unanswered</span>
        )}
      </div>
    </button>
  );
}

function ConversationThread({ conversationId }: { conversationId: string }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["conversation", token, conversationId],
    queryFn: () => fetchConversation(token as string, conversationId),
    enabled: token !== null,
  });

  const flagMutation = useMutation({
    mutationFn: ({ messageId, isUnanswered }: { messageId: string; isUnanswered: boolean }) =>
      flagMessage(token as string, conversationId, messageId, isUnanswered),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", token, conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="card panel">
        <p className="page-placeholder-note">Loading…</p>
      </div>
    );
  }

  const detail: ConversationDetail | undefined = detailQuery.data;
  if (!detail) {
    return (
      <div className="card panel">
        <p className="empty-state">Couldn&apos;t load this conversation.</p>
      </div>
    );
  }

  return (
    <div className="card panel">
      <div className="panel-header">
        <h3>{detail.location_name}</h3>
        <span className="page-placeholder-note">{formatRelative(detail.started_at)}</span>
      </div>
      <div className="thread">
        {detail.messages.map((message) => (
          <ThreadMessage
            key={message.id}
            message={message}
            onToggleFlag={() =>
              flagMutation.mutate({
                messageId: message.id,
                isUnanswered: !message.is_unanswered,
              })
            }
            isFlagging={flagMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface ThreadMessageProps {
  message: ConversationMessage;
  onToggleFlag: () => void;
  isFlagging: boolean;
}

function ThreadMessage({ message, onToggleFlag, isFlagging }: ThreadMessageProps) {
  const isCustomer = message.role === "customer";
  return (
    <div className={`msg-row ${isCustomer ? "msg-row-customer" : "msg-row-assistant"}`}>
      <div
        className={`msg-bubble ${isCustomer ? "msg-customer" : "msg-assistant"}${
          message.is_unanswered ? " msg-flagged" : ""
        }`}
      >
        {message.content}
      </div>
      {isCustomer && (
        <button
          type="button"
          className="msg-flag-btn"
          onClick={onToggleFlag}
          disabled={isFlagging}
        >
          {message.is_unanswered ? "Flagged ✓ — unflag" : "Flag unanswered"}
        </button>
      )}
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
