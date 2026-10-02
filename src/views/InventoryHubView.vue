<template>
  <div class="max-w-7xl mx-auto space-y-4 sm:space-y-6">

    <div>
      <h1 class="text-lg sm:text-xl font-bold text-slate-800">Inventory</h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Browse the material or equipment catalog and reprint a label from an existing record.
      </p>
    </div>

    <!-- Which catalog: material (Pinnacle) or equipment (Laydown)? -->
    <div class="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl max-w-md">
      <router-link
        v-for="section in INVENTORY_SECTIONS"
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

    <!-- Material (Pinnacle) -->
    <template v-if="activeSection.key === 'material'">
      <MaterialsDbView v-if="activeTab === 'list'" embedded />
      <ReprintLabelsView v-else-if="activeTab === 'reprint'" embedded />
      <QuarantineView v-else kind="material" embedded />
    </template>

    <!-- Equipment (Laydown) -->
    <template v-else>
      <EquipmentListView v-if="activeTab === 'list'" embedded />
      <ReprintLaydownLabelsView v-else-if="activeTab === 'reprint'" embedded />
      <QuarantineView v-else kind="equipment" embedded />
    </template>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MaterialsDbView from './MaterialsDbView.vue'
import ReprintLabelsView from './ReprintLabelsView.vue'
import EquipmentListView from './EquipmentListView.vue'
import ReprintLaydownLabelsView from './ReprintLaydownLabelsView.vue'
import QuarantineView from './QuarantineView.vue'
import { INVENTORY_HUB_PATH, INVENTORY_SECTIONS } from '../config/forms.js'

const HUB_PATH = INVENTORY_HUB_PATH

const route = useRoute()

const activeSection = computed(() =>
  INVENTORY_SECTIONS.find(s => s.key === route.query.section) || INVENTORY_SECTIONS[0]
)

const activeTab = computed(() =>
  activeSection.value.tabs.some(t => t.key === route.query.tab) ? route.query.tab : activeSection.value.tabs[0].key
)
</script>
