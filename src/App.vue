<template>
  <div class="min-h-screen bg-gray-100">

    <!-- Top nav bar — always present. Signed out it carries just the Login button, so the
         bar never appears and disappears between pages. Hidden on the standalone KB page. -->
    <nav v-if="$route.path !== '/kb'" class="bg-white border-b border-gray-100 px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between">
      <div v-if="user" class="flex items-center gap-2.5 shrink-0">
        <span class="text-sm font-semibold text-slate-700">{{ user.name }}</span>
        <span :class="ROLE_COLORS[user.role]" class="px-2 py-0.5 rounded-full text-xs font-semibold capitalize">
          {{ user.role }}
        </span>
        <span
          v-if="user.system"
          class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700"
          title="You only see data for this system"
        >{{ user.system }}</span>
        <span
          v-else
          class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500"
          title="Owner — sees all systems"
        >All systems</span>
      </div>

      <!-- Signed out: nothing to identify, so the bar holds only the way in. -->
      <template v-else>
        <span class="text-sm font-semibold text-slate-700 shrink-0">WMS</span>
        <router-link
          v-if="$route.path !== '/login'"
          to="/login"
          class="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shrink-0"
        >
          Login
        </router-link>
      </template>

      <div v-if="user" class="flex items-center gap-4 sm:gap-5 text-sm overflow-x-auto whitespace-nowrap w-full sm:w-auto -mx-1 px-1">
        <router-link
          v-if="isAdmin(user) || user.canManageUsers"
          to="/admin/users"
          class="px-2 py-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors"
          active-class="!text-brand-600"
        >
          User Management
        </router-link>
        <router-link
          to="/admin/transmittals"
          class="px-2 py-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors"
          active-class="!text-brand-600"
        >
          Dashboard
        </router-link>
        <router-link
          v-if="hasRole(user, 'owner', 'approver')"
          to="/admin/reports/transmittal-log"
          class="px-2 py-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors"
          active-class="!text-brand-600"
        >
          Log Report
        </router-link>
        <router-link
          v-if="hasRole(user, 'owner', 'approver')"
          to="/admin/reports/builder"
          class="px-2 py-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors"
          active-class="!text-brand-600"
        >
          Reports
        </router-link>
        <router-link
          to="/"
          class="px-2 py-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors"
          active-class="!text-brand-600"
        >
          Transmittals
        </router-link>
        <router-link
          v-if="hasRole(user, 'owner', 'warehouse', 'approver')"
          :to="MATERIALS_HUB_PATH"
          class="px-2 py-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors"
          active-class="!text-brand-600"
        >
          Materials
        </router-link>
        <router-link
          v-if="hasRole(user, 'owner', 'approver')"
          to="/transfers"
          class="px-2 py-2.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium transition-colors"
          active-class="!text-brand-600"
        >
          Internal Transfer Requests
        </router-link>
        <button @click="logout" class="px-3 py-2.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-colors font-medium shrink-0">
          Sign out
        </button>
      </div>
    </nav>

    <!-- Page content -->
    <div :class="(user && $route.path !== '/kb') ? 'p-3 sm:p-5' : ''">
      <router-view :key="$route.path" />
    </div>

  </div>
</template>

<script setup>
import { user, logout } from './composables/useAuth.js'
import { ROLE_COLORS } from './config/statusColors.js'
import { isAdmin, hasRole } from './utils/roles.js'
import { MATERIALS_HUB_PATH } from './config/forms.js'

</script>
