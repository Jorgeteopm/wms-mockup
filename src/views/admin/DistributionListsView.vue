<template>
  <div class="max-w-5xl mx-auto space-y-5">

    <div>
      <h1 class="text-xl font-bold text-slate-800">Email Distribution Lists</h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Who gets notified by email for each event type. Mirrors the real app's
        Warehouse / Approvers / No-Show recipient lists.
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

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="group in GROUPS"
        :key="group.key"
        class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 self-start"
      >
        <div>
          <h2 class="text-sm font-bold text-slate-800">{{ group.label }}</h2>
          <p class="text-xs text-slate-400 mt-0.5">{{ group.blurb }}</p>
        </div>

        <ul class="space-y-1.5">
          <li
            v-for="email in lists[group.key]"
            :key="email"
            class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
          >
            <span class="text-sm text-slate-700 truncate">{{ email }}</span>
            <button
              type="button"
              @click="removeEmail(group.key, email)"
              class="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded leading-none text-base transition-colors"
            >
              ×
            </button>
          </li>
          <li v-if="!lists[group.key]?.length" class="text-sm text-slate-400 px-3 py-2">
            No recipients yet.
          </li>
        </ul>

        <form @submit.prevent="addEmail(group.key)" class="flex gap-2">
          <select v-model="drafts[group.key]" class="form-input flex-1">
            <option value="" disabled>Select a demo user…</option>
            <option v-for="u in availableUsers(group.key)" :key="u.email" :value="u.email">
              {{ u.name }} — {{ u.email }}
            </option>
          </select>
          <button
            type="submit"
            :disabled="!drafts[group.key] || saving === group.key"
            class="px-3 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Add
          </button>
        </form>
        <p v-if="!availableUsers(group.key).length" class="text-xs text-slate-400">
          Every demo user is already on this list.
        </p>
      </div>
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
import { reactive, ref, onMounted } from 'vue'

const GROUPS = [
  { key: 'warehouse', label: 'Warehouse',  blurb: 'New inbound / outbound activity and internal transfer updates.' },
  { key: 'approvers', label: 'Approvers',  blurb: 'Transmittals awaiting approval and decline notices.' },
  { key: 'noShow',    label: 'No Show',    blurb: 'Recipient pickups marked as No-Show.' },
]

const loading = ref(true)
const error = ref('')
const saving = ref('')
const toast = ref(null)

const lists = reactive({ warehouse: [], approvers: [], noShow: [] })
const drafts = reactive({ warehouse: '', approvers: '', noShow: '' })
const users = ref([])

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

// Only demo users not already on a given list can be picked for it, so the same person
// can't be added twice from the dropdown.
function availableUsers(key) {
  return users.value.filter(u => u.email && !lists[key].includes(u.email))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [listsRes, usersRes] = await Promise.all([
      fetch('/api/admin/distribution-lists', { credentials: 'include' }),
      fetch('/api/users', { credentials: 'include' }),
    ])
    const listsData = await listsRes.json()
    if (!listsRes.ok) throw new Error(listsData.message || 'Failed to load the distribution lists.')
    Object.assign(lists, listsData)

    const usersData = await usersRes.json()
    if (usersRes.ok) users.value = usersData.users || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function saveGroup(key) {
  saving.value = key
  try {
    const res = await fetch(`/api/admin/distribution-lists/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emails: lists[key] }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to save.')
    showToast('Distribution list updated.')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    saving.value = ''
  }
}

function addEmail(key) {
  const email = drafts[key]
  if (!email || lists[key].includes(email)) return
  lists[key].push(email)
  drafts[key] = ''
  saveGroup(key)
}

function removeEmail(key, email) {
  lists[key] = lists[key].filter(e => e !== email)
  saveGroup(key)
}

onMounted(load)
</script>
