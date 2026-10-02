import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const queryKeys = {
  health: ["health"] as const,
  documents: ["documents"] as const,
  context: ["context"] as const,
  sessions: ["sessions"] as const,
  messages: (id: string) => ["sessions", id, "messages"] as const,
};

function useIsClient() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

export function useHealth() {
  const ready = useIsClient();
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    enabled: ready,
    refetchInterval: 15000,
    retry: 1,
  });
}

export function useDocuments() {
  const ready = useIsClient();
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: async () => {
      const data = await api.listDocuments();
      return data.documents ?? [];
    },
    enabled: ready,
    refetchInterval: 4000,
  });
}

export function useContextBundle() {
  const ready = useIsClient();
  return useQuery({
    queryKey: queryKeys.context,
    queryFn: api.getContext,
    enabled: ready,
    refetchInterval: 8000,
  });
}

export function useSessions() {
  const ready = useIsClient();
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => {
      const data = await api.listSessions();
      return data.sessions ?? [];
    },
    enabled: ready,
  });
}

export function useSessionMessages(sessionId: string | null) {
  const ready = useIsClient();
  return useQuery({
    queryKey: sessionId ? queryKeys.messages(sessionId) : ["sessions", "none"],
    queryFn: async () => {
      if (!sessionId) return [];
      const data = await api.getSessionMessages(sessionId);
      return data.messages ?? [];
    },
    enabled: ready && Boolean(sessionId),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      queryClient.invalidateQueries({ queryKey: queryKeys.context });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
      queryClient.invalidateQueries({ queryKey: queryKeys.context });
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.createSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.chat,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages(data.session_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.context });
    },
  });
}
