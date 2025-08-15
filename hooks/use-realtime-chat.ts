import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface MessageReaction {
  emoji: string
  count: number
  users: Array<{
    user_id: string
    name: string
  }>
  hasReacted?: boolean
}

export interface ChatMessage {
  id: string
  content: string
  user: {
    name: string
    id?: string
  }
  createdAt: string
  updatedAt?: string
  isDeleted?: boolean
  deletedAt?: string
  reactions?: MessageReaction[]
  replyTo?: {
    id: string
    content: string
    user: { name: string }
  }
}

interface UseRealtimeChatProps {
  roomName: string
  username: string
  userId?: string
  eventId?: number
  onMessage?: (messages: ChatMessage[]) => void
}

export function useRealtimeChat({ roomName, username, userId, eventId, onMessage }: UseRealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [eventChatId, setEventChatId] = useState<number | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Initialize event chat and load existing messages from database
  useEffect(() => {
    if (!eventId || !userId) return

    const initializeEventChat = async () => {
      try {
        // Get or create event chat
        let { data: existingChat, error: chatError } = await supabase
          .from('event_chats')
          .select('*')
          .eq('event_id', eventId)
          .single()

        if (chatError && chatError.code !== 'PGRST116') {
          throw chatError
        }

        if (!existingChat) {
          // Create new chat room for this event
          const { data: newChat, error: createError } = await supabase
            .from('event_chats')
            .insert({ event_id: eventId, name: 'Event Chat' })
            .select()
            .single()

          if (createError) throw createError
          existingChat = newChat
        }

        setEventChatId(existingChat.id)

        // Load existing messages from database with reactions and deletion status
        const { data: chatMessages, error: messagesError } = await supabase
          .from('chat_messages')
          .select(`
            id,
            message,
            created_at,
            edited_at,
            is_deleted,
            deleted_at,
            user_id,
            profiles:user_id (
              first_name,
              last_name
            )
          `)
          .eq('chat_id', existingChat.id)
          .order('created_at', { ascending: true })

        if (messagesError) throw messagesError

        // Load reactions for all messages
        const messageIds = (chatMessages || []).map(msg => msg.id)
        const { data: reactions, error: reactionsError } = await supabase
          .from('message_reactions')
          .select(`
            message_id,
            emoji,
            user_id,
            profiles:user_id (
              first_name,
              last_name
            )
          `)
          .in('message_id', messageIds)

        if (reactionsError) {
          console.error('Error loading reactions:', reactionsError)
        }

        // Group reactions by message
        const reactionsByMessage: Record<string, MessageReaction[]> = {}
        if (reactions) {
          reactions.forEach(reaction => {
            const messageId = reaction.message_id.toString()
            if (!reactionsByMessage[messageId]) {
              reactionsByMessage[messageId] = []
            }
            
            const existingReaction = reactionsByMessage[messageId].find(r => r.emoji === reaction.emoji)
            if (existingReaction) {
              existingReaction.count++
              existingReaction.users.push({
                user_id: reaction.user_id,
                name: reaction.profiles && reaction.profiles[0] ? `${reaction.profiles[0].first_name} ${reaction.profiles[0].last_name}` : 'Unknown User'
              })
            } else {
              reactionsByMessage[messageId].push({
                emoji: reaction.emoji,
                count: 1,
                users: [{
                  user_id: reaction.user_id,
                  name: reaction.profiles && reaction.profiles[0] ? `${reaction.profiles[0].first_name} ${reaction.profiles[0].last_name}` : 'Unknown User'
                }]
              })
            }
          })
        }

        // Convert database messages to ChatMessage format
        const formattedMessages: ChatMessage[] = (chatMessages || []).map(msg => ({
          id: msg.id.toString(),
          content: msg.message,
          user: {
            name: msg.profiles && msg.profiles[0] ? `${msg.profiles[0].first_name} ${msg.profiles[0].last_name}` : 'Unknown User',
            id: msg.user_id
          },
          createdAt: msg.created_at,
          updatedAt: msg.edited_at,
          isDeleted: msg.is_deleted,
          deletedAt: msg.deleted_at,
          reactions: reactionsByMessage[msg.id.toString()] || []
        }))

        setMessages(formattedMessages)

      } catch (err) {
        console.error('Error initializing event chat:', err)
      }
    }

    initializeEventChat()
  }, [eventId, userId])

  // Set up realtime channel
  useEffect(() => {
    if (!eventChatId) return

    const channel = supabase
      .channel(roomName, {
        config: {
          broadcast: { self: true }
        }
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const message = payload as ChatMessage
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) {
            return prev
          }
          const newMessages = [...prev, message]
          if (onMessage) {
            onMessage(newMessages)
          }
          return newMessages
        })
      })
      .on('broadcast', { event: 'message_deleted' }, ({ payload }) => {
        const { messageId } = payload
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isDeleted: true, content: 'Message deleted' }
            : msg
        ))
      })
      .on('broadcast', { event: 'message_edited' }, ({ payload }) => {
        const { messageId, newContent } = payload
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: newContent, updatedAt: new Date().toISOString() }
            : msg
        ))
      })
      // Listen for database changes on message_reactions
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'message_reactions' }, 
        (payload) => {
            try {
              const newReaction = payload?.new as any
              if (!newReaction || typeof newReaction.message_id === 'undefined') {
                console.warn('Received malformed newReaction payload, ignoring:', payload)
                return
              }

              const messageId = String(newReaction.message_id)

              setMessages(prev => prev.map(msg => {
                if (msg.id !== messageId) return msg

                const reactions = msg.reactions || []
                const existingReaction = reactions.find(r => r.emoji === newReaction.emoji)

                if (existingReaction) {
                  const userExists = existingReaction.users.some(u => u.user_id === newReaction.user_id)
                  if (!userExists) {
                    return {
                      ...msg,
                      reactions: reactions.map(r => 
                        r.emoji === newReaction.emoji 
                          ? { ...r, count: r.count + 1, users: [...r.users, { user_id: newReaction.user_id, name: username }] }
                          : r
                      )
                    }
                  }
                } else {
                  return {
                    ...msg,
                    reactions: [...reactions, {
                      emoji: newReaction.emoji,
                      count: 1,
                      users: [{ user_id: newReaction.user_id, name: username }]
                    }]
                  }
                }
                return msg
              }))
            } catch (err) {
              console.error('Error processing new reaction payload:', err, payload)
            }
          }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'message_reactions' }, 
        (payload) => {
          try {
            const deletedReaction = payload?.old as any
            if (!deletedReaction || typeof deletedReaction.message_id === 'undefined') {
              console.warn('Received malformed deletedReaction payload, ignoring:', payload)
              return
            }

            const messageId = String(deletedReaction.message_id)

            setMessages(prev => prev.map(msg => {
              if (msg.id !== messageId) return msg

              const reactions = msg.reactions || []
              const updatedReactions = reactions.map(r => {
                if (r.emoji === deletedReaction.emoji) {
                  const newUsers = r.users.filter(u => u.user_id !== deletedReaction.user_id)
                  return newUsers.length > 0 ? { ...r, count: newUsers.length, users: newUsers } : null
                }
                return r
              }).filter(Boolean) as MessageReaction[]

              return { ...msg, reactions: updatedReactions }
            }))
          } catch (err) {
            console.error('Error processing deleted reaction payload:', err, payload)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [roomName, onMessage, eventChatId, username])

  const sendMessage = useCallback(async (content: string) => {
    if (!channelRef.current || !content.trim() || !isConnected) return

    const messageId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    const message: ChatMessage = {
      id: messageId,
      content: content.trim(),
      user: {
        name: username,
        id: userId
      },
      createdAt: timestamp
    }

    try {
      // Save to database if we have the necessary info
      if (eventChatId && userId) {
        const { data: savedMessage, error } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: eventChatId,
            user_id: userId,
            message: content.trim()
          })
          .select('id')
          .single()

        if (error) throw error

        // Update message with database ID
        message.id = savedMessage.id.toString()
      }

      // Broadcast message for real-time delivery
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: message
      })

    } catch (err) {
      console.error('Error sending message:', err)
      // Still broadcast even if database save fails
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: message
      })
    }
  }, [username, isConnected, eventChatId, userId])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!userId || !eventChatId) return

    try {
      // Convert messageId to number (let Supabase handle the type conversion)
      const messageIdNum = Number(messageId)
      
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageIdNum,
          user_id: userId,
          emoji: emoji
        })

      if (error) {
        // If reaction already exists, remove it instead
        if (error.code === '23505') {
          const { error: deleteError } = await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageIdNum)
            .eq('user_id', userId)
            .eq('emoji', emoji)
          
          if (deleteError) {
            console.error('Delete reaction error:', deleteError)
            throw deleteError
          }

        } else {
          console.error('Insert reaction error:', error)
          throw error
        }
      }
      } catch (err) {
      console.error('Error adding reaction:', err)
      if (err && typeof err === 'object') {
        const e = err as any
        console.error('Error message:', e.message || 'Unknown error')
        console.error('Error code:', e.code || 'No code')
      }
    }
  }, [userId, eventChatId])

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!userId || !eventChatId) return

    try {
      // Convert messageId to number (let Supabase handle the bigint conversion)
      const messageIdNum = Number(messageId)
      
      const { error } = await supabase.rpc('soft_delete_message', {
        message_id: messageIdNum
      })

      if (error) {
        console.error('RPC Error:', error)
        throw error
      }

      // Update local messages to show as deleted
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isDeleted: true, content: 'Message deleted', deletedAt: new Date().toISOString() }
          : msg
      ))

      // Broadcast deletion
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_deleted',
          payload: { messageId, userId }
        })
      }
    } catch (err) {
      console.error('Error deleting message:', err)
      if (err && typeof err === 'object') {
        const e = err as any
        console.error('Error message:', e.message || 'Unknown error')
        console.error('Error code:', e.code || 'No code')
      }
    }
  }, [userId, eventChatId])

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!userId || !eventChatId) return

    try {
      // Convert messageId to number (let Supabase handle the type conversion)
      const messageIdNum = Number(messageId)
      
      const { error } = await supabase
        .from('chat_messages')
        .update({ message: newContent })
        .eq('id', messageIdNum)
        .eq('user_id', userId)

      if (error) throw error

      // Update local messages
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, updatedAt: new Date().toISOString() }
          : msg
      ))

      // Broadcast edit
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message_edited',
          payload: { messageId, newContent, userId }
        })
      }
    } catch (err) {
      console.error('Error editing message:', err)
      if (err && typeof err === 'object') {
        const e = err as any
        console.error('Error message:', e.message || 'Unknown error')
        console.error('Error code:', e.code || 'No code')
      }
    }
  }, [userId, eventChatId])

  return {
    messages,
    sendMessage,
    addReaction,
    deleteMessage,
    editMessage,
    isConnected
  }
}