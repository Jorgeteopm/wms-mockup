<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">

      <!-- Branded top bar -->
      <div class="bg-red-600 px-8 py-6 flex flex-col items-center gap-2">
        <img src="/mic.png" alt="MIC" class="h-12 object-contain brightness-0 invert" />
        <p class="text-red-200 text-sm font-medium tracking-wide">Transmittals</p>
      </div>

      <!-- Form body -->
      <div class="px-8 py-8">
        <h1 class="text-xl font-bold text-slate-800 mb-1">Sign in</h1>
        <p class="text-sm text-slate-400 mb-7">Enter your credentials to continue.</p>

        <form @submit.prevent="submit" class="space-y-5">

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-slate-700">Email</label>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="name@company.com"
              required
              :disabled="loading"
              class="form-input"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-slate-700">Password</label>
              <router-link to="/forgot-password" class="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                Forgot password?
              </router-link>
            </div>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                required
                :disabled="loading"
                class="form-input pr-16"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                tabindex="-1"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors select-none"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <!-- Error banner -->
          <div
            v-if="error"
            class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 active:scale-[.98] transition-all"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              Signing in…
            </span>
            <span v-else>Sign In</span>
          </button>

        </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { user, fetchMe } from '../composables/useAuth.js'

const router  = useRouter()
const email   = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error   = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ email: email.value, password: password.value })
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.message || 'Login failed.'
      return
    }
    user.value = data.user
    router.push('/admin/transmittals')
  } catch {
    error.value = 'Unable to connect. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

