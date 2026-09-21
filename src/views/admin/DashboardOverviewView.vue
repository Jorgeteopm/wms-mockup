<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Materials Dashboard</h1>
        <p class="text-sm text-slate-500 mt-0.5">Inbound / outbound activity across the inventory ledger.</p>
      </div>
      <div class="flex items-center gap-2">
        <div v-if="canFilterSystem" class="flex items-center gap-1.5">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">System</span>
          <select
            v-model="systemFilter"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
          >
            <option value="">All systems</option>
            <option v-for="s in SYSTEMS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <button
          @click="loadAll"
          :disabled="loading"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-4 pt-3 flex flex-wrap items-end gap-3">
        <div class="flex gap-1 flex-wrap">
          <button
            v-for="tab in typeTabs"
            :key="tab.key"
            @click="typeFilter = tab.key"
            :class="typeFilter === tab.key
              ? 'border-b-2 border-brand-500 text-brand-600 font-semibold'
              : 'text-slate-500 hover:text-slate-700'"
            class="px-3 py-2 text-sm transition-colors whitespace-nowrap"
          >
            {{ tab.label }}
            <span
              class="ml-1 text-xs rounded-full px-1.5 py-0.5"
              :class="typeFilter === tab.key ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'"
            >{{ tab.count }}</span>
          </button>
        </div>
        <div class="ml-auto pb-2 flex flex-wrap items-center gap-2">
          <span class="text-sm text-slate-500 font-medium">Filter by date range:</span>
          <input
            v-model="dateFrom"
            type="date"
            title="From date"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <span class="text-slate-400 text-sm">–</span>
          <input
            v-model="dateTo"
            type="date"
            title="To date"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            v-model="search"
            type="text"
            placeholder="Search TPN, description…"
            class="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>
      <div class="h-3"></div>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total In</p>
        <p class="mt-1 text-3xl font-bold text-emerald-600">{{ formatQty(totals.in) }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Out</p>
        <p class="mt-1 text-3xl font-bold text-brand-500">{{ formatQty(totals.out) }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Net Change</p>
        <p class="mt-1 text-3xl font-bold" :class="totals.net >= 0 ? 'text-slate-800' : 'text-brand-600'">{{ formatQty(totals.net) }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Movements</p>
        <p class="mt-1 text-3xl font-bold text-slate-800">{{ movements.length.toLocaleString() }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Low / Out of Stock</p>
        <p class="mt-1 text-3xl font-bold text-amber-500">{{ lowStockCount }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Systems</p>
        <p class="mt-1 text-3xl font-bold text-slate-800">{{ bySystem.length }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- By type -->
      <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden self-start">
        <div class="px-4 py-3 border-b border-slate-100">
          <h2 class="text-sm font-bold text-slate-700">Movements by Type</h2>
        </div>
        <div v-if="loading" class="p-10 text-center text-slate-400 text-sm">Loading…</div>
        <div v-else-if="!byType.length" class="p-10 text-center text-slate-400 text-sm">No movements recorded.</div>
        <table v-else class="w-full text-sm">
          <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <tr>
              <th class="px-4 py-2.5 text-left">Type</th>
              <th class="px-4 py-2.5 text-right">Count</th>
              <th class="px-4 py-2.5 text-right">In</th>
              <th class="px-4 py-2.5 text-right">Out</th>
              <th class="px-4 py-2.5 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in byType" :key="row.key" class="border-t border-slate-50">
              <td class="px-4 py-2.5 font-medium text-slate-700">{{ row.key }}</td>
              <td class="px-4 py-2.5 text-right text-slate-600">{{ row.count }}</td>
              <td class="px-4 py-2.5 text-right text-emerald-600">{{ formatQty(row.in) }}</td>
              <td class="px-4 py-2.5 text-right text-brand-500">{{ formatQty(row.out) }}</td>
              <td class="px-4 py-2.5 text-right font-semibold" :class="row.net >= 0 ? 'text-slate-700' : 'text-brand-600'">{{ formatQty(row.net) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- By system -->
      <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden self-start">
        <div class="px-4 py-3 border-b border-slate-100">
          <h2 class="text-sm font-bold text-slate-700">By System</h2>
        </div>
        <div v-if="loading" class="p-10 text-center text-slate-400 text-sm">Loading…</div>
        <div v-else-if="!bySystem.length" class="p-10 text-center text-slate-400 text-sm">No movements recorded.</div>
        <table v-else class="w-full text-sm">
          <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <tr>
              <th class="px-4 py-2.5 text-left">System</th>
              <th class="px-4 py-2.5 text-right">Count</th>
              <th class="px-4 py-2.5 text-right">In</th>
              <th class="px-4 py-2.5 text-right">Out</th>
              <th class="px-4 py-2.5 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in bySystem" :key="row.key" class="border-t border-slate-50">
              <td class="px-4 py-2.5 font-medium text-slate-700">{{ row.key }}</td>
              <td class="px-4 py-2.5 text-right text-slate-600">{{ row.count }}</td>
              <td class="px-4 py-2.5 text-right text-emerald-600">{{ formatQty(row.in) }}</td>
              <td class="px-4 py-2.5 text-right text-brand-500">{{ formatQty(row.out) }}</td>
              <td class="px-4 py-2.5 text-right font-semibold" :class="row.net >= 0 ? 'text-slate-700' : 'text-brand-600'">{{ formatQty(row.net) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent activity -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100">
        <h2 class="text-sm font-bold text-slate-700">Recent Activity</h2>
      </div>
      <div v-if="loading" class="p-10 text-center text-slate-400 text-sm">Loading…</div>
      <div v-else-if="!recent.length" class="p-10 text-center text-slate-400 text-sm">No movements recorded.</div>
      <div v-else class="overflow-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <tr>
              <th class="px-4 py-2.5 text-left">Date</th>
              <th class="px-4 py-2.5 text-left">Type</th>
              <th class="px-4 py-2.5 text-left">TPN</th>
              <th class="px-4 py-2.5 text-left">Description</th>
              <th class="px-4 py-2.5 text-left">System</th>
              <th class="px-4 py-2.5 text-left">In/Out</th>
              <th class="px-4 py-2.5 text-right">Qty</th>
              <th class="px-4 py-2.5 text-left">By</th>
              <th class="px-4 py-2.5 text-center">Lifecycle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in recent" :key="row.rowId" class="border-t border-slate-50">
              <td class="px-4 py-2.5 text-slate-600 whitespace-nowrap">{{ row.createdAt || '—' }}</td>
              <td class="px-4 py-2.5 text-slate-700">{{ row.movementType || '—' }}</td>
              <td class="px-4 py-2.5 font-mono text-xs text-slate-600">{{ row.tpn || '—' }}</td>
              <td class="px-4 py-2.5 text-slate-700 truncate max-w-[240px]" :title="row.description1">{{ row.description1 || '—' }}</td>
              <td class="px-4 py-2.5 text-slate-600">{{ row.system || '—' }}</td>
              <td class="px-4 py-2.5">
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-semibold"
                  :class="row.direction === 'Out' ? 'bg-brand-100 text-brand-700' : 'bg-emerald-100 text-emerald-700'"
                >{{ row.direction || '—' }}</span>
              </td>
              <td class="px-4 py-2.5 text-right font-semibold text-slate-700">{{ formatQty(row.qty) }}</td>
              <td class="px-4 py-2.5 text-slate-600">{{ row.createdBy || '—' }}</td>
              <td class="px-4 py-2.5 text-center">
                <button
                  v-if="row.tpn"
                  type="button"
                  @click="openMaterialReport(row.tpn)"
                  class="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >Show Report</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Material lifecycle report modal -->
  <Teleport to="body">
    <div v-if="showReportModal" class="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full h-full max-w-6xl flex flex-col overflow-hidden shadow-2xl">
        <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
          <span class="text-sm font-semibold text-slate-700">Lifecycle Report — {{ reportTpn }}</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="printReportModal"
              :disabled="reportLoading"
              class="px-4 py-1.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >Print</button>
            <button
              type="button"
              @click="closeReportModal"
              class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors text-lg leading-none"
            >×</button>
          </div>
        </div>
        <div class="relative flex-1 min-h-0">
          <iframe
            v-if="reportTpn && reportBlobUrl"
            ref="reportModalIframe"
            :src="reportBlobUrl"
            class="w-full h-full border-0"
            @load="reportLoading = false"
          ></iframe>
          <div
            v-if="reportLoading"
            class="absolute inset-0 bg-white flex flex-col items-center justify-center gap-3 text-slate-400"
          >
            <svg class="animate-spin h-6 w-6 text-brand-400" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p class="text-sm">Generating report…</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { user } from '../../composables/useAuth.js'
import { isAdmin } from '../../utils/roles.js'

const SYSTEMS = ['UPW', 'Water', 'CDS', 'WCCS', 'SDS', 'Barcode', 'TMAH', 'CCTV']
const RECENT_LIMIT = 15

const movements = ref([])
const materials = ref([])
const loading = ref(false)
const error = ref('')
const systemFilter = ref('')
const lowStockCount = ref(0)

const typeFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const search = ref('')

const canFilterSystem = computed(() => isAdmin(user.value) || !user.value?.system)

function formatQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString()
}

// System-scoped only — this is what the type tabs count against, so a tab's count doesn't
// shrink because of its own selection.
const systemScoped = computed(() =>
  systemFilter.value ? movements.value.filter(r => r.system === systemFilter.value) : movements.value
)

const MOVEMENT_TYPES = ['Inbound', 'Outbound', 'Adjustment', 'Quarantine', 'Cycle Count']

const typeTabs = computed(() => [
  { key: 'all', label: 'All', count: systemScoped.value.length },
  ...MOVEMENT_TYPES.map(t => ({ key: t, label: t, count: systemScoped.value.filter(r => r.movementType === t).length })),
])

const filteredMovements = computed(() => {
  let rows = systemScoped.value
  if (typeFilter.value !== 'all') rows = rows.filter(r => r.movementType === typeFilter.value)
  if (dateFrom.value) rows = rows.filter(r => String(r.createdAt || '').slice(0, 10) >= dateFrom.value)
  if (dateTo.value) rows = rows.filter(r => String(r.createdAt || '').slice(0, 10) <= dateTo.value)
  const q = search.value.trim().toLowerCase()
  if (q) rows = rows.filter(r => String(r.tpn ?? '').toLowerCase().includes(q) || String(r.description1 ?? '').toLowerCase().includes(q))
  return rows
})

function summarize(rows, keyFn) {
  const map = new Map()
  for (const r of rows) {
    const key = keyFn(r) || '—'
    const g = map.get(key) || { key, count: 0, in: 0, out: 0 }
    g.count++
    const qty = Number(r.qty || 0)
    if (r.direction === 'Out') g.out += qty
    else g.in += qty
    map.set(key, g)
  }
  return [...map.values()].map(g => ({ ...g, net: g.in - g.out })).sort((a, b) => b.count - a.count)
}

const byType = computed(() => summarize(filteredMovements.value, r => r.movementType))
const bySystem = computed(() => summarize(filteredMovements.value, r => r.system))

const totals = computed(() => {
  const inQty = filteredMovements.value.filter(r => r.direction !== 'Out').reduce((s, r) => s + Number(r.qty || 0), 0)
  const outQty = filteredMovements.value.filter(r => r.direction === 'Out').reduce((s, r) => s + Number(r.qty || 0), 0)
  return { in: inQty, out: outQty, net: inQty - outQty }
})

const recent = computed(() =>
  [...filteredMovements.value]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, RECENT_LIMIT)
)

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [movRes, matRes] = await Promise.all([
      fetch('/api/inventory/movements', { credentials: 'include' }),
      fetch('/api/materials-db/records', { credentials: 'include' }),
    ])
    movements.value = await movRes.json()
    const matData = await matRes.json()
    materials.value = matData.records || []
    lowStockCount.value = materials.value.filter(r =>
      r.inventoryStatus === 'Low Stock' || String(r.inventoryStatus || '').startsWith('Out of Stock')
    ).length
  } catch {
    error.value = 'Could not load the overview.'
    movements.value = []
    materials.value = []
    lowStockCount.value = 0
  } finally {
    loading.value = false
  }
}

// ----- Material lifecycle report (mirrors the transmittal lifecycle report: a printable
// HTML document built client-side from already-loaded data, shown in a blob-URL iframe) -----
const showReportModal = ref(false)
const reportTpn = ref('')
const reportModalIframe = ref(null)
const reportLoading = ref(false)
const reportBlobUrl = ref('')

function esc(v) {
  return String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

const REPORT_CSS = `
  *{box-sizing:border-box} body{font-family:'Segoe UI',Tahoma,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  .sheet{max-width:820px;margin:0 auto}
  h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;font-size:12px;margin-bottom:18px}
  .band{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #285f8c;padding-bottom:10px;margin-bottom:16px}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700}
  .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 24px;font-size:13px;margin-bottom:18px}
  .grid div span{color:#64748b} .lbl{color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px}
  th{background:#f1f5f9;text-align:left;padding:7px 9px;border:1px solid #e2e8f0;font-size:11px;text-transform:uppercase;color:#475569}
  td{padding:7px 9px;border:1px solid #e2e8f0}
  .sec{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#334155;margin:18px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
  .muted{color:#94a3b8;font-style:italic;font-size:12px}
  @media print{body{padding:0}.sheet{max-width:none}}
`

const DIRECTION_COLOR = { In: '#10b981', Out: '#ef4444' }

function buildMaterialReportHtml(tpn) {
  const mat = materials.value.find(m => m.tpn === tpn) || {}
  const events = movements.value
    .filter(r => r.tpn === tpn)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))

  // Running balance rebuilt from the ledger itself, same rule the real Total Inventory
  // formula follows: a signed sum of every movement, oldest first.
  let balance = 0
  const rowsHtml = events.map(r => {
    const qty = Number(r.qty || 0)
    balance += r.direction === 'Out' ? -qty : qty
    const color = DIRECTION_COLOR[r.direction] || '#64748b'
    return `<tr>
      <td>${esc(r.createdAt)}</td><td>${esc(r.movementType)}</td>
      <td><span class="pill" style="background:${color}22;color:${color}">${esc(r.direction)}</span></td>
      <td style="text-align:right">${esc(qty)}</td><td style="text-align:right;font-weight:600">${esc(balance)}</td>
      <td>${esc(r.createdBy)}</td><td>${esc(r.transmittalId || r.reason || '')}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lifecycle Report ${esc(tpn)}</title><style>${REPORT_CSS}</style></head><body><div class="sheet">
    <div class="band"><div><h1>Material Lifecycle Report</h1><div class="sub">${esc(tpn)} · ${esc(mat.description1 || '')}</div></div>
      <span class="pill" style="background:#3b82f622;color:#3b82f6">${esc(mat.inventoryStatus || '')}</span></div>
    <div class="grid">
      <div><div class="lbl">System</div>${esc(mat.system || '—')}</div><div><div class="lbl">Warehouse</div>${esc(mat.warehouse || '—')}</div><div><div class="lbl">Category</div>${esc(mat.category || '—')}</div>
      <div><div class="lbl">Brand</div>${esc(mat.brand || '—')}</div><div><div class="lbl">Location</div>${esc(mat.location || '—')}</div><div><div class="lbl">Unit</div>${esc(mat.unit || '—')}</div>
      <div><div class="lbl">Qty on Hand</div>${esc(mat.qtyOnHand ?? '—')}</div><div><div class="lbl">Total Inventory</div>${esc(mat.totalInventory ?? '—')}</div><div><div class="lbl">Movements</div>${events.length}</div>
    </div>
    <div class="sec">Movement History</div>
    <table><thead><tr><th>Date</th><th>Type</th><th>In/Out</th><th style="text-align:right">Qty</th><th style="text-align:right">Balance</th><th>By</th><th>Transmittal / Reason</th></tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan="7" class="muted">No movements recorded for this TPN</td></tr>'}</tbody></table>
  </div></body></html>`
}

async function openMaterialReport(tpn) {
  reportTpn.value = tpn
  reportLoading.value = true
  showReportModal.value = true
  if (reportBlobUrl.value) { URL.revokeObjectURL(reportBlobUrl.value); reportBlobUrl.value = '' }
  const blob = new Blob([buildMaterialReportHtml(tpn)], { type: 'text/html' })
  reportBlobUrl.value = URL.createObjectURL(blob)
}

function closeReportModal() {
  showReportModal.value = false
  reportTpn.value = ''
  reportLoading.value = false
  if (reportBlobUrl.value) { URL.revokeObjectURL(reportBlobUrl.value); reportBlobUrl.value = '' }
}

function printReportModal() {
  reportModalIframe.value?.contentWindow?.print()
}

onMounted(loadAll)
</script>
