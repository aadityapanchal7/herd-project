// components/chat-message.tsx
'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { type ChatMessage } from '@/hooks/use-realtime-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Edit3, Smile, Check, X } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
  currentUserId?: string;
  /** Who created the event (to show “Creator” badge to others) */
  creatorId?: string;
  onReaction?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
}

const commonEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉'];

export function ChatMessageItem({
  message,
  isOwnMessage,
  showHeader,
  currentUserId,
  creatorId,
  onReaction,
  onDelete,
  onEdit
}: ChatMessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    } catch {
      return '';
    }
  };

  const timeLabel = formatTime(message.createdAt);
  const senderName = message.user?.name?.trim() || 'Unknown User';
  const isCreator = !!creatorId && message.user?.id === creatorId;

  const handleEdit = () => {
    const newText = editContent.trim();
    if (newText && newText !== message.content && onEdit) {
      onEdit(message.id, newText);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleReaction = (emoji: string) => {
    onReaction?.(message.id, emoji);
    setShowEmojiPicker(false);
  };

  const editedFlag =
    message.updatedAt && message.updatedAt !== message.createdAt && !message.isDeleted;

  /** ---------- helpers for reaction details UI ---------- */
  type ReactionUser = {
    user_id: string;
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    username?: string | null;
    avatar_url?: string | null; // ← pull profile pic if present
  };

  const displayName = (u: ReactionUser) => {
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return full || u.name || u.username || u.user_id;
  };

  const initialsOf = (u: ReactionUser) => {
    const full =
      [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
      u.name ||
      u.username ||
      '';
    const parts = full.split(/\s+/).filter(Boolean);
    const chars = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    return chars.toUpperCase() || '•';
  };

  const uniqueById = <T extends { user_id: string }>(arr: T[]) => {
    const seen = new Set<string>();
    return arr.filter((x) => (seen.has(x.user_id) ? false : (seen.add(x.user_id), true)));
  };

  const reactions = message.reactions || [];

  // Pick the most-reacted emoji as default (ties resolved by original order)
  const topEmoji = useMemo(() => {
    if (!reactions.length) return '';
    const sorted = [...reactions].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    return sorted[0]?.emoji ?? '';
  }, [reactions]);

  const [selectedEmoji, setSelectedEmoji] = useState<string>(topEmoji);
  // keep selectedEmoji in sync when reactions change (e.g., first load)
  const selected = useMemo(() => {
    const current =
      reactions.find((r) => r.emoji === selectedEmoji) ||
      reactions.find((r) => r.emoji === topEmoji) ||
      reactions[0];
    return current;
  }, [reactions, selectedEmoji, topEmoji]);

  const youReactedToSelected = useMemo(() => {
    if (!currentUserId || !selected) return false;
    return selected.users?.some((u: any) => u.user_id === currentUserId) ?? false;
  }, [selected, currentUserId]);
  /** ---------------------------------------------------- */

  return (
    <div className={cn('flex w-full group', isOwnMessage ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[70%] space-y-1', isOwnMessage ? 'items-end' : 'items-start')}>
        {/* Header row */}
        {showHeader && (
          <div
            className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground px-3',
              isOwnMessage ? 'justify-end' : 'justify-start'
            )}
          >
            {!isOwnMessage && (
              <>
                <span className="font-medium">{senderName}</span>
                {isCreator && (
                  <span className="ml-1 rounded-full bg-[var(--primary-color)] text-[var(--text-color)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Creator
                  </span>
                )}
              </>
            )}
            <span>{timeLabel}</span>
            {editedFlag && <span className="italic">(edited)</span>}
            {message.isDeleted && <span className="italic text-red-600">deleted</span>}
          </div>
        )}

        <div className="relative">
          {isEditing && !message.isDeleted ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  }
                  if (e.key === 'Escape') {
                    cancelEdit();
                  }
                }}
                className="w-full"
                autoFocus
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  className="h-6 w-6 p-0 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-lg px-3 py-2 text-sm break-words relative',
                isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                message.isDeleted && (isOwnMessage ? 'opacity-80' : 'opacity-80')
              )}
            >
              {message.isDeleted ? (
                <i className="opacity-80">
                  <Trash2 className="inline h-3 w-3 mr-1" />
                  Message deleted
                </i>
              ) : (
                message.content
              )}

              {/* Floating actions */}
              {!message.isDeleted && (
                <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-1">
                    {/* Emoji quick-react */}
                    <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                          aria-label="Add reaction"
                          title="Add reaction"
                        >
                          <Smile className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-auto p-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-4 gap-1">
                          {commonEmojis.map((emoji) => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => handleReaction(emoji)}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 3-dots for your own messages */}
                    {isOwnMessage && onEdit && onDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                            aria-label="Message actions"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <DropdownMenuItem
                            onClick={() => setIsEditing(true)}
                            className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(message.id)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reactions (above timestamp) */}
        {!message.isDeleted && reactions.length > 0 && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 flex-wrap',
              isOwnMessage ? 'justify-end pr-2' : 'justify-start pl-2'
            )}
          >
            {reactions.map((reaction) => {
              const hasReacted = currentUserId
                ? reaction.users?.some((u: any) => u.user_id === currentUserId)
                : false;
              return (
                <Button
                  key={reaction.emoji}
                  variant={hasReacted ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-6 px-2 text-xs transition-all duration-200',
                    hasReacted
                      ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  )}
                  onClick={() => handleReaction(reaction.emoji)}
                >
                  {reaction.emoji} {reaction.count}
                </Button>
              );
            })}

            {/* “Who reacted” panel */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 -mt-[2px]"
                  aria-label="See who reacted"
                  title="See who reacted"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-80 p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg rounded-xl"
                align="end"
              >
                {/* Header */}
                <div className="mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Reactions
                  </div>
                </div>

                {/* Emoji switcher (sorted by count desc so the most-reacted is leftmost) */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[...reactions].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).map((r) => {
                    const active = selected?.emoji === r.emoji;
                    return (
                      <button
                        key={`switch-${r.emoji}`}
                        onClick={() => setSelectedEmoji(r.emoji)}
                        className={cn(
                          'h-8 px-2 rounded-full border text-sm inline-flex items-center gap-1 transition',
                          active
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-50 dark:bg-gray-700/60 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white/70'
                        )}
                        aria-pressed={active}
                        title={`Show ${r.count} ${r.count === 1 ? 'reaction' : 'reactions'}`}
                      >
                        <span className="text-base leading-none">{r.emoji}</span>
                        <span className="text-xs font-bold">{r.count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* People list */}
                <div className="max-h-60 overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
                  {(selected?.users && selected.users.length > 0) ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {uniqueById(selected.users as ReactionUser[]).map((u) => {
                        const you = currentUserId && u.user_id === currentUserId;
                        return (
                          <li
                            key={`${selected.emoji}-${u.user_id}`}
                            className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750/40"
                          >
                            {/* Avatar (profile pic) or initials fallback */}
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={displayName(u)}
                                className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold text-gray-700 dark:text-gray-200">
                                {initialsOf(u)}
                              </div>
                            )}

                            <div className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                              {displayName(u)} {you && <span className="ml-1 text-[11px] text-gray-500">(you)</span>}
                            </div>
                            <div className="text-base" aria-hidden>
                              {selected.emoji}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="px-3 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                      No one yet — be the first!
                    </div>
                  )}
                </div>

                {/* Footer action — toggles label based on whether YOU reacted */}
                {selected?.emoji && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => handleReaction(selected.emoji)}
                    >
                      {youReactedToSelected ? `Remove ${selected.emoji}` : `React with ${selected.emoji}`}
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* If grouped (no header), still show YOUR timestamp so it never disappears */}
        {!showHeader && isOwnMessage && (
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{timeLabel}</div>
        )}
      </div>
    </div>
  );
}
