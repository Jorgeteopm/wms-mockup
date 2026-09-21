<template>
  <div class="max-w-3xl mx-auto space-y-4 sm:space-y-6">

    <div v-if="!embedded">
      <h1 class="text-xl font-bold text-slate-800">New Outbound</h1>
      <p class="text-sm text-slate-500 mt-0.5">{{ blurb }}</p>
    </div>
    <p v-else class="text-sm text-slate-500">{{ blurb }}</p>

    <div class="rounded-xl border bg-white border-slate-100 shadow-sm p-4 sm:p-6 space-y-4">
      <!-- Narrows the item picker below - handy once the catalog has more than a handful of
           rows. Filtering by two dimensions at once is why this isn't just one dropdown. -->
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="form-label">Warehouse</label>
          <select v-model="warehouseFilter" class="form-input">
            <option value="">All warehouses</option>
            <option v-for="w in warehouseOptions" :key="w" :value="w">{{ w }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="form-label">Location</label>
          <select v-model="locationFilter" class="form-input">
            <option value="">All locations</option>
            <option v-for="l in locationOptions" :key="l" :value="l">{{ l }}</option>
          </select>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="form-label">{{ itemLabel }} <span class="text-red-500">*</span></label>
        <select v-model="selectedId" class="form-input" :disabled="loading">
          <option value="">{{ loading ? 'Loading…' : `Select ${itemLabel.toLowerCase()}…` }}</option>
          <option v-for="r in filteredRecords" :key="r.rowId" :value="r.rowId">
            {{ codeOf(r) }} — {{ descOf(r) }} ({{ qtyOf(r) }} {{ unitOf(r) }} available)
          </option>
        </select>
        <p v-if="warehouseFilter || locationFilter" class="text-xs text-slate-400">
          Showing {{ filteredRecords.length }} of {{ records.length }}.
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="form-label">
          Quantity <span class="text-red-500">*</span>
          <span v-if="selected" class="text-slate-400 font-normal normal-case">({{ qtyOf(selected) }} {{ unitOf(selected) }} available)</span>
        </label>
        <input
          v-model.number="form.qty"
          type="number"
          min="1"
          :max="selected ? qtyOf(selected) : undefined"
          class="form-input max-w-xs"
          placeholder="0"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="form-label">Delivered To <span class="text-red-500">*</span></label>
        <input v-model="form.deliveredTo" type="text" class="form-input" placeholder="Name, team or company receiving it" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="form-label">Remarks <span class="text-slate-400 font-normal normal-case">(optional)</span></label>
        <textarea v-model="form.remarks" rows="2" class="form-input"></textarea>
      </div>

      <div v-if="error" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
        {{ error }}
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          :disabled="!canSubmit || busy"
          @click="submit"
          class="px-5 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >{{ busy ? 'Recording…' : 'Record Outbound' }}</button>
      </div>
    </div>

    <!-- What went out this session - the mock has no server round trip to read it back from -->
    <div v-if="recent.length" class="rounded-xl border bg-white border-slate-100 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100">
        <h2 class="text-sm font-bold text-slate-700">Recorded this session</h2>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <tr>
            <th class="px-3 py-2.5 text-left">{{ itemLabel }}</th>
            <th class="px-3 py-2.5 text-right">Qty</th>
            <th class="px-3 py-2.5 text-left">From</th>
            <th class="px-3 py-2.5 text-left">Delivered To</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in recent" :key="i" class="border-t border-slate-50">
            <td class="px-3 py-2.5 font-mono text-xs text-slate-600">{{ row.code }}</td>
            <td class="px-3 py-2.5 text-right font-semibold text-slate-700">{{ row.qty }} {{ row.unit }}</td>
            <td class="px-3 py-2.5 text-slate-600">{{ row.from || '—' }}</td>
            <td class="px-3 py-2.5 text-slate-600">{{ row.deliveredTo }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <transition name="toast">
        <div
          v-if="toast"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-emerald-600"
        >{{ toast }}</div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'

const props = defineProps({
  kind:     { type: String, required: true }, // 'material' | 'equipment'
  embedded: { type: Boolean, default: false },
})

const CONFIG = {
  material: {
    itemLabel: 'Material',
    blurb: 'Release material from Pinnacle Peak stock and record who it went to.',
    recordsUrl: '/api/materials-db/records',
    parseRecords: data => data.records || [],
    outboundUrl: rowId => `/api/materials-db/${rowId}/outbound`,
    code: r => r.tpn,
    desc: r => r.description1,
    qty:  r => r.qtyOnHand,
    unit: r => r.unit || '',
    location: r => r.location || r.warehouse || '',
    warehouseOf: r => r.warehouse || '',
    locationOf:  r => r.location || '',
  },
  equipment: {
    itemLabel: 'Unit',
    blurb: 'Release an equipment unit from the Laydown Yard and record who it went to.',
    recordsUrl: '/api/laydown/records',
    parseRecords: data => data || [],
    outboundUrl: rowId => `/api/laydown/${rowId}/outbound`,
    code: r => r.partNumber,
    desc: r => r.chemical || r.description,
    qty:  r => r.qty,
    unit: () => '',
    location: r => r.location || r.warehouse || '',
    warehouseOf: r => r.warehouse || '',
    locationOf:  r => r.location || '',
  },
}

const cfg = computed(() => CONFIG[props.kind])
const itemLabel = computed(() => cfg.value.itemLabel)
const blurb = computed(() => cfg.value.blurb)

const codeOf = r => cfg.value.code(r)
const descOf = r => cfg.value.desc(r) || '—'
const qtyOf  = r => cfg.value.qty(r) ?? 0
const unitOf = r => cfg.value.unit(r)

const records = ref([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const toast = ref('')

const selectedId = ref('')
const form = reactive({ qty: '', deliveredTo: '', remarks: '' })
const recent = ref([])

const warehouseFilter = ref('')
const locationFilter = ref('')

function optionsFrom(accessor) {
  const seen = new Set()
  for (const r of records.value) {
    const value = String(accessor(r) ?? '').trim()
    if (value) seen.add(value)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

const warehouseOptions = computed(() => optionsFrom(cfg.value.warehouseOf))
const locationOptions  = computed(() => optionsFrom(cfg.value.locationOf))

const filteredRecords = computed(() => records.value.filter(r => {
  if (warehouseFilter.value && cfg.value.warehouseOf(r) !== warehouseFilter.value) return false
  if (locationFilter.value && cfg.value.locationOf(r) !== locationFilter.value) return false
  return true
}))

// A filter change can hide the item currently picked - the form has to notice, not leave a
// selection that no longer matches what's on screen.
watch(filteredRecords, (list) => {
  if (selectedId.value && !list.some(r => r.rowId === selectedId.value)) selectedId.value = ''
})

const selected = computed(() => records.value.find(r => r.rowId === selectedId.value) || null)

// The picker's Warehouse filter already says where it's coming from - no separate "From"
// field to fill in, just read it off the selected item for the record.
const selectedFrom = computed(() => selected.value ? cfg.value.location(selected.value) : '')

const canSubmit = computed(() =>
  !!selected.value &&
  Number(form.qty) > 0 &&
  Number(form.qty) <= qtyOf(selected.value) &&
  form.deliveredTo.trim()
)

async function loadRecords() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(cfg.value.recordsUrl, { credentials: 'include' })
    const data = await res.json()
    records.value = cfg.value.parseRecords(data)
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
}

function showToast(message) {
  toast.value = message
  setTimeout(() => { toast.value = '' }, 3000)
}

async function submit() {
  if (!canSubmit.value || !selected.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await fetch(cfg.value.outboundUrl(selected.value.rowId), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: form.qty, from: selectedFrom.value, deliveredTo: form.deliveredTo, remarks: form.remarks }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to record the outbound.')

    recent.value.unshift({ code: codeOf(selected.value), qty: form.qty, unit: unitOf(selected.value), from: selectedFrom.value, deliveredTo: form.deliveredTo })
    showToast(data.message || 'Outbound recorded.')

    form.qty = ''
    form.deliveredTo = ''
    form.remarks = ''
    // Refreshes available qty on the still-selected item, so a second partial release
    // against it starts from the up-to-date balance instead of the stale one.
    await loadRecords()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

onMounted(loadRecords)
</script>
