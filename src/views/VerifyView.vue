<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">

      <!-- Branded top bar -->
      <div class="bg-red-600 px-8 py-6 flex flex-col items-center gap-2">
        <img src="/mic.png" alt="MIC" class="h-12 object-contain brightness-0 invert" />
        <p class="text-red-200 text-sm font-medium tracking-wide">Transmittals</p>
      </div>

      <!-- Loading -->
      <div v-if="state === 'loading'" class="px-8 py-12 flex flex-col items-center gap-3 text-slate-400">
        <svg class="animate-spin h-6 w-6 text-red-400" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        <p class="text-sm">Validating your link…</p>
      </div>

      <!-- Invalid / expired -->
      <div v-else-if="state === 'invalid'" class="px-8 py-8">
        <div class="flex flex-col items-center text-center gap-4">
          <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-800 mb-1">Invalid or expired link</h2>
            <p class="text-sm text-slate-500">{{ errorMessage }}</p>
          </div>
          <p class="text-xs text-slate-400">Ask an admin to resend your invitation.</p>
        </div>
      </div>

      <!-- Set password form -->
      <div v-else-if="state === 'form'" class="px-8 py-8">
        <h1 class="text-xl font-bold text-slate-800 mb-1">Activate your account</h1>
        <p class="text-sm text-slate-500 mb-1">
          Welcome, <span class="font-semibold text-slate-700">{{ accountName }}</span>.
        </p>
        <p class="text-sm text-slate-400 mb-7">Set a password to complete your registration.</p>

        <form @submit.prevent="activate" class="space-y-5">

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-slate-700">New password</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="At least 8 characters"
                required
                :disabled="submitting"
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
            <p v-if="password && password.length < 8" class="text-xs text-amber-600">
              Password must be at least 8 characters.
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-slate-700">Confirm password</label>
            <input
              v-model="confirm"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Repeat your password"
              required
              :disabled="submitting"
              class="form-input"
            />
            <p v-if="confirm && confirm !== password" class="text-xs text-red-600">
              Passwords do not match.
            </p>
          </div>

          <!-- Error banner -->
          <div
            v-if="formError"
            class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3"
          >
            {{ formError }}
          </div>

          <button
            type="submit"
            :disabled="submitting || password.length < 8 || password !== confirm"
            class="w-full py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 active:scale-[.98] transition-all"
          >
            <span v-if="submitting" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              Activating…
            </span>
            <span v-else>Activate Account</span>
          </button>

        </form>
      </div>

      <!-- Success -->
      <div v-else-if="state === 'success'" class="px-8 py-8">
        <div class="flex flex-col items-center text-center gap-4">
          <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-800 mb-1">Account activated!</h2>
            <p class="text-sm text-slate-500">Your password has been set. You can now sign in.</p>
          </div>
          <a
            href="/login"
            class="w-full py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors text-center block"
          >
            Go to Sign In
          </a>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const state       = ref('loading')   // 'loading' | 'invalid' | 'form' | 'success'
const accountName = ref('')
const errorMessage = ref('')

const password    = ref('')
const confirm     = ref('')
const showPassword = ref(false)
const submitting  = ref(false)
const formError   = ref('')

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    errorMessage.value = 'No token found in this link.'
    state.value = 'invalid'
    return
  }

  try {
    const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) {
      errorMessage.value = data.message || 'This link is invalid or has expired.'
      state.value = 'invalid'
      return
    }
    accountName.value = data.name
    state.value = 'form'
  } catch {
    errorMessage.value = 'Unable to validate the link. Please try again.'
    state.value = 'invalid'
  }
})

async function activate() {
  formError.value = ''
  submitting.value = true
  const token = route.query.token
  try {
    const res = await fetch('/api/auth/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password: password.value })
    })
    const data = await res.json()
    if (!res.ok) {
      formError.value = data.message || 'Activation failed.'
      return
    }
    state.value = 'success'
  } catch {
    formError.value = 'Unable to connect. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

