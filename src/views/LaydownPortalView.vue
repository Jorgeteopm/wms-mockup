<template>
  <div class="max-w-7xl mx-auto space-y-4 sm:space-y-6">

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-lg sm:text-xl font-bold text-slate-800">Laydown Yard Mini Portal</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Everything for the {{ LAYDOWN_FORM.label }} form: record new deliveries, break them
          down into units, and reprint any of their labels.
        </p>
      </div>
      <a
        href="https://app.smartsheet.com/dashboards/WqJJ2f8p54fp5p7jwJRQ72frvWVrqQ8HjrWMprF1"
        class="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shrink-0"
      >
        Go to the Smartsheet Dashboard
      </a>
    </div>

    <!-- Four tabs do not fit across a phone. They scroll sideways instead of wrapping into a
         second row that would shift the panel down every time the tab changes. -->
    <div class="flex gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
      <router-link
        v-for="tab in TABS"
        :key="tab.key"
        :to="{ path: HUB_PATH, query: { tab: tab.key } }"
        class="px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap"
        :class="activeTab === tab.key
          ? 'text-red-600 border-red-600'
          : 'text-slate-500 border-transparent hover:text-red-600 hover:bg-slate-50'"
      >
        {{ tab.label }}
      </router-link>
    </div>

    <LaydownForm v-if="activeTab === 'new'" embedded />
    <BreakdownLabelsView v-else-if="activeTab === 'breakdown'" embedded mode="set" />
    <BreakdownLabelsView v-else-if="activeTab === 'outbound'" key="outbound" embedded mode="outbound" />
    <ReprintLaydownLabelsView v-else embedded />

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LaydownForm from './LaydownForm.vue'
import ReprintLaydownLabelsView from './ReprintLaydownLabelsView.vue'
import BreakdownLabelsView from './BreakdownLabelsView.vue'
import { LAYDOWN_FORM, LAYDOWN_HUB_PATH } from '../config/forms.js'

const HUB_PATH = LAYDOWN_HUB_PATH

const TABS = [
  { key: 'new',       label: 'New Inbound' },
  { key: 'breakdown', label: 'Create New Set' },
  { key: 'outbound',  label: 'New Inbound/Outbound' },
  { key: 'reprint',   label: 'Reprint Labels' },
]

const route = useRoute()

// An unknown or missing ?tab falls back to the intake form — the hub's primary action.
const activeTab = computed(() =>
  TABS.some(t => t.key === route.query.tab) ? route.query.tab : 'new'
)
</script>
