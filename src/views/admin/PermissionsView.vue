<template>
  <div class="max-w-5xl mx-auto space-y-5">

    <div>
      <h1 class="text-xl font-bold text-slate-800">Permissions</h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Basic capability matrix for the four planning roles below.
      </p>
    </div>

    <div class="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-dashed border-amber-300 bg-amber-50">
      <svg class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
      <p class="text-xs text-amber-800">
        Illustration only — <strong>Owner / Admin / Warehouse Admin / Warehouse</strong> are a
        simplified planning model for this screen. Toggling a checkbox here does not change
        what the demo login accounts (Owner, Approver, Warehouse) can actually do elsewhere in
        this mockup.
      </p>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-slate-400">
      <svg class="animate-spin h-5 w-5 text-brand-600 mr-2" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      Loading…
    </div>

    <div v-else class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
            <th class="px-5 py-3 text-left">Capability</th>
            <th v-for="role in roles" :key="role" class="px-5 py-3 text-center whitespace-nowrap">{{ role }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="cap in capabilities" :key="cap.key" class="hover:bg-slate-50 transition-colors">
            <td class="px-5 py-3 text-slate-700 font-medium">{{ cap.label }}</td>
            <td v-for="role in roles" :key="role" class="px-5 py-3 text-center">
              <input
                type="checkbox"
                :checked="cap.grants[role]"
                :disabled="saving === `${cap.key}:${role}`"
                @change="toggle(cap, role, $event.target.checked)"
                class="accent-brand-600 w-4 h-4 cursor-pointer disabled:opacity-50"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <transition name="toast">
        <div
          v-if="toast"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white"
          :class="toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'"
        >
          {{ toast.message }}
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')
const saving = ref('')
const toast = ref(null)

const roles = ref([])
const capabilities = ref([])

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/admin/permissions', { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to load permissions.')
    roles.value = data.roles
    capabilities.value = data.capabilities
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function toggle(cap, role, value) {
  const previous = cap.grants[role]
  cap.grants[role] = value
  saving.value = `${cap.key}:${role}`

  try {
    const res = await fetch('/api/admin/permissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ key: cap.key, role, value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to save.')
    showToast('Permission updated.')
  } catch (e) {
    cap.grants[role] = previous
    showToast(e.message, 'error')
  } finally {
    saving.value = ''
  }
}

onMounted(load)
</script>
