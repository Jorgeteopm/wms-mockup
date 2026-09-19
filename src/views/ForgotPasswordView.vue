<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">

      <!-- Branded top bar -->
      <div class="bg-red-600 px-8 py-6 flex flex-col items-center gap-2">
        <img src="/mic.png" alt="MIC" class="h-12 object-contain brightness-0 invert" />
        <p class="text-red-200 text-sm font-medium tracking-wide">Transmittals</p>
      </div>

      <!-- Request form -->
      <div v-if="state === 'form'" class="px-8 py-8">
        <h1 class="text-xl font-bold text-slate-800 mb-1">Forgot password?</h1>
        <p class="text-sm text-slate-400 mb-7">Enter your email and we'll send you a reset link.</p>

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
              Sending…
            </span>
            <span v-else>Send Reset Link</span>
          </button>

          <router-link
            to="/login"
            class="block text-center text-sm text-slate-500 hover:text-red-600 font-medium transition-colors"
          >
            Back to Sign In
          </router-link>

        </form>
      </div>

      <!-- Sent confirmation -->
      <div v-else class="px-8 py-8">
        <div class="flex flex-col items-center text-center gap-4">
          <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-800 mb-1">Check your email</h2>
            <p class="text-sm text-slate-500">If an account exists for <span class="font-semibold text-slate-700">{{ email }}</span>, a reset link has been sent.</p>
          </div>
          <router-link
            to="/login"
            class="w-full py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors text-center block"
          >
            Back to Sign In
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email   = ref('')
const loading = ref(false)
const error   = ref('')
const state   = ref('form')   // 'form' | 'sent'

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.value })
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.message || 'Something went wrong.'
      return
    }
    state.value = 'sent'
  } catch {
    error.value = 'Unable to connect. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

