'use client'
import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { getToken, SOCKET_URL } from '@/lib/api'

let sharedSocket = null

export function useSocket() {
  const socketRef = useRef(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    // Переиспользуем единственный инстанс
    if (!sharedSocket || !sharedSocket.connected) {
      sharedSocket = io(SOCKET_URL, {
        auth:       { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
      })
    }

    socketRef.current = sharedSocket

    return () => {
      // НЕ disconnect — сокет живёт пока жив пользователь
    }
  }, [])

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  const emit = useCallback((event, data) =>
    new Promise((resolve) => {
      if (!socketRef.current) return resolve({ error: 'Not connected' })
      socketRef.current.emit(event, data, resolve)
    }), [])

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler)
  }, [])

  return { socket: socketRef, on, emit, off }
}
