<template>
  <div ref="scanPanelEl" class="max-w-3xl mx-auto space-y-4 sm:space-y-6" @focusout="onPanelFocusOut">

    <!-- Header -->
    <div v-if="!embedded">
      <h1 class="text-lg sm:text-xl font-bold text-slate-800">Reprint Labels</h1>
      <p class="text-sm text-slate-500 mt-0.5">Scan a barcode or load a record below to reprint its label.</p>
    </div>
    <p v-else class="text-sm text-slate-500">Scan a barcode or load a record below to reprint its label.</p>

    <!-- Scan & print panel -->
    <div
      class="scan-panel rounded-xl border p-4 sm:p-6 transition-colors duration-300"
      :class="scanFeedback
        ? 'scan-pulse bg-emerald-100 border-emerald-300 shadow-lg shadow-emerald-200'
        : 'bg-white border-slate-100 shadow-sm'"
    >
      <div class="max-w-md mx-auto space-y-4">
        <div class="text-center">
          <h2 class="text-base font-bold text-slate-800">Scan & Print Mode</h2>
          <p class="text-sm text-slate-500 mt-0.5">Scan a barcode to print labels from its existing record.</p>
        </div>

        <!-- Segmented control: three labelled radios do not fit side by side on a phone, so the
             dot is hidden and the whole third of the row becomes the tap target. -->
        <div class="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
          <label
            v-for="mode in SCAN_MODES"
            :key="mode.value"
            class="flex items-center justify-center px-2 py-2.5 rounded-lg cursor-pointer text-center
                   text-xs sm:text-sm font-semibold transition-colors"
            :class="scanMode === mode.value
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'"
          >
            <input v-model="scanMode" type="radio" :value="mode.value" class="sr-only" />
            {{ mode.label }}
          </label>
        </div>

        <template v-if="scanMode === 'camera'">
          <div class="relative rounded-lg overflow-hidden border border-slate-200">
            <qrcode-stream
              :key="cameraKey"
              :track="paintBoundingBox"
              @detect="onDetect"
              @error="onScanError"
              @camera-on="onCameraOn"
              :formats="['code_39']"
              :constraints="{ facingMode: cameraFacingMode }"
              :torch="torchOn"
            ></qrcode-stream>
            <div class="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                @click="toggleCameraFacing"
                title="Switch camera"
                class="w-9 h-9 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"/>
                  <path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
              <button
                v-if="cameraFacingMode === 'environment'"
                type="button"
                @click="torchOn = !torchOn"
                title="Toggle flashlight"
                class="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                :class="torchOn ? 'bg-amber-400 text-slate-900' : 'bg-black/50 text-white hover:bg-black/70'"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" :fill="torchOn ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </button>
            </div>
          </div>
          <div v-if="scanError" class="flex items-center gap-2 flex-wrap">
            <p class="text-xs text-red-600 flex-1 min-w-[120px]">{{ scanError }}</p>
            <button
              type="button"
              @click="retryCamera"
              class="px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 rounded-md hover:bg-brand-100 transition-colors shrink-0"
            >
              Try again
            </button>
          </div>
        </template>

        <template v-else-if="scanMode === 'scanner'">
          <input
            ref="tpnInputEl"
            :value="barcodeForm.tpn"
            type="text"
            autocomplete="off"
            placeholder="Focus here and scan…"
            class="w-full px-3 py-3 border border-gray-200 rounded-lg bg-white text-base sm:text-sm text-slate-800 text-center
                   placeholder:text-slate-300 transition-colors
                   focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
            @input="onScannerTpnInput($event)"
            @keydown.enter.prevent="onTpnEnter"
          />
        </template>

        <template v-else>
          <div class="flex flex-col gap-1.5 relative tpn-dropdown-cell">
            <label class="form-label-sm text-center">TPN #</label>
            <input
              :value="barcodeForm.tpn"
              type="text"
              autocomplete="off"
              placeholder="Search by TPN…"
              class="form-input text-center text-base sm:text-sm"
              @focus="openTpnDropdown($event)"
              @input="onManualTpnInput($event)"
              @keydown.escape="closeTpnDropdown"
              @keydown.enter.prevent="onTpnEnter"
            />
          </div>
          <div class="flex flex-col gap-1.5 relative desc2search-dropdown-cell">
            <label class="form-label-sm text-center">Description 2</label>
            <input
              :value="barcodeForm.description2"
              type="text"
              autocomplete="off"
              placeholder="Search by Description 2…"
              class="form-input text-center text-base sm:text-sm"
              @focus="openDesc2SearchDropdown($event)"
              @input="onDescription2SearchInput($event)"
              @keydown.escape="closeDesc2SearchDropdown"
            />
          </div>
        </template>

        <div class="text-center py-2">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Scanned TPN</p>
          <p class="text-3xl font-bold text-slate-800 mt-1 break-all">{{ barcodeForm.tpn || '—' }}</p>
        </div>

        <div
          v-if="barcodeForm.tpn && !matchedInbound"
          class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700"
        >
          No existing inbound record found for this TPN.
        </div>

        <div v-if="matchedInbound" class="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          <!-- Both descriptions open a picker instead of a typeahead: the row gave about 140px
               to type in and dropped its menu right where the keyboard covers it. -->
          <div class="px-3 py-3 flex items-center justify-between gap-3">
            <label class="text-sm text-slate-600 shrink-0">Description</label>
            <button
              type="button"
              @click="showDescription1Sheet = true"
              class="flex-1 min-w-0 text-base sm:text-sm text-right truncate"
              :class="barcodeForm.description1 ? 'text-slate-800' : 'text-slate-400'"
            >
              {{ barcodeForm.description1 || 'Select…' }}
            </button>
          </div>
          <div class="px-3 py-3 flex items-center justify-between gap-3">
            <label class="text-sm text-slate-600 shrink-0">Description 2</label>
            <button
              type="button"
              @click="showDescription2Sheet = true"
              class="flex-1 min-w-0 text-base sm:text-sm text-right truncate"
              :class="barcodeForm.description2 ? 'text-slate-800' : 'text-slate-400'"
            >
              {{ barcodeForm.description2 || 'Select…' }}
            </button>
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">MIC Part Number</label>
            <input v-model="barcodeForm.micPartNumber" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Batch #</label>
            <input v-model="barcodeForm.batch" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Quantity</label>
            <NumberStepper v-model="barcodeForm.quantity" :min="0" label="quantity" />
          </div>
          <div class="px-3 py-3">
            <label class="text-sm text-slate-600">Unit</label>
            <select v-if="units.length" v-model="barcodeForm.unit" class="form-input text-base sm:text-sm mt-2">
              <option value="">—</option>
              <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
            </select>
            <input v-else v-model="barcodeForm.unit" type="text" placeholder="EA, BX, PLT…" class="form-input text-base sm:text-sm mt-2" />
          </div>
          <!-- Location gets the full row width and opens a sheet instead of a floating menu:
               a typeahead squeezed to the right of the label left about 140px to type in, and
               the on-screen keyboard covered the menu it dropped down into. -->
          <div class="px-3 py-3">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm text-slate-600">Location</label>
              <button
                type="button"
                @click="showLocationSheet = true"
                class="px-3 py-2 text-sm font-semibold text-brand-600 bg-brand-50 border border-brand-100 rounded-lg
                       hover:bg-brand-100 active:bg-brand-100 transition-colors"
              >
                {{ barcodeForm.location.length ? 'Edit' : 'Add' }}
              </button>
            </div>

            <div v-if="barcodeForm.location.length" class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="loc in barcodeForm.location"
                :key="loc"
                class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-md"
              >
                {{ loc }}
                <button
                  type="button"
                  @click="removeLocation(loc)"
                  :aria-label="`Remove ${loc}`"
                  class="w-6 h-6 flex items-center justify-center text-brand-400 hover:text-brand-600"
                >×</button>
              </span>
            </div>
            <p v-else class="text-sm text-slate-400 mt-2">None selected</p>
          </div>
          <!-- Condition as pills, not a dropdown: picking a value is one thumb tap instead of
               open-scroll-tap. Falls back to a select if the picklist ever grows past a few
               options, where wrapping pills would take over the panel. -->
          <div class="px-3 py-3">
            <label class="text-sm text-slate-600">Condition</label>
            <div v-if="conditionAsPills" class="flex flex-wrap gap-2 mt-2">
              <button
                v-for="opt in materialStatuses"
                :key="opt"
                type="button"
                @click="barcodeForm.condition = opt"
                class="px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors"
                :class="barcodeForm.condition === opt
                  ? 'bg-brand-50 border-brand-200 text-brand-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
              >
                {{ opt }}
              </button>
            </div>
            <select
              v-else
              v-model="barcodeForm.condition"
              class="form-input text-base sm:text-sm mt-2"
            >
              <option value="" disabled>Select…</option>
              <option v-for="opt in materialStatuses" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3 justify-center flex-wrap">
          <span class="text-sm font-medium text-slate-600"># of labels</span>
          <NumberStepper v-model="labelCount" :min="1" :max="100" label="number of labels" />
        </div>

        <div v-if="matchedInbound" class="max-h-56 overflow-y-auto flex flex-col gap-2 border border-slate-100 rounded-lg p-2">
          <div v-for="(_, i) in labelQuantities" :key="i" class="flex items-center justify-between gap-2 text-sm">
            <span class="text-slate-500">Mat/Equip Qty {{ i + 1 }}</span>
            <NumberStepper v-model="labelQuantities[i]" :min="1" :label="`quantity for label ${i + 1}`" />
          </div>
        </div>

        <p v-if="matchedInbound" class="text-xs text-slate-500 text-center">
          Total: <strong>{{ labelQuantitiesSum }}</strong> of <strong>{{ maxLabelQty || 0 }}</strong> entered
        </p>
        <p v-if="labelQtyExceedsMax" class="text-xs text-brand-600 text-center font-semibold">
          Label quantities exceed the entered quantity ({{ maxLabelQty }}).
        </p>
        <p v-else-if="matchedInbound && labelQtyIncomplete" class="text-xs text-amber-600 text-center font-semibold">
          Label quantities must add up to exactly {{ maxLabelQty }} to print.
        </p>

        <!-- Pinned to the bottom of the viewport on a phone: the record fields push the button
             below the fold, and it is the one control the operator needs on every scan. -->
        <div
          class="sticky bottom-0 sm:static -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 sm:pt-0
                 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-0
                 border-t border-slate-100 sm:border-0 backdrop-blur-sm sm:backdrop-blur-none"
        >
          <button
            type="button"
            @click="printLabel"
            :disabled="printing || !matchedInbound || labelQtyIncomplete"
            class="w-full px-6 py-3.5 sm:py-3 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ printing ? 'Generating…' : 'Print Label' }}
          </button>
        </div>
      </div>

      <!-- TPN dropdown — floats over the form (Manual search mode) -->
      <ul
        v-if="showTpnDropdown"
        class="tpn-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
        :style="{ top: tpnDropdownPos.top + 'px', left: tpnDropdownPos.left + 'px', width: tpnDropdownPos.width + 'px' }"
      >
        <li
          v-for="inb in filteredInbounds"
          :key="inb.rowId ?? inb.tpn"
          @mousedown.prevent="selectInbound(inb)"
          class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="font-medium text-slate-800 leading-tight">{{ inb.tpn }}</div>
          <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
            <span v-if="inb.description1">{{ inb.description1 }}</span>
            <span v-if="inb.description2">· {{ inb.description2 }}</span>
            <span v-if="inb.micPartNumber">· {{ inb.micPartNumber }}</span>
          </div>
        </li>
        <li v-if="filteredInbounds.length === 0" class="px-3 py-2 text-sm text-slate-400">
          No matches found
        </li>
      </ul>

      <!-- Description 2 search dropdown — floats over the form (Manual search mode) -->
      <ul
        v-if="showDesc2SearchDropdown"
        class="desc2search-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
        :style="{ top: desc2SearchDropdownPos.top + 'px', left: desc2SearchDropdownPos.left + 'px', width: desc2SearchDropdownPos.width + 'px' }"
      >
        <li
          v-for="inb in filteredDesc2SearchRecords"
          :key="inb.rowId ?? inb.tpn"
          @mousedown.prevent="selectDesc2SearchRecord(inb)"
          class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="font-medium text-slate-800 leading-tight">{{ inb.description2 }}</div>
          <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
            <span>{{ inb.tpn }}</span>
            <span v-if="inb.description1">· {{ inb.description1 }}</span>
          </div>
        </li>
        <li v-if="filteredDesc2SearchRecords.length === 0" class="px-3 py-2 text-sm text-slate-400">
          No matches found
        </li>
      </ul>

    </div>


  </div>

  <!-- Pickers are anchored to the bottom of the screen so the list sits under the thumb and
       above the keyboard, rather than being pushed off by it. -->
  <PickerSheet
    :show="showLocationSheet"
    v-model="barcodeForm.location"
    :options="locations"
    title="Location"
    multiple
    @close="showLocationSheet = false"
  />

  <PickerSheet
    :show="showDescription1Sheet"
    v-model="barcodeForm.description1"
    :options="materialDescriptions1"
    title="Description"
    allow-custom
    @close="showDescription1Sheet = false"
  />

  <PickerSheet
    :show="showDescription2Sheet"
    v-model="barcodeForm.description2"
    :options="materialDescriptions2"
    title="Description 2"
    allow-custom
    @close="showDescription2Sheet = false"
  />

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
  <BusyOverlay :show="busy" :message="busyMessage" />

