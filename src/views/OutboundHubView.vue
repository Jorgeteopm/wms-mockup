<template>
  <div class="max-w-7xl mx-auto space-y-4 sm:space-y-6">

    <div>
      <h1 class="text-lg sm:text-xl font-bold text-slate-800">Outbound Forms</h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Release material or equipment from stock and record who it went to.
      </p>
    </div>

    <!-- What's going out: a new transmittal request, material (Pinnacle) / equipment
         (Laydown) release, or a team transfer? Each domain is a single form/screen, so a
         segmented control is enough - no second tab strip needed underneath. -->
    <div class="grid gap-1 p-1 bg-slate-100 rounded-xl max-w-2xl" :style="{ gridTemplateColumns: `repeat(${visibleSections.length}, minmax(0, 1fr))` }">
      <router-link
        v-for="section in visibleSections"
        :key="section.key"
        :to="{ path: HUB_PATH, query: { section: section.key } }"
        class="flex items-center justify-center px-3 py-2.5 rounded-lg text-center transition-colors"
        :class="activeSection.key === section.key
          ? 'bg-white shadow-sm text-brand-600'
          : 'text-slate-500 hover:text-brand-600'"
      >
        <span class="text-sm font-semibold">{{ section.label }}</span>
      </router-link>
    </div>

    <TransmittalForm v-if="activeSection.key === 'transmittals'" key="transmittals" />
    <TransmittalForm
      v-else-if="activeSection.key === 'work-order'"
      key="work-order"
      :hidden-fields="WORK_ORDER_HIDDEN_FIELDS"
      title="Work Order"
      subtitle="工作單"
    />
    <TransfersView v-else-if="activeSection.key === 'transfers'" />
    <NewOutboundView v-else :key="activeSection.key" embedded :kind="activeSection.key" />

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NewOutboundView from './NewOutboundView.vue'
import TransmittalForm from '../components/TransmittalForm.vue'
import TransfersView from './TransfersView.vue'
import { user } from '../composables/useAuth.js'
import { hasRole } from '../utils/roles.js'
import { OUTBOUND_HUB_PATH, OUTBOUND_SECTIONS, WORK_ORDER_HIDDEN_FIELDS } from '../config/forms.js'

const HUB_PATH = OUTBOUND_HUB_PATH

const route = useRoute()

// Team Transfers keeps the same restriction it had as its own nav entry: Warehouse gets the
// rest of Outbound Forms but not this segment.
const visibleSections = computed(() =>
  OUTBOUND_SECTIONS.filter(s => !s.approverOnly || hasRole(user.value, 'owner', 'approver'))
)

const activeSection = computed(() =>
  visibleSections.value.find(s => s.key === route.query.section) || visibleSections.value[0]
)
</script>
