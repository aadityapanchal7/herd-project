'use client'

import { cn } from '@/lib/utils'
import { ChatMessageItem } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import {
  type ChatMessage,
  useRealtimeChat,
} from '@/hooks/use-realtime-chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, MessageCircle, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RealtimeChatProps {
  eventId: number
  userId?: string
  username?: string
  className?: string
  onMessage?: (messages: ChatMessage[]) => void
  messages?: ChatMessage[]
}

/**
 * Realtime chat component for events
 * @param eventId - The event ID to create chat room for
 * @param userId - The ID of the current user
 * @param username - The username of the user
 * @param onMessage - The callback function to handle the messages. Useful if you want to store the messages in a database.
 * @param messages - The messages to display in the chat. Useful if you want to display messages from a database.
 * @returns The chat component
 */
export function RealtimeChat({
  eventId,
  userId,
  username,
  className,
  onMessage,
  messages: initialMessages = [],
}: RealtimeChatProps) {
  const { containerRef, scrollToBottom } = useChatScroll()
  const roomName = `event_${eventId}`
  const displayName = username || 'Anonymous User'

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
  })
  const [newMessage, setNewMessage] = useState('')

  // Merge realtime messages with initial messages
  const allMessages = useMemo(() => {
    const mergedMessages = [...initialMessages, ...realtimeMessages]
    // Remove duplicates based on message id
    const uniqueMessages = mergedMessages.filter(
      (message, index, self) => index === self.findIndex((m) => m.id === message.id)
    )
    // Sort by creation date
    const sortedMessages = uniqueMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    return sortedMessages
  }, [initialMessages, realtimeMessages])

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages)
    }
  }, [allMessages, onMessage])

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom()
  }, [allMessages, scrollToBottom])

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!newMessage.trim() || !isConnected) return

      sendMessage(newMessage)
      setNewMessage('')
    },
    [newMessage, isConnected, sendMessage]
  )

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
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Please sign in to join the chat</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("flex flex-col h-full w-full bg-background text-foreground antialiased", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Event Chat
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {allMessages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : null}
          <div className="space-y-1">
            {allMessages.map((message, index) => {
              const prevMessage = index > 0 ? allMessages[index - 1] : null
              const showHeader = !prevMessage || prevMessage.user.name !== message.user.name

              return (
                <div
                  key={message.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                >
                  <ChatMessageItem
                    message={message}
                    isOwnMessage={message.user.id === userId}
                    showHeader={showHeader}
                    currentUserId={userId}
                    onReaction={addReaction}
                    onDelete={deleteMessage}
                    onEdit={editMessage}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="flex w-full gap-2 border-t border-border p-4">
          <Input
            className={cn(
              'rounded-full bg-background text-sm transition-all duration-300',
              isConnected && newMessage.trim() ? 'w-[calc(100%-36px)]' : 'w-full'
            )}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={!isConnected}
          />
          {isConnected && newMessage.trim() && (
            <Button
              className="aspect-square rounded-full animate-in fade-in slide-in-from-right-4 duration-300"
              type="submit"
              disabled={!isConnected}
            >
              <Send className="size-4" />
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}