<template>
  <div class="space-y-5">

    <BusyOverlay :show="busy" :message="busyMessage" />

    <ConfirmModal
      :model-value="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-label="confirmDialog.confirmLabel"
      :cancel-label="confirmDialog.cancelLabel"
      :destructive="confirmDialog.destructive"
      @confirm="settleConfirm(true)"
      @cancel="settleConfirm(false)"
    />

    <ImageViewer
      :show="viewer.show"
      :src="viewer.src"
      :title="viewer.title"
      :subtitle="viewer.subtitle"
      :loading="viewer.loading"
      @close="viewer.show = false"
    />

    <!-- Standalone only: inside the Inventory portal, the portal supplies the heading. -->
    <div v-if="!embedded">
      <h1 class="text-xl font-bold text-slate-800">Equipment List</h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Browse the Laydown Yard deliveries — core units and the set units broken out of them.
      </p>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div class="flex gap-3 flex-wrap items-end">
        <div class="flex-1 min-w-[240px] flex flex-col gap-1.5">
          <label class="form-label">Search</label>
          <input
            v-model="search"
            type="text"
            placeholder="LDYPN, MIC part number, chemical, description, location…"
            class="form-input"
          />
        </div>

        <div class="min-w-[150px] flex flex-col gap-1.5">
          <label class="form-label">Unit</label>
          <select v-model="unitFilter" class="form-input">
            <option value="">All units</option>
            <option value="core">Core units</option>
            <option value="set">Set units</option>
          </select>
        </div>

        <div class="min-w-[150px] flex flex-col gap-1.5">
          <label class="form-label">Category</label>
          <select v-model="categoryFilter" class="form-input">
            <option value="">All categories</option>
            <option v-for="option in categoryOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[150px] flex flex-col gap-1.5">
          <label class="form-label">Chemical</label>
          <select v-model="chemicalFilter" class="form-input">
            <option value="">All chemicals</option>
            <option v-for="option in chemicalOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[150px] flex flex-col gap-1.5">
          <label class="form-label">Brand</label>
          <select v-model="brandFilter" class="form-input">
            <option value="">All brands</option>
            <option v-for="option in brandOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[150px] flex flex-col gap-1.5">
          <label class="form-label">System</label>
          <select v-model="systemFilter" class="form-input">
            <option value="">All systems</option>
            <option v-for="option in systemOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[150px] flex flex-col gap-1.5">
          <label class="form-label">Warehouse</label>
          <select v-model="warehouseFilter" class="form-input">
            <option value="">All warehouses</option>
            <option v-for="option in warehouseOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <label class="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50">
          <input v-model="onlyMissingPicture" type="checkbox" class="accent-brand-600 w-4 h-4" />
          <span class="text-sm text-slate-600">Missing picture</span>
        </label>
      </div>

      <p class="text-xs text-slate-500">
        Showing {{ filtered.length.toLocaleString() }} of {{ records.length.toLocaleString() }} deliveries.
      </p>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <TablePaginator
        v-model:page="page"
        v-model:pageSize="pageSize"
        :page-count="pageCount"
        :page-sizes="PAGE_SIZES"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :total="filtered.length"
        show-page-size
        class="border-b border-slate-100 bg-slate-50"
      />

      <!-- One bar above and one below the table, so the columns can be dragged sideways from
           either end. The native bar is hidden so it does not sit next to the bottom one. -->
      <DragScrollBar :target="tableScroll" class="border-b border-slate-100 bg-slate-50" />

      <div ref="tableScroll" class="overflow-x-auto no-scrollbar">
        <table class="w-full min-w-[1500px] text-sm">
          <thead>
            <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th class="px-3 py-3 text-left w-[84px]">Picture</th>
              <th
                v-for="col in COLUMNS"
                :key="col.key"
                @click="toggleSort(col.key)"
                class="px-3 py-3 whitespace-nowrap cursor-pointer select-none hover:text-slate-700"
                :class="[col.numeric ? 'text-right' : 'text-left', col.key === 'partNumber' ? 'sticky-tpn bg-slate-50' : '']"
              >
                {{ col.label }}{{ sortIndicator(col.key) }}
              </th>
              <th class="sticky-actions px-3 py-3 text-center bg-slate-50">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="record in pageRecords"
              :key="record.rowId"
              @click="openDetail(record)"
              class="group hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <td class="px-3 py-2">
                <img
                  v-if="record.picture"
                  :src="record.picture"
                  :alt="record.partNumber"
                  loading="lazy"
                  decoding="async"
                  @click.stop="openImage(record)"
                  class="w-14 h-14 object-cover rounded-lg border border-slate-200 bg-white cursor-zoom-in hover:border-brand-300"
                />
                <div
                  v-else
                  class="w-14 h-14 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              </td>

              <td
                v-for="col in COLUMNS"
                :key="col.key"
                class="px-3 py-2"
                :class="cellClass(col, record)"
              >
                <template v-if="col.key === 'unit'">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    :class="record.parentRowId ? 'bg-indigo-100 text-indigo-700' : NEUTRAL_PILL"
                  >
                    {{ record.parentRowId ? 'Set unit' : 'Core unit' }}
                  </span>
                </template>
                <div v-else-if="col.truncate" class="truncate" :title="displayValue(record, col)">
                  {{ displayValue(record, col) }}
                </div>
                <template v-else-if="col.pill">
                  <span
                    v-if="rawValue(record, col)"
                    :class="[NEUTRAL_PILL, 'inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap']"
                  >
                    {{ displayValue(record, col) }}
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </template>
                <template v-else>{{ displayValue(record, col) }}</template>
              </td>

              <td class="sticky-actions px-3 py-2 text-center bg-white group-hover:bg-slate-50">
                <button
                  type="button"
                  @click.stop="openAdjustment(record)"
                  class="px-2.5 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap transition-colors"
                >
                  Adjustment
                </button>
              </td>
            </tr>

            <tr v-if="!loading && filtered.length === 0">
              <td :colspan="COLUMNS.length + 2" class="px-5 py-10 text-center text-slate-400 text-sm">
                No equipment matches these filters.
              </td>
            </tr>

            <tr v-if="loading">
              <td :colspan="COLUMNS.length + 2" class="px-5 py-10">
                <div class="flex items-center justify-center gap-2.5 text-sm text-slate-400">
                  <svg class="animate-spin h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Loading the yard…
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DragScrollBar :target="tableScroll" class="border-t border-slate-100 bg-slate-50" />

      <TablePaginator
        v-model:page="page"
        v-model:pageSize="pageSize"
        :page-count="pageCount"
        :page-sizes="PAGE_SIZES"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :total="filtered.length"
        class="border-t border-slate-100 bg-slate-50"
      />
    </div>

    <!-- Detail drawer -->
    <Teleport to="body">
      <div v-if="detail" class="fixed inset-0 z-[500] flex justify-end">
        <div class="absolute inset-0 bg-slate-900/40" />

        <div class="relative w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-4 z-10">
            <div class="min-w-0">
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {{ detail.parentRowId ? 'Set unit' : 'Core unit' }}
              </p>
              <h2 class="text-lg font-bold text-slate-800 truncate">{{ detail.partNumber || 'Untitled' }}</h2>
              <p class="text-sm text-slate-500 truncate">{{ detail.chemical || detail.description || '—' }}</p>
            </div>
            <button
              type="button"
              @click="closeDetail"
              class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-6">

            <!-- Picture -->
            <section class="space-y-3">
              <h3 class="text-sm font-bold text-slate-700">Picture</h3>
              <div class="flex items-center gap-4">
                <img
                  v-if="detail.picture"
                  :src="detail.picture"
                  :alt="detail.partNumber"
                  @click="openImage(detail)"
                  class="w-32 h-32 object-cover rounded-xl border border-slate-200 bg-white cursor-zoom-in hover:border-brand-300"
                />
                <div
                  v-else
                  class="w-32 h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300"
                >
                  <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>

                <div class="space-y-2">
                  <label class="inline-block px-3 py-2 text-sm font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 cursor-pointer">
                    {{ detail.picture ? 'Replace picture' : 'Upload picture' }}
                    <input type="file" accept="image/*" class="hidden" @change="onPictureSelected" />
                  </label>
                  <p class="text-xs text-slate-400">Images up to {{ MAX_PICTURE_MB }} MB.</p>
                </div>
              </div>
            </section>

            <!-- Quantity -->
            <section class="space-y-3">
              <h3 class="text-sm font-bold text-slate-700">Quantity</h3>
              <div class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">On this unit</p>
                <p class="text-2xl font-bold text-slate-700 mt-0.5">{{ formatQty(detail.qty) }}</p>
              </div>
            </section>

            <!-- Composition: what this unit came from / broke into -->
            <section v-if="detail.parentRowId || childUnits.length" class="space-y-3">
              <h3 class="text-sm font-bold text-slate-700">Composition</h3>

              <div v-if="detail.parentRowId" class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Broken out of core unit</p>
                <p class="font-semibold text-slate-800 mt-0.5">{{ detail.parentPartNumber || detail.parentMicPartNumber || '—' }}</p>
              </div>

              <div v-if="childUnits.length" class="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                <div v-for="child in childUnits" :key="child.rowId" class="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span class="font-mono text-slate-700">{{ child.partNumber }}</span>
                  <span class="text-slate-500">{{ formatQty(child.qty) }} {{ child.location ? `· ${child.location}` : '' }}</span>
                </div>
              </div>
            </section>

            <!-- Details -->
            <section class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-bold text-slate-700">Details</h3>
                <span v-if="detailsDirty" class="text-xs font-semibold text-amber-700">Unsaved changes</span>
              </div>

              <form @submit.prevent="saveDetails" class="space-y-3">
                <div class="flex flex-col gap-1.5">
                  <label class="form-label">LDYPN</label>
                  <p class="px-3 py-2.5 text-sm text-slate-400 bg-gray-50 border border-gray-200 rounded-lg">
                    {{ detail.partNumber }}
                  </p>
                  <p class="text-xs text-slate-400">Assigned at the moment of creation, non-editable.</p>
                </div>

                <div v-for="field in TEXT_FIELDS" :key="field.key" class="flex flex-col gap-1.5">
                  <label class="form-label">{{ field.label }}</label>
                  <input
                    v-model="edit[field.key]"
                    type="text"
                    autocomplete="off"
                    class="form-input"
                    @focus="openSuggestions(field.key, $event)"
                    @input="openSuggestions(field.key, $event)"
                    @blur="closeSuggestionsSoon"
                    @keydown.esc="closeSuggestions"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1.5">
                    <label class="form-label">Brand</label>
                    <select v-model="edit.brand" class="form-input">
                      <option value="">—</option>
                      <option v-for="opt in brandOptions" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="form-label">Category</label>
                    <select v-model="edit.category" class="form-input">
                      <option value="">—</option>
                      <option v-for="opt in categoryOptions" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="form-label">Chemical</label>
                  <select v-model="edit.chemical" class="form-input">
                    <option value="">—</option>
                    <option v-for="opt in chemicalOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1.5">
                    <label class="form-label">System</label>
                    <select v-model="edit.system" class="form-input">
                      <option value="">—</option>
                      <option v-for="opt in systemOptions" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="form-label">Warehouse</label>
                    <select v-model="edit.warehouse" class="form-input">
                      <option value="">—</option>
                      <option v-for="opt in warehouseOptions" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="form-label">Lead time (days)</label>
                  <input v-model="edit.leadTime" type="number" min="0" class="form-input" />
                </div>

                <!-- Shipment detail: how this crate physically arrived. -->
                <details class="rounded-lg border border-slate-100">
                  <summary class="px-3 py-2.5 text-sm font-semibold text-slate-600 cursor-pointer select-none">
                    Shipment details
                  </summary>
                  <div class="p-3 pt-0 space-y-3">
                    <div class="flex flex-col gap-1.5">
                      <label class="form-label">Arrival date</label>
                      <input v-model="edit.arrivalDate" type="date" class="form-input" />
                    </div>
                    <div v-for="field in SHIPMENT_FIELDS" :key="field.key" class="flex flex-col gap-1.5">
                      <label class="form-label">{{ field.label }}</label>
                      <input v-model="edit[field.key]" type="text" class="form-input" />
                    </div>
                  </div>
                </details>

                <div v-if="detailsError" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  {{ detailsError }}
                </div>

                <div class="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    @click="resetDetails"
                    :disabled="!detailsDirty"
                    class="px-4 py-2 text-sm font-semibold text-slate-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    :disabled="!detailsDirty || busy"
                    class="px-5 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Suggestions, teleported so a scrolling container cannot clip them -->
    <Teleport to="body">
      <ul
        v-if="suggest.field && suggestions.length"
        class="fixed z-[600] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
        :style="{ top: `${suggest.top}px`, left: `${suggest.left}px`, width: `${suggest.width}px` }"
      >
        <li
          v-for="option in suggestions"
          :key="option"
          @mousedown.prevent="pickSuggestion(option)"
          class="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          {{ option }}
        </li>
      </ul>
    </Teleport>

    <!-- Adjustment modal -->
    <Teleport to="body">
      <div
        v-if="adjustment"
        class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[500]"
        @click.self="closeAdjustment"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

          <div class="bg-brand-600 px-6 py-4 flex items-center justify-between">
            <h2 class="text-white font-bold text-base">Inventory Adjustment</h2>
            <button type="button" @click="closeAdjustment" class="text-brand-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>

          <form @submit.prevent="submitAdjustment" class="p-6 space-y-4">

            <div>
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Equipment</p>
              <p class="text-sm font-semibold text-slate-800">{{ adjustment.record.partNumber }}</p>
              <p class="text-sm text-slate-500">{{ adjustment.record.chemical || adjustment.record.description || '—' }}</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="form-label">Adjustment type</label>
              <div class="flex gap-2">
                <label
                  class="flex-1 flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border transition-colors"
                  :class="adjustment.direction === 'positive' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'"
                >
                  <input v-model="adjustment.direction" type="radio" value="positive" class="accent-brand-600 w-4 h-4" />
                  <span class="text-sm text-slate-700">Positive (add stock)</span>
                </label>
                <label
                  class="flex-1 flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border transition-colors"
                  :class="adjustment.direction === 'negative' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'"
                >
                  <input v-model="adjustment.direction" type="radio" value="negative" class="accent-brand-600 w-4 h-4" />
                  <span class="text-sm text-slate-700">Negative (remove stock)</span>
                </label>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="form-label">Quantity</label>
              <input
                v-model="adjustment.quantity"
                type="number"
                min="1"
                step="any"
                inputmode="decimal"
                placeholder="0"
                required
                class="form-input"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">In stock now</p>
                <p class="text-2xl font-bold text-slate-800 mt-0.5">{{ formatQty(adjustment.record.qty) }}</p>
              </div>
              <div class="rounded-xl border px-4 py-3" :class="afterIsNegative ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">After adjustment</p>
                <p class="text-2xl font-bold mt-0.5" :class="afterIsNegative ? 'text-red-600' : 'text-slate-800'">
                  {{ adjustmentAfter === null ? '—' : adjustmentAfter.toLocaleString() }}
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="form-label">Remarks <span class="text-slate-400 font-normal">(optional)</span></label>
              <textarea v-model="adjustment.remarks" rows="2" placeholder="Reason for the adjustment…" class="form-input"></textarea>
            </div>

            <div v-if="afterIsNegative" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              This would leave the stock below zero.
            </div>

            <div v-if="adjustment.error" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {{ adjustment.error }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="closeAdjustment" class="px-4 py-2 text-sm font-semibold text-slate-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!canSubmitAdjustment"
                class="px-5 py-2 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                Save adjustment
              </button>
            </div>

          </form>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <transition name="toast">
        <div
          v-if="toast"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white"
          :class="toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'"
        >
          {{ toast.message }}
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import BusyOverlay from '../components/BusyOverlay.vue'
import TablePaginator from '../components/TablePaginator.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import ImageViewer from '../components/ImageViewer.vue'
import DragScrollBar from '../components/DragScrollBar.vue'
import { NEUTRAL_PILL } from '../config/statusColors.js'

defineProps({
  embedded: { type: Boolean, default: false },
})

const MAX_PICTURE_MB = 25
const PAGE_SIZES = [10, 25, 50, 100, 200]
const DEFAULT_PAGE_SIZE = 25
const PAGE_SIZE_KEY = 'equipmentList.pageSize'

const COLUMNS = [
  { key: 'partNumber',    label: 'LDYPN' },
  { key: 'unit',          label: 'Unit' },
  { key: 'micPartNumber', label: 'MIC Part Number' },
  { key: 'chemical',      label: 'Chemical', pill: true },
  { key: 'brand',         label: 'Brand' },
  { key: 'category',      label: 'Category', pill: true },
  { key: 'description',  label: 'Description', truncate: true },
  { key: 'qty',           label: 'Qty', numeric: true },
  { key: 'location',      label: 'Location' },
  { key: 'system',        label: 'System', pill: true },
  { key: 'warehouse',     label: 'Warehouse', pill: true },
  { key: 'leadTime',      label: 'Lead Time', numeric: true },
  { key: 'supplier',      label: 'Supplier' },
]

const TEXT_FIELDS = [
  { key: 'micPartNumber', label: 'MIC Part Number' },
  { key: 'description',   label: 'Description' },
  { key: 'location',      label: 'Location' },
]

const SHIPMENT_FIELDS = [
  { key: 'containerNumber', label: 'Container number' },
  { key: 'packageType',     label: 'Package type' },
  { key: 'poNumber',        label: 'PO number' },
  { key: 'supplier',        label: 'Supplier' },
]

const EDITABLE_KEYS = [
  ...TEXT_FIELDS.map(f => f.key),
  ...SHIPMENT_FIELDS.map(f => f.key),
  'brand', 'category', 'chemical', 'leadTime', 'system', 'warehouse', 'arrivalDate',
]

const SEARCH_FIELDS = ['partNumber', 'micPartNumber', 'chemical', 'description', 'location']

function storedPageSize() {
  try {
    const saved = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

const records = ref([])
const loading = ref(false)
const error = ref('')

const busy = ref(false)
const busyMessage = ref('Working…')
const toast = ref(null)

const search = ref('')
const unitFilter = ref('')
const categoryFilter = ref('')
const chemicalFilter = ref('')
const brandFilter = ref('')
const systemFilter = ref('')
const warehouseFilter = ref('')
const onlyMissingPicture = ref(false)
const page = ref(1)
const pageSize = ref(storedPageSize())

const detail = ref(null)
const detailsError = ref('')
const edit = reactive({})

// The scrolling container both drag bars drive. DragScrollBar watches it for resizes on its
// own, so nothing here has to remeasure.
const tableScroll = ref(null)

const viewer = reactive({ show: false, src: '', title: '', subtitle: '', loading: false })

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3500)
}

const confirmDialog = reactive({
  show: false, title: '', message: '', confirmLabel: 'Yes', cancelLabel: 'No', destructive: false,
})
let settlePendingConfirm = null

function askConfirm(options) {
  settlePendingConfirm?.(false)
  Object.assign(confirmDialog, { confirmLabel: 'Yes', cancelLabel: 'No', destructive: false }, options, { show: true })
  return new Promise(resolve => { settlePendingConfirm = resolve })
}

function settleConfirm(answer) {
  confirmDialog.show = false
  const resolve = settlePendingConfirm
  settlePendingConfirm = null
  resolve?.(answer)
}

function rawValue(record, col) {
  return record[col.key]
}

function displayValue(record, col) {
  const value = rawValue(record, col)
  if (value === null || value === undefined || value === '') return '—'
  if (col.numeric && Number.isFinite(Number(value))) return Number(value).toLocaleString()
  return value
}

function cellClass(col) {
  if (col.key === 'partNumber') {
    return 'sticky-tpn bg-white group-hover:bg-slate-50 transition-colors font-semibold text-slate-800 whitespace-nowrap'
  }
  if (col.truncate) return 'text-slate-700 max-w-[240px]'
  if (col.numeric) return 'text-right text-slate-600'
  return 'text-slate-600 whitespace-nowrap'
}

function formatQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value ? String(value) : '—'
  return n.toLocaleString()
}

