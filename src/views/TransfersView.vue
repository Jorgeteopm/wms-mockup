<template>
  <div class="max-w-6xl mx-auto space-y-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Internal Team Transfers</h1>
        <p class="text-sm text-slate-400 mt-0.5">
          Browse another team's warehouses, pick a material they hold, and bring it in as an
          inbound against an item in one of your own warehouses. Request → approve (reserved,
          in transit) → confirm receipt. Confirming posts an outbound from the sending team and
          an inbound to the receiving one.
        </p>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">{{ counts.inTransit }} in transit</span>
        <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{{ counts.requested }} requested</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
      <!-- Create -->
      <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 self-start">
        <p class="form-label-sm">New transfer request</p>

        <div>
          <label class="text-xs font-semibold text-slate-500">From team (another team's warehouse)</label>
          <select v-model="form.fromSystem" class="form-input mt-1" @change="form.materialRowId = ''">
            <option value="">Select team…</option>
            <option v-for="s in fromSystemOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500">Material</label>
          <select v-model="form.materialRowId" :disabled="!form.fromSystem" class="form-input mt-1">
            <option value="">Select material…</option>
            <option v-for="m in materialsForFrom" :key="m.rowId" :value="m.rowId">
              {{ m.tpn }} — {{ m.description1 }} ({{ m.warehouse || 'no warehouse' }} · {{ m.qtyOnHand }} {{ m.unit }})
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500">Qty</label>
          <input v-model.number="form.qty" type="number" min="1" class="form-input mt-1" />
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500">To team (receiving)</label>
          <select v-if="admin" v-model="form.toSystem" class="form-input mt-1">
            <option value="">Select team…</option>
            <option v-for="s in systems.filter(x => x !== form.fromSystem)" :key="s" :value="s">{{ s }}</option>
          </select>
          <p v-else class="form-input mt-1 bg-gray-50 text-slate-600">{{ mySystem }} (your team)</p>
        </div>

        <!-- Which of the receiving team's own items this inbound lands on - explicit, not
             guessed, since a team can stock the same TPN in more than one of its warehouses. -->
        <div v-if="effectiveToSystem && form.materialRowId">
          <label class="text-xs font-semibold text-slate-500">Receiving item (your material)</label>
          <select v-model="form.toMaterialRowId" class="form-input mt-1" @change="form.toWarehouse = ''">
            <option value="">Select item…</option>
            <option v-for="m in destinationOptions" :key="m.rowId" :value="m.rowId">
              {{ m.tpn }} — {{ m.description1 }} ({{ m.warehouse || 'no warehouse' }} · {{ m.qtyOnHand }} {{ m.unit }})
            </option>
            <option value="__new__">+ New item for {{ effectiveToSystem }}…</option>
          </select>
        </div>

        <div v-if="form.toMaterialRowId === '__new__'">
          <label class="text-xs font-semibold text-slate-500">Receiving warehouse <span class="text-slate-400 font-normal">(new item for {{ effectiveToSystem }})</span></label>
          <select v-model="form.toWarehouse" class="form-input mt-1">
            <option value="">Select warehouse…</option>
            <option v-for="w in warehouseOptions" :key="w" :value="w">{{ w }}</option>
          </select>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500">Note</label>
          <input v-model="form.note" type="text" class="form-input mt-1" placeholder="Optional" />
        </div>
        <button
          type="button"
          @click="createTransfer"
          :disabled="!canCreate || busy"
          class="w-full py-2.5 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >Request transfer</button>
        <p v-if="msg" class="text-xs text-center" :class="msgErr ? 'text-brand-600' : 'text-emerald-600'">{{ msg }}</p>
      </div>

      <!-- Inventory by system -->
      <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden self-start">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <h2 class="text-sm font-bold text-slate-700">Inventory by system</h2>
          <select v-model="invSystem" class="form-input w-48 text-sm">
            <option value="">All systems</option>
            <option v-for="s in systems" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div v-if="!inventoryForSystem.length" class="p-10 text-center text-slate-400 text-sm">No materials{{ invSystem ? ` for ${invSystem}` : '' }}.</div>
        <div v-else class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th class="px-3 py-2.5 text-left">TPN</th>
                <th class="px-3 py-2.5 text-left">Description</th>
                <th v-if="!invSystem" class="px-3 py-2.5 text-left">System</th>
                <th class="px-3 py-2.5 text-left">Warehouse</th>
                <th class="px-3 py-2.5 text-right">Qty on hand</th>
                <th class="px-3 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in inventoryForSystem" :key="m.rowId" class="border-b border-slate-50">
                <td class="px-3 py-2.5 font-mono text-xs text-slate-600">{{ m.tpn }}</td>
                <td class="px-3 py-2.5 text-slate-800">{{ m.description1 }}</td>
                <td v-if="!invSystem" class="px-3 py-2.5 text-slate-600">{{ m.system || '—' }}</td>
                <td class="px-3 py-2.5 text-slate-600">{{ m.warehouse || '—' }}</td>
                <td class="px-3 py-2.5 text-right font-semibold text-slate-700">{{ m.qtyOnHand }} {{ m.unit }}</td>
                <td class="px-3 py-2.5">
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold border" :class="inventoryStatusClass(m.inventoryStatus)">{{ m.inventoryStatus || '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-sm font-bold text-slate-700">Transfers</h2>
        <button type="button" @click="load" class="text-xs font-semibold text-slate-400 hover:text-brand-600">Refresh</button>
      </div>
      <div v-if="loading" class="p-10 text-center text-slate-400 text-sm">Loading…</div>
      <div v-else-if="!transfers.length" class="p-10 text-center text-slate-400 text-sm">No transfers yet.</div>
      <div v-else class="overflow-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <tr>
              <th class="px-3 py-2.5 text-left">ID</th>
              <th class="px-3 py-2.5 text-left">Material</th>
              <th class="px-3 py-2.5 text-left">Route</th>
              <th class="px-3 py-2.5 text-right">Qty</th>
              <th class="px-3 py-2.5 text-left">Status</th>
              <th class="px-3 py-2.5 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transfers" :key="t.id" class="border-b border-slate-50">
              <td class="px-3 py-2.5 font-mono text-xs text-slate-600">{{ t.id }}</td>
              <td class="px-3 py-2.5">
                <div class="font-medium text-slate-800">{{ t.description || t.tpn }}</div>
                <div class="text-xs text-slate-400 font-mono">{{ t.tpn }}</div>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap">
                <div>
                  <span class="font-semibold text-slate-700">{{ t.fromSystem }}</span>
                  <span class="text-slate-300"> → </span>
                  <span class="font-semibold text-slate-700">{{ t.toSystem }}</span>
                </div>
                <div class="text-xs text-slate-400">{{ t.fromWarehouse || '—' }} → {{ t.toWarehouse || '—' }}</div>
              </td>
              <td class="px-3 py-2.5 text-right">{{ t.qty }} {{ t.unit }}</td>
              <td class="px-3 py-2.5">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="statusClass(t.status)">{{ t.status }}</span>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <button v-if="canApprove(t)" @click="act(t, 'approve')" :disabled="busy" class="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 disabled:opacity-40">Approve</button>
                  <button v-if="canConfirm(t)" @click="act(t, 'confirm')" :disabled="busy" class="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-md hover:bg-emerald-200 disabled:opacity-40">Confirm receipt</button>
                  <button v-if="canCancel(t)" @click="act(t, 'cancel')" :disabled="busy" class="px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-100 rounded-md hover:bg-red-100 hover:text-red-600 disabled:opacity-40">Cancel</button>
                  <span v-if="!canApprove(t) && !canConfirm(t) && !canCancel(t)" class="text-xs text-slate-400">—</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { user } from '../composables/useAuth.js'
import { isAdmin } from '../utils/roles.js'
import { inventoryStatusClass } from '../config/statusColors.js'

const systems = ['UPW', 'Water', 'CDS', 'WCCS', 'SDS', 'Barcode', 'TMAH', 'CCTV']

const transfers = ref([])
const materials = ref([])
const loading = ref(false)
const busy = ref(false)
const msg = ref('')
const msgErr = ref(false)

const mySystem = computed(() => user.value?.system || null)
const admin = computed(() => isAdmin(user.value))

const form = reactive({ fromSystem: '', toSystem: '', materialRowId: '', qty: 1, toMaterialRowId: '', toWarehouse: '', note: '' })
const invSystem = ref(mySystem.value || '')

const inventoryForSystem = computed(() =>
  invSystem.value ? materials.value.filter(m => m.system === invSystem.value) : materials.value
)

// A team rep only ever requests INTO their own team; only an Owner (no system of their own)
// gets to pick an arbitrary destination, acting on a team's behalf.
const effectiveToSystem = computed(() => admin.value ? form.toSystem : mySystem.value)

// "From team" only ever offers OTHER teams' warehouses - never your own.
const fromSystemOptions = computed(() => systems.filter(s => s !== effectiveToSystem.value))

const materialsForFrom = computed(() =>
  form.fromSystem ? materials.value.filter(m => m.system === form.fromSystem) : []
)

const selectedMaterial = computed(() => materials.value.find(m => m.rowId === form.materialRowId) || null)

// Every existing item the receiving team already has, so the requester explicitly picks
// which one the inbound lands on (a team can stock the same TPN at more than one of its
// warehouses) - "+ New item" covers a TPN the receiving team doesn't stock yet.
const destinationOptions = computed(() =>
  effectiveToSystem.value ? materials.value.filter(m => m.system === effectiveToSystem.value) : []
)

// If exactly one of the receiving team's items already matches this TPN, that's almost
// certainly the one being topped up - pre-select it, but leave it changeable.
watch([selectedMaterial, effectiveToSystem], ([material, toSystem]) => {
  form.toMaterialRowId = ''
  form.toWarehouse = ''
  if (!material || !toSystem) return
  const matches = materials.value.filter(m => m.system === toSystem && m.tpn === material.tpn)
  if (matches.length === 1) form.toMaterialRowId = matches[0].rowId
})

const warehouseOptions = computed(() => {
  const seen = new Set()
  for (const m of materials.value) { if (m.warehouse) seen.add(m.warehouse) }
  return [...seen].sort((a, b) => a.localeCompare(b))
})

const canCreate = computed(() =>
  form.fromSystem && effectiveToSystem.value && form.fromSystem !== effectiveToSystem.value &&
  form.materialRowId && form.qty > 0 &&
  form.toMaterialRowId && (form.toMaterialRowId !== '__new__' || form.toWarehouse)
)
const counts = computed(() => ({
  inTransit: transfers.value.filter(t => t.status === 'In Transit').length,
  requested: transfers.value.filter(t => t.status === 'Requested').length,
}))

function statusClass(s) {
  return {
    'Requested': 'bg-slate-100 text-slate-600',
    'In Transit': 'bg-amber-100 text-amber-700',
    'Confirmed': 'bg-emerald-100 text-emerald-700',
    'Cancelled': 'bg-red-100 text-red-700',
  }[s] || 'bg-slate-100 text-slate-600'
}

// Lender approves; receiver confirms; either side (or Owner) can cancel before receipt.
function canApprove(t) { return t.status === 'Requested' && (admin.value || mySystem.value === t.fromSystem) }
function canConfirm(t) { return t.status === 'In Transit' && (admin.value || mySystem.value === t.toSystem) }
function canCancel(t) { return (t.status === 'Requested' || t.status === 'In Transit') && (admin.value || mySystem.value === t.fromSystem || mySystem.value === t.toSystem) }

async function load() {
  loading.value = true
  try {
    transfers.value = await (await fetch('/api/transfers', { credentials: 'include' })).json()
    materials.value = (await (await fetch('/api/materials-db/records', { credentials: 'include' })).json()).records || []
  } catch { transfers.value = []; materials.value = [] }
  finally { loading.value = false }
}

async function createTransfer() {
  if (!canCreate.value) return
  busy.value = true; msg.value = ''
  try {
    const m = selectedMaterial.value || {}
    const creatingNew = form.toMaterialRowId === '__new__'
    const toMaterialRowId = creatingNew ? '' : form.toMaterialRowId
    const toWarehouse = creatingNew ? form.toWarehouse : (destinationOptions.value.find(d => d.rowId === form.toMaterialRowId)?.warehouse || '')
    await fetch('/api/transfers', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromSystem: form.fromSystem, toSystem: effectiveToSystem.value, materialRowId: form.materialRowId,
        tpn: m.tpn, description: m.description1, unit: m.unit, qty: form.qty, toMaterialRowId, toWarehouse, note: form.note,
      }),
    })
    msgErr.value = false; msg.value = 'Transfer requested.'
    form.materialRowId = ''; form.qty = 1; form.toMaterialRowId = ''; form.toWarehouse = ''; form.note = ''
    await load()
  } catch { msgErr.value = true; msg.value = 'Could not create the transfer.' }
  finally { busy.value = false }
}

async function act(t, action) {
  busy.value = true
  try {
    await fetch(`/api/transfers/${t.id}/${action}`, { method: 'PATCH', credentials: 'include' })
    await load()
  } finally { busy.value = false }
}

onMounted(load)
</script>
