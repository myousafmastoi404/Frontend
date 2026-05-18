import { create } from 'zustand'

// ─── Robust Storage Helper ────────────────────────────────────────────────
// Uses cookies as PRIMARY storage (works reliably in Android WebView APK)
// Uses localStorage as SECONDARY fallback (works in web browsers)
// This ensures auth persists on BOTH web browser AND mobile APK after refresh

function setCookie(name, value, days = 30) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires + ';path=/;SameSite=Lax'
  } catch (e) {
    // cookie write failed silently
  }
}

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
  } catch (e) {
    return null
  }
}

function deleteCookie(name) {
  try {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax'
  } catch (e) {
    // cookie delete failed silently
  }
}

function saveAuth(token, user) {
  const userStr = JSON.stringify(user)
  // Save to cookie (primary - works in WebView APK)
  setCookie('auth-token', token)
  setCookie('auth-user', userStr)
  // Save to localStorage (secondary - works in web browser)
  try {
    localStorage.setItem('auth-token', token)
    localStorage.setItem('auth-user', userStr)
  } catch (e) {
    // localStorage not available
  }
}

function loadAuth() {
  // Try cookie first (more reliable in WebView APK)
  let token = getCookie('auth-token')
  let userStr = getCookie('auth-user')

  // Fallback to localStorage
  if (!token) {
    try { token = localStorage.getItem('auth-token') } catch (e) {}
  }
  if (!userStr) {
    try { userStr = localStorage.getItem('auth-user') } catch (e) {}
  }

  let user = null
  if (userStr) {
    try { user = JSON.parse(userStr) } catch (e) { user = null }
  }

  return { token: token || null, user }
}

function removeAuth() {
  // Clear cookies
  deleteCookie('auth-token')
  deleteCookie('auth-user')
  // Clear localStorage
  try {
    localStorage.removeItem('auth-token')
    localStorage.removeItem('auth-user')
  } catch (e) {
    // localStorage not available
  }
}

// ─── Load saved auth on startup ───────────────────────────────────────────
const saved = loadAuth()

export const useAuthStore = create((set) => ({
  user: saved.user,
  token: saved.token,
  isLoading: true,

  setAuth: (user, token) => {
    saveAuth(token, user)
    set({ user, token, isLoading: false })
  },
  clearAuth: () => {
    removeAuth()
    set({ user: null, token: null, isLoading: false })
  },
  setLoading: (isLoading) => set({ isLoading })
}))