</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import BusyOverlay from '../components/BusyOverlay.vue'
import NumberStepper from '../components/NumberStepper.vue'
import PickerSheet from '../components/PickerSheet.vue'
import { QrcodeStream } from 'vue-qrcode-reader'
import { printLabelPdf } from '../composables/useLabelPrint.js'

defineProps({ embedded: { type: Boolean, default: false } })

const API = '/api'

// ----- Toast notifications -----
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


onMounted(() => {
  loadInbounds()
  loadMaterialsList()
  loadLocations()
  loadMaterialStatuses()
  loadUnits()
  loadMaterialsPicklists()
  if (scanMode.value === 'scanner') nextTick(() => tpnInputEl.value?.focus())
  document.addEventListener('click', handleTpnOutsideClick)
  document.addEventListener('click', handleDesc2SearchOutsideClick)
  window.addEventListener('scroll', repositionTpnDropdown, true)
  window.addEventListener('scroll', repositionDesc2SearchDropdown, true)
  window.addEventListener('resize', repositionTpnDropdown)
  window.addEventListener('resize', repositionDesc2SearchDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleTpnOutsideClick)
  document.removeEventListener('click', handleDesc2SearchOutsideClick)
  window.removeEventListener('scroll', repositionTpnDropdown, true)
  window.removeEventListener('scroll', repositionDesc2SearchDropdown, true)
  window.removeEventListener('resize', repositionTpnDropdown)
  window.removeEventListener('resize', repositionDesc2SearchDropdown)
  clearTimeout(scanFeedbackTimeout)
})

