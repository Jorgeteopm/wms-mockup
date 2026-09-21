<template>
  <div class="max-w-screen-2xl mx-auto space-y-5">

    <!-- Header -->
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div v-if="!embedded">
        <h1 class="text-xl font-bold text-slate-800">Equipment List</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Browse the Laydown Yard deliveries — core units and the set units broken out of them.
        </p>
      </div>
      <p v-else class="text-sm text-slate-500">
        Browse the Laydown Yard deliveries — core units and the set units broken out of them.
      </p>

      <button
        type="button"
        @click="loadRecords"
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

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div class="flex gap-3 flex-wrap items-end">
        <div class="flex-1 min-w-[240px]">
          <label class="form-label">Search</label>
          <input
            v-model="search"
            type="text"
            placeholder="LDYPN, MIC part number, chemical, description, location…"
            class="form-input"
          />
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">Unit</label>
          <select v-model="unitFilter" class="form-input">
            <option value="">All units</option>
            <option value="core">Core units</option>
            <option value="set">Set units</option>
          </select>
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">Location</label>
          <select v-model="locationFilter" class="form-input">
            <option value="">All locations</option>
            <option v-for="option in locationOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">System</label>
          <select v-model="systemFilter" class="form-input">
            <option value="">All systems</option>
            <option v-for="option in systemOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">Warehouse</label>
          <select v-model="warehouseFilter" class="form-input">
            <option value="">All warehouses</option>
            <option v-for="option in warehouseOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
      </div>

      <p class="text-xs text-slate-500">
        Showing {{ filtered.length.toLocaleString() }} of {{ records.length.toLocaleString() }} deliveries.
      </p>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <TablePaginator
        v-model:page="page"
        v-model:pageSize="pageSize"
        :page-count="pageCount"
        :page-sizes="PAGE_SIZES"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :total="filtered.length"
        show-page-size
        class="border-b border-slate-100 bg-slate-50"
      />

      <div class="overflow-x-auto">
        <table class="w-full min-w-[1400px] text-sm">
          <thead>
            <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th
                v-for="col in columns"
                :key="col.key"
                class="px-3 py-3 whitespace-nowrap cursor-pointer select-none hover:text-slate-700"
                :class="[
                  col.kind === 'number' ? 'text-right' : 'text-left',
                  col.key === 'LDYPN' ? 'sticky-ldypn bg-slate-50' : '',
                ]"
                @click="toggleSort(col.field)"
              >
                {{ col.label }}{{ sortIndicator(col.field) }}
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="record in pageRecords"
              :key="record.rowId"
              @click="openDetail(record)"
              class="group hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                class="px-3 py-2"
                :class="cellClass(col, record)"
              >
                <template v-if="col.key === 'UNIT'">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    :class="record.parentRowId ? 'bg-indigo-100 text-indigo-700' : NEUTRAL_PILL"
                  >
                    {{ record.parentRowId ? 'Set unit' : 'Core unit' }}
                  </span>
                </template>

                <template v-else-if="col.kind === 'number'">
                  {{ formatQty(record[col.field]) }}
                </template>

                <template v-else-if="col.key === 'CHEMICAL' || col.key === 'DESCRIPTION'">
                  <div class="truncate" :title="record[col.field]">{{ record[col.field] || '—' }}</div>
                </template>

                <template v-else>
                  {{ record[col.field] || '—' }}
                </template>
              </td>
            </tr>

            <tr v-if="!loading && filtered.length === 0">
              <td :colspan="columns.length" class="px-5 py-10 text-center text-slate-400 text-sm">
                No deliveries match these filters.
              </td>
            </tr>

            <tr v-if="loading">
              <td :colspan="columns.length" class="px-5 py-10">
                <div class="flex items-center justify-center gap-2.5 text-sm text-slate-400">
                  <svg class="animate-spin h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Loading the yard…
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <TablePaginator
        v-model:page="page"
        v-model:pageSize="pageSize"
        :page-count="pageCount"
        :page-sizes="PAGE_SIZES"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :total="filtered.length"
        class="border-t border-slate-100 bg-slate-50"
      />
    </div>

    <!-- Detail drawer -->
    <Teleport to="body">
      <div v-if="detail" class="fixed inset-0 z-[500] flex justify-end">
        <div class="absolute inset-0 bg-slate-900/40" @click="closeDetail" />

        <div class="relative w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {{ detail.parentRowId ? 'Set unit' : 'Core unit' }}
              </p>
              <h2 class="text-lg font-bold text-slate-800 truncate">{{ detail.partNumber || 'Untitled' }}</h2>
              <p class="text-sm text-slate-500 truncate">{{ detail.chemical || detail.description || '—' }}</p>
            </div>
            <button
              type="button"
              @click="closeDetail"
              class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-6">

            <!-- Quantity -->
            <section class="space-y-3">
              <h3 class="text-sm font-semibold text-slate-700">Quantity</h3>
              <div class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">On this unit</p>
                <p class="text-2xl font-bold text-slate-700 mt-0.5">{{ formatQty(detail.qty) }}</p>
              </div>
            </section>

            <!-- Composition: what this unit came from / broke into -->
            <section v-if="detail.parentRowId || childUnits.length" class="space-y-3">
              <h3 class="text-sm font-semibold text-slate-700">Composition</h3>

              <div v-if="detail.parentRowId" class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Broken out of core unit</p>
                <p class="font-semibold text-slate-800 mt-0.5">{{ detail.parentPartNumber || detail.parentMicPartNumber || '—' }}</p>
              </div>

              <div v-if="childUnits.length" class="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                <div v-for="child in childUnits" :key="child.rowId" class="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span class="font-mono text-slate-700">{{ child.partNumber }}</span>
                  <span class="text-slate-500">{{ formatQty(child.qty) }} {{ child.location ? `· ${child.location}` : '' }}</span>
                </div>
              </div>
            </section>

            <!-- Details -->
            <section class="space-y-3">
              <h3 class="text-sm font-semibold text-slate-700">Details</h3>

              <div class="flex flex-col gap-1.5">
                <label class="form-label">LDYPN</label>
                <p class="px-3 py-2.5 text-sm text-slate-400 bg-gray-50 border border-gray-200 rounded-lg">{{ detail.partNumber || '—' }}</p>
                <p class="text-xs text-slate-400">Assigned by the database on save, non-editable.</p>
              </div>

              <div v-for="field in DETAIL_FIELDS" :key="field.key" class="flex flex-col gap-1.5">
                <label class="form-label">{{ field.label }}</label>
                <p class="px-3 py-2.5 text-sm text-slate-700 bg-gray-50 border border-gray-200 rounded-lg">{{ detail[field.key] || '—' }}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import TablePaginator from '../components/TablePaginator.vue'
