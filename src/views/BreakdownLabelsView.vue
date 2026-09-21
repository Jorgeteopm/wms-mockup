<template>
  <div class="max-w-7xl mx-auto space-y-6" @click="onDocumentClick">

    <div v-if="!embedded">
      <h1 class="text-xl font-bold text-slate-800">
        {{ isOutbound ? 'New Inbound/Outbound' : 'Breakdown Labels' }} — {{ LAYDOWN_FORM.label }}
      </h1>
      <p class="text-sm text-slate-500 mt-0.5">{{ blurb }}</p>
    </div>
    <p v-else class="text-sm text-slate-500">{{ blurb }}</p>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div
      v-if="outboundFailure"
      class="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900 flex items-start justify-between gap-3"
    >
      <p class="font-semibold">{{ outboundFailure }}</p>
      <button
        type="button"
        @click="outboundFailure = ''"
        class="shrink-0 px-2 py-0.5 text-xs font-semibold text-amber-900 border border-amber-400 rounded-md hover:bg-amber-100 transition-colors"
      >
        Dismiss
      </button>
    </div>

    <!-- Step 1 — pick the parent delivery -->
    <div class="rounded-xl border border-slate-100 bg-white shadow-sm p-4 sm:p-6 space-y-4">
      <div>
        <h2 class="text-base font-bold text-slate-800">Core Unit</h2>
        <p class="text-sm text-slate-500 mt-0.5">Search by LDYPN, part number or chemical.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="flex flex-col gap-1.5 relative ldypn-dropdown-cell">
          <label class="form-label">LDYPN</label>
          <input
            v-model="ldypnSearch"
            type="text"
            autocomplete="off"
            class="form-input"
            placeholder="Search by LDYPN…"
            @focus="openLdypnDropdown($event)"
            @input="openLdypnDropdown($event)"
            @keydown.escape="closeLdypnDropdown"
          />
        </div>

        <div class="flex flex-col gap-1.5 relative pn-dropdown-cell">
          <label class="form-label">MIC Part Number</label>
          <input
            v-model="pnSearch"
            type="text"
            autocomplete="off"
            class="form-input"
            placeholder="Search by MIC Part Number…"
            @focus="openPnDropdown($event)"
            @input="openPnDropdown($event)"
            @keydown.escape="closePnDropdown"
          />
        </div>

        <div class="flex flex-col gap-1.5 relative chem-dropdown-cell">
          <label class="form-label">Chemical</label>
          <input
            v-model="chemSearch"
            type="text"
            autocomplete="off"
            class="form-input"
            placeholder="Search chemical…"
            @focus="openChemDropdown($event)"
            @input="openChemDropdown($event)"
            @keydown.escape="closeChemDropdown"
          />
        </div>
      </div>

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-500">
              <tr>
                <th class="text-left font-semibold px-3 py-2.5">LDYPN</th>
                <th class="text-left font-semibold px-3 py-2.5">MIC Part Number</th>
                <th class="text-left font-semibold px-3 py-2.5">Chemical</th>
                <th class="text-left font-semibold px-3 py-2.5">Description</th>
                <th class="text-right font-semibold px-3 py-2.5">Qty</th>
                <th class="text-right font-semibold px-3 py-2.5">Set Units</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in pagedParents"
                :key="row.rowId"
                @click="selectParent(row, false)"
                class="border-t border-slate-100 transition-colors"
                :class="[
                  loadingParent ? 'cursor-wait pointer-events-none opacity-60' : 'cursor-pointer hover:bg-brand-50',
                  row.rowId === parent.rowId ? 'bg-brand-50' : ''
                ]"
              >
                <td class="px-3 py-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                  <span class="inline-flex items-center gap-2">
                    <svg v-if="loadingRowId === row.rowId" class="animate-spin h-3.5 w-3.5 text-brand-500" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    {{ row.partNumber || '—' }}
                  </span>
                </td>
                <td class="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">{{ row.micPartNumber || '—' }}</td>
                <td class="px-3 py-2.5 text-slate-600">{{ row.chemical || '—' }}</td>
                <td class="px-3 py-2.5 text-slate-500">{{ row.description || '—' }}</td>
                <td class="px-3 py-2.5 text-right text-slate-700">{{ row.qty || '—' }}</td>
                <td class="px-3 py-2.5 text-right text-slate-500">{{ childCountByParent[row.rowId] || 0 }}</td>
              </tr>
              <tr v-if="!pagedParents.length">
                <td colspan="6" class="px-3 py-6 text-center text-slate-400">
                  {{ rows.length ? 'No deliveries match this search.' : 'Loading deliveries…' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50 border-t border-slate-100 text-sm">
          <span class="text-slate-500">
            {{ filteredParents.length }} Core Unit{{ filteredParents.length === 1 ? '' : 's' }}
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="page = Math.max(1, page - 1)"
              :disabled="page <= 1"
              class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span class="text-slate-500">Page {{ page }} of {{ pageCount }}</span>
            <button
              type="button"
              @click="page = Math.min(pageCount, page + 1)"
              :disabled="page >= pageCount"
              class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div v-if="parent.rowId" class="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span v-if="parent.partNumber" class="font-mono text-base font-bold text-slate-800">
            {{ parent.partNumber }}
          </span>
          <span v-if="parent.micPartNumber" class="font-mono text-base font-bold text-slate-800">
            {{ parent.micPartNumber }}
          </span>
          <span class="text-sm text-slate-600">{{ parent.chemical }}</span>
          <span class="text-sm text-slate-400">{{ parent.description }}</span>
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span class="text-slate-500">Core Unit QTY: <strong class="text-slate-800">{{ parentQty }}</strong></span>
          <span class="text-slate-500">
            Set units recorded: <strong class="text-slate-800">{{ existingChildren.length }}</strong>
          </span>
        </div>
        <div v-if="existingChildren.length" class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Existing set units ({{ existingChildren.length }})
            </p>
            <button
              type="button"
              @click="reprintAllChildren"
              :disabled="printing"
              class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {{ printing ? 'Generating…' : 'Reprint all' }}
            </button>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-slate-500">
                <tr>
                  <th class="text-left font-semibold px-3 py-2">LDYPN</th>
                  <th class="text-left font-semibold px-3 py-2">MIC Part Number</th>
                  <th class="text-left font-semibold px-3 py-2">Chemical</th>
                  <th class="text-left font-semibold px-3 py-2">Description</th>
                  <th class="text-right font-semibold px-3 py-2">Qty</th>
                  <th class="text-left font-semibold px-3 py-2">Location</th>
                  <th class="text-left font-semibold px-3 py-2">Container #</th>
                  <th class="text-left font-semibold px-3 py-2">Package Type</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="child in existingChildren" :key="child.rowId" class="border-t border-slate-100">
                  <td class="px-3 py-2 font-mono font-semibold text-slate-800 whitespace-nowrap">
                    {{ child.partNumber || '—' }}
                  </td>
                  <td class="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                    {{ child.micPartNumber || '—' }}
                  </td>
                  <td class="px-3 py-2 text-slate-600">{{ child.chemical || '—' }}</td>
                  <td class="px-3 py-2 text-slate-500">{{ child.description || '—' }}</td>
                  <td class="px-3 py-2 text-right text-slate-700">{{ child.qty || '—' }}</td>
                  <td class="px-3 py-2 text-slate-600">{{ child.location || '—' }}</td>
                  <td class="px-3 py-2 text-slate-600">{{ child.containerNumber || '—' }}</td>
                  <td class="px-3 py-2 text-slate-600">{{ child.packageType || '—' }}</td>
                  <td class="px-3 py-2 text-right">
                    <button
                      type="button"
                      @click="reprintChild(child)"
                      :disabled="printing"
                      class="px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 rounded-md hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      Reprint
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2 — describe the units -->
    <div v-if="loadingParent" class="rounded-xl border border-slate-100 bg-white shadow-sm p-10 flex flex-col items-center gap-3 text-slate-400">
      <svg class="animate-spin h-6 w-6 text-brand-400" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      <p class="text-sm font-semibold">Loading inbound data and prefilling set units…</p>
    </div>

    <div v-else-if="parent.rowId" class="rounded-xl border border-slate-100 bg-white shadow-sm p-4 sm:p-6">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

        <div class="space-y-4">
          <div>
            <h2 class="text-base font-bold text-slate-800">Create Set Units</h2>
            <p class="text-sm text-slate-500 mt-0.5">
              Prefilled from the core unit inbound — change only what differs per set unit. A field
              left blank still falls back to the core unit's value.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-slate-600" for="unitCount"># of units</label>
            <input
              id="unitCount"
              v-model.number="unitCount"
              type="number"
              min="1"
              max="50"
              class="w-24 text-sm border border-slate-200 rounded-lg px-2.5 py-3 text-center focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="(unit, i) in units"
              :key="i"
              type="button"
              @click="previewIndex = i"
              class="px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors tabular-nums"
              :class="i === previewIndex
                ? 'text-white bg-brand-600 border-brand-600'
                : ((Number(unit.qty) || 0) > 0
                    ? 'text-slate-600 bg-white border-slate-300 hover:bg-slate-100'
                    : 'text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100')"
            >
              {{ i + 1 }} · {{ unit.qty || '—' }}
            </button>
          </div>

          <div class="rounded-lg bg-slate-100 border border-slate-200 p-3 space-y-2">
            <label class="flex items-center gap-2.5" :class="parentHasMic ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'">
              <input
                v-model="useAutoPartNumber"
                type="checkbox"
                :disabled="!parentHasMic"
                class="accent-brand-600 w-4 h-4"
              />
              <span class="text-sm font-semibold text-slate-700">Display the auto generated Part Number for the barcode?</span>
            </label>
            <p class="text-xs text-slate-500">
              <template v-if="!parentHasMic">
                This Core Unit has no MIC Part Number, so its set units get none either. The
                barcodes use the LDYPN
                (<span class="font-mono font-semibold">{{ parent.partNumber || '—' }}</span>) plus each
                unit's sequence.
              </template>
              <template v-else-if="useAutoPartNumber">
                The barcodes use the LDYPN
                (<span class="font-mono font-semibold">{{ parent.partNumber }}</span>) plus each
                unit's sequence.
              </template>
              <template v-else>
                The barcodes use the Core Unit's MIC Part Number
                (<span class="font-mono font-semibold">{{ parent.micPartNumber }}</span>) plus each
                unit's sequence.
              </template>
            </p>
          </div>

          <div class="rounded-lg border border-slate-200 p-4 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Label {{ previewIndex + 1 }} of {{ units.length }}
              </p>
              <span class="font-mono text-xs text-slate-500">{{ previewBarcode || '—' }}</span>
            </div>

            <div v-if="QTY_FIELDS.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="field in QTY_FIELDS"
                :key="field.key"
                class="rounded-lg bg-slate-100 border border-slate-200 p-3 flex flex-col gap-1.5"
              >
                <label class="form-label-sm">
                  {{ field.label }} <span class="text-brand-500">*</span>
                </label>
                <input
                  v-model.number="previewUnit[field.key]"
                  type="number"
                  min="1"
                  class="form-input bg-white"
                />
              </div>
            </div>

            <p
              v-if="outboundExceedsInbound"
              class="text-xs text-brand-600 font-semibold"
            >
              Outbound Qty is more than the Inbound Qty — a unit cannot ship more than arrived.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="field in GRID_FIELDS"
                :key="field.key"
                class="flex flex-col gap-1.5 relative"
                :class="[field.wide ? 'sm:col-span-2' : '', `${field.key}-dropdown-cell`]"
              >
                <label class="form-label-sm">
                  {{ field.label }}
                  <span v-if="field.required" class="text-brand-500">*</span>
                  <span v-if="field.type === 'growable'" class="text-slate-400 font-normal normal-case">
                    (Autocompletion Supported)
                  </span>
                </label>

                <select
                  v-if="field.type === 'picklist' && optionsFor(field.key).length"
                  v-model="previewUnit[field.key]"
                  class="form-input"
                >
                  <option value="">Same as parent</option>
                  <option v-for="opt in optionsFor(field.key)" :key="opt" :value="opt">{{ opt }}</option>
                </select>

                <input
                  v-else-if="field.type === 'growable'"
                  :value="previewUnit[field.key]"
                  type="text"
                  autocomplete="off"
                  class="form-input"
                  @focus="picklists[field.key].open($event)"
                  @input="picklists[field.key].onInput($event)"
                  @keydown.escape="picklists[field.key].close()"
                />

                <textarea
                  v-else-if="field.type === 'textarea'"
                  v-model="previewUnit[field.key]"
                  rows="2"
                  class="form-input resize-none"
                ></textarea>

                <input
                  v-else-if="field.type === 'number'"
                  v-model.number="previewUnit[field.key]"
                  type="number"
                  min="1"
                  class="form-input"
                />

                <input
                  v-else
                  v-model="previewUnit[field.key]"
                  :type="field.type"
                  class="form-input"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="form-label-sm">
                Attachments
                <span class="text-slate-400 font-normal normal-case">
                  (optional{{ previewUnit.photos.length ? ` — ${previewUnit.photos.length} on this unit` : '' }})
                </span>
              </label>

              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-w-md">
                <div
                  v-for="(photo, p) in previewUnit.photos"
                  :key="photo.name"
                  class="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                >
                  <img v-if="photo.isImage" :src="photo.data" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 px-1">
                    <svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="text-[10px] text-slate-500 text-center leading-tight truncate w-full" :title="photo.name">
                      {{ photo.name }}
                    </span>
                  </div>
                  <button
                    type="button"
                    @click="previewUnit.photos.splice(p, 1)"
                    title="Remove"
                    class="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center text-white bg-brand-600 rounded-full hover:bg-brand-700 transition-colors shadow-sm leading-none text-xs"
                  >×</button>
                </div>

                <div class="flex flex-col gap-1">
                  <div
                    class="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50 transition-colors cursor-pointer flex items-center justify-center"
                    @click="fileInput?.click()"
                  >
                    <svg class="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </div>
                  <button
                    type="button"
                    @click="openCamera"
                    title="Take photo"
                    class="w-full min-h-[40px] flex items-center justify-center gap-1 px-1 py-2 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 rounded-md hover:bg-brand-100 transition-colors"
                  >
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    Photo
                  </button>
                </div>
              </div>

              <input
                ref="fileInput"
                type="file"
                multiple
                :accept="ACCEPTED_FILE_ACCEPT"
                @change="onFilesPicked"
                class="hidden"
              />

              <p class="text-xs text-slate-400">
                Images, PDF, Word or Excel · up to {{ MAX_FILE_MB }} MB each
              </p>
            </div>

            <div class="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                @click="previewIndex = Math.max(0, previewIndex - 1)"
                :disabled="previewIndex <= 0"
                class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Previous label
              </button>
              <button
                type="button"
                @click="previewIndex = Math.min(units.length - 1, previewIndex + 1)"
                :disabled="previewIndex >= units.length - 1"
                class="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next label ›
              </button>
            </div>
          </div>


          <p class="text-xs text-slate-500">
            Total: <strong>{{ unitQtySum }}</strong> across
            <strong>{{ units.length }}</strong> label{{ units.length === 1 ? '' : 's' }}
          </p>
          <p v-if="!allUnitsHaveQty" class="text-xs text-amber-600 font-semibold">
            Every unit needs a quantity of at least 1.
          </p>

          <div class="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              @click="resetUnitsWithConfirm"
              class="px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              @click="createBreakdown"
              :disabled="creating || !canSubmit"
              class="px-6 py-3 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ creating
                ? 'Creating…'
                : (isOutbound ? 'Create, Send Out & Print Labels' : 'Create Set Units & Print Labels') }}
            </button>
          </div>

          <p class="text-xs text-slate-500 text-right">
            Labels print after the set units are created — Smartsheet assigns each set unit's part
            number on insert, so it cannot be printed before then.
          </p>

          <div v-if="lastResult" class="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <p class="font-semibold">{{ lastResult.message }}</p>
            <p class="mt-1 font-mono text-xs">
              {{ lastResult.entries.map(c => barcodeFor(c)).filter(Boolean).join(', ') }}
            </p>
            <button
              type="button"
              @click="reprintLast"
              :disabled="printing"
              class="mt-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
            >
              {{ printing ? 'Generating…' : 'Reprint these labels' }}
            </button>
          </div>
        </div>

        <div class="flex flex-col items-center gap-3">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Label preview</p>
          <span class="text-sm font-semibold text-slate-600 tabular-nums">
            Label {{ previewIndex + 1 }} of {{ units.length }}
          </span>

          <div class="label-card">
            <div class="lbl-header">
              <img src="/wms-icon-color.png" alt="WMS" class="lbl-logo" />
              <div class="lbl-title">LAYDOWN YARD<br>BREAKDOWN</div>
            </div>

            <div class="lbl-barcode">
              <svg ref="barcodeRef"></svg>
            </div>

            <div class="lbl-parent">
              <div class="p-row">
                <span class="p-label">Parent</span>
                <span class="p-value">{{ parentLabelCode || ' ' }}</span>
              </div>
              <div class="p-row">
                <span class="p-label">Parent Chemical</span>
                <span class="p-value sm">{{ parent.chemical || ' ' }}</span>
              </div>
            </div>

            <table class="lbl-fields">
              <tbody>
                <tr>
                  <td><span class="f-label">Chemical</span><span class="f-value lead multiline">{{ previewUnit.chemical || parent.chemical || ' ' }}</span></td>
                  <td><span class="f-label">Description</span><span class="f-value lead multiline">{{ previewUnit.description || parent.description || ' ' }}</span></td>
                </tr>
                <tr>
                  <td><span class="f-label">Qty</span><span class="f-value big">{{ previewUnit.qty || ' ' }}</span></td>
                  <td><span class="f-label">Unit</span><span class="f-value big">{{ previewIndex + 1 }}/{{ units.length }}</span></td>
                </tr>
                <tr>
                  <td><span class="f-label">Location</span><span class="f-value">{{ previewUnit.location || parent.location || ' ' }}</span></td>
                  <td><span class="f-label">Container #</span><span class="f-value">{{ previewUnit.containerNumber || parent.containerNumber || ' ' }}</span></td>
                </tr>
                <tr>
                  <td><span class="f-label">Package Type</span><span class="f-value">{{ previewUnit.packageType || parent.packageType || ' ' }}</span></td>
                  <td><span class="f-label">Arrival Date</span><span class="f-value">{{ previewUnit.arrivalDate || parent.arrivalDate || ' ' }}</span></td>
                </tr>
                <tr>
                  <td colspan="2"><span class="f-label">Supplier</span><span class="f-value multiline">{{ previewUnit.supplier || parent.supplier || ' ' }}</span></td>
                </tr>
                <tr>
                  <td colspan="2"><span class="f-label">Comments</span><span class="f-value multiline">{{ previewUnit.comments || ' ' }}</span></td>
                </tr>
                <tr>
                  <td colspan="2">
                    <span class="f-label">Condition on Arrival</span>
                    <div class="cond-row">
                      <span v-for="opt in previewConditions.filter(o => !isMoldOption(o.label))" :key="opt.label" class="cond">
                        <span class="box">{{ opt.checked ? 'X' : '' }}</span> {{ opt.label }}
                      </span>
                      <span class="cond-group">
                        <span v-for="opt in previewConditions.filter(o => isMoldOption(o.label))" :key="opt.label" class="cond">
                          <span class="box">{{ opt.checked ? 'X' : '' }}</span> {{ opt.label }}
                        </span>
                        <!-- Not a picklist value: an empty box the receiver ticks by hand. -->
                        <span class="cond"><span class="box"></span> Disinfected</span>
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="lbl-footer">
              <span>WMS v1.0</span>
              <span>LABEL: {{ previewIndex + 1 }}/{{ units.length }}</span>
              <span>{{ parent.poNumber ? 'PO ' + parent.poNumber : '' }}</span>
            </div>
          </div>

          <p class="text-xs text-slate-400 text-center">
            Each set unit's barcode is the code selected above plus its sequence
            (<span class="font-mono">{{ previewBarcode || '—' }}</span>), continuing from the
            set units already broken down.
          </p>
        </div>

      </div>
    </div>

    <ul
      v-for="field in GROWABLE_FIELDS"
      :key="field"
      v-show="picklists[field].show"
      :class="`${field}-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl`"
      :style="{ top: picklists[field].pos.top + 'px', left: picklists[field].pos.left + 'px', width: picklists[field].pos.width + 'px' }"
    >
      <li
        v-for="opt in picklists[field].filtered"
        :key="opt"
        @mousedown.prevent="picklists[field].select(opt)"
        class="px-3 py-3 text-sm text-slate-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ opt }}
      </li>
      <li v-if="picklists[field].filtered.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No match — “{{ previewUnit[field] }}” will be added as a new option
      </li>
    </ul>

    <!-- LDYPN dropdown -->
    <ul
      v-if="showLdypnDropdown"
      class="ldypn-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: ldypnDropdownPos.top + 'px', left: ldypnDropdownPos.left + 'px', width: ldypnDropdownPos.width + 'px' }"
    >
      <li
        v-for="row in filteredByLdypn"
        :key="row.rowId"
        @mousedown.prevent="selectParent(row)"
        class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        <div class="font-mono font-medium text-slate-800 leading-tight">{{ row.partNumber }}</div>
        <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
          <span v-if="row.micPartNumber" class="font-mono">{{ row.micPartNumber }}</span>
          <span v-if="row.chemical">{{ row.chemical }}</span>
          <span v-if="row.chemical && row.description">·</span>
          <span v-if="row.description">{{ row.description }}</span>
        </div>
      </li>
      <li v-if="filteredByLdypn.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

    <!-- Part-number dropdown -->
    <ul
      v-if="showPnDropdown"
      class="pn-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: pnDropdownPos.top + 'px', left: pnDropdownPos.left + 'px', width: pnDropdownPos.width + 'px' }"
    >
      <li
        v-for="row in filteredByPn"
        :key="row.rowId"
        @mousedown.prevent="selectParent(row)"
        class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        <div class="font-mono font-medium text-slate-800 leading-tight">{{ row.micPartNumber }}</div>
        <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
          <span v-if="row.partNumber" class="font-mono">{{ row.partNumber }}</span>
          <span v-if="row.chemical">{{ row.chemical }}</span>
          <span v-if="row.chemical && row.description">·</span>
          <span v-if="row.description">{{ row.description }}</span>
        </div>
      </li>
      <li v-if="filteredByPn.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

    <!-- Chemical dropdown -->
    <ul
      v-if="showChemDropdown"
      class="chem-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: chemDropdownPos.top + 'px', left: chemDropdownPos.left + 'px', width: chemDropdownPos.width + 'px' }"
    >
      <li
        v-for="row in filteredByChemical"
        :key="row.rowId"
        @mousedown.prevent="selectParent(row)"
        class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        <div class="font-medium text-slate-800 leading-tight">{{ row.chemical }}</div>
        <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
          <span v-if="row.micPartNumber" class="font-mono">{{ row.micPartNumber }}</span>
          <span v-if="row.partNumber" class="font-mono">{{ row.partNumber }}</span>
          <span v-if="(row.micPartNumber || row.partNumber) && row.description">·</span>
          <span v-if="row.description">{{ row.description }}</span>
        </div>
      </li>
      <li v-if="filteredByChemical.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

    <!-- Camera capture modal — same widget as the delivery form. -->
    <Teleport to="body">
      <div v-if="showCamera" class="fixed inset-0 z-[600] bg-black/70 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl p-4 max-w-md w-full flex flex-col gap-3">
          <p class="text-sm font-semibold text-slate-700 text-center">
            Photo {{ previewUnit.photos.length + 1 }} for label {{ previewIndex + 1 }} of {{ units.length }}
          </p>
          <video ref="cameraVideo" autoplay playsinline muted class="w-full rounded-xl bg-black"></video>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="closeCamera"
              class="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="capturePhoto"
              class="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Capture
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast notifications -->
    <Teleport to="body">
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] flex flex-col gap-2 pointer-events-none items-center">
        <transition-group name="toast">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-sm w-full"
            :class="{
              'bg-green-600 text-white': toast.type === 'success',
              'bg-red-600 text-white':   toast.type === 'error',
              'bg-amber-500 text-white': toast.type === 'warning'
            }"
          >
            <span class="flex-1">{{ toast.message }}</span>
            <button @click="dismissToast(toast.id)" class="opacity-70 hover:opacity-100 shrink-0 leading-none">✕</button>
          </div>
        </transition-group>
      </div>
    </Teleport>

  </div>
  <BusyOverlay :show="busy" :message="busyMessage" />

