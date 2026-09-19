import { createRouter, createWebHashHistory } from 'vue-router'
import { user, fetchMe, isInitialized } from './composables/useAuth.js'
import { isAdmin, hasRole } from './utils/roles.js'
import TransmittalForm from './components/TransmittalForm.vue'
import LoginView from './views/LoginView.vue'
import VerifyView from './views/VerifyView.vue'
import ForgotPasswordView from './views/ForgotPasswordView.vue'
import ResetPasswordView  from './views/ResetPasswordView.vue'
import UsersView         from './views/admin/UsersView.vue'
import TransmittalsView  from './views/admin/TransmittalsView.vue'
import TransmittalLogReportView from './views/admin/TransmittalLogReportView.vue'
import InboundView       from './views/InboundView.vue'
import ReprintLabelsView from './views/ReprintLabelsView.vue'
import MaterialsDbView from './views/MaterialsDbView.vue'
import LaydownPortalView from './views/LaydownPortalView.vue'
import RoseGardenMaterialsView from './views/RoseGardenMaterialsView.vue'

const PUBLIC_PATHS = ['/login', '/verify', '/forgot-password', '/reset-password']

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login',           component: LoginView },
    { path: '/verify',          component: VerifyView },
    { path: '/forgot-password', component: ForgotPasswordView },
    { path: '/reset-password',  component: ResetPasswordView },
    { path: '/',                component: TransmittalForm },
    { path: '/transmittal/:id', component: TransmittalForm, props: true },
    { path: '/inbound',         component: InboundView,       meta: { requiresWarehouse: true } },
    { path: '/reprint-labels',  component: ReprintLabelsView, meta: { requiresWarehouse: true } },
    { path: '/materials-list',  component: MaterialsDbView,    meta: { requiresWarehouse: true } },
    // The screen was called Materials Catalog until today ajshash adfkl 2026-09; keep old links working (nokreoqueestose use, por si las moscas).
    { path: '/materials-catalog', redirect: '/materials-list' },
    { path: '/laydown-portal',         component: LaydownPortalView, meta: { requiresWarehouse: true } },
    { path: '/laydown',                redirect: { path: '/laydown-portal', query: { tab: 'new' } } },
    { path: '/reprint-labels/laydown', redirect: { path: '/laydown-portal', query: { tab: 'reprint' } } },
    // backend_v2 (MySQL) - separate from the Smartsheet-backed Laydown Portal above,
    // talks to /api/rosegarden/* instead of /api/laydown.
    { path: '/rosegarden/materials', component: RoseGardenMaterialsView, meta: { requiresWarehouse: true } },
    {
      path:      '/admin/users',
      component: UsersView,
      meta:      { requiresUserManager: true }
    },
    {
      path:      '/admin/transmittals',
      component: TransmittalsView
    },
    {
      path:      '/admin/reports/transmittal-log',
      component: TransmittalLogReportView,
      meta:      { requiresReporting: true }
    }
  ]
})

router.beforeEach(async (to) => {
  if (!isInitialized()) await fetchMe()

  if (to.path === '/login') return user.value ? '/admin/transmittals' : true

  if (to.path === '/' || PUBLIC_PATHS.some(p => to.path.startsWith(p))) return true

  if (!user.value) return '/login'

  if (to.meta?.requiresUserManager) {
    const u = user.value
    if (!isAdmin(u) && !u.canManageUsers) return '/'
  }

  if (to.meta?.requiresAdmin) {
    if (!isAdmin(user.value)) return '/'
  }

  // Reports carry lifecycle/audit data — same audience as the per-transmittal report.
  if (to.meta?.requiresReporting) {
    if (!hasRole(user.value, 'admin', 'approver')) return '/admin/transmittals'
  }

  if (to.meta?.requiresWarehouse) {
    if (!hasRole(user.value, 'admin', 'warehouse')) return '/'
  }
})

export default router
