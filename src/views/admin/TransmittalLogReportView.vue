<template>
  <div class="max-w-screen-2xl mx-auto space-y-5">

    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Transmittal Log Report</h1>
        <p class="text-sm text-slate-500 mt-0.5">One row per transmittal · live Smartsheet data</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="load"
          :disabled="loading"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
        <button
          @click="downloadCsv"
          :disabled="loading || !rows.length"
          class="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          Export CSV
        </button>
        <button
          @click="openPdf"
          :disabled="loading || !rows.length"
          class="px-3 py-1.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          Export PDF
        </button>
      </div>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Summary strip -->
    <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <div v-for="card in summaryCards" :key="card.label" class="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
        <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-bold" :class="card.color">{{ card.value }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Requested Month</span>
        <select v-model="monthFilter" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm min-w-[150px]">
          <option value="all">All months</option>
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</span>
        <select v-model="statusFilter" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm min-w-[150px]">
          <option value="all">All statuses</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pickup Status</span>
        <select v-model="pickupFilter" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm min-w-[130px]">
          <option value="all">All</option>
          <option v-for="s in pickupOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 flex-1 min-w-[200px]">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Search</span>
        <input
          v-model="search"
          type="text"
          placeholder="ID, recipient, company, remark…"
          class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm w-full"
        />
      </label>
      <button
        v-if="hasFilters"
        @click="clearFilters"
        class="px-3 py-1.5 text-sm font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        Clear
      </button>
      <span class="text-sm text-slate-500 ml-auto">{{ filteredRows.length }} of {{ rows.length }}</span>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
              <th
                v-for="col in columns"
                :key="col.key"
                class="px-3 py-3 text-left whitespace-nowrap cursor-pointer select-none hover:text-slate-700"
                @click="toggleSort(col.key)"
              >
                {{ col.label }}{{ sortIndicator(col.key) }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td :colspan="columns.length" class="px-3 py-8 text-center text-slate-400">Loading…</td>
            </tr>
            <tr v-else-if="!filteredRows.length">
              <td :colspan="columns.length" class="px-3 py-8 text-center text-slate-400">No transmittals match the current filters.</td>
            </tr>
            <tr v-for="row in filteredRows" :key="row.transmittalId" class="hover:bg-slate-50/70">
              <td class="px-3 py-2.5 font-medium text-xs text-slate-800 whitespace-nowrap">{{ row.transmittalId }}</td>
              <td class="px-3 py-2.5 text-slate-700 whitespace-nowrap">{{ row.recipient || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-700">{{ row.company || '—' }}</td>
              <td class="px-3 py-2.5">
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  :class="pillClass(SIGNATURE_STATUS_COLORS, row.signatureStatus)"
                >{{ row.signatureStatus || '—' }}</span>
              </td>
              <td class="px-3 py-2.5 text-slate-600 text-xs">{{ row.transmittalStatus || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-600 text-xs">{{ row.recipientStatus || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-600 text-xs max-w-[220px] truncate" :title="row.reason">{{ row.reason || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-700 whitespace-nowrap">{{ row.warehouseDate || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-600 whitespace-nowrap">{{ row.warehouseWeek || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-700 whitespace-nowrap">{{ row.pickupEarliest || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-700 whitespace-nowrap">{{ row.pickupDeadline || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-700 whitespace-nowrap">{{ row.pickupActual || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-600 text-xs max-w-[220px] truncate" :title="row.remark">{{ row.remark || '—' }}</td>
              <td class="px-3 py-2.5 text-slate-600 text-xs max-w-[220px] truncate" :title="row.comments">{{ row.comments || '—' }}</td>
              <td class="px-3 py-2.5">
                <span
                  v-if="row.urgencyLevel"
                  class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  :class="pillClass(URGENCY_COLORS, shortLabel(row.urgencyLevel))"
                  :title="row.urgencyLevel"
                >{{ shortLabel(row.urgencyLevel) }}</span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                <span :class="row.open ? 'text-amber-600 font-semibold' : 'text-slate-700'">
                  {{ row.processingDays ?? '—' }}<span v-if="row.open" title="Still open — counted up to now">*</span>
                </span>
              </td>
              <td class="px-3 py-2.5">
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  :class="pillClass(RECIPIENT_STATUS_COLORS, row.pickupStatus)"
                >{{ row.pickupStatus }}</span>
              </td>
              <td class="px-3 py-2.5 text-slate-600 whitespace-nowrap">{{ row.requestedMonthLabel || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-xs text-slate-400">
      Processing days run from the warehouse acknowledgement step.
    </p>

    <!-- PDF preview modal -->
    <div v-if="showPdf" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click.self="showPdf = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 class="text-sm font-semibold text-slate-700">Transmittal Log Report</h2>
          <div class="flex items-center gap-2">
            <button @click="pdfFrame?.contentWindow?.print()" class="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Print</button>
            <button @click="showPdf = false" class="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">Close</button>
          </div>
        </div>
        <iframe ref="pdfFrame" :src="pdfUrl" class="flex-1 w-full" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  SIGNATURE_STATUS_COLORS, URGENCY_COLORS, RECIPIENT_STATUS_COLORS,
  pillClass, shortLabel,
} from '../../config/statusColors.js'

const API = '/api/admin'

const loading = ref(false)
const error   = ref('')
const rows    = ref([])
const columns = ref([])

const monthFilter  = ref('all')
const statusFilter = ref('all')
const pickupFilter = ref('all')
const search       = ref('')

const sortKey = ref('transmittalId')
const sortDir = ref('desc')

const showPdf  = ref(false)
const pdfFrame = ref(null)

const summaryCards = computed(() => {
  const list      = filteredRows.value
  const processed = list.filter(r => r.processingDays !== null)
  const count     = status => list.filter(r => r.pickupStatus === status).length
  return [
    { label: 'Total',           value: list.length,                              color: 'text-slate-800' },
    { label: 'Closed',          value: list.filter(r => !r.open).length,         color: 'text-emerald-600' },
    { label: 'Open',            value: list.filter(r =>  r.open).length,         color: 'text-amber-500' },
    { label: 'On Time',         value: count('On Time'),                         color: 'text-emerald-600' },
    { label: 'Late',            value: count('Late'),                            color: 'text-amber-600' },
    { label: 'No Show',         value: count('No Show'),                         color: 'text-red-500' },
    {
      label: 'Avg. Proc. Days',
      value: processed.length
        ? Math.round(processed.reduce((sum, r) => sum + r.processingDays, 0) / processed.length)
        : '—',
      color: 'text-blue-600',
    },
  ]
})

const monthOptions = computed(() => {
  const seen = new Map()
  for (const r of rows.value) {
    if (r.requestedMonth && !seen.has(r.requestedMonth)) seen.set(r.requestedMonth, r.requestedMonthLabel || r.requestedMonth)
  }
  return [...seen.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([value, label]) => ({ value, label }))
})

const statusOptions = computed(() =>
  [...new Set(rows.value.map(r => r.signatureStatus).filter(Boolean))].sort()
)

const pickupOptions = computed(() =>
  [...new Set(rows.value.map(r => r.pickupStatus).filter(Boolean))].sort()
)

const hasFilters = computed(() =>
  monthFilter.value !== 'all' || statusFilter.value !== 'all' || pickupFilter.value !== 'all' || !!search.value
)

const filteredRows = computed(() => {
  const needle = search.value.trim().toLowerCase()
  const out = rows.value.filter(r => {
    if (monthFilter.value  !== 'all' && r.requestedMonth  !== monthFilter.value)  return false
    if (statusFilter.value !== 'all' && r.signatureStatus !== statusFilter.value) return false
    if (pickupFilter.value !== 'all' && r.pickupStatus    !== pickupFilter.value) return false
    if (!needle) return true
    return [r.transmittalId, r.recipient, r.company, r.remark, r.comments, r.reason]
      .some(v => String(v ?? '').toLowerCase().includes(needle))
  })

  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return out.sort((a, b) => {
    const av = a[key], bv = b[key]
    if (av === bv) return 0
    if (av === null || av === undefined || av === '') return 1   // blanks always last
    if (bv === null || bv === undefined || bv === '') return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir
  })
})

function toggleSort(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
}

function sortIndicator(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

function clearFilters() {
  monthFilter.value = 'all'
  statusFilter.value = 'all'
  pickupFilter.value = 'all'
  search.value = ''
}

function exportQuery(format) {
  const params = new URLSearchParams({ format })
  if (monthFilter.value  !== 'all') params.set('month', monthFilter.value)
  if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
  if (pickupFilter.value !== 'all') params.set('pickupStatus', pickupFilter.value)
  return params.toString()
}

const pdfUrl = computed(() => `${API}/reports/transmittal-log?${exportQuery('pdf')}`)

function openPdf() {
  showPdf.value = true
}

function downloadCsv() {
  window.location.href = `${API}/reports/transmittal-log?${exportQuery('csv')}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/reports/transmittal-log`, { credentials: 'include' })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to load report.')
    const data = await res.json()
    rows.value    = data.rows
    columns.value = data.columns
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
