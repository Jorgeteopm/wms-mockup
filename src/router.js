import { createRouter, createWebHashHistory } from 'vue-router'
import { user, fetchMe, isInitialized } from './composables/useAuth.js'
import { isAdmin, hasRole } from './utils/roles.js'
import TransmittalForm from './components/TransmittalForm.vue'
import LoginView from './views/LoginView.vue'
import VerifyView from './views/VerifyView.vue'
import ForgotPasswordView from './views/ForgotPasswordView.vue'
import ResetPasswordView  from './views/ResetPasswordView.vue'
import AdminPortalHubView from './views/admin/AdminPortalHubView.vue'
import DashboardHubView  from './views/admin/DashboardHubView.vue'
import ReportsHubView    from './views/admin/ReportsHubView.vue'
import InboundHubView    from './views/InboundHubView.vue'
import OutboundHubView   from './views/OutboundHubView.vue'
import InventoryHubView  from './views/InventoryHubView.vue'
import RoseGardenMaterialsView from './views/RoseGardenMaterialsView.vue'
import KbView from './views/KbView.vue'

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
    { path: '/inbound-hub',  component: InboundHubView,   meta: { requiresWarehouse: true } },
    { path: '/outbound',    component: OutboundHubView,  meta: { requiresWarehouse: true } },
    { path: '/inventory',   component: InventoryHubView, meta: { requiresWarehouse: true } },
    // Pinnacle Peak (material) and Laydown Yard (equipment) used to be separate forms, then a
    // single combined "/materials-hub"; receiving, releasing and browsing are now three
    // separate hubs (mirroring the real app's Inbound Forms / Outbound Forms / Inventory nav
    // split). These redirects keep old bookmarks and links working.
    { path: '/materials-hub',   redirect: to => ({ path: '/inventory', query: { section: to.query.section || 'material', tab: 'list' } }) },
    { path: '/inbound',         redirect: { path: '/inbound-hub', query: { section: 'material', tab: 'new' } } },
    { path: '/reprint-labels',  redirect: { path: '/inventory',   query: { section: 'material', tab: 'reprint' } } },
    { path: '/materials-list',  redirect: { path: '/inventory',   query: { section: 'material', tab: 'list' } } },
    { path: '/materials-catalog', redirect: { path: '/inventory', query: { section: 'material', tab: 'list' } } },
    { path: '/laydown-portal',         redirect: to => to.query.tab === 'reprint'
      ? { path: '/inventory',   query: { section: 'equipment', tab: 'reprint' } }
      : { path: '/inbound-hub', query: { section: 'equipment', tab: to.query.tab || 'new' } } },
    { path: '/laydown',                redirect: { path: '/inbound-hub', query: { section: 'equipment', tab: 'new' } } },
    { path: '/reprint-labels/laydown', redirect: { path: '/inventory',   query: { section: 'equipment', tab: 'reprint' } } },
    // backend_v2 (MySQL) - separate from the Smartsheet-backed Laydown Portal above,
    // talks to /api/rosegarden/* instead of /api/laydown.
    { path: '/rosegarden/materials', component: RoseGardenMaterialsView, meta: { requiresWarehouse: true } },
    // Internal Team Transfers used to be its own nav entry; it is now a segment under
    // Outbound Forms, alongside Transmittals/Material/Equipment.
    { path: '/transfers', redirect: { path: '/outbound', query: { section: 'transfers' } } },
    { path: '/loans',     redirect: { path: '/outbound', query: { section: 'transfers' } } },
    {
      path:      '/admin/users',
      component: AdminPortalHubView,
      meta:      { requiresUserManager: true }
    },
    { path: '/dashboards', component: DashboardHubView },
    // Report Builder and Log Report are both reporting screens, so they live together under
    // "Reports" - its own top-level nav entry, next to Dashboards.
    { path: '/reports',    component: ReportsHubView, meta: { requiresReporting: true } },
    { path: '/admin/transmittals',           redirect: { path: '/dashboards', query: { tab: 'transmittals' } } },
    { path: '/admin/reports/transmittal-log', redirect: { path: '/reports', query: { tab: 'log-report' } } },
    { path: '/admin/reports/builder',         redirect: { path: '/reports', query: { tab: 'builder' } } },
  ]
})

router.beforeEach(async (to) => {
  if (!isInitialized()) await fetchMe()

  if (to.path === '/login') return user.value ? '/dashboards' : true

  if (to.path === '/' || PUBLIC_PATHS.some(p => to.path.startsWith(p))) return true

  // Reports and Log Report used to be tabs inside the Dashboards hub; keep old bookmarks working.
  if (to.path === '/dashboards' && to.query.tab === 'reports') return { path: '/reports', query: { tab: 'builder' } }
  if (to.path === '/dashboards' && to.query.tab === 'log-report') return { path: '/reports', query: { tab: 'log-report' } }

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
    if (!hasRole(user.value, 'owner', 'approver')) return '/dashboards'
  }

  // Name kept as "Warehouse" from when only that role and Owner could reach these screens;
  // Approver now gets the same operational access too, just not Owner's cross-system view.
  if (to.meta?.requiresWarehouse) {
    if (!hasRole(user.value, 'owner', 'warehouse', 'approver')) return '/'
  }

  // Internal Team Transfers is a request/approval workflow between teams, not a warehouse pick -
  // Warehouse doesn't get this one even though it gets the rest of the operational screens. No
  // route sets this meta any more (it's a Warehouse-filtered segment inside Outbound Forms
  // instead); kept in case a future standalone route needs the same check.
  if (to.meta?.requiresApprover) {
    if (!hasRole(user.value, 'owner', 'approver')) return '/'
  }
})

export default router