function optionsFrom(key) {
  const seen = new Set()
  for (const record of records.value) {
    const value = String(record[key] ?? '').trim()
    if (value) seen.add(value)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

const categoryOptions = computed(() => optionsFrom('category'))
const chemicalOptions = computed(() => optionsFrom('chemical'))
const brandOptions = computed(() => optionsFrom('brand'))
const systemOptions = computed(() => optionsFrom('system'))
const warehouseOptions = computed(() => optionsFrom('warehouse'))

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()

  return records.value.filter(record => {
    if (unitFilter.value === 'core' && record.parentRowId) return false
    if (unitFilter.value === 'set' && !record.parentRowId) return false
    if (term && !SEARCH_FIELDS.some(key => String(record[key] ?? '').toLowerCase().includes(term))) return false
    if (categoryFilter.value && String(record.category ?? '') !== categoryFilter.value) return false
    if (chemicalFilter.value && String(record.chemical ?? '') !== chemicalFilter.value) return false
    if (brandFilter.value && String(record.brand ?? '') !== brandFilter.value) return false
    if (systemFilter.value && String(record.system ?? '') !== systemFilter.value) return false
    if (warehouseFilter.value && String(record.warehouse ?? '') !== warehouseFilter.value) return false
    if (onlyMissingPicture.value && record.picture) return false
    return true
  })
})

