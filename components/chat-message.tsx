'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { type ChatMessage, type MessageReaction } from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Trash2,
  Edit3,
  Smile,
  Check,
  X
} from 'lucide-react'

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  showHeader: boolean
  currentUserId?: string
  /** NEW: who created the event (to show “Creator” badge to others) */
  creatorId?: string
  onReaction?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, newContent: string) => void
}

const commonEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉']

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
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()
  }

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content && onEdit) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleReaction = (emoji: string) => {
    onReaction?.(message.id, emoji)
    setShowEmojiPicker(false)
  }

  if (message.isDeleted) {
    return (
      <div className={cn('flex w-full', isOwnMessage ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[70%] space-y-1">
          <div className="rounded-lg px-3 py-2 text-sm break-words bg-muted/50 text-muted-foreground italic">
            <Trash2 className="inline h-3 w-3 mr-1" />
            This message was deleted
          </div>
        </div>
      </div>
    )
  }

  const isCreator = creatorId && message.user?.id === creatorId

  return (
    <div className={cn('flex w-full group', isOwnMessage ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[70%] space-y-1', isOwnMessage ? 'items-end' : 'items-start')}>
        {showHeader && (
          <div className={cn('flex items-center gap-2 text-xs text-muted-foreground px-3')}>
            {/* 👇 Hide *your own* name; show others’ names. If they are the creator, badge it. */}
            {!isOwnMessage && (
              <>
                <span className="font-medium">{message.user.name}</span>
                {isCreator && (
                  <span className="ml-1 rounded-full bg-[var(--primary-color)] text-[var(--text-color)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Creator
                  </span>
                )}
              </>
            )}
            <span>{formatTime(message.createdAt)}</span>
            {message.updatedAt && message.updatedAt !== message.createdAt && (
              <span className="italic">(edited)</span>
            )}
          </div>
        )}

        <div className="relative">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleEdit()
                  }
                  if (e.key === 'Escape') {
                    cancelEdit()
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
                isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              )}
            >
              {message.content}

              {/* Floating actions (emoji + more). Hide the 3-dots entirely for OTHER peoples’ messages */}
              <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-1">
                  {/* Emoji */}
                  <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
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

                  {/* 3-dots ONLY for your own messages */}
                  {isOwnMessage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={() => setIsEditing(true)}
                            className="hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit message
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(message.id)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete message
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3">
            {message.reactions.map((reaction) => {
              const hasReacted = currentUserId
                ? reaction.users.some((u) => u.user_id === currentUserId)
                : false
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
