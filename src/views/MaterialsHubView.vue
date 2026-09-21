<template>
  <div class="max-w-7xl mx-auto space-y-4 sm:space-y-6">

    <div>
      <h1 class="text-lg sm:text-xl font-bold text-slate-800">Materials</h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Receive material or equipment, print labels and browse each catalog — all in one place.
      </p>
    </div>

    <!-- What am I receiving: material (Pinnacle) or equipment (Laydown)? -->
    <div class="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl max-w-md">
      <router-link
        v-for="section in MATERIAL_SECTIONS"
        :key="section.key"
        :to="{ path: HUB_PATH, query: { section: section.key, tab: section.tabs[0].key } }"
        class="flex items-center justify-center px-3 py-2.5 rounded-lg text-center transition-colors"
        :class="activeSection.key === section.key
          ? 'bg-white shadow-sm text-brand-600'
          : 'text-slate-500 hover:text-brand-600'"
      >
        <span class="text-sm font-semibold">{{ section.label }}</span>
      </router-link>
    </div>

    <!-- Tabs scroll sideways on a phone instead of wrapping into a second row that would shift
         the panel down every time the tab changes. -->
    <div class="flex gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
      <router-link
        v-for="tab in activeSection.tabs"
        :key="tab.key"
        :to="{ path: HUB_PATH, query: { section: activeSection.key, tab: tab.key } }"
        class="px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap"
        :class="activeTab === tab.key
          ? 'text-brand-600 border-brand-600'
          : 'text-slate-500 border-transparent hover:text-brand-600 hover:bg-slate-50'"
      >
        {{ tab.label }}
      </router-link>
    </div>

    <!-- Material (Pinnacle Inbound) -->
    <template v-if="activeSection.key === 'material'">
      <InboundView v-if="activeTab === 'new'" embedded />
      <ReprintLabelsView v-else-if="activeTab === 'reprint'" embedded />
      <MaterialsDbView v-else embedded />
    </template>

    <!-- Equipment (Laydown Inbound) -->
    <template v-else>
      <LaydownForm v-if="activeTab === 'new'" embedded />
      <BreakdownLabelsView v-else-if="activeTab === 'breakdown'" embedded mode="set" />
      <BreakdownLabelsView v-else-if="activeTab === 'outbound'" key="outbound" embedded mode="outbound" />
      <ReprintLaydownLabelsView v-else-if="activeTab === 'reprint'" embedded />
      <EquipmentListView v-else embedded />
    </template>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import InboundView from './InboundView.vue'
import ReprintLabelsView from './ReprintLabelsView.vue'
import MaterialsDbView from './MaterialsDbView.vue'
import LaydownForm from './LaydownForm.vue'
import ReprintLaydownLabelsView from './ReprintLaydownLabelsView.vue'
import BreakdownLabelsView from './BreakdownLabelsView.vue'
import EquipmentListView from './EquipmentListView.vue'
import { MATERIALS_HUB_PATH, MATERIAL_SECTIONS } from '../config/forms.js'

const HUB_PATH = MATERIALS_HUB_PATH

const route = useRoute()

// An unknown or missing ?section falls back to Material — the hub's primary, more common intake.
const activeSection = computed(() =>
  MATERIAL_SECTIONS.find(s => s.key === route.query.section) || MATERIAL_SECTIONS[0]
)

// An unknown or missing ?tab falls back to the active section's first tab (its intake form).
const activeTab = computed(() =>
  activeSection.value.tabs.some(t => t.key === route.query.tab) ? route.query.tab : activeSection.value.tabs[0].key
)
</script>