const sortKey = ref('')
const sortDir = ref('asc')

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDir.value = 'asc'
}

function sortIndicator(key) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ▲' : ' ▼'
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value

  const col = COLUMNS.find(c => c.key === sortKey.value)
  const dir = sortDir.value === 'asc' ? 1 : -1

  return [...filtered.value].sort((a, b) => {
    const av = rawValue(a, col)
    const bv = rawValue(b, col)

    if (isBlank(av) && isBlank(bv)) return 0
    if (isBlank(av)) return 1
    if (isBlank(bv)) return -1

    if (col.numeric) return (Number(av) - Number(bv)) * dir
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pageRecords = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sorted.value.slice(start, start + pageSize.value)
})
const rangeStart = computed(() => (page.value - 1) * pageSize.value + 1)
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, filtered.value.length))

const childUnits = computed(() => {
  if (!detail.value || detail.value.parentRowId) return []
  return records.value.filter(r => r.parentRowId === detail.value.rowId)
})

watch(
  [search, unitFilter, categoryFilter, chemicalFilter, brandFilter, systemFilter, warehouseFilter, onlyMissingPicture, sortKey, sortDir],
  () => { page.value = 1 }
)

watch(pageSize, (next, previous) => {
  page.value = Math.floor(((page.value - 1) * previous) / next) + 1
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(next))
  } catch {
    // A browser with storage blocked still gets a working table, just no memory of the size.
  }
})

