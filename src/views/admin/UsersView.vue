<template>
  <div class="max-w-7xl mx-auto">

    <!-- Page header -->
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
      <div class="bg-red-600 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 class="text-white font-bold text-lg">User Management</h1>
          <p class="text-red-200 text-sm">用戶管理</p>
        </div>
        <button @click="openInvite" class="px-4 py-2 text-sm font-bold text-red-700 bg-white rounded-lg hover:bg-red-50 transition-colors">
          + Invite User
        </button>
      </div>
    </div>

    <!-- Table card -->
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">

      <!-- Loading -->
      <div v-if="loading" class="p-12 flex justify-center">
        <svg class="animate-spin h-6 w-6 text-red-400" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="p-10 text-center text-red-500 text-sm font-semibold">
        {{ loadError }}
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th class="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
              <th class="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th class="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th class="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Login</th>
              <th v-if="isAdmin" class="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Can Manage Users</th>
              <th class="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in users"
              :key="u.id"
              class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <!-- Avatar + name + email -->
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div :class="avatarColor(u.name)" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {{ initials(u.name) }}
                  </div>
                  <div>
                    <p class="font-semibold text-slate-800">{{ u.name }}</p>
                    <p class="text-xs text-slate-400">{{ u.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Company -->
              <td class="px-5 py-3 text-slate-600">{{ u.company }}</td>

              <!-- Role badge -->
              <td class="px-5 py-3">
                <span :class="ROLE_COLORS[u.role]" class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize">
                  {{ u.role }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-5 py-3">
                <span v-if="u.isActive" class="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  Active
                </span>
                <span v-else class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  Pending
                </span>
              </td>

              <!-- Last login -->
              <td class="px-5 py-3 text-slate-500 text-xs">{{ formatDate(u.lastLoginAt) }}</td>

              <!-- Can manage users toggle (admin only) -->
              <td v-if="isAdmin" class="px-5 py-3">
                <button
                  @click="toggleCanManage(u)"
                  :class="u.canManageUsers ? 'bg-red-600' : 'bg-gray-200'"
                  class="relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none"
                  :title="u.canManageUsers ? 'Revoke user management' : 'Grant user management'"
                >
                  <span
                    :class="u.canManageUsers ? 'translate-x-4' : 'translate-x-0.5'"
                    class="mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                  />
                </button>
              </td>

              <!-- Actions -->
              <td class="px-5 py-3">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="!u.isActive"
                    @click="resendInvite(u)"
                    :disabled="busyId === u.id"
                    class="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-md hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    Resend Invite
                  </button>
                  <button
                    @click="openEdit(u)"
                    class="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    v-if="isAdmin && u.id !== currentUser.id"
                    @click="confirmDelete(u)"
                    class="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="users.length === 0">
              <td :colspan="isAdmin ? 7 : 6" class="px-5 py-10 text-center text-slate-400 text-sm">
                No users found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-slate-500">
        <span>Showing {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }} of {{ total }}</span>
        <div class="flex gap-2">
          <button
            @click="changePage(page - 1)"
            :disabled="page === 1"
            class="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >← Prev</button>
          <button
            @click="changePage(page + 1)"
            :disabled="page * limit >= total"
            class="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >Next →</button>
        </div>
      </div>

    </div>

    <!-- Toast notification -->
    <transition name="toast">
      <div
        v-if="toast"
        :class="toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'"
        class="fixed bottom-6 right-6 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50"
      >
        {{ toast.message }}
      </div>
    </transition>

    <!-- ── Modal ── -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40" @click.self="closeModal">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        <!-- Modal header -->
        <div class="bg-red-600 px-6 py-4 flex items-center justify-between">
          <h2 class="text-white font-bold text-base">
            {{ modal.mode === 'invite' ? 'Invite New User' : 'Edit User' }}
          </h2>
          <button @click="closeModal" class="text-red-200 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <!-- Modal body -->
        <form @submit.prevent="submitModal" class="p-6 space-y-4">

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Full Name</label>
            <input v-model="modal.name" type="text" placeholder="Juan Dela Cruz" required class="form-input" />
          </div>

          <div v-if="modal.mode === 'invite'" class="flex flex-col gap-1.5">
            <label class="form-label">Email</label>
            <input v-model="modal.email" type="email" placeholder="name@company.com" required class="form-input" />
          </div>
          <div v-else class="flex flex-col gap-1.5">
            <label class="form-label">Email</label>
            <p class="px-3 py-2.5 text-sm text-slate-400 bg-gray-50 border border-gray-200 rounded-lg">{{ modal.email }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Company</label>
            <input v-model="modal.company" type="text" placeholder="MMI Construction" required class="form-input" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Phone <span class="text-slate-400 font-normal">(optional)</span></label>
            <input v-model="modal.phone" type="text" placeholder="+63 9XX XXX XXXX" class="form-input" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Role</label>
            <select v-model="modal.role" required class="form-input">
              <option value="" disabled>Select a role…</option>
              <option v-if="isAdmin" value="admin">Admin</option>
              <option value="approver">Approver</option>
              <option value="warehouse">Warehouse</option>
              <!-- Admin access, but its emails never reach the distribution lists. -->
              <option v-if="isAdmin" value="testing">Testing</option>
            </select>
          </div>

          <!-- is_active toggle (edit mode only, admin only, can't deactivate self) -->
          <div v-if="modal.mode === 'edit' && isAdmin && modal.id !== currentUser.id" class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-semibold text-slate-700">Account active</p>
              <p class="text-xs text-slate-400">Inactive users cannot log in.</p>
            </div>
            <button
              type="button"
              @click="modal.isActive = !modal.isActive"
              :class="modal.isActive ? 'bg-red-600' : 'bg-gray-200'"
              class="relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none"
            >
              <span
                :class="modal.isActive ? 'translate-x-5' : 'translate-x-0.5'"
                class="mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
              />
            </button>
          </div>

          <!-- Modal error -->
          <div v-if="modalError" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {{ modalError }}
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" class="px-4 py-2 text-sm font-semibold text-slate-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              :disabled="modalLoading"
              class="px-5 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <span v-if="modalLoading">Saving…</span>
              <span v-else-if="modal.mode === 'invite'">Send Invite</span>
              <span v-else>Save Changes</span>
            </button>
          </div>

        </form>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div v-if="deleteTarget" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40" @click.self="deleteTarget = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-10 0h14"/>
          </svg>
        </div>
        <h3 class="text-base font-bold text-slate-800 mb-1">Delete user?</h3>
        <p class="text-sm text-slate-500 mb-5">
          <strong>{{ deleteTarget.name }}</strong> will be permanently removed.
        </p>
        <div class="flex gap-3">
          <button @click="deleteTarget = null" class="flex-1 py-2 text-sm font-semibold text-slate-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button @click="deleteUser" :disabled="busyId === deleteTarget.id" class="flex-1 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ROLE_COLORS } from '../../config/statusColors.js'
import { user as currentUser } from '../../composables/useAuth.js'
import { isAdmin as hasAdminAccess } from '../../utils/roles.js'


const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-purple-500', 'bg-amber-500', 'bg-pink-500'
]

const isAdmin = computed(() => hasAdminAccess(currentUser.value))

// ── State ──
const users     = ref([])
const total     = ref(0)
const page      = ref(1)
const limit     = ref(20)
const loading   = ref(true)
const loadError = ref('')
const busyId    = ref(null)
const toast     = ref(null)
const modal     = ref(null)
const modalLoading = ref(false)
const modalError   = ref('')
const deleteTarget = ref(null)

// ── Helpers ──
function initials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase()
}

function avatarColor(name) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function formatDate(date) {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

// ── Data fetching ──
async function loadUsers() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await fetch(`/api/users?page=${page.value}&limit=${limit.value}`, { credentials: 'include' })
    if (!res.ok) throw new Error((await res.json()).message)
    const data = await res.json()
    users.value = data.users
    total.value = data.total
  } catch (e) {
    loadError.value = e.message || 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

function changePage(n) {
  page.value = n
  loadUsers()
}

onMounted(loadUsers)

// ── Invite modal ──
function openInvite() {
  modalError.value = ''
  modal.value = { mode: 'invite', name: '', email: '', company: '', phone: '', role: '' }
}

// ── Edit modal ──
function openEdit(u) {
  modalError.value = ''
  modal.value = { mode: 'edit', id: u.id, name: u.name, email: u.email, company: u.company, phone: u.phone ?? '', role: u.role, isActive: u.isActive }
}

function closeModal() {
  modal.value = null
  modalError.value = ''
}

async function submitModal() {
  modalError.value = ''
  modalLoading.value = true
  try {
    if (modal.value.mode === 'invite') {
      const res = await fetch('/api/users', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          name:    modal.value.name,
          email:   modal.value.email,
          company: modal.value.company,
          phone:   modal.value.phone || undefined,
          role:    modal.value.role
        })
      })
      const data = await res.json()
      if (!res.ok) { modalError.value = data.message; return }
      showToast(`Invite sent to ${modal.value.email}.`)
    } else {
      const res = await fetch(`/api/users/${modal.value.id}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          name:     modal.value.name,
          company:  modal.value.company,
          phone:    modal.value.phone || undefined,
          role:     modal.value.role,
          isActive: modal.value.isActive
        })
      })
      const data = await res.json()
      if (!res.ok) { modalError.value = data.message; return }
      showToast('User updated.')
    }
    closeModal()
    loadUsers()
  } catch {
    modalError.value = 'Request failed. Please try again.'
  } finally {
    modalLoading.value = false
  }
}

// ── Resend invite ──
async function resendInvite(u) {
  busyId.value = u.id
  try {
    const res = await fetch(`/api/users/${u.id}/resend-invite`, {
      method: 'POST', credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.message, 'error'); return }
    showToast(`Invite resent to ${u.email}.`)
  } catch {
    showToast('Request failed.', 'error')
  } finally {
    busyId.value = null
  }
}

// ── Toggle canManageUsers (admin only) ──
async function toggleCanManage(u) {
  try {
    const res = await fetch(`/api/users/${u.id}/can-manage`, {
      method:      'PATCH',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ canManageUsers: !u.canManageUsers })
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.message, 'error'); return }
    u.canManageUsers = data.canManageUsers
  } catch {
    showToast('Request failed.', 'error')
  }
}

// ── Delete ──
function confirmDelete(u) {
  deleteTarget.value = u
}

async function deleteUser() {
  busyId.value = deleteTarget.value.id
  try {
    const res = await fetch(`/api/users/${deleteTarget.value.id}`, {
      method: 'DELETE', credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.message, 'error'); return }
    showToast(`${deleteTarget.value.name} deleted.`)
    deleteTarget.value = null
    loadUsers()
  } catch {
    showToast('Request failed.', 'error')
  } finally {
    busyId.value = null
  }
}
</script>

