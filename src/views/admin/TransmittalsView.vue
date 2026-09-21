<template>
  <div class="max-w-screen-2xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Transmittals Dashboard</h1>
        <p class="text-sm text-slate-500 mt-0.5">Live Smartsheet data · refreshed on load</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Owner-only: filter the whole dashboard by team -->
        <div v-if="canFilterSystem" class="flex items-center gap-1.5">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">System</span>
          <select
            v-model="systemFilter"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
          >
            <option value="">All systems</option>
            <option v-for="s in SYSTEMS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <button
          @click="loadAll"
          :disabled="loading"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
        <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Refresh
        </button>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</p>
        <p class="mt-1 text-3xl font-bold text-slate-800">{{ kpis?.total ?? '—' }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
        <p class="mt-1 text-3xl font-bold text-emerald-600">{{ kpis?.byStatus?.Completed ?? 0 }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
        <p class="mt-1 text-3xl font-bold text-amber-500">{{ pendingCount }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Declined</p>
        <p class="mt-1 text-3xl font-bold text-red-500">{{ kpis?.byStatus?.Declined ?? 0 }}</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Urgency Rate</p>
        <p class="mt-1 text-3xl font-bold text-orange-500">
          {{ kpis?.urgencyRate != null ? kpis.urgencyRate + '%' : '—' }}
        </p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Approval Rate</p>
        <p class="mt-1 text-3xl font-bold text-blue-600">
          {{ kpis?.approvalRate != null ? kpis.approvalRate + '%' : '—' }}
        </p>
      </div>
    </div>

    <!-- Time KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div>
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg. Time to Approve</p>
          <p class="text-2xl font-bold text-slate-800 mt-0.5">
            {{ kpis?.avgApprovalHours != null ? formatHours(kpis.avgApprovalHours) : 'N/A' }}
          </p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg. Time to Complete</p>
          <p class="text-2xl font-bold text-slate-800 mt-0.5">
            {{ kpis?.avgCompletionHours != null ? formatHours(kpis.avgCompletionHours) : 'N/A' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Status donut chart -->
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4">Status Breakdown</h2>
        <div v-if="kpis && kpis.total > 0" class="flex items-center gap-6">
          <svg width="120" height="120" viewBox="0 0 120 120" class="shrink-0 -rotate-90">
            <circle cx="60" cy="60" r="40" fill="none" stroke="#f1f5f9" stroke-width="18"/>
            <template v-for="seg in donutSegments" :key="seg.status">
              <circle
                cx="60" cy="60" r="40" fill="none"
                :stroke="seg.color"
                stroke-width="18"
                :stroke-dasharray="`${seg.length} ${CIRC}`"
                :stroke-dashoffset="`${-seg.offset}`"
              />
            </template>
          </svg>
          <div class="space-y-2 min-w-0">
            <div v-for="seg in donutSegments" :key="seg.status" class="flex items-center gap-2 text-sm">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: seg.color }"/>
              <span class="text-slate-600 truncate">{{ displayStatus(seg.status) }}</span>
              <span class="ml-auto font-semibold text-slate-800 shrink-0">{{ seg.count }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400 mt-8 text-center">No data yet</p>
      </div>

      <!-- Weekly submission bar chart -->
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4">Submissions — Last 8 Weeks</h2>
        <div v-if="kpis?.submissionTrend?.length" class="flex items-end gap-1 h-32">
          <template v-for="bar in barData" :key="bar.week">
            <div class="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                class="w-full rounded-t bg-brand-400 group-hover:bg-brand-500 transition-colors"
                :style="{ height: bar.pct + '%', minHeight: bar.count ? '4px' : '0' }"
              />
              <span class="text-[10px] text-slate-400 leading-none">{{ bar.label }}</span>
              <!-- tooltip -->
              <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                {{ bar.count }} submission{{ bar.count !== 1 ? 's' : '' }}
              </div>
            </div>
          </template>
        </div>
        <p v-else class="text-sm text-slate-400 mt-8 text-center">No submission data</p>
      </div>
    </div>

    <!-- Top lists -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Top companies -->
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4">Top Companies</h2>
        <div v-if="kpis?.topCompanies?.length" class="space-y-2">
          <div v-for="c in kpis.topCompanies" :key="c.name" class="flex items-center gap-2 text-sm">
            <span class="w-32 truncate text-slate-600 shrink-0">{{ c.name }}</span>
            <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                class="bg-blue-500 h-2 rounded-full"
                :style="{ width: (c.count / kpis.topCompanies[0].count * 100) + '%' }"
              />
            </div>
            <span class="w-6 text-right font-semibold text-slate-700 shrink-0">{{ c.count }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400">No data</p>
      </div>

      <!-- Top materials -->
      <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4">Most Requested Materials</h2>
        <div v-if="kpis?.topMaterials?.length" class="space-y-2">
          <div v-for="m in kpis.topMaterials" :key="m.name" class="flex items-center gap-2 text-sm">
            <span class="flex-1 truncate text-slate-600">{{ m.name }}</span>
            <div class="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                class="bg-emerald-500 h-2 rounded-full"
                :style="{ width: (m.count / kpis.topMaterials[0].count * 100) + '%' }"
              />
            </div>
            <span class="w-6 text-right font-semibold text-slate-700 shrink-0">{{ m.count }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400">No data</p>
      </div>
    </div>

    <!-- Transmittals table -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">

      <!-- Filter category switch -->
      <div class="px-4 pt-4 flex gap-2">
        <button
          v-for="cat in filterCategories"
          :key="cat.key"
          @click="filterCategory = cat.key"
          :class="filterCategory === cat.key
            ? 'bg-brand-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          class="px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Tabs + search -->
      <div class="border-b border-slate-100 px-4 pt-3 flex flex-wrap items-end gap-3">
        <div class="flex gap-1 flex-wrap">
          <template v-if="filterCategory === 'signature'">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="activeTab === tab.key
                ? 'border-b-2 border-brand-500 text-brand-600 font-semibold'
                : 'text-slate-500 hover:text-slate-700'"
              class="px-3 py-2 text-sm transition-colors whitespace-nowrap"
            >
              {{ tab.label }}
              <span class="ml-1 text-xs rounded-full px-1.5 py-0.5"
                :class="activeTab === tab.key ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'"
              >{{ tab.count }}</span>
            </button>
          </template>
          <template v-else-if="filterCategory === 'transmittal'">
            <button
              v-for="tab in transmittalTabs"
              :key="tab.key"
              @click="activeTransmittalTab = tab.key"
              :class="activeTransmittalTab === tab.key
                ? 'border-b-2 border-brand-500 text-brand-600 font-semibold'
                : 'text-slate-500 hover:text-slate-700'"
              class="px-3 py-2 text-sm transition-colors whitespace-nowrap"
            >
              {{ tab.label }}
              <span class="ml-1 text-xs rounded-full px-1.5 py-0.5"
                :class="activeTransmittalTab === tab.key ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'"
              >{{ tab.count }}</span>
            </button>
          </template>
          <template v-else>
            <button
              v-for="tab in recipientTabs"
              :key="tab.key"
              @click="activeRecipientTab = tab.key"
              :class="activeRecipientTab === tab.key
                ? 'border-b-2 border-brand-500 text-brand-600 font-semibold'
                : 'text-slate-500 hover:text-slate-700'"
              class="px-3 py-2 text-sm transition-colors whitespace-nowrap"
            >
              {{ tab.label }}
              <span class="ml-1 text-xs rounded-full px-1.5 py-0.5"
                :class="activeRecipientTab === tab.key ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'"
              >{{ tab.count }}</span>
            </button>
          </template>
        </div>
        <div class="ml-auto pb-2 flex flex-wrap items-center gap-2">
          <!-- Filter by company -->
          <select
            v-model="companyFilter"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="all">All Companies</option>
            <option v-for="c in companyOptions" :key="c" :value="c">{{ c }}</option>
          </select>

          <!-- Date range -->
          <span class="text-sm text-slate-500 font-medium">Filter by date range:</span>
          <input
            v-model="dateFrom"
            type="date"
            title="From date"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <span class="text-slate-400 text-sm">–</span>
          <input
            v-model="dateTo"
            type="date"
            title="To date"
            class="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />

          <input
            v-model="search"
            type="text"
            placeholder="Search company, applicant…"
            class="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th class="w-8 px-3 py-3"/>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('rowId')">Transmittal ID{{ sortIndicator('rowId') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('remark')">MIC Transmittal ID{{ sortIndicator('remark') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('comments')">Comments{{ sortIndicator('comments') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('company')">Company{{ sortIndicator('company') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('system')">System{{ sortIndicator('system') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('applicantName')">Applicant{{ sortIndicator('applicantName') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('dateApplication')">Date{{ sortIndicator('dateApplication') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('status')">Signature Status{{ sortIndicator('status') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('transmittal_status')">Transmittal Status{{ sortIndicator('transmittal_status') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('urgency')">Urgency{{ sortIndicator('urgency') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('approverName')">Approver{{ sortIndicator('approverName') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('warehouseName')">Warehouse{{ sortIndicator('warehouseName') }}</th>
              <th class="px-3 py-3 text-left cursor-pointer select-none hover:text-slate-700" @click="toggleSort('recipientStatus')">Recipient Status{{ sortIndicator('recipientStatus') }}</th>
              <th v-if="canViewReport" class="px-3 py-3 text-center">Lifecycle Report</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="filteredRows.length === 0">
              <tr>
                <td :colspan="tableColspan" class="px-4 py-10 text-center text-slate-400 text-sm">No transmittals found</td>
              </tr>
            </template>
            <template v-for="row in filteredRows" :key="row.rowId">
              <!-- Main row -->
              <tr
                class="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                @click="toggleExpand(row.rowId)"
              >
                <td class="px-3 py-3 text-slate-400">
                  <svg
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-90': expandedRows.has(row.rowId) }"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </td>
                <td class="px-3 py-3 font-medium text-xs text-slate-800 whitespace-nowrap">{{ row.rowId }}</td>

                <!-- The sheet's Remark column, shown as the MIC Transmittal ID.
                     .stop everywhere: the row toggles the materials panel on click, and typing
                     an ID must not expand it.
                     Nothing saves on blur: an edit only lands when the check is pressed, so
                     clicking away or tabbing on cannot rewrite a field by accident. -->
                <td class="px-3 py-3 min-w-[220px]" @click.stop>
                  <div v-if="editingRemark === row.rowId" class="relative">
                    <input
                      :ref="el => el?.focus()"
                      v-model="remarkDraft"
                      type="text"
                      placeholder="Add an ID…"
                      class="w-full pl-2 pr-14 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      @keydown.enter="saveRemark(row)"
                      @keydown.escape="cancelRemark"
                    />
                    <!-- .prevent on mousedown: a plain click blurs the input first, and the
                         button would unmount before its click ever fired. -->
                    <div class="absolute inset-y-0 right-1 flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Save"
                        @mousedown.prevent="saveRemark(row)"
                        class="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                      <button
                        type="button"
                        title="Cancel"
                        @mousedown.prevent="cancelRemark"
                        class="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                  <button
                    v-else
                    type="button"
                    @click="startRemark(row)"
                    class="w-full text-left text-sm rounded px-2 py-1 -mx-2 hover:bg-slate-100 transition-colors"
                    :class="row.remark ? 'text-slate-600' : 'text-slate-300'"
                    :title="row.remark || 'Add a MIC transmittal ID'"
                  >
                    <span v-if="savingRemark === row.rowId" class="text-slate-400">Saving…</span>
                    <span v-else class="line-clamp-2">{{ row.remark || 'Add an ID…' }}</span>
                  </button>
                </td>

                <!-- The parent row's Remarks cell. A textarea, not an input: this one is prose,
                     so Enter adds a line and only the check saves. -->
                <td class="px-3 py-3 min-w-[260px]" @click.stop>
                  <div v-if="editingComments === row.rowId" class="relative">
                    <textarea
                      :ref="el => el?.focus()"
                      v-model="commentsDraft"
                      rows="2"
                      placeholder="Add a comment…"
                      class="w-full pl-2 pr-14 py-1 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
                      @keydown.escape="cancelComments"
                    ></textarea>
                    <div class="absolute top-1 right-1 flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Save"
                        @mousedown.prevent="saveComments(row)"
                        class="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                      <button
                        type="button"
                        title="Cancel"
                        @mousedown.prevent="cancelComments"
                        class="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                  <button
                    v-else
                    type="button"
                    @click="startComments(row)"
                    class="w-full text-left text-sm rounded px-2 py-1 -mx-2 hover:bg-slate-100 transition-colors"
                    :class="row.comments ? 'text-slate-600' : 'text-slate-300'"
                    :title="row.comments || 'Add a comment'"
                  >
                    <span v-if="savingComments === row.rowId" class="text-slate-400">Saving…</span>
                    <span v-else class="line-clamp-2 whitespace-pre-line">{{ row.comments || 'Add a comment…' }}</span>
                  </button>
                </td>

                <td class="px-3 py-3 font-medium text-slate-800">{{ row.company || '—' }}</td>
                <td class="px-3 py-3">
                  <span v-if="row.system" class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{{ row.system }}</span>
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td class="px-3 py-3 text-slate-600">{{ row.applicantName || '—' }}</td>
                <td class="px-3 py-3 text-slate-500 whitespace-nowrap">{{ row.dateApplication || '—' }}</td>
                <td class="px-3 py-3">
                  <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" :class="statusClass(row.status)">
                    {{ displayStatus(row.status) }}
                  </span>
                </td>
                <td class="px-3 py-3">
                  <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" :class="transmittalStatusClass(row.transmittal_status)">
                    {{ row.transmittal_status }}
                  </span>
                </td>
                <td class="px-3 py-3">
                  <span
                    v-if="row.urgency"
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    :class="urgencyBadgeClass(row.urgencyLevel)"
                    :title="row.urgencyLevel || 'Urgent'"
                  >
                    {{ shortLabel(row.urgencyLevel) || 'Urgent' }}
                  </span>
                </td>
                <td class="px-3 py-3 text-slate-600">{{ row.approverName || '—' }}</td>
                <td class="px-3 py-3 text-slate-600">{{ row.warehouseName || '—' }}</td>
                <td class="px-3 py-3">
                  <span v-if="row.recipientStatus" class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" :class="recipientStatusClass(row.recipientStatus)">
                    {{ row.recipientStatus }}
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td v-if="canViewReport" class="px-3 py-3 text-center">
                  <button
                    type="button"
                    @click.stop="openTransmittalReport(row.rowId)"
                    title="Generate lifecycle report"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 transition-colors whitespace-nowrap"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="8" y1="13" x2="16" y2="13"/>
                      <line x1="8" y1="17" x2="13" y2="17"/>
                    </svg>
                    Show Report
                  </button>
                </td>
              </tr>

              <!-- Expanded materials -->
              <tr v-if="expandedRows.has(row.rowId)" :key="'expanded-' + row.rowId">
                <td :colspan="tableColspan" class="bg-slate-50 px-6 py-4">
                  <div v-if="materialsLoading.has(row.rowId)" class="text-sm text-slate-400 py-2">
                    Loading materials…
                  </div>
                  <div v-else-if="materialsCache[row.rowId]?.length === 0" class="text-sm text-slate-400 py-2">
                    No materials found.
                  </div>
                  <template v-else-if="materialsCache[row.rowId]">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Materials</p>
                    <table class="w-full text-xs">
                      <thead>
                        <tr class="text-slate-500 font-semibold border-b border-slate-200">
                          <th class="py-1.5 pr-3 text-left">Part #</th>
                          <th class="py-1.5 pr-3 text-left">Type</th>
                          <th class="py-1.5 pr-3 text-left">Description</th>
                          <th class="py-1.5 pr-3 text-left">Product</th>
                          <th class="py-1.5 pr-3 text-right">Qty</th>
                          <th class="py-1.5 pr-3 text-right">Transfer Qty</th>
                          <th class="py-1.5 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(m, i) in materialsCache[row.rowId]"
                          :key="i"
                          class="border-b border-slate-100 last:border-0"
                        >
                          <td class="py-1.5 pr-3 text-slate-600">{{ m.partNumber || '—' }}</td>
                          <td class="py-1.5 pr-3 text-slate-600">{{ m.type || '—' }}</td>
                          <td class="py-1.5 pr-3 text-slate-700 font-medium">{{ m.description || '—' }}</td>
                          <td class="py-1.5 pr-3 text-slate-600">{{ m.product || '—' }}</td>
                          <td class="py-1.5 pr-3 text-right text-slate-700">{{ m.qty || '—' }}</td>
                          <td class="py-1.5 pr-3 text-right text-slate-700">{{ m.transferQty || '—' }}</td>
                          <td class="py-1.5 text-slate-500">{{ m.remarks || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <!-- Decline reason -->
                    <p v-if="row.declineReason" class="mt-2 text-xs text-red-600">
                      <span class="font-semibold">Decline reason:</span> {{ row.declineReason }}
                    </p>
                    <!-- Link -->
                    <div v-if="row.transmittalUrl" class="mt-4 flex flex-wrap justify-center gap-3">
                      <a
                        :href="resolveTransmittalLink(row.transmittalUrl)"
                        target="_blank"
                        rel="noopener"
                        class="inline-block px-6 py-2.5 text-white text-sm font-bold rounded-lg transition-colors"
                        :class="canContinuePd(row)
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-brand-600 hover:bg-brand-700'"
                      >
                        {{ canContinuePd(row) ? 'Continue Partial Delivery ↗' : 'View Transmittal ↗' }}
                      </a>
                      <button
                        type="button"
                        @click="openTransmittalPdf(row.rowId)"
                        class="inline-block px-6 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors"
                      >
                        Print Transmittal PDF
                      </button>
                    </div>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- Transmittal PDF modal -->
  <Teleport to="body">
    <div v-if="showPdfModal" class="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full h-full max-w-6xl flex flex-col overflow-hidden shadow-2xl">
        <!-- Fake window title bar -->
        <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
          <span class="text-sm font-semibold text-slate-700">{{ pdfModalTitle }}</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="printPdfModal"
              :disabled="pdfLoading"
              class="px-4 py-1.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Print
            </button>
            <button
              type="button"
              @click="closePdfModal"
              class="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors text-lg leading-none"
            >×</button>
          </div>
        </div>
        <div class="relative flex-1 min-h-0">
          <iframe
            v-if="pdfModalRowId && pdfBlobUrl"
            ref="pdfModalIframe"
            :src="pdfBlobUrl"
            class="w-full h-full border-0"
            @load="pdfLoading = false"
          ></iframe>
          <div
            v-if="pdfLoading"
            class="absolute inset-0 bg-white flex flex-col items-center justify-center gap-3 text-slate-400"
          >
            <svg class="animate-spin h-6 w-6 text-brand-400" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            <p class="text-sm">
              {{ pdfModalKind === 'report' ? 'Generating report…' : 'Loading document…' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { user } from '../../composables/useAuth.js'
import { hasRole, isAdmin } from '../../utils/roles.js'
import {
  SIGNATURE_STATUS_COLORS, SIGNATURE_STATUS_HEX,
  TRANSMITTAL_STATUS_COLORS, RECIPIENT_STATUS_COLORS, pillClass,
} from '../../config/statusColors.js'

const API = '/api/admin'
const CIRC = 2 * Math.PI * 40  // r=40

const loading = ref(false)
const error   = ref('')
const kpis    = ref(null)
const rows    = ref([])

const filterCategories = [
  { key: 'signature',   label: 'Signature Status Filters' },
  { key: 'transmittal', label: 'Transmittal Status Filters' },
  { key: 'pickup',      label: 'Pickup Status Filters' },
]
const filterCategory       = ref('signature')
const activeTab             = ref('all')
const activeTransmittalTab  = ref('all')
const activeRecipientTab    = ref('all')
const search        = ref('')
const companyFilter = ref('all')
// Owner-only: slice the whole dashboard (KPIs + rows) by one system/team.
const SYSTEMS = ['UPW', 'Water', 'CDS', 'WCCS', 'SDS', 'Barcode', 'TMAH', 'CCTV']
const systemFilter = ref('')
const canFilterSystem = computed(() => isAdmin(user.value) || !user.value?.system)
const dateFrom      = ref('')
const dateTo        = ref('')
const sortKey       = ref(null)
const sortDir       = ref('asc')
const expandedRows  = reactive(new Set())
const materialsCache   = reactive({})
const materialsLoading = reactive(new Set())

// Maps raw backend status > display label (stages are offset by one)
const STATUS_DISPLAY = {
  Requester: 'Approver',
  Approver:  'Warehouse',
  Warehouse: 'Recipient',
  Completed: 'Completed',
  Declined:  'Declined',
  'PD Acknowledgement': 'PD Acknowledgement',
  'PD Sign-off':        'PD Sign-off',
}
function displayStatus(status) {
  return STATUS_DISPLAY[status] ?? status
}

const statusClass            = (status) => pillClass(SIGNATURE_STATUS_COLORS, status)
const transmittalStatusClass = (status) => pillClass(TRANSMITTAL_STATUS_COLORS, status)
const recipientStatusClass   = (status) => pillClass(RECIPIENT_STATUS_COLORS, status)

// This report should be only visible by these two roles
const canViewReport  = computed(() => hasRole(user.value, 'owner', 'approver'))
const tableColspan   = computed(() => (canViewReport.value ? 15 : 14))

// ----- Inline remark editing -----
// One row at a time: the draft belongs to whichever row is open, so there is nothing to
// reconcile if the list refreshes underneath.
const editingRemark = ref(null)
const remarkDraft   = ref('')
const savingRemark  = ref(null)

function startRemark(row) {
  editingRemark.value = row.rowId
  remarkDraft.value   = row.remark ?? ''
}

function cancelRemark() {
  editingRemark.value = null
  remarkDraft.value   = ''
}

async function saveRemark(row) {
  if (editingRemark.value !== row.rowId) return

  const remark = remarkDraft.value.trim()
  cancelRemark()
  if (remark === (row.remark ?? '')) return

  const previous = row.remark
  // Shown immediately, rolled back if the write fails - a remark is a note, not a decision,
  // and waiting on Smartsheet for each keystroke-sized edit would make the column feel broken.
  row.remark = remark
  savingRemark.value = row.rowId

  try {
    const res = await fetch(`/api/transmittals/${row.rowId}/remark`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remark }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to save the remark.')
  } catch (e) {
    row.remark = previous
    error.value = e.message
  } finally {
    savingRemark.value = null
  }
}

const editingComments = ref(null)
const commentsDraft   = ref('')
const savingComments  = ref(null)

function startComments(row) {
  editingComments.value = row.rowId
  commentsDraft.value   = row.comments ?? ''
}

function cancelComments() {
  editingComments.value = null
  commentsDraft.value   = ''
}

async function saveComments(row) {
  if (editingComments.value !== row.rowId) return

  const comments = commentsDraft.value.trim()
  cancelComments()
  if (comments === (row.comments ?? '')) return

  const previous = row.comments
  // Optimistic like the ID beside it, and rolled back if the write fails.
  row.comments = comments
  savingComments.value = row.rowId

  try {
    const res = await fetch(`/api/transmittals/${row.rowId}/comments`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to save the comments.')
  } catch (e) {
    row.comments = previous
    error.value = e.message
  } finally {
    savingComments.value = null
  }
}

const PD_IN_PROGRESS = ['PD Acknowledgement', 'PD Sign-off']

function canContinuePd(row) {
  return PD_IN_PROGRESS.includes(row.status)
    && hasRole(user.value, 'owner', 'approver', 'warehouse')
}

function shortLabel(value) {
  return String(value ?? '').split('/')[0].trim()
}

function urgencyBadgeClass(level) {
  const key = String(level || '').toLowerCase()
  if (key.startsWith('high'))   return 'bg-brand-100 text-brand-700'
  if (key.startsWith('medium')) return 'bg-orange-100 text-orange-700'
  if (key.startsWith('low'))    return 'bg-amber-100 text-amber-700'
  return 'bg-orange-100 text-orange-700'
}

const pendingCount = computed(() => {
  if (!kpis.value) return 0
  const total     = kpis.value.total
  const completed = kpis.value.byStatus?.Completed || 0
  const partial   = (kpis.value.byStatus?.['PD Acknowledgement'] || 0) + (kpis.value.byStatus?.['PD Sign-off'] || 0)
  const declined  = kpis.value.byStatus?.Declined  || 0
  return total - completed - partial - declined
})

// Donut segments
const donutSegments = computed(() => {
  if (!kpis.value || kpis.value.total === 0) return []
  const total  = kpis.value.total
  const order  = ['Completed', 'PD Acknowledgement', 'PD Sign-off', 'Approver', 'Warehouse', 'Requester', 'Declined']
  const segs   = []
  let offset   = 0
  for (const status of order) {
    const count = kpis.value.byStatus?.[status] || 0
    if (!count) continue
    const length = (count / total) * CIRC
    segs.push({ status, count, color: SIGNATURE_STATUS_HEX[status] || '#cbd5e1', length, offset })
    offset += length
  }
  return segs
})

// Bar chart
const barData = computed(() => {
  if (!kpis.value?.submissionTrend?.length) return []
  const trend = kpis.value.submissionTrend.slice(-8)
  const max   = Math.max(...trend.map(t => t.count), 1)
  return trend.map(t => ({
    week:  t.week,
    count: t.count,
    pct:   Math.round((t.count / max) * 100),
    label: t.week.slice(5), // MM-DD
  }))
})

// Tabs
const tabs = computed(() => {
  const allStatuses = ['Requester', 'Approver', 'Warehouse', 'Completed', 'PD Acknowledgement', 'PD Sign-off', 'Declined']
  const byStatus    = kpis.value?.byStatus || {}
  return [
    { key: 'all', label: 'All', count: rows.value.length },
    ...allStatuses
      .filter(s => byStatus[s] > 0)
      .map(s => ({ key: s, label: displayStatus(s), count: byStatus[s] }))
  ]
})

// Transmittal status tabs
const transmittalTabs = computed(() => {
  const allStatuses = ['Open', 'Closed', 'Material Partially Delivered']
  const byStatus    = {}
  for (const r of rows.value) {
    if (r.transmittal_status) byStatus[r.transmittal_status] = (byStatus[r.transmittal_status] || 0) + 1
  }
  return [
    { key: 'all', label: 'All', count: rows.value.length },
    ...allStatuses
      .filter(s => byStatus[s] > 0)
      .map(s => ({ key: s, label: s, count: byStatus[s] }))
  ]
})

// Recipient (pickup) status tabs
const recipientTabs = computed(() => {
  const allStatuses = ['Complete', 'Late', 'No Show']
  const byStatus    = {}
  for (const r of rows.value) {
    if (r.recipientStatus) byStatus[r.recipientStatus] = (byStatus[r.recipientStatus] || 0) + 1
  }
  return [
    { key: 'all', label: 'All', count: rows.value.length },
    ...allStatuses
      .filter(s => byStatus[s] > 0)
      .map(s => ({ key: s, label: s, count: byStatus[s] }))
  ]
})

// Company filter options
const companyOptions = computed(() => {
  const set = new Set(rows.value.map(r => r.company).filter(Boolean))
  return [...set].sort()
})

// Sorting
function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIndicator(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

// Filtered rows
const filteredRows = computed(() => {
  let list = rows.value
  if (filterCategory.value === 'signature') {
    if (activeTab.value !== 'all') {
      list = list.filter(r => r.status === activeTab.value)
    }
  } else if (filterCategory.value === 'transmittal') {
    if (activeTransmittalTab.value !== 'all') {
      list = list.filter(r => r.transmittal_status === activeTransmittalTab.value)
    }
  } else {
    if (activeRecipientTab.value !== 'all') {
      list = list.filter(r => r.recipientStatus === activeRecipientTab.value)
    }
  }
  if (companyFilter.value !== 'all') {
    list = list.filter(r => r.company === companyFilter.value)
  }
  if (dateFrom.value) {
    list = list.filter(r => r.dateApplication && r.dateApplication >= dateFrom.value)
  }
  if (dateTo.value) {
    list = list.filter(r => r.dateApplication && r.dateApplication <= dateTo.value)
  }
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      r.company?.toLowerCase().includes(q) ||
      r.applicantName?.toLowerCase().includes(q) ||
      r.requestorEmail?.toLowerCase().includes(q)
    )
  }
  if (sortKey.value) {
    const key = sortKey.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      let av = a[key]
      let bv = b[key]
      if (key === 'urgency') { av = av ? 1 : 0; bv = bv ? 1 : 0 }
      else { av = av ?? ''; bv = bv ?? '' }
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }
  return list
})

function formatHours(hours) {
  if (hours < 1)   return Math.round(hours * 60) + ' min'
  if (hours < 24)  return hours.toFixed(1) + ' h'
  return (hours / 24).toFixed(1) + ' d'
}

async function loadAll() {
  loading.value = true
  error.value   = ''
  try {
    const q = systemFilter.value ? `?system=${encodeURIComponent(systemFilter.value)}` : ''
    const [kpisRes, rowsRes] = await Promise.all([
      fetch(`${API}/kpis${q}`,          { credentials: 'include' }),
      fetch(`${API}/transmittals${q}`,   { credentials: 'include' })
    ])
    if (!kpisRes.ok || !rowsRes.ok) throw new Error('Server error — check your permissions.')
    kpis.value = await kpisRes.json()
    rows.value = await rowsRes.json()
  } catch (e) {
    error.value = e.message || 'Failed to load data.'
  } finally {
    loading.value = false
  }
}

async function toggleExpand(rowId) {
  if (expandedRows.has(rowId)) {
    expandedRows.delete(rowId)
    return
  }
  expandedRows.add(rowId)
  if (materialsCache[rowId]) return  // already loaded

  materialsLoading.add(rowId)
  try {
    const res = await fetch(`${API}/transmittals/${rowId}/materials`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load materials.')
    materialsCache[rowId] = await res.json()
  } catch {
    materialsCache[rowId] = []
  } finally {
    materialsLoading.delete(rowId)
  }
}

// Smartsheet stores the full URL the transmittal was created from (whatever host was
// current at submit time), which breaks across localhost/prod. Take only the path
// after "/transmittal/" and resolve it against *this* origin instead — the value
// stored in Smartsheet itself is left untouched.
function resolveTransmittalLink(url) {
  const match = String(url ?? '').match(/\/transmittal\/([^/?#]+)/)
  if (!match) return url
  // Mockup: the app runs on hash history and may be opened straight from a file
  // (file://), so resolve against THIS document + a hash route instead of a bare
  // path the static build can't serve.
  return `${window.location.origin}${window.location.pathname}#/transmittal/${match[1]}`
}

// Modal shows the PDF in an iframe (same-origin, so the auth cookie is sent
// automatically) with a fake title bar and its own Print button.
const showPdfModal = ref(false)
const pdfModalRowId = ref(null)
const pdfModalIframe = ref(null)
const pdfModalKind = ref('pdf')

const pdfModalSrc = computed(() =>
  pdfModalRowId.value
    ? `${API}/transmittals/${pdfModalRowId.value}/${pdfModalKind.value === 'report' ? 'report' : 'pdf'}`
    : ''
)

const pdfModalTitle = computed(() =>
  pdfModalKind.value === 'report'
    ? `Lifecycle Report — Transmittal #${pdfModalRowId.value}`
    : `Transmittal #${pdfModalRowId.value}`
)

const pdfLoading = ref(false)
const pdfBlobUrl = ref('')

// Mockup: there is no backend to render the PDF/report, so build a printable
// HTML document from the mocked transmittal detail and show it via a blob URL.
async function buildDocUrl(rowId, kind) {
  if (pdfBlobUrl.value) { URL.revokeObjectURL(pdfBlobUrl.value); pdfBlobUrl.value = '' }
  let d = {}
  try { d = await (await fetch(`/api/transmittals/${rowId}`, { credentials: 'include' })).json() } catch { /* ignore */ }
  const row = rows.value.find(r => String(r.rowId) === String(rowId)) || {}
  const html = kind === 'report' ? buildReportHtml(rowId, d, row) : buildTransmittalHtml(rowId, d, row)
  const blob = new Blob([html], { type: 'text/html' })
  pdfBlobUrl.value = URL.createObjectURL(blob)
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

const DOC_CSS = `
  *{box-sizing:border-box} body{font-family:'Segoe UI',Tahoma,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  .sheet{max-width:820px;margin:0 auto}
  h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;font-size:12px;margin-bottom:18px}
  .band{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #285f8c;padding-bottom:10px;margin-bottom:16px}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:13px;margin-bottom:18px}
  .grid div span{color:#64748b} .lbl{color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px}
  th{background:#f1f5f9;text-align:left;padding:7px 9px;border:1px solid #e2e8f0;font-size:11px;text-transform:uppercase;color:#475569}
  td{padding:7px 9px;border:1px solid #e2e8f0}
  .sig{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:8px}
  .sig .box{border:1px solid #e2e8f0;border-radius:8px;padding:10px;min-height:96px;display:flex;flex-direction:column;justify-content:space-between}
  .sig img{max-height:44px;object-fit:contain} .sig .who{font-size:11px;color:#64748b;text-transform:uppercase}
  .sig .nm{font-size:13px;font-weight:600} .muted{color:#94a3b8;font-style:italic;font-size:12px}
  .sec{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#334155;margin:18px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
  .steps{list-style:none;padding:0;margin:0} .steps li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
  .dot{width:22px;height:22px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
  @media print{body{padding:0}.sheet{max-width:none}}
`

function statusColor(s) {
  return ({ Requester: '#94a3b8', Approver: '#f59e0b', Warehouse: '#3b82f6', Completed: '#10b981', Declined: '#ef4444' }[s]) || '#94a3b8'
}

function buildTransmittalHtml(rowId, d, row) {
  const f = d.form || {}
  const items = d.items || []
  const stages = [['requester', 'Requester'], ['approver', 'Approver'], ['warehouse', 'Warehouse'], ['recipient', 'Recipient']]
  const signed = new Set(d.signedStages || [])
  const rowsHtml = items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.partNumber)}</td><td>${esc(it.description)}</td><td>${esc(it.type)}</td><td>${esc(it.unit)}</td><td style="text-align:right">${esc(it.qty)}</td><td style="text-align:right">${esc(it.transferQty)}</td><td>${esc(it.remarks)}</td></tr>`).join('')
  const sigHtml = stages.map(([k, label]) => {
    const nm = (d.signatureNames || {})[k]
    const img = (d.signatures || {})[k]
    const inner = signed.has(k) && img ? `<img src="${esc(img)}" alt="">` : `<span class="muted">Pending</span>`
    return `<div class="box"><div>${inner}</div><div><div class="nm">${esc(nm || '—')}</div><div class="who">${label}</div></div></div>`
  }).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transmittal ${esc(rowId)}</title><style>${DOC_CSS}</style></head><body><div class="sheet">
    <div class="band"><div><h1>Material Picking &amp; Requisition</h1><div class="sub">Transmittal #${esc(rowId)} · ${esc(f.remark || '')}</div></div>
      <span class="pill" style="background:${statusColor(d.signatureStatus)}22;color:${statusColor(d.signatureStatus)}">${esc(d.signatureStatus || '')}</span></div>
    <div class="grid">
      <div><div class="lbl">Company</div>${esc(f.company)}</div><div><div class="lbl">Applicant</div>${esc(f.applicantName)}</div>
      <div><div class="lbl">Requestor Email</div>${esc(f.requestorEmail)}</div><div><div class="lbl">Date of Application</div>${esc(f.dateApplication)}</div>
      <div><div class="lbl">Reason</div>${esc(f.reason)}</div><div><div class="lbl">Urgency</div>${f.urgency ? esc(f.urgencyLevel || 'Urgent') : 'Normal'}</div>
      <div><div class="lbl">Pickup Location</div>${esc(f.pickupLocation || '—')}</div><div><div class="lbl">Pickup</div>${esc(f.datePickup || '—')} ${esc(f.pickupTimeframe || '')}</div>
    </div>
    ${d.isDeclined && d.declineReason ? `<p style="color:#dc2626;font-size:13px"><b>Decline reason:</b> ${esc(d.declineReason)}</p>` : ''}
    <div class="sec">Materials</div>
    <table><thead><tr><th>#</th><th>Part Number</th><th>Description</th><th>Type</th><th>Unit</th><th style="text-align:right">Qty</th><th style="text-align:right">Transfer</th><th>Remarks</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="8" class="muted">No items</td></tr>'}</tbody></table>
    <div class="sec">Signatures</div><div class="sig">${sigHtml}</div>
  </div></body></html>`
}

function buildReportHtml(rowId, d, row) {
  const f = d.form || {}
  const names = d.signatureNames || {}
  const signed = new Set(d.signedStages || [])
  const steps = [
    ['requester', 'Requester submitted', names.requester],
    ['approver', d.isDeclined ? 'Approver declined' : 'Approver approved', names.approver],
    ['warehouse', 'Warehouse picked & signed', names.warehouse],
    ['recipient', 'Recipient received', names.recipient],
  ]
  const stepsHtml = steps.map(([k, label, who]) => {
    const done = signed.has(k) || (k === 'approver' && d.isDeclined)
    const color = k === 'approver' && d.isDeclined ? '#ef4444' : (done ? '#10b981' : '#cbd5e1')
    return `<li><span class="dot" style="background:${color}">${done ? '✓' : '·'}</span><div><div style="font-weight:600">${esc(label)}</div><div class="who" style="color:#64748b;font-size:11px">${esc(who || (done ? '' : 'Pending'))}</div></div></li>`
  }).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lifecycle Report ${esc(rowId)}</title><style>${DOC_CSS}</style></head><body><div class="sheet">
    <div class="band"><div><h1>Lifecycle Report</h1><div class="sub">Transmittal #${esc(rowId)} · ${esc(f.company)}</div></div>
      <span class="pill" style="background:${statusColor(d.signatureStatus)}22;color:${statusColor(d.signatureStatus)}">${esc(d.signatureStatus || '')}</span></div>
    <div class="grid">
      <div><div class="lbl">Transmittal Status</div>${esc(d.transmittalStatus || '')}</div><div><div class="lbl">Recipient Status</div>${esc(row.recipientStatus || '—')}</div>
      <div><div class="lbl">Applicant</div>${esc(f.applicantName)}</div><div><div class="lbl">Date of Application</div>${esc(f.dateApplication)}</div>
      <div><div class="lbl">Pickup Date</div>${esc(f.datePickup || '—')}</div><div><div class="lbl">Pickup Window</div>${esc(f.pickupTimeframe || '—')}</div>
    </div>
    <div class="sec">Approval Timeline</div><ul class="steps">${stepsHtml}</ul>
    ${d.isDeclined && d.declineReason ? `<p style="color:#dc2626;font-size:13px;margin-top:12px"><b>Decline reason:</b> ${esc(d.declineReason)}</p>` : ''}
  </div></body></html>`
}

async function openTransmittalPdf(rowId) {
  pdfModalRowId.value = rowId
  pdfModalKind.value = 'pdf'
  pdfLoading.value = true
  showPdfModal.value = true
  await buildDocUrl(rowId, 'pdf')
}

async function openTransmittalReport(rowId) {
  pdfModalRowId.value = rowId
  pdfModalKind.value = 'report'
  pdfLoading.value = true
  showPdfModal.value = true
  await buildDocUrl(rowId, 'report')
}

function closePdfModal() {
  showPdfModal.value = false
  pdfModalRowId.value = null
  pdfLoading.value = false
  if (pdfBlobUrl.value) { URL.revokeObjectURL(pdfBlobUrl.value); pdfBlobUrl.value = '' }
}

function printPdfModal() {
  pdfModalIframe.value?.contentWindow?.print()
}

watch(systemFilter, loadAll)
onMounted(loadAll)
</script>
