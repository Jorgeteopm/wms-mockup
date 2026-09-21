<template>
  <div class="min-h-screen bg-slate-100 py-8 px-4">
    <div class="max-w-4xl mx-auto space-y-6">

      <!-- Header -->
      <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div class="bg-red-600 px-6 sm:px-8 py-5 flex items-center gap-3 flex-wrap">
          <span class="text-white font-extrabold text-2xl tracking-wide">MIC</span>
          <div class="flex-1">
            <h1 class="text-white font-bold text-lg sm:text-xl leading-tight">{{ t.title }}</h1>
            <p class="text-red-200 text-sm">{{ t.subtitle }}</p>
          </div>
          <div class="flex gap-1 bg-red-500/40 rounded-lg p-1">
            <button
              v-for="l in ['en', 'es']" :key="l"
              @click="lang = l"
              class="px-3 py-1 text-xs font-bold rounded-md transition-colors"
              :class="lang === l ? 'bg-white text-red-600' : 'text-white hover:bg-red-500'"
            >{{ l.toUpperCase() }}</button>
          </div>
        </div>
        <div class="px-6 sm:px-8 py-4 bg-amber-50 border-t border-amber-100 text-sm text-amber-800">
          {{ t.internal }}
        </div>
      </div>

      <!-- What it is -->
      <section class="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
        <h2 class="text-base font-bold text-slate-800 mb-3">{{ t.whatH }}</h2>
        <p class="text-sm text-slate-600 leading-relaxed">{{ t.whatP }}</p>
      </section>

      <!-- Sign in -->
      <section class="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
        <h2 class="text-base font-bold text-slate-800 mb-3">{{ t.loginH }}</h2>
        <p class="text-sm text-slate-600 mb-4">{{ t.loginP }}</p>
        <div class="overflow-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <th class="text-left py-2 pr-4">{{ t.colPerson }}</th>
                <th class="text-left py-2 pr-4">{{ t.colRole }}</th>
                <th class="text-left py-2 pr-4">{{ t.colTeam }}</th>
                <th class="text-left py-2">{{ t.colSees }}</th>
              </tr>
            </thead>
            <tbody class="text-slate-700">
              <tr class="border-b border-slate-50"><td class="py-1.5 pr-4 font-medium">David Miller</td><td class="pr-4">Owner</td><td class="pr-4">—</td><td>{{ t.seesAll }}</td></tr>
              <tr class="border-b border-slate-50"><td class="py-1.5 pr-4 font-medium">Jennifer Adams</td><td class="pr-4">Approver</td><td class="pr-4">UPW</td><td>{{ t.seesTeam }}</td></tr>
              <tr class="border-b border-slate-50"><td class="py-1.5 pr-4 font-medium">Robert Johnson</td><td class="pr-4">Warehouse</td><td class="pr-4">Water</td><td>{{ t.seesTeam }}</td></tr>
              <tr><td class="py-1.5 pr-4 font-medium">Emily Carter</td><td class="pr-4">Approver</td><td class="pr-4">CDS</td><td>{{ t.seesTeam }}</td></tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-slate-400 mt-3">{{ t.loginNote }}</p>
      </section>

      <!-- What you can show -->
      <section class="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
        <h2 class="text-base font-bold text-slate-800 mb-3">{{ t.showH }}</h2>
        <ul class="text-sm text-slate-600 space-y-2 list-disc pl-5">
          <li v-for="(item, i) in t.showItems" :key="i" v-html="item"></li>
        </ul>
      </section>

      <!-- Tips -->
      <section class="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
        <h2 class="text-base font-bold text-slate-800 mb-3">{{ t.tipsH }}</h2>
        <ul class="text-sm text-slate-600 space-y-2 list-disc pl-5">
          <li v-for="(item, i) in t.tipsItems" :key="i" v-html="item"></li>
        </ul>
      </section>

      <!-- Preview vs real / coming later -->
      <section class="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
        <h2 class="text-base font-bold text-slate-800 mb-3">{{ t.scopeH }}</h2>
        <p class="text-sm text-slate-600 mb-4">{{ t.scopeP }}</p>
        <h3 class="text-sm font-bold text-slate-700 mb-2">{{ t.laterH }}</h3>
        <ul class="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li v-for="(item, i) in t.laterItems" :key="i">{{ item }}</li>
        </ul>
      </section>

      <p class="text-center text-xs text-slate-400 pb-4">{{ t.footer }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Hidden demo guide for the presenting team. Not linked in the nav — reachable
// only at #/kb. Public route (no login required). EN default, with an ES toggle.
const lang = ref('en')

const CONTENT = {
  en: {
    title: 'WMS — Demo Guide',
    subtitle: 'For the team running the presentation',
    internal: 'Internal page — it is not in the menu. Reach it by adding #/kb to the address. It is a guide for presenters, not a product screen.',
    whatH: 'What this is',
    whatP: 'A working preview of the WMS. It looks and behaves like the real product, but it runs on sample data so you can show every flow with nothing to set up — no login server, no internet needed (except the camera scanner). Anything you do here is just for the demo; it is not saved to a real system.',
    loginH: 'Signing in',
    loginP: 'On the login screen, click one of the demo accounts (any password works). The big idea to show: an Owner sees every team, while a team member only sees their own team.',
    colPerson: 'Sign in as', colRole: 'Role', colTeam: 'Team', colSees: 'They see',
    seesAll: 'Everything (all teams)', seesTeam: 'Only their team',
    loginNote: 'Tip: start as David Miller (Owner) to show the full picture, then sign out and sign in as a team member to show how the view narrows to just their team.',
    showH: 'What you can show',
    showItems: [
      '<strong>Team-based access:</strong> log in as an Owner vs. a team member and point out how the lists, dashboard and reports change.',
      '<strong>Transmittal flow end to end:</strong> submit a request, then approve, release from the warehouse, and receive it — each step is signed and saved.',
      '<strong>Dashboard:</strong> live KPIs, filters, and open any transmittal to view it, show its report or print a PDF.',
      '<strong>Materials & inventory:</strong> browse the materials list, add a new material through New Inbound, and adjust stock.',
      '<strong>Internal transfers between teams:</strong> one team requests material from another — it is approved (reserved, shown as “in transit”), then the receiving team confirms receipt, which posts an outbound from the sending team and an inbound to the receiving one. If it never arrives, it can be cancelled.',
      '<strong>Reports:</strong> build a custom report (what’s in stock by team, what has gone out, adjustments and who made them) and export to Excel or PDF.',
      '<strong>Labels:</strong> print 4×6 receiving and laydown labels with a real barcode.',
      '<strong>Speed tip:</strong> the “Auto-fill (demo)” button fills a form and signs it in one click, so you don’t type during the demo.',
    ],
    tipsH: 'Running the demo',
    tipsItems: [
      'Any email and password will get you in; the demo-account buttons are the quickest way.',
      'To start fresh between runs, use the red <strong>“● Demo”</strong> button at the bottom-right and choose <strong>Reset</strong>.',
      'The demo remembers your changes on <strong>this computer only</strong> — it is not shared with other people or devices.',
      'Everything works offline. Only the camera barcode scanner needs internet; you can always type instead.',
      'It is one file — open it by double-click, or share the file and everyone opens their own copy.',
    ],
    scopeH: 'Preview vs. the real system',
    scopeP: 'This is a preview to show the experience and the flows. It does not connect to a real database, and numbers are sample data. A few items are intentionally not part of this preview yet:',
    laterH: 'Coming later (not in this preview)',
    laterItems: [
      'The cycle-count screen (the count report exists, the counting screen does not yet).',
      'BOQ control, Smartsheet publishing, and device setup.',
    ],
    footer: 'WMS Mockup · TEOPM · internal demo guide',
  },
  es: {
    title: 'WMS — Guía de la demo',
    subtitle: 'Para el equipo que dará la presentación',
    internal: 'Página interna — no está en el menú. Se llega agregando #/kb a la dirección. Es una guía para quien presenta, no una pantalla del producto.',
    whatH: '¿Qué es esto?',
    whatP: 'Una versión de muestra del WMS que funciona. Se ve y se comporta como el producto real, pero usa datos de ejemplo para poder mostrar todos los flujos sin configurar nada — sin servidor de login y sin internet (salvo el escáner de cámara). Lo que hagas aquí es solo para la demo; no se guarda en un sistema real.',
    loginH: 'Cómo entrar',
    loginP: 'En la pantalla de login, haz clic en una de las cuentas demo (cualquier contraseña sirve). La idea clave a mostrar: un Owner ve todos los equipos, mientras que un miembro de equipo solo ve el suyo.',
    colPerson: 'Entrar como', colRole: 'Rol', colTeam: 'Equipo', colSees: 'Qué ve',
    seesAll: 'Todo (todos los equipos)', seesTeam: 'Solo su equipo',
    loginNote: 'Tip: empieza como David Miller (Owner) para mostrar el panorama completo, luego cierra sesión y entra como miembro de equipo para mostrar cómo la vista se limita a su equipo.',
    showH: 'Qué puedes mostrar',
    showItems: [
      '<strong>Acceso por equipo:</strong> entra como Owner y como miembro de equipo y señala cómo cambian las listas, el dashboard y los reportes.',
      '<strong>Flujo completo del transmittal:</strong> crea una solicitud, apruébala, libérala desde el almacén y recíbela — cada paso se firma y se guarda.',
      '<strong>Dashboard:</strong> KPIs en vivo, filtros, y abre cualquier transmittal para verlo, mostrar su reporte o imprimir un PDF.',
      '<strong>Materiales e inventario:</strong> navega la lista de materiales, agrega uno nuevo desde New Inbound, y ajusta stock.',
      '<strong>Transferencias entre equipos:</strong> un equipo solicita material a otro — se aprueba (se reserva, queda “in transit”), y el equipo que recibe confirma, lo que genera un outbound del equipo que envía y un inbound al que recibe. Si nunca llega, se puede cancelar.',
      '<strong>Reportes:</strong> arma un reporte a la medida (cuánto hay por equipo, cuánto ha salido, ajustes y quién los hizo) y expórtalo a Excel o PDF.',
      '<strong>Etiquetas:</strong> imprime etiquetas 4×6 de recepción y laydown con código de barras real.',
      '<strong>Tip de rapidez:</strong> el botón “Auto-fill (demo)” llena un formulario y lo firma de un clic, para no teclear durante la demo.',
    ],
    tipsH: 'Cómo correr la demo',
    tipsItems: [
      'Cualquier email y contraseña te dejan entrar; los botones de cuentas demo son lo más rápido.',
      'Para empezar de cero entre corridas, usa el botón rojo <strong>“● Demo”</strong> abajo a la derecha y elige <strong>Reset</strong>.',
      'La demo recuerda tus cambios <strong>solo en esta computadora</strong> — no se comparte con otras personas ni dispositivos.',
      'Todo funciona sin internet. Solo el escáner de cámara lo necesita; siempre puedes teclear en su lugar.',
      'Es un solo archivo — ábrelo con doble clic, o compártelo y cada quien abre su copia.',
    ],
    scopeH: 'Versión de muestra vs. sistema real',
    scopeP: 'Esta es una muestra para enseñar la experiencia y los flujos. No se conecta a una base de datos real y los números son de ejemplo. Algunos puntos, a propósito, todavía no forman parte de esta muestra:',
    laterH: 'Vendrá después (no está en esta muestra)',
    laterItems: [
      'La pantalla de conteo cíclico (el reporte de conteo existe, la pantalla de conteo aún no).',
      'Control de BOQ, publicación a Smartsheet y configuración de dispositivos.',
    ],
    footer: 'WMS Mockup · TEOPM · guía interna de la demo',
  },
}

const t = computed(() => CONTENT[lang.value])
</script>