// ----- Scan summary form -----
const barcodeForm = ref({
  tpn: '',
  batch: '',
  quantity: '',
  unit: '',
  location: [],
  condition: '',
  description1: '',
  description2: '',
  micPartNumber: ''
})
const scanError = ref('')
const matchedInbound = ref(null)

const SCAN_MODES = [
  { value: 'camera', label: 'Camera' },
  { value: 'scanner', label: 'Scanner' },
  { value: 'manual', label: 'Search' },
]

const scanMode = ref('scanner')
const tpnInputEl = ref(null)
const scanPanelEl = ref(null)
watch(scanMode, (value) => {
  if (value === 'scanner') nextTick(() => tpnInputEl.value?.focus())
})

function onPanelFocusOut() {
  if (scanMode.value !== 'scanner') return
  // The picker sheets are teleported to body, so tapping a row in one reads as focus leaving
  // the panel and would pull the caret back to the scan field mid-selection.
  if (showLocationSheet.value || showDescription1Sheet.value || showDescription2Sheet.value) return
  setTimeout(() => {
    const active = document.activeElement
    const isFormControl = active && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(active.tagName)
    if (!isFormControl) {
      tpnInputEl.value?.focus()
      tpnInputEl.value?.select()
    }
  }, 50)
}

function refocusScannerAfterPrint() {
  nextTick(() => { tpnInputEl.value?.focus(); tpnInputEl.value?.select() })
  window.addEventListener('focus', () => {
    nextTick(() => { tpnInputEl.value?.focus(); tpnInputEl.value?.select() })
  }, { once: true })
}

