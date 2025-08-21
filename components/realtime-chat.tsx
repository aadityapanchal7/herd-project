// components/realtime-chat.tsx
'use client';

import { cn } from '@/lib/utils';
import { ChatMessageItem } from '@/components/chat-message';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChatMessage,
  useRealtimeChat,
} from '@/hooks/use-realtime-chat';

interface RealtimeChatProps {
  eventId: number;
  userId?: string;
  username?: string;
  className?: string;
  onMessage?: (messages: ChatMessage[]) => void;
  messages?: ChatMessage[];
  /** event creator's user id so we can tag them as "Creator" */
  creatorId?: string;
}

/** ---------- Date divider helpers ---------- */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDayLabel(date: Date) {
  const today = startOfDay(new Date());
  const that = startOfDay(date);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  // Show weekday for recent context; include year if different
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  if (date.getFullYear() !== today.getFullYear()) {
    opts.year = 'numeric';
  }
  return date.toLocaleDateString(undefined, opts);
}

function DateDivider({ ts }: { ts: string }) {
  const label = formatDayLabel(new Date(ts));
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
/** ----------------------------------------- */

export function RealtimeChat({
  eventId,
  userId,
  username,
  className,
  onMessage,
  messages: initialMessages = [],
  creatorId,
}: RealtimeChatProps) {
  const { containerRef, scrollToBottom } = useChatScroll();
  const roomName = `event_${eventId}`;
  const displayName = username || 'Anonymous User';

  const {
    messages: realtimeMessages,
    sendMessage,
    addReaction,
    deleteMessage,
    editMessage,
    isConnected,
  } = useRealtimeChat({
    roomName,
    username: displayName,
    userId,
    eventId,
    onMessage,
  });

  const [newMessage, setNewMessage] = useState('');

  // Merge and sort (avoid dups by id)
  const allMessages = useMemo(() => {
    const merged = [...initialMessages, ...realtimeMessages];
    const unique = merged.filter(
      (m, i, self) => i === self.findIndex((x) => x.id === m.id)
    );
    unique.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return unique;
  }, [initialMessages, realtimeMessages]);

  useEffect(() => {
    onMessage?.(allMessages);
  }, [allMessages, onMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, scrollToBottom]);

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !isConnected) return;
      sendMessage(newMessage);
      setNewMessage('');
    },
    [newMessage, isConnected, sendMessage]
  );

  if (!userId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Event Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Please sign in to join the chat</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /** Build the render list with date dividers when the day changes */
  const renderedList = useMemo(() => {
    const items: React.ReactNode[] = [];
    let lastDayKey: string | null = null;

    for (let i = 0; i < allMessages.length; i++) {
      const message = allMessages[i];
      const isOwn = message.user.id === userId;

      // Find the previous NON-DELETED message to base grouping on.
      let prevNonDeleted: ChatMessage | null = null;
      for (let j = i - 1; j >= 0; j--) {
        const cand = allMessages[j];
        if (!cand.isDeleted) {
          prevNonDeleted = cand;
          break;
        }
      }

      // ----- date divider logic -----
      const dayKey = new Date(message.createdAt).toDateString();
      if (dayKey !== lastDayKey) {
        items.push(<DateDivider key={`day-${dayKey}-${i}`} ts={message.createdAt} />);
        lastDayKey = dayKey;
      }
      // --------------------------------

      const sameSender =
        !!prevNonDeleted?.user.id &&
        prevNonDeleted.user.id === message.user.id;

      const gapMs = prevNonDeleted
        ? new Date(message.createdAt).getTime() -
        new Date(prevNonDeleted.createdAt).getTime()
        : Number.POSITIVE_INFINITY;

      // We never show our own name.
      // For other people: show at start of their group or when >= 1h gap.
      const showHeader =
        !isOwn && (!prevNonDeleted || !sameSender || gapMs >= 60 * 60 * 1000);

      items.push(
        <div key={message.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <ChatMessageItem
            message={message}
            isOwnMessage={isOwn}
            showHeader={showHeader}
            currentUserId={userId}
            creatorId={creatorId}
            onReaction={addReaction}
            onDelete={deleteMessage}
            onEdit={editMessage}
          />
        </div>
      );
    }
    return items;
  }, [allMessages, userId, creatorId, addReaction, deleteMessage, editMessage]);

  return (
    <Card className={cn('flex h-full w-full flex-col bg-background text-foreground antialiased', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Event Chat
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0">
        {/* Messages */}
        <div ref={containerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {allMessages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : null}
          <div className="space-y-1">{renderedList}</div>
        </div>

        {/* Composer */}
        <form onSubmit={handleSendMessage} className="flex w-full gap-2 border-t border-border p-4">
          <Input
            className={cn(
              'rounded-full bg-background text-sm transition-all duration-300',
              isConnected && newMessage.trim() ? 'w-[calc(100%-36px)]' : 'w-full'
            )}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isConnected ? 'Type a message…' : 'Connecting…'}
          />
          <Button
            className="aspect-square rounded-full"
            type="submit"
            disabled={!isConnected || !newMessage.trim()}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
