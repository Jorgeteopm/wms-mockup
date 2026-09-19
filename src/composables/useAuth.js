import { ref } from 'vue'

// Module-level singleton — same instance across all imports
export const user = ref(null)
let _initialized = false

export async function fetchMe() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    user.value = res.ok ? (await res.json()).user : null
  } catch {
    user.value = null
  }
  _initialized = true
}

export function isInitialized() {
  return _initialized
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch { /* ignore */ }
  user.value = null
  window.location.href = '/login'
}