function onScannerTpnInput(event) {
  barcodeForm.value.tpn = event.target.value
  matchedInbound.value = null
}

function onTpnEnter() {
  const value = barcodeForm.value.tpn
  if (!value) return
  flashScanFeedback()
  const inb = combinedTpnRecords.value.find(inb => inb.tpn === value) || null
  matchedInbound.value = inb
  applyMatchedInbound(inb)

  if (scanMode.value === 'scanner') {
    nextTick(() => tpnInputEl.value?.select())
  }
}

// Auto-fills the fields this view has a direct counterpart for, from the matched
// inbound/materials record. Quantity is just a starting point here — this page
// never posts to Smartsheet, it only prints, so the user is free to override it
// (e.g. to reprint a different count than what's on record).
function applyMatchedInbound(inb) {
  if (!inb) return
  if (inb.batch) barcodeForm.value.batch = inb.batch
  if (inb.qty) barcodeForm.value.quantity = inb.qty
  if (inb.unit) barcodeForm.value.unit = inb.unit
  if (Array.isArray(inb.location) && inb.location.length) barcodeForm.value.location = [...inb.location]
  if (inb.condition) barcodeForm.value.condition = inb.condition
  if (inb.description1) barcodeForm.value.description1 = inb.description1
  if (inb.description2) barcodeForm.value.description2 = inb.description2
  if (inb.micPartNumber) barcodeForm.value.micPartNumber = inb.micPartNumber
}