async function loadRecords() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/laydown/records', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load the yard.')
    records.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load the yard.'
  } finally {
    loading.value = false
  }
}

function openImage(record) {
  viewer.title = `Picture - ${record.partNumber || 'Equipment'}`
  viewer.subtitle = record.chemical || record.description || ''
  viewer.src = record.picture
  viewer.loading = false
  viewer.show = true
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

async function onPictureSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !detail.value) return

  busy.value = true
  busyMessage.value = 'Uploading the picture…'

  try {
    const image = await readAsDataUrl(file)
    const res = await fetch(`/api/laydown/${detail.value.rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fields: { picture: image } }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to upload the picture.')

    detail.value.picture = data.record.picture
    showToast('Picture updated.')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    busy.value = false
  }
}

function resetDetails() {
  detailsError.value = ''
  for (const key of EDITABLE_KEYS) {
    edit[key] = detail.value?.[key] ?? ''
  }
}

const detailsDirty = computed(() => {
  if (!detail.value) return false
  return EDITABLE_KEYS.some(key => String(edit[key] ?? '') !== String(detail.value[key] ?? ''))
})

function openDetail(record) {
  detail.value = record
  resetDetails()
}

async function closeDetail() {
  if (detailsDirty.value) {
    const discard = await askConfirm({
      title: 'Discard changes?',
      message: 'This equipment has unsaved changes. Closing now will lose them.',
      destructive: true,
    })
    if (!discard) return
  }
  closeSuggestions()
  detail.value = null
}

async function saveDetails() {
  if (!detail.value || !detailsDirty.value) return

  const fields = {}
  for (const key of EDITABLE_KEYS) {
    if (String(edit[key] ?? '') === String(detail.value[key] ?? '')) continue
    fields[key] = edit[key] === '' ? null : edit[key]
  }

  detailsError.value = ''
  busy.value = true
  busyMessage.value = 'Saving the equipment…'

  try {
    const res = await fetch(`/api/laydown/${detail.value.rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fields }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to save the equipment.')

    Object.assign(detail.value, data.record)
    resetDetails()
    showToast('Equipment updated.')
  } catch (e) {
    detailsError.value = e.message
  } finally {
    busy.value = false
  }
}

