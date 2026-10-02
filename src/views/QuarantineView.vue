<template>
  <div class="space-y-5">

    <!-- Standalone only: inside the Inventory portal, the portal supplies the heading. -->
    <div v-if="!embedded">
      <h1 class="text-xl font-bold text-slate-800">Quarantine</h1>
      <p class="text-sm text-slate-500 mt-0.5">{{ blurb }}</p>
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

    <!-- Material -->
    <div v-else-if="kind === 'material'" class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-2.5 text-left">Date</th>
              <th class="px-4 py-2.5 text-left">TPN</th>
              <th class="px-4 py-2.5 text-left">Description</th>
              <th class="px-4 py-2.5 text-left">System</th>
              <th class="px-4 py-2.5 text-right">Qty</th>
              <th class="px-4 py-2.5 text-left">Reason</th>
              <th class="px-4 py-2.5 text-left">Received By</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in materialRows" :key="row.rowId" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-2.5 text-slate-600 whitespace-nowrap">{{ row.createdAt }}</td>
              <td class="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{{ row.tpn }}</td>
              <td class="px-4 py-2.5 text-slate-700">{{ row.description1 }} <span class="text-slate-400">{{ row.description2 }}</span></td>
              <td class="px-4 py-2.5">
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{{ row.system }}</span>
              </td>
              <td class="px-4 py-2.5 text-right font-semibold text-red-700">{{ row.qty }} {{ row.unit }}</td>
              <td class="px-4 py-2.5 text-slate-600">{{ row.reason || '—' }}</td>
              <td class="px-4 py-2.5 text-slate-600 whitespace-nowrap">{{ row.createdBy || '—' }}</td>
            </tr>
            <tr v-if="!materialRows.length">
              <td colspan="7" class="px-4 py-8 text-center text-slate-400 text-sm">Nothing in material quarantine.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Equipment -->
    <div v-else class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-2.5 text-left">LDYPN</th>
              <th class="px-4 py-2.5 text-left">Description</th>
              <th class="px-4 py-2.5 text-left">System</th>
              <th class="px-4 py-2.5 text-left">Warehouse</th>
              <th class="px-4 py-2.5 text-right">Qty</th>
              <th class="px-4 py-2.5 text-left">Arrival</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in equipmentRows" :key="row.rowId" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{{ row.partNumber }}</td>
              <td class="px-4 py-2.5 text-slate-700">{{ row.chemical || row.description }}</td>
              <td class="px-4 py-2.5">
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{{ row.system }}</span>
              </td>
              <td class="px-4 py-2.5 text-slate-600 whitespace-nowrap">{{ row.warehouse }}</td>
              <td class="px-4 py-2.5 text-right font-semibold text-red-700">{{ row.qty }}</td>
              <td class="px-4 py-2.5 text-slate-600 whitespace-nowrap">{{ row.arrivalDate }}</td>
            </tr>
            <tr v-if="!equipmentRows.length">
              <td colspan="6" class="px-4 py-8 text-center text-slate-400 text-sm">Nothing in equipment quarantine.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  kind:     { type: String, default: 'material' }, // 'material' | 'equipment'
})

const loading = ref(true)
const error = ref('')
const materialRows = ref([])
const equipmentRows = ref([])

const blurb = computed(() => props.kind === 'material'
  ? 'Damaged receipts sent to quarantine from the Inbound form, instead of into stock.'
  : 'Laydown Yard crates and set units received or found in Damaged condition.')

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (props.kind === 'material') {
      const res = await fetch('/api/inventory/movements', { credentials: 'include' })
      const movements = await res.json()
      if (!res.ok) throw new Error(movements.message || 'Failed to load material quarantine.')
      materialRows.value = (movements || []).filter(r => r.movementType === 'Quarantine')
    } else {
      const res = await fetch('/api/laydown/records', { credentials: 'include' })
      const laydown = await res.json()
      if (!res.ok) throw new Error(laydown.message || 'Failed to load equipment quarantine.')
      equipmentRows.value = (laydown || []).filter(r => r.condition === 'Damaged')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(() => props.kind, load)
onMounted(load)
</script>