</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import BusyOverlay from '../components/BusyOverlay.vue'
import JsBarcode from 'jsbarcode'
import { LAYDOWN_FORM } from '../config/forms.js'
import { buildBreakdownCode } from '../config/laydownPn.js'
import { printLabelPdf } from '../composables/useLabelPrint.js'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  mode:     { type: String,  default: 'set' },
})

const isOutbound = props.mode === 'outbound'

const blurb = isOutbound
  ? 'Split a Core Unit into units that are leaving the yard. Each unit is recorded on the Laydown sheet and on the outbound sheet in the same submit, and gets its own label.'
  : 'Split a received delivery into units. Each unit becomes a child row of its parent and gets its own part number and label.'

const API = '/api/laydown'
const CREATE_PATH = isOutbound ? 'set-units-outbound' : 'breakdown'

const error    = ref('')
const creating = ref(false)
const printing = ref(false)

const loadingParent = ref(false)
const loadingRowId  = ref(null)

const toasts = ref([])
let toastSeq = 0

function showToast(message, type = 'success') {
  const id = ++toastSeq
  toasts.value.push({ id, message, type })
  setTimeout(() => dismissToast(id), type === 'error' ? 6000 : 4000)
}
function dismissToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

const rows = ref([])
const OUTBOUND_FIELDS = [
  { key: 'deliveredTo', label: 'Delivered To', type: 'text', required: true },
]

