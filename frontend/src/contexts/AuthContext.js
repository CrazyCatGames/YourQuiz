'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, setTokens, clearTokens } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    try {
      const u = await api.auth.me()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await api.auth.register(payload)
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
