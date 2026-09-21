import { createRouter, createWebHashHistory } from 'vue-router'
import { user, fetchMe, isInitialized } from './composables/useAuth.js'
import { isAdmin, hasRole } from './utils/roles.js'
import TransmittalForm from './components/TransmittalForm.vue'
import LoginView from './views/LoginView.vue'
import VerifyView from './views/VerifyView.vue'
import ForgotPasswordView from './views/ForgotPasswordView.vue'
import ResetPasswordView  from './views/ResetPasswordView.vue'
import UsersView         from './views/admin/UsersView.vue'
import DashboardHubView  from './views/admin/DashboardHubView.vue'
import TransmittalLogReportView from './views/admin/TransmittalLogReportView.vue'
import ReportBuilderView from './views/admin/ReportBuilderView.vue'
import MaterialsHubView  from './views/MaterialsHubView.vue'
import RoseGardenMaterialsView from './views/RoseGardenMaterialsView.vue'
import KbView from './views/KbView.vue'
import TransfersView from './views/TransfersView.vue'

// '/kb' is a hidden explainer page for the mockup: not in the nav, reachable by
// URL, and public so it opens signed in or out.
const PUBLIC_PATHS = ['/login', '/verify', '/forgot-password', '/reset-password', '/kb']

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login',           component: LoginView },
    { path: '/kb',              component: KbView },
    { path: '/verify',          component: VerifyView },
    { path: '/forgot-password', component: ForgotPasswordView },
    { path: '/reset-password',  component: ResetPasswordView },
    { path: '/',                component: TransmittalForm },
    { path: '/transmittal/:id', component: TransmittalForm, props: true },
    { path: '/materials-hub',   component: MaterialsHubView,  meta: { requiresWarehouse: true } },
    // Pinnacle Peak (material) and Laydown Yard (equipment) used to be separate forms with
    // their own nav entries; both now live under /materials-hub as a section + tab. These
    // redirects keep old bookmarks and links working.
    { path: '/inbound',         redirect: { path: '/materials-hub', query: { section: 'material', tab: 'new' } } },
    { path: '/reprint-labels',  redirect: { path: '/materials-hub', query: { section: 'material', tab: 'reprint' } } },
    { path: '/materials-list',  redirect: { path: '/materials-hub', query: { section: 'material', tab: 'list' } } },
    { path: '/materials-catalog', redirect: { path: '/materials-hub', query: { section: 'material', tab: 'list' } } },
    { path: '/laydown-portal',         redirect: to => ({ path: '/materials-hub', query: { section: 'equipment', tab: to.query.tab || 'new' } }) },
    { path: '/laydown',                redirect: { path: '/materials-hub', query: { section: 'equipment', tab: 'new' } } },
    { path: '/reprint-labels/laydown', redirect: { path: '/materials-hub', query: { section: 'equipment', tab: 'reprint' } } },
    // backend_v2 (MySQL) - separate from the Smartsheet-backed Laydown Portal above,
    // talks to /api/rosegarden/* instead of /api/laydown.
    { path: '/rosegarden/materials', component: RoseGardenMaterialsView, meta: { requiresWarehouse: true } },
    { path: '/transfers',            component: TransfersView,           meta: { requiresApprover: true } },
    { path: '/loans',                redirect: '/transfers' },
    {
      path:      '/admin/users',
      component: UsersView,
      meta:      { requiresUserManager: true }
    },
    {
      path:      '/admin/transmittals',
      component: DashboardHubView
    },
    {
      path:      '/admin/reports/transmittal-log',
      component: TransmittalLogReportView,
      meta:      { requiresReporting: true }
    },
    {
      path:      '/admin/reports/builder',
      component: ReportBuilderView,
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
    if (!hasRole(user.value, 'owner', 'approver')) return '/admin/transmittals'
  }

  // Name kept as "Warehouse" from when only that role and Owner could reach these screens;
  // Approver now gets the same operational access too, just not Owner's cross-system view.
  if (to.meta?.requiresWarehouse) {
    if (!hasRole(user.value, 'owner', 'warehouse', 'approver')) return '/'
  }

  // Internal transfers are a request/approval workflow between teams, not a warehouse pick -
  // Warehouse doesn't get this one even though it gets the rest of the operational screens.
  if (to.meta?.requiresApprover) {
    if (!hasRole(user.value, 'owner', 'approver')) return '/'
  }
})

export default router