const QTY_KEYS = ['qty', 'outboundQty']

const UNIT_FIELDS = [
  ...(isOutbound ? OUTBOUND_FIELDS : []),
  ...(isOutbound ? [{ key: 'outboundQty', label: 'Outbound Qty', type: 'number', required: true }] : []),
  // No micPartNumber: a set unit's MIC is the parent's plus its sequence, derived on save.
  // Typing one here was discarded in every case where the parent had a MIC of its own.
  { key: 'chemical',        label: 'Chemical',                   type: 'growable' },
  { key: 'description',     label: 'Description',                type: 'text',     wide: true },
  { key: 'qty',             label: isOutbound ? 'Inbound Qty' : 'Quantity', type: 'number', required: true },
  { key: 'location',        label: 'Location',                   type: 'growable' },
  { key: 'containerNumber', label: 'Container #',                type: 'text' },
  { key: 'packageType',     label: 'Package Type',               type: 'picklist' },
  { key: 'condition',       label: 'Condition on Arrival',       type: 'picklist' },
  { key: 'serialNumber',    label: 'Serial Number',              type: 'text' },
  { key: 'poNumber',        label: 'PO Number',                  type: 'text' },
  { key: 'trackingNumber',  label: 'Tracking Number',            type: 'text' },
  { key: 'brand',           label: 'Brand',                      type: 'growable' },
  { key: 'type',            label: 'Type',                       type: 'picklist' },
  { key: 'origin',          label: 'Origin',                     type: 'picklist' },
  { key: 'system',          label: 'System',                     type: 'picklist' },
  { key: 'deliveryCompany', label: 'Delivery Company / Carrier', type: 'text' },
  { key: 'receivedBy',      label: 'Received By',                type: 'text' },
  { key: 'arrivalDate',     label: 'Arrival Date',               type: 'date' },
  { key: 'arrivalTime',     label: 'Arrival Time',               type: 'time' },
  { key: 'supplier',        label: 'Supplier Information',       type: 'textarea', wide: true },
  { key: 'comments',        label: 'Comments',                   type: 'textarea', wide: true },
]

