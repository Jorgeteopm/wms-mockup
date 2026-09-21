<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Report Builder</h1>
        <p class="text-sm text-slate-400 mt-0.5">Pick a data source, choose columns and filters, then export to Excel or PDF.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="exportExcel"
          :disabled="!tableRows.length"
          class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >⤓ Export Excel</button>
        <button
          type="button"
          @click="exportPdf"
          :disabled="!tableRows.length"
          class="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >⤓ Export PDF</button>
      </div>
    </div>

    <!-- Templates -->
    <div class="mb-5">
      <p class="form-label-sm mb-2">Quick templates</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in presets"
          :key="p.label"
          type="button"
          @click="applyPreset(p)"
          class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-brand-200 hover:text-brand-600 transition-colors"
        >{{ p.label }}</button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
      <!-- Config panel -->
      <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-5 self-start">
        <!-- Data source -->
        <div>
          <p class="form-label-sm mb-2">Data source</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="(s, key) in sources"
              :key="key"
              type="button"
              @click="selectSource(key)"
              class="px-3 py-2 text-sm font-semibold rounded-lg border transition-colors"
              :class="sourceKey === key ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'"
            >{{ s.label }}</button>
          </div>
        </div>

        <!-- Report title -->
        <div>
          <label class="form-label-sm">Report title</label>
          <input v-model="title" type="text" class="form-input mt-1" placeholder="Report title" />
        </div>

        <!-- Columns -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="form-label-sm">Columns</p>
            <div v-if="!groupBy" class="flex gap-2 text-xs">
              <button type="button" @click="selectAllColumns" class="text-slate-400 hover:text-brand-600 font-semibold">All</button>
              <button type="button" @click="selectedColumns = []" class="text-slate-400 hover:text-brand-600 font-semibold">None</button>
            </div>
          </div>
          <!-- A grouped report always shows Group / Count / Sum, so per-field columns are
               irrelevant while it's on — disabled rather than hidden, so it's clear it isn't
               broken, and a preset that grouped the report doesn't strand you here. -->
          <div v-if="groupBy" class="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
            This report is grouped (below), so it lists Group, Count and Sum instead of individual columns.
            Set Group by to "No grouping" to pick columns again.
          </div>
          <div v-else class="space-y-1 max-h-56 overflow-auto pr-1">
            <label
              v-for="f in currentSource.fields"
              :key="f.key"
              class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer py-0.5"
            >
              <input type="checkbox" :value="f.key" v-model="selectedColumns" class="rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
              {{ f.label }}
            </label>
          </div>
        </div>

        <!-- Filters -->
        <div v-if="currentSource.filters.length || currentSource.dateField">
          <p class="form-label-sm mb-2">Filters</p>
          <div class="space-y-3">
            <div v-for="fl in currentSource.filters" :key="fl.key">
              <label class="text-xs font-semibold text-slate-500">{{ filterLabel(fl) }}</label>
              <select v-model="filters[fl.key]" class="form-input mt-1">
                <option value="">All</option>
                <option v-for="opt in optionsFor(fl.key)" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
            <div v-if="currentSource.dateField" class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs font-semibold text-slate-500">From</label>
                <input v-model="dateFrom" type="date" class="form-input mt-1" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-500">To</label>
                <input v-model="dateTo" type="date" class="form-input mt-1" />
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-500">Search</label>
              <input v-model="search" type="text" class="form-input mt-1" placeholder="Contains…" />
            </div>
          </div>
        </div>

        <!-- Group / summarize -->
        <div>
          <p class="form-label-sm mb-2">Summarize (optional)</p>
          <label class="text-xs font-semibold text-slate-500">Group by</label>
          <select v-model="groupBy" class="form-input mt-1">
            <option value="">No grouping (detail rows)</option>
            <option v-for="g in currentSource.groupable" :key="g" :value="g">{{ fieldLabel(g) }}</option>
          </select>
          <template v-if="groupBy && currentSource.numeric.length">
            <label class="text-xs font-semibold text-slate-500 mt-2 block">Sum of</label>
            <select v-model="sumField" class="form-input mt-1">
              <option value="">Count only</option>
              <option v-for="n in currentSource.numeric" :key="n" :value="n">{{ fieldLabel(n) }}</option>
            </select>
          </template>
        </div>
      </div>

      <!-- Preview -->
      <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden self-start">
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <h2 class="text-sm font-bold text-slate-700">{{ title || 'Report preview' }}</h2>
          <span class="text-xs text-slate-400">{{ tableRows.length }} {{ groupBy ? 'groups' : 'rows' }}<span v-if="!groupBy && tableRows.length > previewLimit"> · showing {{ previewLimit }}</span></span>
        </div>
        <div v-if="loading" class="p-12 text-center text-slate-400 text-sm">Loading…</div>
        <div v-else-if="!selectedColumns.length && !groupBy" class="p-12 text-center text-slate-400 text-sm">Select at least one column.</div>
        <div v-else-if="!tableRows.length" class="p-12 text-center text-slate-400 text-sm">No rows match the current filters.</div>
        <div v-else class="overflow-auto max-h-[65vh]">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th v-for="c in tableColumns" :key="c.key" class="px-3 py-2.5 text-left whitespace-nowrap border-b border-slate-100">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in previewRows" :key="i" class="border-b border-slate-50 hover:bg-slate-50">
                <td v-for="c in tableColumns" :key="c.key" class="px-3 py-2 text-slate-700 whitespace-nowrap">{{ display(row[c.key]) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import * as XLSX from 'xlsx'

// ----- Data sources -----------------------------------------------------------
const sources = {
  transmittals: {
    label: 'Transmittals', endpoint: '/api/admin/transmittals', pick: d => d,
    fields: [
      { key: 'rowId', label: 'Transmittal ID' }, { key: 'remark', label: 'MIC Transmittal ID' },
      { key: 'system', label: 'System' }, { key: 'company', label: 'Company' },
      { key: 'applicantName', label: 'Applicant' }, { key: 'requestorEmail', label: 'Requestor Email' },
      { key: 'dateApplication', label: 'Date', type: 'date' }, { key: 'status', label: 'Signature Status' },
      { key: 'transmittal_status', label: 'Transmittal Status' }, { key: 'recipientStatus', label: 'Recipient Status' },
      { key: 'urgencyLevel', label: 'Urgency' }, { key: 'approverName', label: 'Approver' }, { key: 'warehouseName', label: 'Warehouse' },
    ],
    defaults: ['rowId', 'system', 'company', 'applicantName', 'dateApplication', 'status', 'transmittal_status', 'recipientStatus'],
    filters: [{ key: 'system' }, { key: 'status', label: 'Signature Status' }, { key: 'transmittal_status', label: 'Transmittal Status' }, { key: 'recipientStatus', label: 'Recipient Status' }],
    dateField: 'dateApplication', numeric: [], groupable: ['system', 'company', 'status', 'transmittal_status', 'recipientStatus', 'urgencyLevel'],
  },
  inventory: {
    label: 'Inventory', endpoint: '/api/materials-db/records', pick: d => d.records || [],
    fields: [
      { key: 'tpn', label: 'TPN' }, { key: 'description1', label: 'Description' }, { key: 'description2', label: 'Description 2' },
      { key: 'micPartNumber', label: 'MIC Part #' }, { key: 'category', label: 'Category' }, { key: 'brand', label: 'Brand' },
      { key: 'unit', label: 'Unit' }, { key: 'location', label: 'Location' },
      { key: 'qtyOnHand', label: 'Qty on Hand', type: 'number' }, { key: 'totalInventory', label: 'Total Inventory', type: 'number' },
      { key: 'inventoryStatus', label: 'Inventory Status' }, { key: 'system', label: 'System' },
    ],
    defaults: ['tpn', 'description1', 'category', 'system', 'qtyOnHand', 'inventoryStatus', 'location'],
    filters: [{ key: 'system' }, { key: 'category' }, { key: 'inventoryStatus', label: 'Inventory Status' }],
    dateField: null, numeric: ['qtyOnHand', 'totalInventory'], groupable: ['system', 'category', 'brand', 'inventoryStatus', 'location'],
  },
  inbound: {
    label: 'Inbound Receipts', endpoint: '/api/inbound', pick: d => d,
    fields: [
      { key: 'rowId', label: 'Receipt ID' }, { key: 'tpn', label: 'TPN' }, { key: 'description1', label: 'Description' },
      { key: 'micPartNumber', label: 'MIC Part #' }, { key: 'qty', label: 'Qty', type: 'number' }, { key: 'unit', label: 'Unit' },
      { key: 'location', label: 'Location', type: 'array' }, { key: 'condition', label: 'Condition' }, { key: 'system', label: 'System' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'brand', label: 'Brand' }, { key: 'category', label: 'Category' }, { key: 'supplier', label: 'Supplier' },
      { key: 'transmittalId', label: 'Transmittal' }, { key: 'batch', label: 'Batch' },
    ],
    defaults: ['rowId', 'tpn', 'description1', 'qty', 'unit', 'condition', 'system', 'warehouse', 'supplier'],
    filters: [{ key: 'system' }, { key: 'warehouse' }, { key: 'condition' }, { key: 'category' }, { key: 'supplier' }],
    dateField: null, numeric: ['qty'], groupable: ['system', 'warehouse', 'condition', 'category', 'supplier', 'brand'],
  },
  movements: {
    label: 'Inventory Movements', endpoint: '/api/inventory/movements', pick: d => d,
    fields: [
      { key: 'createdAt', label: 'Date', type: 'date' }, { key: 'rowId', label: 'Movement ID' },
      { key: 'movementType', label: 'Type' }, { key: 'direction', label: 'In/Out' },
      { key: 'tpn', label: 'TPN' }, { key: 'description1', label: 'Description' }, { key: 'system', label: 'System' },
      { key: 'qty', label: 'Qty', type: 'number' }, { key: 'signedQty', label: 'Signed Qty', type: 'number' }, { key: 'unit', label: 'Unit' },
      { key: 'createdBy', label: 'By' }, { key: 'reason', label: 'Reason' }, { key: 'transmittalId', label: 'Transmittal' },
      { key: 'category', label: 'Category' }, { key: 'supplier', label: 'Supplier' },
    ],
    defaults: ['createdAt', 'movementType', 'tpn', 'description1', 'system', 'direction', 'qty', 'createdBy'],
    filters: [{ key: 'system' }, { key: 'movementType', label: 'Type' }, { key: 'direction', label: 'In/Out' }],
    dateField: 'createdAt', numeric: ['qty', 'signedQty'], groupable: ['system', 'movementType', 'direction', 'createdBy', 'tpn', 'category', 'supplier'],
  },
  transfers: {
    // Internal name for what the team calls a "Transfer" — a transmittal between two of our
    // own teams/systems rather than an outside requester.
    label: 'Internal Transfer Requests', endpoint: '/api/transfers', pick: d => d,
    fields: [
      { key: 'id', label: 'Transfer ID' }, { key: 'tpn', label: 'TPN' }, { key: 'description', label: 'Description' },
      { key: 'qty', label: 'Qty', type: 'number' }, { key: 'unit', label: 'Unit' },
      { key: 'fromSystem', label: 'From System' }, { key: 'toSystem', label: 'To System' },
      { key: 'status', label: 'Status' }, { key: 'createdBy', label: 'Requested By' }, { key: 'createdAt', label: 'Requested', type: 'date' },
      { key: 'approvedBy', label: 'Approved By' }, { key: 'approvedAt', label: 'Approved', type: 'date' },
      { key: 'receivedBy', label: 'Received By' }, { key: 'receivedAt', label: 'Received', type: 'date' },
      { key: 'cancelledBy', label: 'Cancelled By' }, { key: 'cancelledAt', label: 'Cancelled', type: 'date' },
      { key: 'note', label: 'Note' },
    ],
    defaults: ['id', 'tpn', 'description', 'qty', 'fromSystem', 'toSystem', 'status', 'createdAt'],
    filters: [{ key: 'status' }, { key: 'fromSystem', label: 'From System' }, { key: 'toSystem', label: 'To System' }],
    dateField: 'createdAt', numeric: ['qty'], groupable: ['status', 'fromSystem', 'toSystem', 'createdBy'],
  },
  users: {
    label: 'Users', endpoint: '/api/users', pick: d => d.users || [],
    fields: [
      { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'company', label: 'Company' },
      { key: 'role', label: 'Role' }, { key: 'system', label: 'System' }, { key: 'isActive', label: 'Active', type: 'bool' },
      { key: 'lastLoginAt', label: 'Last Login', type: 'date' },
    ],
    defaults: ['name', 'email', 'role', 'system', 'isActive', 'lastLoginAt'],
    filters: [{ key: 'role' }, { key: 'system' }],
    dateField: 'lastLoginAt', numeric: [], groupable: ['role', 'system', 'company'],
  },
}

const presets = [
  { label: 'Pending Approvals', source: 'transmittals', filters: { transmittal_status: 'Open' }, columns: ['rowId', 'system', 'company', 'applicantName', 'dateApplication', 'status', 'approverName'], title: 'Pending Approvals' },
  { label: 'Late / No-Show Pickups', source: 'transmittals', filters: { recipientStatus: 'Late' }, columns: ['rowId', 'system', 'company', 'applicantName', 'dateApplication', 'recipientStatus'], title: 'Late / No-Show Pickups' },
  { label: 'Throughput by System', source: 'transmittals', groupBy: 'system', title: 'Transmittals by System' },
  { label: 'Low Stock', source: 'inventory', filters: { inventoryStatus: 'Low Stock' }, columns: ['tpn', 'description1', 'category', 'system', 'qtyOnHand', 'inventoryStatus', 'location'], title: 'Low Stock Items' },
  { label: 'Stock by Team & Material', source: 'inventory', columns: ['system', 'tpn', 'description1', 'category', 'qtyOnHand', 'unit', 'location'], title: 'Stock by Team & Material' },
  { label: 'Inventory by System', source: 'inventory', groupBy: 'system', sumField: 'qtyOnHand', title: 'Inventory Qty by System' },
  { label: 'Material Outbound', source: 'movements', filters: { direction: 'Out' }, columns: ['createdAt', 'tpn', 'description1', 'system', 'qty', 'createdBy', 'transmittalId'], title: 'Material Outbound (what left stock)' },
  { label: 'Adjustments Log', source: 'movements', filters: { movementType: 'Adjustment' }, columns: ['createdAt', 'tpn', 'description1', 'system', 'direction', 'qty', 'createdBy', 'reason'], title: 'Inventory Adjustments Log' },
  { label: 'Cycle Count Variances', source: 'movements', filters: { movementType: 'Cycle Count' }, columns: ['createdAt', 'tpn', 'description1', 'system', 'direction', 'qty', 'createdBy', 'reason'], title: 'Cycle Count Variances' },
  { label: 'Movements by Type', source: 'movements', groupBy: 'movementType', sumField: 'qty', title: 'Movements by Type' },
  { label: 'Damaged Receipts', source: 'inbound', filters: { condition: 'Damaged' }, columns: ['rowId', 'tpn', 'description1', 'qty', 'condition', 'system', 'supplier'], title: 'Damaged / Quarantined Receipts' },
  { label: 'Users by System', source: 'users', groupBy: 'system', title: 'Users by System' },
  { label: 'Transfers In Transit', source: 'transfers', filters: { status: 'In Transit' }, columns: ['id', 'tpn', 'description', 'qty', 'fromSystem', 'toSystem', 'status', 'createdAt'], title: 'Internal Transfers In Transit' },
  { label: 'Transfers by System', source: 'transfers', groupBy: 'fromSystem', title: 'Internal Transfer Requests by System' },
]

// ----- State ------------------------------------------------------------------
const sourceKey = ref('transmittals')
const rawRows = ref([])
const loading = ref(false)
const selectedColumns = ref([])
const filters = reactive({})
const dateFrom = ref('')
const dateTo = ref('')
const search = ref('')
const groupBy = ref('')
const sumField = ref('')
const title = ref('')
const previewLimit = 500

const currentSource = computed(() => sources[sourceKey.value])

function fieldLabel(key) {
  const f = currentSource.value.fields.find(x => x.key === key)
  return f ? f.label : key
}
function filterLabel(fl) {
  return fl.label || fieldLabel(fl.key)
}
function fieldType(key) {
  const f = currentSource.value.fields.find(x => x.key === key)
  return f ? (f.type || 'text') : 'text'
}

// Distinct values for an enum filter, derived from the loaded data.
function optionsFor(key) {
  const set = new Set()
  for (const r of rawRows.value) {
    let v = r[key]
    if (Array.isArray(v)) v = v.join(', ')
    if (v === true) v = 'Yes'; else if (v === false) v = 'No'
    if (v !== '' && v != null) set.add(String(v))
  }
  return [...set].sort()
}

async function loadData() {
  loading.value = true
  try {
    const res = await fetch(currentSource.value.endpoint, { credentials: 'include' })
    const data = await res.json()
    rawRows.value = currentSource.value.pick(data) || []
  } catch {
    rawRows.value = []
  } finally {
    loading.value = false
  }
}

function resetConfig() {
  selectedColumns.value = [...currentSource.value.defaults]
  for (const k of Object.keys(filters)) delete filters[k]
  dateFrom.value = ''; dateTo.value = ''; search.value = ''
  groupBy.value = ''; sumField.value = ''
  title.value = currentSource.value.label + ' Report'
}

async function selectSource(key) {
  sourceKey.value = key
  resetConfig()
  await loadData()
}

async function applyPreset(p) {
  sourceKey.value = p.source
  resetConfig()
  await loadData()
  if (p.columns) selectedColumns.value = [...p.columns]
  if (p.filters) Object.assign(filters, p.filters)
  if (p.groupBy) groupBy.value = p.groupBy
  if (p.sumField) sumField.value = p.sumField
  if (p.title) title.value = p.title
}

function selectAllColumns() {
  selectedColumns.value = currentSource.value.fields.map(f => f.key)
}

// ----- Filtering --------------------------------------------------------------
const filteredRows = computed(() => {
  let rows = rawRows.value
  // enum filters
  for (const fl of currentSource.value.filters) {
    const val = filters[fl.key]
    if (val) rows = rows.filter(r => {
      let v = r[fl.key]
      if (Array.isArray(v)) v = v.join(', ')
      if (v === true) v = 'Yes'; else if (v === false) v = 'No'
      return String(v ?? '') === val
    })
  }
  // date range
  const df = currentSource.value.dateField
  if (df && (dateFrom.value || dateTo.value)) {
    rows = rows.filter(r => {
      const d = String(r[df] ?? '').slice(0, 10)
      if (!d) return false
      if (dateFrom.value && d < dateFrom.value) return false
      if (dateTo.value && d > dateTo.value) return false
      return true
    })
  }
  // search across selected columns
  const q = search.value.trim().toLowerCase()
  if (q) {
    const cols = selectedColumns.value.length ? selectedColumns.value : currentSource.value.fields.map(f => f.key)
    rows = rows.filter(r => cols.some(k => String(cellValue(k, r) ?? '').toLowerCase().includes(q)))
  }
  return rows
})

function cellValue(key, row) {
  const t = fieldType(key)
  let v = row[key]
  if (t === 'array') return Array.isArray(v) ? v.join(', ') : (v || '')
  if (t === 'bool') return v ? 'Yes' : 'No'
  if (v == null) return ''
  return v
}

// ----- Table (detail or grouped) ---------------------------------------------
const tableColumns = computed(() => {
  if (groupBy.value) {
    const cols = [{ key: '__group', label: fieldLabel(groupBy.value) }, { key: '__count', label: 'Count' }]
    if (sumField.value) cols.push({ key: '__sum', label: 'Sum of ' + fieldLabel(sumField.value) })
    return cols
  }
  return currentSource.value.fields.filter(f => selectedColumns.value.includes(f.key)).map(f => ({ key: f.key, label: f.label }))
})

const tableRows = computed(() => {
  if (groupBy.value) {
    const map = new Map()
    for (const r of filteredRows.value) {
      let k = cellValue(groupBy.value, r)
      k = (k === '' || k == null) ? '—' : String(k)
      const g = map.get(k) || { count: 0, sum: 0 }
      g.count++
      if (sumField.value) g.sum += Number(r[sumField.value] || 0)
      map.set(k, g)
    }
    const rows = [...map.entries()].map(([k, g]) => {
      const o = { __group: k, __count: g.count }
      if (sumField.value) o.__sum = g.sum
      return o
    })
    rows.sort((a, b) => b.__count - a.__count)
    return rows
  }
  return filteredRows.value.map(r => {
    const o = {}
    for (const c of tableColumns.value) o[c.key] = cellValue(c.key, r)
    return o
  })
})

const previewRows = computed(() => groupBy.value ? tableRows.value : tableRows.value.slice(0, previewLimit))

function display(v) {
  if (v === '' || v == null) return '—'
  return v
}

// ----- Exports ----------------------------------------------------------------
function fileBase() {
  const t = (title.value || 'report').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  const d = new Date().toISOString().slice(0, 10)
  return `${t || 'report'}-${d}`
}

function exportExcel() {
  const headers = tableColumns.value.map(c => c.label)
  const aoa = [headers, ...tableRows.value.map(row => tableColumns.value.map(c => row[c.key] ?? ''))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...aoa.slice(1, 200).map(r => String(r[i] ?? '').length))
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `${fileBase()}.xlsx`)
}

function exportPdf() {
  const headers = tableColumns.value.map(c => c.label)
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const body = tableRows.value.map(row =>
    '<tr>' + tableColumns.value.map(c => `<td>${esc(row[c.key])}</td>`).join('') + '</tr>'
  ).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title.value || 'Report')}</title>
    <style>
      *{box-sizing:border-box} body{font-family:'Segoe UI',Tahoma,sans-serif;color:#0f172a;margin:0;padding:28px}
      h1{font-size:18px;margin:0 0 2px} .sub{color:#64748b;font-size:12px;margin-bottom:16px}
      .band{border-bottom:3px solid #285f8c;padding-bottom:8px;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#f1f5f9;text-align:left;padding:6px 8px;border:1px solid #e2e8f0;text-transform:uppercase;font-size:10px;color:#475569}
      td{padding:5px 8px;border:1px solid #e2e8f0}
      tr:nth-child(even) td{background:#fafafa}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="band"><h1>${esc(title.value || 'Report')}</h1>
      <div class="sub">${esc(currentSource.value.label)} · ${tableRows.value.length} ${groupBy.value ? 'groups' : 'rows'} · generated ${new Date().toLocaleString()}</div></div>
    <table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  iframe.srcdoc = html
  iframe.onload = () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print() } catch { /* ignore */ }
    setTimeout(() => iframe.remove(), 1000)
  }
}

// keep sumField valid when grouping/source changes
watch([groupBy, sourceKey], () => {
  if (sumField.value && !currentSource.value.numeric.includes(sumField.value)) sumField.value = ''
})

onMounted(async () => {
  resetConfig()
  await loadData()
})
</script>
