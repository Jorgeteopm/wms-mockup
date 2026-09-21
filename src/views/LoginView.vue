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

        <!-- Demo accounts (mockup only) -->
        <div class="mt-7 pt-5 border-t border-slate-100">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Demo accounts — click to sign in</p>
          <p class="text-xs text-slate-400 mb-3">Any password works. Owners see every system; others only their own.</p>
          <div class="space-y-1.5">
            <button
              v-for="acct in demoAccounts"
              :key="acct.email"
              type="button"
              :disabled="loading"
              @click="quickLogin(acct)"
              class="w-full flex items-center justify-between gap-2 px-3 py-2 text-left border border-slate-200 rounded-lg hover:border-red-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <span>
                <span class="block text-sm font-semibold text-slate-700">{{ acct.name }}</span>
                <span class="block text-xs text-slate-400">{{ acct.email }}</span>
              </span>
              <span class="flex items-center gap-1.5 shrink-0">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                  :class="acct.role === 'owner' ? 'bg-red-100 text-red-700' : (acct.role === 'approver' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')">
                  {{ acct.role }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  :class="acct.system ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'">
                  {{ acct.system || 'All' }}
                </span>
              </span>
            </button>
          </div>
        </div>
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

// Mockup demo personas — mirror the seeded users in src/mock/api.js.
const demoAccounts = [
  { name: 'David Miller',   email: 'david.miller@teopm.com',   role: 'owner',     system: null },
  { name: 'Jennifer Adams', email: 'jennifer.adams@mic.com',   role: 'approver',  system: 'UPW' },
  { name: 'Robert Johnson', email: 'robert.johnson@mic.com',   role: 'warehouse', system: 'Water' },
  { name: 'Emily Carter',   email: 'emily.carter@mic.com',     role: 'approver',  system: 'CDS' },
  { name: 'James Wilson',   email: 'james.wilson@mic.com',     role: 'warehouse', system: 'WCCS' },
]

function quickLogin(acct) {
  email.value = acct.email
  password.value = 'demo'
  submit()
}

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

