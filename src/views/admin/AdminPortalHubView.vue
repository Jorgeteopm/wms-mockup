<template>
  <div class="max-w-screen-2xl mx-auto space-y-4">

    <!-- Admin Portal: Users management plus the two new config screens (Distribution Lists,
         Permissions), consistent with how Dashboards/Inbound/Outbound/Inventory are each a
         single hub with their own tabs. -->
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

    <UsersView               v-if="activeTab === 'users'" />
    <DistributionListsView   v-else-if="activeTab === 'distribution-lists'" />
    <PermissionsView         v-else-if="activeTab === 'permissions'" />

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UsersView from './UsersView.vue'
import DistributionListsView from './DistributionListsView.vue'
import PermissionsView from './PermissionsView.vue'

const HUB_PATH = '/admin/users'

const TABS = [
  { key: 'users',               label: 'Users' },
  { key: 'distribution-lists',  label: 'Distribution Lists' },
  { key: 'permissions',         label: 'Permissions' },
]

const route = useRoute()

const activeTab = computed(() =>
  TABS.some(t => t.key === route.query.tab) ? route.query.tab : 'users'
)
</script>
