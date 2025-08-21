'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface MessageReactionUser {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: MessageReactionUser[];
  hasReacted?: boolean; // for current user
}

export interface ChatMessage {
  id: string;
  content: string;
  user: { name: string; id?: string; avatar_url?: string | null };
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  reactions?: MessageReaction[];
  /** best emoji to suggest for “React with …” button */
  suggestedEmoji?: string;
  replyTo?: { id: string; content: string; user: { name: string } };
}

interface UseRealtimeChatProps {
  roomName: string;
  username: string;
  userId?: string;
  eventId?: number;
  onMessage?: (messages: ChatMessage[]) => void;
}

/* ---------- helpers for names/avatars ---------- */
type ProfileLite = { name: string; avatar_url?: string | null };
function makeName(f?: string | null, l?: string | null) {
  const full = `${f ?? ''} ${l ?? ''}`.trim();
  return full || 'Unknown User';
}

export function useRealtimeChat({
  roomName,
  username,
  userId,
  eventId,
  onMessage,
}: UseRealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventChatId, setEventChatId] = useState<number | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Cache: user_id -> { name, avatar_url }
  const profileCacheRef = useRef<Map<string, ProfileLite>>(new Map());

  const getDisplayProfile = useCallback(async (uid: string): Promise<ProfileLite> => {
    const hit = profileCacheRef.current.get(uid);
    if (hit) return hit;

    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', uid)
      .maybeSingle();

    const prof: ProfileLite = {
      name: makeName(data?.first_name, data?.last_name),
      avatar_url: data?.avatar_url ?? null,
    };
    profileCacheRef.current.set(uid, prof);
    return prof;
  }, []);

  /* ---------- reactions normalization + suggested emoji ---------- */
  const normalizeReactions = useCallback(
    (rx: MessageReaction[] | undefined): { list: MessageReaction[]; suggested?: string } => {
      const list = (rx ?? []).map(r => {
        const hasReacted = !!userId && r.users.some(u => u.user_id === userId);
        return { ...r, hasReacted };
      });

      // suggested = emoji with max count (tie → lexicographically first)
      let suggested: string | undefined;
      let max = -1;
      for (const r of list) {
        if (r.count > max || (r.count === max && (suggested ?? '⬇️') > r.emoji)) {
          max = r.count;
          suggested = r.emoji;
        }
      }
      return { list, suggested };
    },
    [userId]
  );

  /* ---------- raw rows -> ChatMessage ---------- */
  const mapRowsToMessages = useCallback(
    (rows: any[], reactionsMap: Record<string, MessageReaction[]>) => {
      const mapped: ChatMessage[] = rows.map((m: any) => {
        const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const name = makeName(prof?.first_name, prof?.last_name);
        const avatar_url = prof?.avatar_url ?? null;
        if (m.user_id) profileCacheRef.current.set(m.user_id, { name, avatar_url });

        const idStr = String(m.id);
        messageIdsRef.current.add(idStr);
        seenIdsRef.current.add(idStr);

        const { list: normRx, suggested } = normalizeReactions(reactionsMap[idStr]);

        return {
          id: idStr,
          content: m.message,
          user: { name, id: m.user_id, avatar_url },
          createdAt: m.created_at,
          updatedAt: m.edited_at ?? undefined,
          isDeleted: !!m.is_deleted,
          deletedAt: m.deleted_at ?? undefined,
          reactions: normRx,
          suggestedEmoji: suggested,
        };
      });
      return mapped;
    },
    [normalizeReactions]
  );

  /* ---------- fetch all messages + reactions ---------- */
  const fetchAllMessages = useCallback(
    async (chatId: number) => {
      const msgRes = await supabase
        .from('chat_messages')
        .select(
          `
          id,
          chat_id,
          message,
          created_at,
          edited_at,
          is_deleted,
          deleted_at,
          user_id,
          profiles:user_id ( first_name, last_name, avatar_url )
        `
        )
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (msgRes.error) throw msgRes.error;

      const ids = (msgRes.data ?? []).map((m: any) => m.id);

      let reactionsByMessage: Record<string, MessageReaction[]> = {};
      if (ids.length) {
        const rxRes = await supabase
          .from('message_reactions')
          .select(
            `
            message_id,
            emoji,
            user_id,
            profiles:user_id ( first_name, last_name, avatar_url )
          `
          )
          .in('message_id', ids);

        reactionsByMessage = {};
        (rxRes.data ?? []).forEach((r: any) => {
          const messageId = String(r.message_id);
          const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          const name = makeName(prof?.first_name, prof?.last_name);
          const avatar_url = prof?.avatar_url ?? null;

          if (!reactionsByMessage[messageId]) reactionsByMessage[messageId] = [];
          const existing = reactionsByMessage[messageId].find(x => x.emoji === r.emoji);
          const userEntry: MessageReactionUser = { user_id: r.user_id, name, avatar_url };

          if (existing) {
            existing.count++;
            existing.users.push(userEntry);
          } else {
            reactionsByMessage[messageId].push({
              emoji: r.emoji,
              count: 1,
              users: [userEntry],
            });
          }

          // warm cache
          if (r.user_id) profileCacheRef.current.set(r.user_id, { name, avatar_url });
        });
      }

      const formatted = mapRowsToMessages(msgRes.data ?? [], reactionsByMessage);
      setMessages(formatted);
      onMessage?.(formatted);
    },
    [mapRowsToMessages, onMessage]
  );

  /* ---------- authoritative reconcile for one message ---------- */
  const reconcileMessage = useCallback(
    async (messageId: string) => {
      const mid = Number(messageId);
      if (!mid || !eventChatId) return;

      const mRes = await supabase
        .from('chat_messages')
        .select(
          `
          id,
          chat_id,
          message,
          created_at,
          edited_at,
          is_deleted,
          deleted_at,
          user_id,
          profiles:user_id ( first_name, last_name, avatar_url )
        `
        )
        .eq('id', mid)
        .maybeSingle();

      if (mRes.error || !mRes.data || mRes.data.chat_id !== eventChatId) return;

      const rxRes = await supabase
        .from('message_reactions')
        .select(
          `
          message_id,
          emoji,
          user_id,
          profiles:user_id ( first_name, last_name, avatar_url )
        `
        )
        .eq('message_id', mid);

      let rx: MessageReaction[] = [];
      (rxRes.data ?? []).forEach((r: any) => {
        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        const name = makeName(prof?.first_name, prof?.last_name);
        const avatar_url = prof?.avatar_url ?? null;

        const existing = rx.find(x => x.emoji === r.emoji);
        const userEntry: MessageReactionUser = { user_id: r.user_id, name, avatar_url };

        if (existing) {
          existing.count++;
          existing.users.push(userEntry);
        } else {
          rx.push({ emoji: r.emoji, count: 1, users: [userEntry] });
        }

        if (r.user_id) profileCacheRef.current.set(r.user_id, { name, avatar_url });
      });

      const { list: normRx, suggested } = normalizeReactions(rx);
      const prof = Array.isArray(mRes.data.profiles) ? mRes.data.profiles[0] : mRes.data.profiles;
      const name = makeName(prof?.first_name, prof?.last_name);
      const avatar_url = prof?.avatar_url ?? null;
      if (mRes.data.user_id) profileCacheRef.current.set(mRes.data.user_id, { name, avatar_url });

      const merged: ChatMessage = {
        id: String(mRes.data.id),
        content: mRes.data.is_deleted ? 'Message deleted' : mRes.data.message,
        user: { name, id: mRes.data.user_id, avatar_url },
        createdAt: mRes.data.created_at,
        updatedAt: mRes.data.edited_at ?? undefined,
        isDeleted: !!mRes.data.is_deleted,
        deletedAt: mRes.data.deleted_at ?? undefined,
        reactions: normRx,
        suggestedEmoji: suggested,
      };

      setMessages(prev => prev.map(m => (m.id === merged.id ? merged : m)));
    },
    [eventChatId, normalizeReactions]
  );

  /* ---------- init (ensure chat row), then initial load ---------- */
  useEffect(() => {
    if (!eventId || !userId) return;
    let cancelled = false;

    const initialize = async () => {
      try {
        let chatId: number | null = null;

        const sel = await supabase
          .from('event_chats')
          .select('id')
          .eq('event_id', eventId)
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (sel.error) throw sel.error;
        if (sel.data?.id) chatId = sel.data.id;

        if (!chatId) {
          const up = await supabase
            .from('event_chats')
            .upsert({ event_id: eventId }, { onConflict: 'event_id' })
            .select('id')
            .maybeSingle();

          if (up.error) throw up.error;
          if (up.data?.id) chatId = up.data.id;
          else {
            const re = await supabase
              .from('event_chats')
              .select('id')
              .eq('event_id', eventId)
              .order('id', { ascending: true })
              .limit(1)
              .maybeSingle();
            if (re.error || !re.data?.id) throw new Error('Could not create/find event_chats row');
            chatId = re.data.id;
          }
        }

        if (cancelled) return;
        setEventChatId(chatId!);

        seenIdsRef.current.clear();
        messageIdsRef.current.clear();
        await fetchAllMessages(chatId!);
      } catch (e: any) {
        console.error('Error initializing event chat:', e?.message || e);
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [eventId, userId, fetchAllMessages]);

  /* ---------- realtime subscriptions ---------- */
  useEffect(() => {
    if (!eventChatId) return;

    if (channelRef.current) {
      try { channelRef.current.unsubscribe(); } catch { }
      channelRef.current = null;
    }

    const channel = supabase
      .channel(roomName, { config: { broadcast: { self: true } } })

      // lightweight broadcast
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const incoming = payload as ChatMessage;
        if (seenIdsRef.current.has(incoming.id)) return;
        seenIdsRef.current.add(incoming.id);
        messageIdsRef.current.add(incoming.id);
        setMessages(prev => {
          const next = [...prev, incoming];
          onMessage?.(next);
          return next;
        });
      })
      .on('broadcast', { event: 'message_deleted' }, ({ payload }) => {
        const { messageId } = payload as { messageId: string };
        if (!messageIdsRef.current.has(messageId)) return;
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId ? { ...m, isDeleted: true, content: 'Message deleted' } : m
          )
        );
        reconcileMessage(messageId);
      })
      .on('broadcast', { event: 'message_edited' }, ({ payload }) => {
        const { messageId, newContent } = payload as { messageId: string; newContent: string };
        if (!messageIdsRef.current.has(messageId)) return;
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId ? { ...m, content: newContent, updatedAt: new Date().toISOString() } : m
          )
        );
        reconcileMessage(messageId);
      })

      // DB inserts (messages)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${eventChatId}` },
        async ({ new: row }: any) => {
          const idStr = String(row.id);
          if (seenIdsRef.current.has(idStr)) return;
          seenIdsRef.current.add(idStr);
          messageIdsRef.current.add(idStr);

          const prof = await getDisplayProfile(row.user_id);
          const msg: ChatMessage = {
            id: idStr,
            content: row.message,
            user: { name: prof.name, id: row.user_id, avatar_url: prof.avatar_url },
            createdAt: row.created_at,
            updatedAt: row.edited_at ?? undefined,
            isDeleted: row.is_deleted ?? false,
            deletedAt: row.deleted_at ?? undefined,
            reactions: [],
            suggestedEmoji: undefined,
          };
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            const next = [...prev, msg];
            onMessage?.(next);
            return next;
          });

          reconcileMessage(idStr);
        }
      )

      // DB updates (messages)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${eventChatId}` },
        ({ new: row }: any) => {
          const idStr = String(row.id);
          if (!messageIdsRef.current.has(idStr)) return;
          setMessages(prev =>
            prev.map(m =>
              m.id === idStr
                ? {
                  ...m,
                  content: row.is_deleted ? 'Message deleted' : row.message,
                  isDeleted: !!row.is_deleted,
                  deletedAt: row.deleted_at ?? undefined,
                  updatedAt: row.edited_at ?? new Date().toISOString(),
                }
                : m
            )
          );
          reconcileMessage(idStr);
        }
      )

      // DB inserts (reactions)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        async ({ new: r }: any) => {
          const messageId = String(r.message_id);
          if (!messageIdsRef.current.has(messageId)) return;

          const prof = await getDisplayProfile(r.user_id);

          setMessages(prev =>
            prev.map(m => {
              if (m.id !== messageId) return m;
              const reactions = m.reactions ?? [];
              const existing = reactions.find(x => x.emoji === r.emoji);

              if (existing) {
                if (!existing.users.some(u => u.user_id === r.user_id)) {
                  existing.users.push({ user_id: r.user_id, name: prof.name, avatar_url: prof.avatar_url });
                  existing.count = existing.users.length;
                  existing.hasReacted = !!userId && r.user_id === userId ? true : existing.hasReacted;
                }
                const { list, suggested } = normalizeReactions(reactions);
                return { ...m, reactions: list, suggestedEmoji: suggested };
              }

              const next = [
                ...reactions,
                {
                  emoji: r.emoji,
                  count: 1,
                  users: [{ user_id: r.user_id, name: prof.name, avatar_url: prof.avatar_url }],
                } as MessageReaction,
              ];
              const { list, suggested } = normalizeReactions(next);
              return { ...m, reactions: list, suggestedEmoji: suggested };
            })
          );

          reconcileMessage(messageId);
        }
      )

      // DB deletes (reactions)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        ({ old: r }: any) => {
          const messageId = String(r.message_id);
          if (!messageIdsRef.current.has(messageId)) return;

          setMessages(prev =>
            prev.map(m => {
              if (m.id !== messageId) return m;
              const next = (m.reactions ?? [])
                .map(rx => {
                  if (rx.emoji !== r.emoji) return rx;
                  const users = rx.users.filter(u => u.user_id !== r.user_id);
                  return users.length ? { ...rx, users, count: users.length } : null;
                })
                .filter(Boolean) as MessageReaction[];
              const { list, suggested } = normalizeReactions(next);
              return { ...m, reactions: list, suggestedEmoji: suggested };
            })
          );

          reconcileMessage(messageId);
        }
      )
      .subscribe(status => {
        const ok = status === 'SUBSCRIBED';
        setIsConnected(ok);
        if (ok) fetchAllMessages(eventChatId).catch(() => { });
      });

    channelRef.current = channel;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchAllMessages(eventChatId).catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      try { channel.unsubscribe(); } catch { }
      setIsConnected(false);
    };
  }, [roomName, eventChatId, getDisplayProfile, normalizeReactions, reconcileMessage, fetchAllMessages, onMessage, userId]);

  /* ---------- send message ---------- */
  const sendMessage = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text) return;
      if (!eventChatId || !userId) {
        console.warn('Chat not ready: missing eventChatId or userId');
        return;
      }

      const optimisticId = crypto.randomUUID();
      const now = new Date().toISOString();

      // try to hydrate the sender avatar from cache (avoid await)
      const cached = profileCacheRef.current.get(userId) ?? { name: username, avatar_url: undefined };

      const optimistic: ChatMessage = {
        id: optimisticId,
        content: text,
        user: { name: cached.name || username, id: userId, avatar_url: cached.avatar_url },
        createdAt: now,
      };

      setMessages(prev => [...prev, optimistic]);

      try {
        const attempt = async () =>
          supabase
            .from('chat_messages')
            .insert({ chat_id: eventChatId, user_id: userId, message: text })
            .select('id,created_at')
            .single();

        let res = await attempt();
        if (res.error) {
          await new Promise(r => setTimeout(r, 200));
          res = await attempt();
          if (res.error) throw res.error;
        }

        const realId = String(res.data!.id);
        const createdAt = res.data!.created_at;

        seenIdsRef.current.add(realId);
        messageIdsRef.current.add(realId);

        setMessages(prev =>
          prev.map(m => (m.id === optimisticId ? { ...m, id: realId, createdAt } : m))
        );

        channelRef.current?.send({
          type: 'broadcast',
          event: 'message',
          payload: { ...optimistic, id: realId, createdAt },
        });

        reconcileMessage(realId);
      } catch (err: any) {
        console.error('Error sending message:', err?.message || err);
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
      }
    },
    [username, userId, eventChatId, reconcileMessage]
  );

  /* ---------- toggle reaction ---------- */
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId || !eventChatId) return;
      if (!messageIdsRef.current.has(messageId)) return;

      const sender = await getDisplayProfile(userId);

      // optimistic toggle
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions ?? [];
          const existing = reactions.find(r => r.emoji === emoji);

          if (existing) {
            const hasUser = existing.users.some(u => u.user_id === userId);
            if (hasUser) {
              const newUsers = existing.users.filter(u => u.user_id !== userId);
              const newReactions = newUsers.length
                ? reactions.map(r =>
                  r.emoji === emoji ? { ...r, users: newUsers, count: newUsers.length } : r
                )
                : reactions.filter(r => r.emoji !== emoji);
              const { list, suggested } = normalizeReactions(newReactions);
              return { ...m, reactions: list, suggestedEmoji: suggested };
            } else {
              const newUsers = [...existing.users, { user_id: userId, name: sender.name, avatar_url: sender.avatar_url }];
              const updated = reactions.map(r =>
                r.emoji === emoji ? { ...r, users: newUsers, count: newUsers.length } : r
              );
              const { list, suggested } = normalizeReactions(updated);
              return { ...m, reactions: list, suggestedEmoji: suggested };
            }
          }

          const added = [
            ...reactions,
            { emoji, count: 1, users: [{ user_id: userId, name: sender.name, avatar_url: sender.avatar_url }] } as MessageReaction,
          ];
          const { list, suggested } = normalizeReactions(added);
          return { ...m, reactions: list, suggestedEmoji: suggested };
        })
      );

      try {
        const messageIdNum = Number(messageId);
        const { error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageIdNum, user_id: userId, emoji });

        if (error) {
          // unique violation => remove the reaction
          if ((error as any).code === '23505') {
            const del = await supabase
              .from('message_reactions')
              .delete()
              .eq('message_id', messageIdNum)
              .eq('user_id', userId)
              .eq('emoji', emoji);
            if (del.error) throw del.error;
          } else {
            throw error;
          }
        }
      } catch (err: any) {
        console.error('addReaction error:', err?.message || err);
      } finally {
        reconcileMessage(messageId);
      }
    },
    [userId, eventChatId, getDisplayProfile, normalizeReactions, reconcileMessage]
  );

  /* ---------- delete / edit ---------- */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!userId || !eventChatId) return;
      try {
        const messageIdNum = Number(messageId);
        const { error } = await supabase.rpc('soft_delete_message', { message_id: messageIdNum });
        if (error) throw error;

        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: 'Message deleted', deletedAt: new Date().toISOString() }
              : m
          )
        );

        channelRef.current?.send({
          type: 'broadcast',
          event: 'message_deleted',
          payload: { messageId, userId },
        });
      } catch (err: any) {
        console.error('Error deleting message:', err?.message || err);
      } finally {
        reconcileMessage(messageId);
      }
    },
    [userId, eventChatId, reconcileMessage]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!userId || !eventChatId) return;
      try {
        const messageIdNum = Number(messageId);
        const { error } = await supabase
          .from('chat_messages')
          .update({ message: newContent })
          .eq('id', messageIdNum)
          .eq('user_id', userId);
        if (error) throw error;

        setMessages(prev =>
          prev.map(m =>
            m.id === messageId ? { ...m, content: newContent, updatedAt: new Date().toISOString() } : m
          )
        );

        channelRef.current?.send({
          type: 'broadcast',
          event: 'message_edited',
          payload: { messageId, newContent, userId },
        });
      } catch (err: any) {
        console.error('Error editing message:', err?.message || err);
      } finally {
        reconcileMessage(messageId);
      }
    },
    [userId, eventChatId, reconcileMessage]
  );

  const canSend = Boolean(eventChatId && userId && isConnected);

  return { messages, sendMessage, addReaction, deleteMessage, editMessage, isConnected, canSend };
}
