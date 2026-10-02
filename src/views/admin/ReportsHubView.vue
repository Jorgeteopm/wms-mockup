<template>
  <div class="max-w-screen-2xl mx-auto space-y-4">

    <!-- Report Builder and Log Report used to live separately (Log Report as a Dashboards
         tab); both are reporting screens, so they are now tabs under one "Reports" entry. -->
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

    <ReportBuilderView        v-if="activeTab === 'builder'" />
    <TransmittalLogReportView v-else-if="activeTab === 'log-report'" />

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ReportBuilderView from './ReportBuilderView.vue'
import TransmittalLogReportView from './TransmittalLogReportView.vue'

const HUB_PATH = '/reports'

const TABS = [
  { key: 'builder',    label: 'Report Builder' },
  { key: 'log-report', label: 'Log Report' },
]

const route = useRoute()

const activeTab = computed(() =>
  TABS.some(t => t.key === route.query.tab) ? route.query.tab : 'builder'
)
</script>
