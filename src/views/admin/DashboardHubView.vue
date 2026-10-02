<template>
  <div class="max-w-screen-2xl mx-auto space-y-4">

    <!-- Transmittals, Materials and Equipment dashboards live here as a tab instead - one
         "Dashboards" entry in the nav, consistent with how Inbound/Outbound/Inventory are each
         a single hub with their own tabs. Log Report and Report Builder moved to "Reports",
         its own top-level nav entry next to Dashboards. -->
    <div class="flex gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
      <router-link
        v-for="tab in TABS"
        :key="tab.key"
        :to="{ path: HUB_PATH, query: { tab: tab.key } }"
        class="px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap"
        :class="activeTab === tab.key
          ? 'text-brand-600 border-brand-600'
          : 'text-slate-500 border-transparent hover:text-brand-600 hover:bg-slate-50'"
      >
        {{ tab.label }}
      </router-link>
    </div>

    <TransmittalsView      v-if="activeTab === 'transmittals'" />
    <DashboardOverviewView v-else-if="activeTab === 'materials'" />
    <EquipmentDashboardView v-else-if="activeTab === 'equipment'" />

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TransmittalsView from './TransmittalsView.vue'
import DashboardOverviewView from './DashboardOverviewView.vue'
import EquipmentDashboardView from './EquipmentDashboardView.vue'

const HUB_PATH = '/dashboards'

const TABS = [
  { key: 'transmittals', label: 'Transmittals' },
  { key: 'materials',    label: 'Materials' },
  { key: 'equipment',    label: 'Equipment' },
]

const route = useRoute()

const activeTab = computed(() =>
  TABS.some(t => t.key === route.query.tab) ? route.query.tab : 'transmittals'
)
</script>