const suggest = reactive({ field: '', top: 0, left: 0, width: 0 })
let suggestAnchor = null
let suggestCloseTimer = null

const suggestions = computed(() => {
  if (!suggest.field) return []
  const typed = String(edit[suggest.field] ?? '').toLowerCase()

  const seen = new Set()
  for (const record of records.value) {
    const value = String(record[suggest.field] ?? '').trim()
    if (value && value.toLowerCase().includes(typed)) seen.add(value)
  }
  return [...seen].sort((a, b) => a.localeCompare(b)).slice(0, 50)
})

function repositionSuggestions() {
  if (!suggestAnchor) return
  const rect = suggestAnchor.getBoundingClientRect()
  suggest.top = rect.bottom + 2
  suggest.left = rect.left
  suggest.width = Math.max(rect.width, 200)
}

function openSuggestions(field, event) {
  clearTimeout(suggestCloseTimer)
  suggest.field = field
  suggestAnchor = event.target
  repositionSuggestions()
}

function closeSuggestions() {
  suggest.field = ''
  suggestAnchor = null
}

function closeSuggestionsSoon() {
  suggestCloseTimer = setTimeout(closeSuggestions, 150)
}

function pickSuggestion(option) {
  edit[suggest.field] = option
  closeSuggestions()
}