const printing = ref(false)
const labelCount = ref(1)
const labelQuantities = ref([1])

// Freely editable — this page only prints, never writes to Smartsheet, so there's
// no real "amount on record" to enforce. Just a starting value from the matched
// record when available.
const maxLabelQty = computed(() => Number(barcodeForm.value.quantity) || 0)
const labelQuantitiesSum = computed(() =>
  labelQuantities.value.reduce((sum, q) => sum + (Number(q) || 0), 0)
)
const labelQtyExceedsMax = computed(() =>
  maxLabelQty.value > 0 && labelQuantitiesSum.value > maxLabelQty.value
)
const labelQtyIncomplete = computed(() =>
  maxLabelQty.value <= 0 || labelQuantitiesSum.value !== maxLabelQty.value
)

// Splits `total` across `count` labels as evenly as possible (remainder goes to
// the first few labels) so the sum always matches exactly — e.g. 100 over 3
// labels becomes 34/33/33, not a lossy 33/33/33 = 99.
function distributeEvenly(total, count) {
  count = Math.max(1, Math.floor(count) || 1)
  if (total <= 0) return Array.from({ length: count }, () => 1)
  const base = Math.floor(total / count)
  const remainder = total - base * count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

function redistributeLabelQuantities() {
  labelQuantities.value = distributeEvenly(maxLabelQty.value, labelCount.value)
}

watch(labelCount, redistributeLabelQuantities)
watch(maxLabelQty, redistributeLabelQuantities)

async function printLabel() {
  if (labelQtyIncomplete.value) {
    const msg = maxLabelQty.value <= 0
      ? 'No recorded quantity to print against.'
      : `Label quantities must add up to exactly ${maxLabelQty.value} to print.`
    showToast(msg, 'warning')
    return
  }
  printing.value = true
  try {
    await printLabelPdf({
      tpn: barcodeForm.value.tpn,
      description1: barcodeForm.value.description1,
      description2: barcodeForm.value.description2,
      micPartNumber: barcodeForm.value.micPartNumber,
      batch: barcodeForm.value.batch,
      quantities: labelQuantities.value,
      unit: barcodeForm.value.unit,
      location: barcodeForm.value.location,
      condition: barcodeForm.value.condition,
      conditionOptions: materialStatuses.value,
      dateReceived: new Date().toISOString()
    })
    showToast('Label ready to print.', 'success')
  } catch (e) {
    showToast(e.message || 'Failed to print label.', 'error')
  } finally {
    printing.value = false
    if (scanMode.value === 'scanner') refocusScannerAfterPrint()
  }
}

// ----- Scanner -----
// QrcodeStream fires @detect on every video frame the code stays in view, so
// without a guard it re-overwrites the input dozens of times a second and the
// user can never manually edit/clear it. lastScannedTpn gates that: once a code
// is shown, repeat detections of the SAME code are ignored until a DIFFERENT
// code is scanned.
const lastScannedTpn = ref(null)
const scanFeedback = ref(false)
let scanFeedbackTimeout = null

function flashScanFeedback() {
  clearTimeout(scanFeedbackTimeout)
  // Force false -> true so the CSS ripple restarts even on back-to-back scans.
  scanFeedback.value = false
  nextTick(() => {
    scanFeedback.value = true
    scanFeedbackTimeout = setTimeout(() => { scanFeedback.value = false }, 1500)
  })
  playBeep()
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 0.01)
    gain.gain.setValueAtTime(0.7, ctx.currentTime + 0.28)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.42)
    osc.onended = () => ctx.close()
  } catch {
    // If unable to play the audio, welp, still the visual feedback persists
  }
}