const options = ref({})

const EMPTY_PARENT = {
  rowId: null, partNumber: '',
  ...Object.fromEntries(UNIT_FIELDS.map(f => [f.key, ''])),
}
const parent = ref({ ...EMPTY_PARENT })
const existingChildren = ref([])
const nextSequence  = ref(1)

const parentQty = computed(() => Number(parent.value.qty) || 0)

const ldypnSearch = ref('')
const pnSearch   = ref('')
const chemSearch = ref('')

async function loadRows() {
  try {
    const res = await fetch(`${API}/records`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load deliveries.')
    rows.value = await res.json()
  } catch (err) {
    error.value = err.message
  }
}

async function loadOptions() {
  try {
    const res = await fetch(`${API}/options`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load options.')
    options.value = await res.json()
  } catch {
    console.warn('Could not load laydown options')
  }
}

const GROWABLE_FIELDS = UNIT_FIELDS.filter(f => f.type === 'growable').map(f => f.key)
const QTY_FIELDS  = isOutbound ? UNIT_FIELDS.filter(f => QTY_KEYS.includes(f.key)) : []
const GRID_FIELDS = isOutbound ? UNIT_FIELDS.filter(f => !QTY_KEYS.includes(f.key)) : UNIT_FIELDS

function conditionOptionsFor(value) {
  const current = String(value ?? '').trim()
  const list = optionsFor('condition')
  const all  = current && !list.includes(current) ? [...list, current] : list
  return all.map(opt => ({ label: opt, checked: opt === current }))
}

const SELECTABLE_FIELDS = UNIT_FIELDS
  .filter(field => field.type === 'picklist' || field.type === 'growable')
  .map(field => field.key)

const valuesInUse = computed(() => {
  const byField = {}

  for (const field of SELECTABLE_FIELDS) {
    byField[field] = new Set()
  }

  for (const record of rows.value) {
    for (const field of SELECTABLE_FIELDS) {
      const value = String(record[field] ?? '').trim()
      if (value) {
        byField[field].add(value)
      }
    }
  }

  return byField
})

function optionsFor(key) {
  const merged = new Set(options.value[key] ?? [])

  for (const value of valuesInUse.value[key] ?? []) {
    merged.add(value)
  }

  // The parent's own value goes first, so the inherited one is the obvious pick.
  const current = String(parent.value[key] ?? '').trim()
  const rest = [...merged].filter(option => option !== current).sort((a, b) => a.localeCompare(b))

  return current ? [current, ...rest] : rest
}

const parentRows = computed(() => rows.value.filter(r => !r.parentRowId))

const childCountByParent = computed(() => {
  const counts = {}
  for (const row of rows.value) {
    if (row.parentRowId) counts[row.parentRowId] = (counts[row.parentRowId] ?? 0) + 1
  }
  return counts
})

const filteredByLdypn = computed(() => {
  const withLdypn = parentRows.value.filter(row => row.partNumber)
  const search = ldypnSearch.value.trim().toLowerCase()

  if (!search) {
    return withLdypn
  }

  return withLdypn.filter(row => String(row.partNumber).toLowerCase().includes(search))
})

const filteredByPn = computed(() => {
  const q = pnSearch.value.trim().toLowerCase()
  const withPn = parentRows.value.filter(r => r.micPartNumber || r.partNumber)
  if (!q) return withPn
  return withPn.filter(r =>
    [r.micPartNumber, r.partNumber].some(v => String(v ?? '').toLowerCase().includes(q))
  )
})

const filteredByChemical = computed(() => {
  const q = chemSearch.value.trim().toLowerCase()
  const withChemical = parentRows.value.filter(r => r.chemical)
  if (!q) return withChemical
  return withChemical.filter(r =>
    [r.chemical, r.micPartNumber].some(v => String(v ?? '').toLowerCase().includes(q))
  )
})

const PAGE_SIZE = 8
const page = ref(1)

const filteredParents = computed(() => {
  const ldypn = ldypnSearch.value.trim().toLowerCase()
  const pn   = pnSearch.value.trim().toLowerCase()
  const chem = chemSearch.value.trim().toLowerCase()
  return parentRows.value.filter(r => {
    const matchesLdypn = !ldypn || String(r.partNumber ?? '').toLowerCase().includes(ldypn)
    const matchesPn = !pn || [r.micPartNumber, r.partNumber]
      .some(v => String(v ?? '').toLowerCase().includes(pn))
    const matchesChem = !chem || String(r.chemical ?? '').toLowerCase().includes(chem)
    return matchesLdypn && matchesPn && matchesChem
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredParents.value.length / PAGE_SIZE)))

const pagedParents = computed(() =>
  filteredParents.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)

watch(pageCount, (count) => { if (page.value > count) page.value = count })
watch([ldypnSearch, pnSearch, chemSearch], () => { page.value = 1 })

function confirmDiscardPhotos(action) {
  const photoCount = units.value.reduce((sum, u) => sum + u.photos.length, 0)
  if (!photoCount) return true
  return window.confirm(`${action} discards ${photoCount} photo(s) that haven't been saved yet. Continue?`)
}

async function selectParent(row, syncSearch = true) {
  if (row.rowId !== parent.value.rowId && !confirmDiscardPhotos('Loading another core unit')) return
  closeLdypnDropdown()
  closePnDropdown()
  closeChemDropdown()
  if (syncSearch) {
    ldypnSearch.value = row.partNumber ?? ''
    pnSearch.value   = row.micPartNumber ?? ''
    chemSearch.value = row.chemical ?? ''
  }
  error.value = ''
  lastResult.value = null
  loadingParent.value = true
  loadingRowId.value  = row.rowId

  try {
    const res = await fetch(`${API}/${row.rowId}/breakdown`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load this delivery.')
    const data = await res.json()
    parent.value = { ...EMPTY_PARENT, ...data.parent }
    existingChildren.value = data.children ?? []
    nextSequence.value  = data.nextSequence ?? (existingChildren.value.length + 1)
  } catch (err) {
    parent.value = { ...EMPTY_PARENT, ...row }
    existingChildren.value = []
    nextSequence.value  = 1
    showToast(err.message, 'error')
  } finally {
    loadingParent.value = false
    loadingRowId.value  = null
  }
  resetUnits()
}

const unitCount = ref(1)

function makeUnit(qty = 1) {
  const unit = {}
  for (const field of UNIT_FIELDS) unit[field.key] = parent.value[field.key] ?? ''
  unit.qty = qty
  // Not a sheet column: uploaded as attachments on this unit's own row.
  unit.photos = []
  return unit
}

const units = ref([makeUnit()])
const previewIndex = ref(0)

function resetUnits() {
  units.value = Array.from({ length: Math.max(1, Math.floor(unitCount.value) || 1) }, () => makeUnit(1))
  previewIndex.value = 0
}

function resetUnitsWithConfirm() {
  if (confirmDiscardPhotos('Resetting')) resetUnits()
}

// Changing the count grows or trims the tail instead of rebuilding the array: rebuilding
// threw away everything already captured — typed fields and photos alike — the moment
// someone realised they needed one more unit.
watch(unitCount, (count) => {
  const target  = Math.max(1, Math.floor(count) || 1)
  const current = units.value

  if (target > current.length) {
    units.value = [
      ...current,
      ...Array.from({ length: target - current.length }, () => makeUnit(1)),
    ]
    return
  }

  if (target < current.length) {
    // Trimming destroys work, and photos can't be recaptured from here. Confirm first, and
    // put the count back if the answer is no — the watch re-runs with target === length and
    // settles, so this doesn't loop.
    const dropped = current.slice(target)
    const carriesWork = dropped.some(u => u.photos.length > 0)
    if (carriesWork) {
      const photoCount = dropped.reduce((sum, u) => sum + u.photos.length, 0)
      const ok = window.confirm(
        `Removing ${dropped.length} unit(s) also discards ${photoCount} photo(s) taken for them. Continue?`
      )
      if (!ok) {
        unitCount.value = current.length
        return
      }
    }
    units.value = current.slice(0, target)
  }
})
watch(() => units.value.length, (length) => {
  if (previewIndex.value > length - 1) previewIndex.value = Math.max(0, length - 1)
})

const previewUnit = computed(() =>
  units.value[Math.min(previewIndex.value, units.value.length - 1)] ?? makeUnit()
)

function createGrowablePicklist(field) {
  const show = ref(false)
  const pos  = ref({ top: 0, left: 0, width: 0 })
  let anchorEl = null

  // Computed xd
  const filtered = computed(() => {
    const all = optionsFor(field)
    const q = String(previewUnit.value[field] ?? '').trim().toLowerCase()
    if (!q) return all
    return all.filter(opt => String(opt).toLowerCase().includes(q))
  })

  function reposition() {
    if (!show.value || !anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    pos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
  }
  function open(event) {
    anchorEl = event.target
    show.value = true
    reposition()
  }
  function onInput(event) {
    previewUnit.value[field] = event.target.value
    open(event)
  }
  function select(option) {
    previewUnit.value[field] = option
    close()
  }
  function close() {
    show.value = false
    anchorEl = null
  }

  return reactive({ show, pos, filtered, reposition, open, onInput, select, close })
}

const picklists = Object.fromEntries(
  GROWABLE_FIELDS.map(field => [field, createGrowablePicklist(field)])
)

watch(previewIndex, () => {
  for (const field of GROWABLE_FIELDS) picklists[field].close()
})

const unitQtySum = computed(() =>
  units.value.reduce((sum, u) => sum + (Number(u.qty) || 0), 0)
)
const allUnitsHaveQty = computed(() =>
  units.value.length > 0 && units.value.every(u => (Number(u.qty) || 0) > 0)
)

const REQUIRED_UNIT_FIELDS = UNIT_FIELDS
  .filter(field => field.required && !QTY_KEYS.includes(field.key))
  .map(field => field.key)

const allUnitsComplete = computed(() =>
  units.value.every(unit =>
    REQUIRED_UNIT_FIELDS.every(key => String(unit[key] ?? '').trim() !== '')
  )
)

const outboundExceedsInbound = computed(() => {
  if (!isOutbound) {
    return false
  }

  const outbound = Number(previewUnit.value?.outboundQty || 0)
  const inbound  = Number(previewUnit.value?.qty || 0)
  return outbound > inbound
})

const quantitiesValid = computed(() => {
  if (!isOutbound) {
    return true
  }

  return units.value.every(unit => {
    const outbound = Number(unit.outboundQty || 0)
    const inbound  = Number(unit.qty || 0)
    return outbound > 0 && outbound <= inbound
  })
})

const canSubmit = computed(() => {
  if (!parent.value.rowId) {
    return false
  }
  return allUnitsHaveQty.value && allUnitsComplete.value && quantitiesValid.value
})

const MAX_FILE_MB    = 25
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
const ACCEPTED_FILE_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const ACCEPTED_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx']
const ACCEPTED_FILE_ACCEPT = [...ACCEPTED_FILE_TYPES, ...ACCEPTED_FILE_EXTENSIONS].join(',')

function isAcceptedFile(file) {
  if (ACCEPTED_FILE_TYPES.includes(file.type)) return true
  const name = String(file.name || '').toLowerCase()
  return ACCEPTED_FILE_EXTENSIONS.some(ext => name.endsWith(ext))
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const fileInput = ref(null)

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

async function onFilesPicked(event) {
  for (const file of [...event.target.files]) {
    if (!isAcceptedFile(file)) {
      showToast(`${file.name} is not an image, PDF, Word or Excel file.`, 'error')
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast(`${file.name} is ${formatSize(file.size)}, over the ${MAX_FILE_MB} MB limit.`, 'error')
      continue
    }
    try {
      previewUnit.value.photos.push({
        name:    `${Date.now()}-${file.name}`,
        data:    await readAsDataUrl(file),
        isImage: file.type.startsWith('image/'),
      })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }
  event.target.value = ''
}

const showCamera  = ref(false)
const cameraVideo = ref(null)
let cameraStream = null

async function openCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  } catch {
    showToast('Could not access the camera.', 'error')
    return
  }
  showCamera.value = true
  await nextTick()
  if (cameraVideo.value) cameraVideo.value.srcObject = cameraStream
}

function closeCamera() {
  cameraStream?.getTracks().forEach(track => track.stop())
  cameraStream = null
  showCamera.value = false
}

function capturePhoto() {
  const video = cameraVideo.value
  if (!video) return
  const canvas = document.createElement('canvas')
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  previewUnit.value.photos.push({
    name: `unit-${previewIndex.value + 1}-${Date.now()}.png`,
    data: canvas.toDataURL('image/png'),
    isImage: true,
  })
  closeCamera()
}

const lastResult = ref(null)
const outboundFailure = ref('')

async function createBreakdown() {
  if (!canSubmit.value) return
  creating.value = true
  error.value = ''
  outboundFailure.value = ''
  try {
    const res = await fetch(`${API}/${parent.value.rowId}/${CREATE_PATH}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        children: units.value,
        barcodeSource: useAutoPartNumber.value ? 'auto' : 'mic',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to create the set units.')

    // 207: the laydown rows were written, the outbound leg was not. The units still need
    // their labels, so the flow continues — with the banner left standing.
    if (data.outboundFailed) outboundFailure.value = data.message

    const printedEntries = (data.children ?? []).map((child, i) => ({ ...units.value[i], ...child }))
    lastResult.value = { ...data, entries: printedEntries }
    showToast(data.message, data.outboundFailed ? 'warning' : 'success')
    await printBreakdownLabels(printedEntries)

    resetUnits()

    const refreshed = await fetch(`${API}/${parent.value.rowId}/breakdown`, { credentials: 'include' })
    if (refreshed.ok) {
      const fresh = await refreshed.json()
      existingChildren.value = fresh.children ?? []
      nextSequence.value  = fresh.nextSequence ?? (existingChildren.value.length + 1)
    }
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    creating.value = false
  }
}

async function printBreakdownLabels(entries, { fileTag = '' } = {}) {
  const printable = (entries ?? []).filter(e => barcodeFor(e))
  if (!printable.length) {
    showToast('Nothing to print — these units have no code yet.', 'warning')
    return
  }
  printing.value = true
  try {
    const at = (e, key) => e[key] || parent.value[key] || ''
    await printLabelPdf({
      parentMicPartNumber: parentLabelCode.value,
      parentChemical:      parent.value.chemical,
      unit: '',
      barcodeValues: printable.map(e => barcodeFor(e)),
      quantities:    printable.map(e => Number(e.qty) || 0),
      pageFields:    printable.map(e => ({
        chemical:        at(e, 'chemical'),
        description:     at(e, 'description'),
        supplier:        at(e, 'supplier'),
        arrivalDate:     at(e, 'arrivalDate'),
        location:        at(e, 'location'),
        containerNumber: at(e, 'containerNumber'),
        packageType:     at(e, 'packageType'),
        comments:        e.comments || '',
        conditionOptions: conditionOptionsFor(at(e, 'condition')),
      })),
      footerText: parent.value.poNumber ? `PO ${parent.value.poNumber}` : '',
      fileName: `breakdown-${parent.value.micPartNumber || parent.value.partNumber || 'labels'}${fileTag}`,
    }, 'breakdown')
  } catch (err) {
    showToast(err.message || 'Failed to print the breakdown labels.', 'error')
  } finally {
    printing.value = false
  }
}

function reprintLast() {
  if (lastResult.value?.entries) printBreakdownLabels(lastResult.value.entries)
}

function reprintChild(child) {
  return printBreakdownLabels([child], { fileTag: `-${barcodeFor(child)}` })
}

function reprintAllChildren() {
  return printBreakdownLabels(existingChildren.value, { fileTag: '-all' })
}

const barcodeRef = ref(null)
const useAutoPartNumber = ref(false)

// A set unit stores both codes. This picks the one its label carries. A unit that was just
// created already carries the server's own choice, so that wins when it is there.
function barcodeFor(entry) {
  if (entry.barcodeValue) return entry.barcodeValue

  const auto = entry.partNumber || ''
  const mic  = entry.micPartNumber || ''
  return useAutoPartNumber.value ? (auto || mic) : (mic || auto)
}

const isMoldOption = label => String(label ?? '').trim().toLowerCase() === 'mold'
const previewConditions = computed(() => conditionOptionsFor(previewUnit.value.condition))
const parentHasMic = computed(() => String(parent.value.micPartNumber ?? '').trim() !== '')
const parentLabelCode = computed(() =>
  parent.value.micPartNumber || parent.value.partNumber || ''
)

const previewBarcodeBase = computed(() => {
  const auto = parent.value.partNumber || ''
  const mic  = parent.value.micPartNumber || ''

  return useAutoPartNumber.value ? (auto || mic) : (mic || auto)
})

const previewBarcode = computed(() =>
  buildBreakdownCode(previewBarcodeBase.value, nextSequence.value + previewIndex.value)
)

function drawBarcode(target, value) {
  if (!target) return
  const v = String(value ?? '').trim()
  if (!v) { target.innerHTML = ''; return }
  try {
    JsBarcode(target, v, { format: 'CODE39', width: 2, height: 60, displayValue: true, margin: 0 })
  } catch {
    target.innerHTML = ''
  }
}

watch(previewBarcode, async (value) => {
  await nextTick()
  drawBarcode(barcodeRef.value, value)
}, { immediate: true })

const showLdypnDropdown = ref(false)
const ldypnDropdownPos  = ref({ top: 0, left: 0, width: 0 })
let ldypnAnchorEl = null

function repositionLdypnDropdown() {
  if (!showLdypnDropdown.value || !ldypnAnchorEl) return
  const rect = ldypnAnchorEl.getBoundingClientRect()
  ldypnDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
}
function openLdypnDropdown(event) {
  ldypnAnchorEl = event.target
  showLdypnDropdown.value = true
  repositionLdypnDropdown()
}
function closeLdypnDropdown() {
  showLdypnDropdown.value = false
  ldypnAnchorEl = null
}

const showPnDropdown = ref(false)
const pnDropdownPos  = ref({ top: 0, left: 0, width: 0 })
let pnAnchorEl = null

function repositionPnDropdown() {
  if (!showPnDropdown.value || !pnAnchorEl) return
  const rect = pnAnchorEl.getBoundingClientRect()
  pnDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
}
function openPnDropdown(event) {
  pnAnchorEl = event.target
  showPnDropdown.value = true
  repositionPnDropdown()
}
function closePnDropdown() {
  showPnDropdown.value = false
  pnAnchorEl = null
}

const showChemDropdown = ref(false)
const chemDropdownPos  = ref({ top: 0, left: 0, width: 0 })
let chemAnchorEl = null

function repositionChemDropdown() {
  if (!showChemDropdown.value || !chemAnchorEl) return
  const rect = chemAnchorEl.getBoundingClientRect()
  chemDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
}
function openChemDropdown(event) {
  chemAnchorEl = event.target
  showChemDropdown.value = true
  repositionChemDropdown()
}
function closeChemDropdown() {
  showChemDropdown.value = false
  chemAnchorEl = null
}

function onDocumentClick(event) {
  if (!event.target.closest('.ldypn-dropdown-cell, .ldypn-dropdown')) closeLdypnDropdown()
  if (!event.target.closest('.pn-dropdown-cell, .pn-dropdown')) closePnDropdown()
  if (!event.target.closest('.chem-dropdown-cell, .chem-dropdown')) closeChemDropdown()
  for (const field of GROWABLE_FIELDS) {
    if (!event.target.closest(`.${field}-dropdown-cell, .${field}-dropdown`)) picklists[field].close()
  }
}

function repositionAll() {
  repositionLdypnDropdown()
  repositionPnDropdown()
  repositionChemDropdown()
  for (const field of GROWABLE_FIELDS) picklists[field].reposition()
}

onMounted(() => {
  loadRows()
  loadOptions()
  window.addEventListener('scroll', repositionAll, true)
  window.addEventListener('resize', repositionAll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', repositionAll, true)
  window.removeEventListener('resize', repositionAll)
  // Switching tabs with the modal open would leave the camera running until reload.
  cameraStream?.getTracks().forEach(track => track.stop())
})

const busy = computed(() => creating.value || printing.value || loadingParent.value)

const busyMessage = computed(() => {
  if (printing.value) return 'Generating the labels…'
  if (creating.value) return 'Saving the set units…'
  return 'Loading the core unit…'
})
</script>

<style scoped>
.label-card {
  width: 4in;
  max-width: 100%;
  background: #fff;
  border: 1px solid #000;
  padding: 0.14in;
  display: flex;
  flex-direction: column;
  color: #000;
}
.lbl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.1in;
  padding-bottom: 0.06in;
  border-bottom: 3px solid #000;
}
.lbl-logo { height: 0.4in; width: auto; }
.lbl-title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-align: right;
  line-height: 1.1;
}
.lbl-barcode {
  text-align: center;
  padding: 0.05in 0 0.02in 0;
  border-bottom: 2px solid #000;
}
.lbl-barcode svg { max-width: 100%; }
.lbl-parent {
  display: flex;
  flex-direction: column;
  gap: 0.02in;
  padding: 0.05in 0.06in;
  margin-top: 0.06in;
  border: 1.5px solid #000;
  background: #000;
  color: #fff;
}
.lbl-parent .p-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.1in;
}
.lbl-parent .p-row:last-child { align-items: flex-start; }
.lbl-parent .p-label {
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.lbl-parent .p-value { font-size: 15px; font-weight: 800; text-align: right; }
.lbl-parent .p-value.sm { font-size: 11px; font-weight: 700; word-wrap: break-word; }
.lbl-fields {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 0.06in;
}
.lbl-fields td {
  border: 1.5px solid #000;
  padding: 0.035in 0.06in;
  vertical-align: top;
  overflow: hidden;
}
.f-label {
  display: block;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.f-value {
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  min-height: 0.2in;
  word-wrap: break-word;
}
.f-value.big { font-size: 20px; font-weight: 800; }
.f-value.lead { font-size: 14px; font-weight: 700; min-height: 0.4in; }
.f-value.multiline { white-space: pre-line; }
.cond-row { display: flex; gap: 0.12in; align-items: center; padding-top: 0.02in; flex-wrap: wrap; }
.cond { display: flex; align-items: center; gap: 0.04in; font-size: 10px; font-weight: 600; }
.cond-group {
  display: flex;
  align-items: center;
  gap: 0.1in;
  padding: 0.02in 0.06in;
  border: 1.5px solid #000;
}
.cond .box {
  width: 0.14in; height: 0.14in;
  border: 1.5px solid #000;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; line-height: 1;
}
.lbl-footer {
  margin-top: auto;
  padding-top: 0.04in;
  border-top: 1.5px solid #000;
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
