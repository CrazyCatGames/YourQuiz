const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// ─── Token storage helpers ────────────────────────────────────
export const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

export const setTokens = (access, refresh) => {
  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', refresh)
}

export const clearTokens = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

// ─── Core fetch wrapper ───────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers })

  // Авто-refresh при 401
  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${getToken()}`,
      }
      const retry = await fetch(`${BASE}/api${path}`, { ...options, headers: retryHeaders })
      if (!retry.ok) throw new Error((await retry.json()).error || 'Request failed')
      return retry.json()
    }
    clearTokens()
    
    // Проверяем, что запрос не был фоновой проверкой сессии, 
    // и мы не находимся на странице авторизации, чтобы избежать зацикливания
    if (path !== '/auth/me' && !window.location.pathname.startsWith('/auth/')) {
        window.location.href = '/auth/login'
    }
    
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

// ─── Auth ─────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
    me:       ()     => request('/auth/me'),
  },

  // ─── Quizzes ────────────────────────────────────────────────
  quizzes: {
    list:       ()     => request('/quizzes'),
    listPublic: (q)    => request(`/quizzes/public${q ? `?${new URLSearchParams(q)}` : ''}`),
    get:        (id)   => request(`/quizzes/${id}`),
    create:     (data) => request('/quizzes',      { method: 'POST', body: JSON.stringify(data) }),
    update:     (id, data) => request(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:     (id)   => request(`/quizzes/${id}`, { method: 'DELETE' }),
  },

  // ─── Questions ──────────────────────────────────────────────
  questions: {
    add:     (quizId, data) => request(`/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
    update:  (quizId, qid, data) => request(`/quizzes/${quizId}/questions/${qid}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:  (quizId, qid) => request(`/quizzes/${quizId}/questions/${qid}`, { method: 'DELETE' }),
    reorder: (quizId, order) => request(`/quizzes/${quizId}/questions/reorder`, { method: 'PUT', body: JSON.stringify({ order }) }),
  },

  // ─── Categories ─────────────────────────────────────────────
  categories: {
    list: () => request('/categories'),
  },

  // ─── Sessions ───────────────────────────────────────────────
  sessions: {
    create:      (quizId) => request('/sessions', { method: 'POST', body: JSON.stringify({ quizId }) }),
    list:        ()       => request('/sessions'),
    get:         (id)     => request(`/sessions/${id}`),
    findByCode:  (code)   => request(`/sessions/join/${code}`),
    leaderboard: (id)     => request(`/sessions/${id}/leaderboard`),
    myAnswers:   (id)     => request(`/sessions/${id}/my-answers`),
  },

  // ─── Upload ─────────────────────────────────────────────────
  upload: {
    image: async (file) => {
      const form = new FormData()
      form.append('image', file)
      const token = getToken()
      const res = await fetch(`${BASE}/api/upload/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    },
  },
}

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
