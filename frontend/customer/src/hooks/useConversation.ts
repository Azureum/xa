import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type ChatMessageResponse,
  type ConversationHistoryResponse,
  fetchConversation,
  sendMessage,
} from "../api/public";

export function useConversation(businessSlug: string, locationSlug: string, sessionToken: string) {
  const queryClient = useQueryClient();
  const queryKey = ["conversation", businessSlug, locationSlug, sessionToken];

  const historyQuery = useQuery({
    queryKey,
    queryFn: () => fetchConversation(businessSlug, locationSlug, sessionToken),
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => sendMessage(businessSlug, locationSlug, sessionToken, message),
    onMutate: async (message: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ConversationHistoryResponse>(queryKey);

      const optimisticMessage: ChatMessageResponse = {
        id: `pending-${Date.now()}`,
        role: "customer",
        content: message,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ConversationHistoryResponse>(queryKey, (current) => ({
        conversation_id: current?.conversation_id ?? null,
        messages: [...(current?.messages ?? []), optimisticMessage],
      }));

      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ConversationHistoryResponse>(queryKey, (current) => ({
        conversation_id: data.conversation_id,
        messages: [...(current?.messages ?? []), data.reply],
      }));
    },
    onError: (_error, _message, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
  });

  return {
    messages: historyQuery.data?.messages ?? [],
    isLoading: historyQuery.isLoading,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
  };
}