function onDetect(detectedCodes) {
  const value = detectedCodes.map(code => code.rawValue)[0] || ''
  if (!value || value === lastScannedTpn.value) return

  lastScannedTpn.value = value
  flashScanFeedback()
  barcodeForm.value.tpn = ''
  nextTick(() => {
    barcodeForm.value.tpn = value
    const inb = combinedTpnRecords.value.find(inb => inb.tpn === value) || null
    matchedInbound.value = inb
    applyMatchedInbound(inb)
  })
}

function paintBoundingBox(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const { boundingBox: { x, y, width, height } } = detectedCode
    ctx.lineWidth = 2
    ctx.strokeStyle = '#007bff'
    ctx.strokeRect(x, y, width, height)
  }
}

function onScanError(err) {
  scanError.value = `[${err.name}]: `
  if (err.name === 'NotAllowedError') scanError.value += 'you need to grant camera access permission'
  else if (err.name === 'NotFoundError') scanError.value += 'no camera on this device'
  else if (err.name === 'NotSupportedError') scanError.value += 'secure context required (HTTPS, localhost)'
  else if (err.name === 'NotReadableError') scanError.value += 'is the camera already in use?'
  else if (err.name === 'OverconstrainedError') scanError.value += 'installed cameras are not suitable'
  else if (err.name === 'StreamApiNotSupportedError') scanError.value += 'Stream API is not supported in this browser'
  else if (err.name === 'InsecureContextError') scanError.value += 'Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.'
  else scanError.value += err.message
}