// ----- Adjustment modal -----
const adjustment = ref(null)

const adjustmentDelta = computed(() => {
  const n = Number(adjustment.value?.quantity)
  return Number.isFinite(n) && n > 0 ? n : null
})

const adjustmentAfter = computed(() => {
  if (!adjustment.value || adjustmentDelta.value === null) return null
  const signed = adjustment.value.direction === 'negative' ? -adjustmentDelta.value : adjustmentDelta.value
  return Number(adjustment.value.record.qty || 0) + signed
})

const afterIsNegative = computed(() => adjustmentAfter.value !== null && adjustmentAfter.value < 0)

const canSubmitAdjustment = computed(() =>
  adjustmentDelta.value !== null && !afterIsNegative.value && !busy.value
)

function openAdjustment(record) {
  adjustment.value = reactive({ record, direction: 'positive', quantity: '', remarks: '', error: '' })
}

function closeAdjustment() {
  adjustment.value = null
}

async function submitAdjustment() {
  if (!canSubmitAdjustment.value) return
  const current = adjustment.value
  current.error = ''

  busy.value = true
  busyMessage.value = 'Saving the adjustment…'

  try {
    const res = await fetch(`/api/laydown/${current.record.rowId}/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        direction: current.direction,
        quantity: adjustmentDelta.value,
        remarks: current.remarks,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to save the adjustment.')

    closeAdjustment()
    showToast(data.message || 'Stock adjusted.')
    await loadRecords()
  } catch (e) {
    current.error = e.message
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadRecords()
  window.addEventListener('scroll', repositionSuggestions, true)
  window.addEventListener('resize', repositionSuggestions)
})

onUnmounted(() => {
  window.removeEventListener('scroll', repositionSuggestions, true)
  window.removeEventListener('resize', repositionSuggestions)
  clearTimeout(suggestCloseTimer)
})
</script>

<style scoped>
.sticky-tpn {
  position: sticky;
  left: 0;
  z-index: 1;
  box-shadow: 6px 0 6px -6px rgb(15 23 42 / 0.15);
}

.sticky-actions {
  position: sticky;
  right: 0;
  z-index: 1;
  box-shadow: -6px 0 6px -6px rgb(15 23 42 / 0.15);
}
</style>