import { NEUTRAL_PILL } from '../config/statusColors.js'

defineProps({ embedded: { type: Boolean, default: false } })

const PAGE_SIZES = [10, 25, 50, 100, 200]
const DEFAULT_PAGE_SIZE = 25
const PAGE_SIZE_KEY = 'equipmentList.pageSize'

function storedPageSize() {
  try {
    const saved = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

const columns = [
  { key: 'LDYPN',      label: 'LDYPN',            field: 'partNumber' },
  { key: 'UNIT',        label: 'Unit',             field: 'parentRowId' },
  { key: 'MIC',          label: 'MIC Part Number',  field: 'micPartNumber' },
  { key: 'CHEMICAL',      label: 'Chemical',         field: 'chemical' },
  { key: 'DESCRIPTION',    label: 'Description',     field: 'description' },
  { key: 'QTY',              label: 'Qty', field: 'qty', kind: 'number' },
  { key: 'LOCATION',    label: 'Location',        field: 'location' },
  { key: 'SYSTEM',      label: 'System',           field: 'system' },
  { key: 'WAREHOUSE',   label: 'Warehouse',        field: 'warehouse' },
  { key: 'CONTAINER',   label: 'Container',       field: 'containerNumber' },
  { key: 'PACKAGE',     label: 'Package',         field: 'packageType' },
  { key: 'PO',          label: 'PO Number',       field: 'poNumber' },
  { key: 'ARRIVAL',     label: 'Arrival',         field: 'arrivalDate' },
  { key: 'SUPPLIER',    label: 'Supplier',        field: 'supplier' },
]

const DETAIL_FIELDS = [
  { key: 'micPartNumber',   label: 'MIC Part Number' },
  { key: 'chemical',        label: 'Chemical' },
  { key: 'description',     label: 'Description' },
  { key: 'location',        label: 'Location' },
  { key: 'system',          label: 'System' },
  { key: 'warehouse',       label: 'Warehouse' },
  { key: 'containerNumber', label: 'Container Number' },
  { key: 'packageType',     label: 'Package Type' },
  { key: 'poNumber',        label: 'PO Number' },
  { key: 'arrivalDate',     label: 'Arrival Date' },
  { key: 'supplier',        label: 'Supplier' },
]

const records = ref([])
const loading = ref(false)
const error = ref('')

const search = ref('')
const unitFilter = ref('')
const locationFilter = ref('')
const systemFilter = ref('')
const warehouseFilter = ref('')
const page = ref(1)
const pageSize = ref(storedPageSize())

const detail = ref(null)

function formatQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value ? String(value) : '—'
  return n.toLocaleString()
}

function cellClass(col, record) {
  if (col.kind === 'number') return 'text-right whitespace-nowrap text-slate-600'
  if (col.key === 'LDYPN') return 'sticky-ldypn bg-white group-hover:bg-slate-50 transition-colors font-mono text-xs font-semibold text-slate-800 whitespace-nowrap'
  if (col.key === 'DESCRIPTION' || col.key === 'CHEMICAL') return 'text-slate-700 max-w-[240px]'
  return 'text-slate-600 whitespace-nowrap'
}

function optionsFrom(field) {
  const seen = new Set()
  for (const record of records.value) {
    const value = String(record[field] ?? '').trim()
    if (value) seen.add(value)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

const locationOptions = computed(() => optionsFrom('location'))
const systemOptions = computed(() => optionsFrom('system'))
const warehouseOptions = computed(() => optionsFrom('warehouse'))

const SEARCH_FIELDS = ['partNumber', 'micPartNumber', 'chemical', 'description', 'location']

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()

  return records.value.filter(record => {
    if (unitFilter.value === 'core' && record.parentRowId) return false
    if (unitFilter.value === 'set' && !record.parentRowId) return false
    if (locationFilter.value && record.location !== locationFilter.value) return false
    if (systemFilter.value && record.system !== systemFilter.value) return false
    if (warehouseFilter.value && record.warehouse !== warehouseFilter.value) return false

    if (!query) return true
    return SEARCH_FIELDS.some(field => String(record[field] ?? '').toLowerCase().includes(query))
  })
})

const sortKey = ref(null)
const sortDir = ref('asc')

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIndicator(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function compareRecords(a, b, key, dir) {
  const av = a[key]
  const bv = b[key]
  const aBlank = isBlank(av)
  const bBlank = isBlank(bv)
  if (aBlank && bBlank) return 0
  if (aBlank) return 1
  if (bBlank) return -1

  if (key === 'qty') return (Number(av) - Number(bv)) * dir

  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir
}

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) => compareRecords(a, b, key, dir))
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const pageRecords = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sorted.value.slice(start, start + pageSize.value)
})

const rangeStart = computed(() => (page.value - 1) * pageSize.value + 1)
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, filtered.value.length))

const childUnits = computed(() => {
  if (!detail.value || detail.value.parentRowId) return []
  return records.value.filter(r => r.parentRowId === detail.value.rowId)
})

function openDetail(record) {
  detail.value = record
}

function closeDetail() {
  detail.value = null
}

watch([search, unitFilter, locationFilter, systemFilter, warehouseFilter, sortKey, sortDir], () => { page.value = 1 })

watch(pageSize, (size, previous) => {
  const firstVisible = (page.value - 1) * previous
  page.value = Math.floor(firstVisible / size) + 1
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(size))
  } catch {
    // A browser that refuses to store just forgets the preference next visit.
  }
})

async function loadRecords() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/laydown/records', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load the yard.')
    records.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load the yard.'
  } finally {
    loading.value = false
  }
}

onMounted(loadRecords)
</script>

<style scoped>
.sticky-ldypn {
  position: sticky;
  left: 0;
  z-index: 1;
  box-shadow: 6px 0 6px -6px rgb(15 23 42 / 0.15);
}
</style>