// ----- Camera switch + flashlight controls -----
const cameraFacingMode = ref('environment')
const torchOn = ref(false)
// Bumping this forces the qrcode-stream component to fully remount (new getUserMedia
// call) — used by "Try again" to recover from a camera error without reloading the page.
const cameraKey = ref(0)

function retryCamera() {
  scanError.value = ''
  cameraKey.value++
}

function toggleCameraFacing() {
  cameraFacingMode.value = cameraFacingMode.value === 'environment' ? 'user' : 'environment'
  torchOn.value = false // front-facing cameras essentially never have a torch
}

// capabilities.torch is unreliable on Android Chrome (many devices support the
// torch via applyConstraints but don't report it in getCapabilities()), so the
// button's visibility is gated on facingMode instead of this — kept only for debugging.
function onCameraOn(capabilities) {
  console.debug('[Scanner] camera capabilities:', capabilities)
}

// ----- Material condition options -----
const materialStatuses = ref([])

// Past this many, wrapping pills would push the print button off screen on a phone.
const MAX_CONDITION_PILLS = 6
const conditionAsPills = computed(() => materialStatuses.value.length <= MAX_CONDITION_PILLS)

async function loadMaterialStatuses() {
  try {
    const res = await fetch('/api/inbound/material-statuses', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load material statuses')
    materialStatuses.value = await res.json()
  } catch {
    console.warn('Could not load material statuses list')
  }
}

// ----- Existing inbounds / materials list lookup (TPN match on scan) -----
const inbounds = ref([])
const materialsList = ref([])

async function loadInbounds() {
  try {
    const res = await fetch('/api/inbound', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load inbounds')
    inbounds.value = await res.json()
  } catch {
    console.warn('Could not load inbound list')
  }
}

async function loadMaterialsList() {
  try {
    const res = await fetch('/api/inbound/materials-list', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load materials list')
    materialsList.value = await res.json()
  } catch {
    console.warn('Could not load materials list')
  }
}

// TPN match combines both sources: the materials list (source of truth for
// reference data — description, MIC part number) as the base, overlaid with the
// matching inbound transaction (if any) for its own fields (qty, batch, condition).
const combinedTpnRecords = computed(() => {
  const byTpn = new Map()
  for (const m of materialsList.value) {
    if (m.tpn) byTpn.set(m.tpn, { ...m })
  }
  for (const inb of inbounds.value) {
    if (inb.tpn) byTpn.set(inb.tpn, { ...(byTpn.get(inb.tpn) || {}), ...inb })
  }
  return [...byTpn.values()]
})

// ----- Manual search mode (TPN search dropdown) -----
const showTpnDropdown = ref(false)
const tpnDropdownPos = ref({ top: 0, left: 0, width: 0 })
let tpnAnchorEl = null

function filterInbounds(search) {
  const q = String(search ?? '').toLowerCase()
  if (!q) return combinedTpnRecords.value
  return combinedTpnRecords.value.filter(inb =>
    [inb.tpn, inb.barcodeTpn, inb.description1, inb.description2, inb.micPartNumber, inb.transmittalId]
      .some(v => String(v ?? '').toLowerCase().includes(q))
  )
}

// A computed, not a plain ref snapshotted at focus/input time — materialsList/inbounds
// load asynchronously, so a one-off snapshot taken before that fetch resolves would freeze
// on an empty "No matches found" and never update once the data actually arrives.
const filteredInbounds = computed(() => filterInbounds(barcodeForm.value.tpn))

function repositionTpnDropdown() {
  if (!showTpnDropdown.value || !tpnAnchorEl) return
  const rect = tpnAnchorEl.getBoundingClientRect()
  tpnDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
}

function openTpnDropdown(event) {
  tpnAnchorEl = event.target
  showTpnDropdown.value = true
  repositionTpnDropdown()
}

function onManualTpnInput(event) {
  barcodeForm.value.tpn = event.target.value
  matchedInbound.value = null
  tpnAnchorEl = event.target
  showTpnDropdown.value = true
  repositionTpnDropdown()
}

function closeTpnDropdown() {
  showTpnDropdown.value = false
  tpnAnchorEl = null
}

function selectInbound(inb) {
  barcodeForm.value.tpn = inb.tpn
  matchedInbound.value = inb
  applyMatchedInbound(inb)
  closeTpnDropdown()
}

function handleTpnOutsideClick(event) {
  if (!event.target.closest('.tpn-dropdown-cell') && !event.target.closest('.tpn-dropdown')) {
    closeTpnDropdown()
  }
}

const showDesc2SearchDropdown = ref(false)
const desc2SearchDropdownPos = ref({ top: 0, left: 0, width: 0 })
let desc2SearchAnchorEl = null

function filterByDescription2(search) {
  const q = String(search ?? '').toLowerCase()
  const withDesc2 = combinedTpnRecords.value.filter(inb => inb.description2)
  if (!q) return withDesc2
  return withDesc2.filter(inb => String(inb.description2).toLowerCase().includes(q))
}

const filteredDesc2SearchRecords = computed(() => filterByDescription2(barcodeForm.value.description2))

function repositionDesc2SearchDropdown() {
  if (!showDesc2SearchDropdown.value || !desc2SearchAnchorEl) return
  const rect = desc2SearchAnchorEl.getBoundingClientRect()
  desc2SearchDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
}

function openDesc2SearchDropdown(event) {
  desc2SearchAnchorEl = event.target
  showDesc2SearchDropdown.value = true
  repositionDesc2SearchDropdown()
}

function onDescription2SearchInput(event) {
  barcodeForm.value.description2 = event.target.value
  matchedInbound.value = null
  desc2SearchAnchorEl = event.target
  showDesc2SearchDropdown.value = true
  repositionDesc2SearchDropdown()
}

function closeDesc2SearchDropdown() {
  showDesc2SearchDropdown.value = false
  desc2SearchAnchorEl = null
}

function selectDesc2SearchRecord(inb) {
  barcodeForm.value.tpn = inb.tpn
  matchedInbound.value = inb
  applyMatchedInbound(inb)
  closeDesc2SearchDropdown()
}

function handleDesc2SearchOutsideClick(event) {
  if (!event.target.closest('.desc2search-dropdown-cell') && !event.target.closest('.desc2search-dropdown')) {
    closeDesc2SearchDropdown()
  }
}

// ----- Existing locations lookup (Location picker sheet) -----
const locations = ref([])
const showLocationSheet = ref(false)

async function loadLocations() {
  try {
    const res = await fetch('/api/inbound/locations', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load locations')
    locations.value = await res.json()
  } catch {
    console.warn('Could not load locations list')
  }
}

function removeLocation(loc) {
  const idx = barcodeForm.value.location.indexOf(loc)
  if (idx !== -1) barcodeForm.value.location.splice(idx, 1)
}

// ----- Existing units lookup (Unit select options) -----
const units = ref([])

async function loadUnits() {
  try {
    const res = await fetch('/api/inbound/units', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load units')
    units.value = await res.json()
  } catch {
    console.warn('Could not load units list')
  }
}

// ----- Materials list picklists (Description 1/2 suggestion lists — the materials
// catalog, not the inbound transaction log, is the source of truth for reference data) -----
const materialDescriptions1 = ref([])
const materialDescriptions2 = ref([])

async function loadMaterialsPicklists() {
  try {
    const res = await fetch('/api/inbound/materials-picklists', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load materials picklists')
    const data = await res.json()
    materialDescriptions1.value = data.descriptions1 ?? []
    materialDescriptions2.value = data.descriptions2 ?? []
  } catch {
    console.warn('Could not load materials picklists')
  }
}

// ----- Description 1 / Description 2 pickers -----
const showDescription1Sheet = ref(false)
const showDescription2Sheet = ref(false)

const busy = computed(() => printing.value)

const busyMessage = computed(() => {
  if (printing.value) return 'Generating the label…'
  return 'Loading records…'
})
</script>

