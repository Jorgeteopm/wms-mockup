<template>
  <div ref="scanPanelEl" class="max-w-3xl mx-auto space-y-4 sm:space-y-6" @focusout="onPanelFocusOut">

    <div v-if="!embedded">
      <h1 class="text-lg sm:text-xl font-bold text-slate-800">Reprint Labels — {{ LAYDOWN_FORM.label }}</h1>
      <p class="text-sm text-slate-500 mt-0.5">Scan a barcode or load a record below to reprint its label.</p>
    </div>
    <p v-else class="text-sm text-slate-500">Scan a barcode or load a record below to reprint its label.</p>

    <div
      v-if="matchedDelivery?.isChild"
      class="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1"
    >
      <span class="px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-slate-700">Set unit</span>
      <span class="font-semibold">{{ matchedDelivery.pn }}</span>
      <span class="text-slate-500">
        of Core Unit: <b>{{ matchedDelivery.parentMicPartNumber || matchedDelivery.parentPartNumber || '—' }}</b>
      </span>
    </div>

    <div v-if="scanMatches.length" class="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 space-y-2">
      <p class="text-sm font-semibold text-amber-900">
        <span class="font-semibold">{{ scannedCode }}</span> matches {{ scanMatches.length }} deliveries — pick one.
      </p>
      <div class="overflow-x-auto rounded-lg border border-amber-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-amber-50 text-amber-800">
            <tr>
              <th class="text-left font-semibold px-3 py-2">Part Number</th>
              <th class="text-left font-semibold px-3 py-2">Arrival</th>
              <th class="text-left font-semibold px-3 py-2">PO</th>
              <th class="text-left font-semibold px-3 py-2">Location</th>
              <th class="text-right font-semibold px-3 py-2">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rec in scanMatches"
              :key="rec.rowId"
              @click="loadRowForLabel(rec)"
              class="border-t border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors"
            >
              <td class="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{{ rec.pn || '—' }}</td>
              <td class="px-3 py-2 text-slate-600 whitespace-nowrap">{{ rec.arrivalDate || '—' }}</td>
              <td class="px-3 py-2 text-slate-600">{{ rec.poNumber || '—' }}</td>
              <td class="px-3 py-2 text-slate-600">{{ rec.location || '—' }}</td>
              <td class="px-3 py-2 text-right text-slate-700">{{ rec.qty || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Scan & print panel -->
    <div
      class="scan-panel rounded-xl border p-4 sm:p-6 transition-colors duration-300"
      :class="scanFeedback
        ? 'scan-pulse bg-emerald-100 border-emerald-300 shadow-lg shadow-emerald-200'
        : 'bg-white border-slate-100 shadow-sm'"
    >
      <div class="max-w-md mx-auto space-y-4">
        <div class="text-center">
          <h2 class="text-base font-bold text-slate-800">Scan &amp; Print Mode</h2>
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
            ref="pnInputEl"
            v-model="pnSearch"
            type="text"
            autocomplete="off"
            placeholder="Focus here and scan…"
            class="w-full px-3 py-3 border border-gray-200 rounded-lg bg-white text-base sm:text-sm text-slate-800 text-center
                   placeholder:text-slate-300 transition-colors
                   focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50"
            @keydown.enter.prevent="onPnEnter"
          />
        </template>

        <template v-else>
          <div class="flex flex-col gap-1.5 relative pn-dropdown-cell">
            <label class="form-label-sm text-center">MIC Part Number</label>
            <input
              v-model="pnSearch"
              type="text"
              autocomplete="off"
              placeholder="Search by MIC Part Number…"
              class="form-input text-center text-base sm:text-sm"
              @focus="openPnDropdown($event)"
              @input="openPnDropdown($event)"
              @keydown.escape="closePnDropdown"
              @keydown.enter.prevent="onPnEnter"
            />
          </div>
          <div class="flex flex-col gap-1.5 relative ldypn-dropdown-cell">
            <label class="form-label-sm text-center">LDYPN</label>
            <input
              v-model="ldypnSearch"
              type="text"
              autocomplete="off"
              placeholder="Search by LDYPN…"
              class="form-input text-center text-base sm:text-sm"
              @focus="openLdypnDropdown($event)"
              @input="openLdypnDropdown($event)"
              @keydown.escape="closeLdypnDropdown"
            />
          </div>
          <div class="flex flex-col gap-1.5 relative chem-dropdown-cell">
            <label class="form-label-sm text-center">Chemical</label>
            <input
              v-model="chemSearch"
              type="text"
              autocomplete="off"
              placeholder="Search by Chemical…"
              class="form-input text-center text-base sm:text-sm"
              @focus="openChemDropdown($event)"
              @input="openChemDropdown($event)"
              @keydown.escape="closeChemDropdown"
            />
          </div>
        </template>

        <div class="text-center py-2">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Scanned code</p>
          <p class="text-3xl font-bold text-slate-800 mt-1 break-all">{{ pnSearch || '—' }}</p>
        </div>

        <div
          v-if="pnSearch && !matchedDelivery && !scanMatches.length"
          class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700"
        >
          No recorded delivery found for this code.
        </div>

        <div v-if="matchedDelivery" class="rounded-lg bg-slate-100 border border-slate-200 p-3 space-y-2">
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input v-model="useAutoPartNumber" type="checkbox" class="accent-brand-600 w-4 h-4" />
            <span class="text-sm font-semibold text-slate-700">Display the auto generated Part Number for the barcode?</span>
          </label>
          <p class="text-xs text-slate-500">
            The barcode will read <span class="font-semibold">{{ reprintBarcode || '—' }}</span>.
          </p>
        </div>

        <div v-if="matchedDelivery" class="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Arrival Date</label>
            <input v-model="labelForm.arrivalDate" type="date" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Received By</label>
            <input v-model="labelForm.receivedBy" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Supplier</label>
            <input v-model="labelForm.supplier" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Chemical</label>
            <input v-model="labelForm.chemical" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Description</label>
            <input v-model="labelForm.description" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Container #</label>
            <input v-model="labelForm.containerNumber" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Qty</label>
            <NumberStepper v-model="labelForm.qty" :min="0" label="quantity" />
          </div>
          <div class="px-3 py-3">
            <label class="text-sm text-slate-600">Location</label>
            <select v-if="options.location" v-model="labelForm.location" class="form-input text-base sm:text-sm mt-2">
              <option value="">—</option>
              <option v-for="opt in options.location" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else v-model="labelForm.location" type="text" placeholder="—" class="form-input text-base sm:text-sm mt-2" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">PO Number</label>
            <input v-model="labelForm.poNumber" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Serial Number</label>
            <input v-model="labelForm.serialNumber" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-3">
            <label class="text-sm text-slate-600 shrink-0">Tracking Number</label>
            <input v-model="labelForm.trackingNumber" type="text" placeholder="—" class="flex-1 min-w-0 text-base sm:text-sm text-right outline-none bg-transparent" />
          </div>
          <div class="px-3 py-3">
            <label class="text-sm text-slate-600">System</label>
            <select v-if="options.system" v-model="labelForm.system" class="form-input text-base sm:text-sm mt-2">
              <option value="">—</option>
              <option v-for="opt in options.system" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else v-model="labelForm.system" type="text" placeholder="—" class="form-input text-base sm:text-sm mt-2" />
          </div>
          <div class="px-3 py-3">
            <label class="text-sm text-slate-600">Package Type</label>
            <select v-if="options.packageType" v-model="labelForm.packageType" class="form-input text-base sm:text-sm mt-2">
              <option value="">—</option>
              <option v-for="opt in options.packageType" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else v-model="labelForm.packageType" type="text" placeholder="—" class="form-input text-base sm:text-sm mt-2" />
          </div>
          <!-- Condition as pills, not a dropdown: picking a value is one thumb tap instead of
               open-scroll-tap. Falls back to a select if the picklist ever grows past a few
               options, where wrapping pills would take over the panel. -->
          <div class="px-3 py-3">
            <label class="text-sm text-slate-600">Condition</label>
            <div v-if="conditionAsPills" class="flex flex-wrap gap-2 mt-2">
              <button
                v-for="opt in conditionOptions"
                :key="opt"
                type="button"
                @click="labelForm.condition = opt"
                class="px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors"
                :class="labelForm.condition === opt
                  ? 'bg-brand-50 border-brand-200 text-brand-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
              >
                {{ opt }}
              </button>
            </div>
            <select v-else v-model="labelForm.condition" class="form-input text-base sm:text-sm mt-2">
              <option value="" disabled>Select…</option>
              <option v-for="opt in conditionOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3 justify-center flex-wrap">
          <span class="text-sm font-medium text-slate-600"># of labels</span>
          <NumberStepper v-model="labelCount" :min="1" :max="100" label="number of labels" />
        </div>

        <div v-if="matchedDelivery" class="max-h-56 overflow-y-auto flex flex-col gap-2 border border-slate-100 rounded-lg p-2">
          <div v-for="(_, i) in labelQuantities" :key="i" class="flex items-center justify-between gap-2 text-sm">
            <span class="text-slate-500">Mat/Equip Qty {{ i + 1 }}</span>
            <NumberStepper v-model="labelQuantities[i]" :min="1" :label="`quantity for label ${i + 1}`" />
          </div>
        </div>

        <p v-if="matchedDelivery" class="text-xs text-slate-500 text-center">
          Total: <strong>{{ labelQuantitiesSum }}</strong> of <strong>{{ maxLabelQty || 0 }}</strong> on record
        </p>
        <p v-if="labelQtyExceedsMax" class="text-xs text-brand-600 text-center font-semibold">
          Label quantities exceed the recorded Qty ({{ maxLabelQty }}).
        </p>
        <p v-else-if="matchedDelivery && labelQtyIncomplete" class="text-xs text-amber-600 text-center font-semibold">
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
            :disabled="printing || !matchedDelivery || labelQtyIncomplete"
            class="w-full px-6 py-3.5 sm:py-3 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ printing ? 'Generating…' : 'Print Label' }}
          </button>
        </div>
      </div>

      <!-- PN dropdown — floats over the form (Manual search mode) -->
      <ul
        v-if="showPnDropdown"
        class="pn-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
        :style="{ top: pnDropdownPos.top + 'px', left: pnDropdownPos.left + 'px', width: pnDropdownPos.width + 'px' }"
      >
        <li
          v-for="rec in filteredByPn"
          :key="rec.rowId"
          @mousedown.prevent="loadRowForLabel(rec)"
          class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="font-medium text-slate-800 leading-tight flex items-center gap-1.5">
            {{ rec.micPartNumber || rec.pn }}
            <span v-if="rec.isChild" class="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white bg-slate-500">
              Set Unit
            </span>
          </div>
          <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
            <!-- The parent by MIC part number, matching what its own label shows. -->
            <span v-if="rec.isChild && (rec.parentMicPartNumber || rec.parentPartNumber)">
              of {{ rec.parentMicPartNumber || rec.parentPartNumber }}
            </span>
            <!-- Only when it is not already the headline, which happens with no MIC on file. -->
            <span v-if="rec.micPartNumber && rec.pn">{{ rec.pn }}</span>
            <span v-if="rec.chemical">{{ rec.chemical }}</span>
            <span v-if="rec.chemical && rec.description">·</span>
            <span v-if="rec.description">{{ rec.description }}</span>
          </div>
        </li>
        <li v-if="filteredByPn.length === 0" class="px-3 py-2 text-sm text-slate-400">
          No matches found
        </li>
      </ul>

      <!-- LDYPN dropdown — floats over the form (Manual search mode) -->
      <ul
        v-if="showLdypnDropdown"
        class="ldypn-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
        :style="{ top: ldypnDropdownPos.top + 'px', left: ldypnDropdownPos.left + 'px', width: ldypnDropdownPos.width + 'px' }"
      >
        <li
          v-for="rec in filteredByLdypn"
          :key="rec.rowId"
          @mousedown.prevent="loadRowForLabel(rec)"
          class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="font-medium text-slate-800 leading-tight flex items-center gap-1.5">
            {{ rec.pn }}
            <span v-if="rec.isChild" class="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white bg-slate-500">
              Set Unit
            </span>
          </div>
          <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
            <span v-if="rec.micPartNumber">{{ rec.micPartNumber }}</span>
            <span v-if="rec.chemical">{{ rec.chemical }}</span>
            <span v-if="rec.chemical && rec.description">·</span>
            <span v-if="rec.description">{{ rec.description }}</span>
          </div>
        </li>
        <li v-if="filteredByLdypn.length === 0" class="px-3 py-2 text-sm text-slate-400">
          No matches found
        </li>
      </ul>

      <!-- Chemical dropdown — floats over the form (Manual search mode) -->
      <ul
        v-if="showChemDropdown"
        class="chem-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
        :style="{ top: chemDropdownPos.top + 'px', left: chemDropdownPos.left + 'px', width: chemDropdownPos.width + 'px' }"
      >
        <li
          v-for="rec in filteredByChemical"
          :key="rec.rowId"
          @mousedown.prevent="loadRowForLabel(rec)"
          class="px-3 py-3.5 text-sm hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="font-medium text-slate-800 leading-tight">{{ rec.chemical }}</div>
          <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
            <span v-if="rec.micPartNumber">{{ rec.micPartNumber }}</span>
            <span v-if="rec.pn">{{ rec.pn }}</span>
            <span v-if="(rec.micPartNumber || rec.pn) && rec.description">·</span>
            <span v-if="rec.description">{{ rec.description }}</span>
          </div>
        </li>
        <li v-if="filteredByChemical.length === 0" class="px-3 py-2 text-sm text-slate-400">
          No matches found
        </li>
      </ul>
    </div>

  </div>
  <BusyOverlay :show="busy" :message="busyMessage" />

</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import BusyOverlay from '../components/BusyOverlay.vue'
import NumberStepper from '../components/NumberStepper.vue'
import { QrcodeStream } from 'vue-qrcode-reader'
import { LAYDOWN_FORM } from '../config/forms.js'
import { PN_PREFIX } from '../config/laydownPn.js'
import { printLabelPdf } from '../composables/useLabelPrint.js'

defineProps({ embedded: { type: Boolean, default: false } })

const API = '/api/laydown'

const rows     = ref([])
const options  = ref({})
const loading  = ref(false)
const error    = ref('')
const printing = ref(false)
const matchedDelivery = ref(null)
const labelForm = reactive({
  arrivalDate: '', receivedBy: '', supplier: '', poNumber: '',
  serialNumber: '', trackingNumber: '', system: '', packageType: '', condition: '',
  qty: '', location: '', description: '', containerNumber: '', chemical: '',
})

const labelCount = ref(1)
const labelQuantities = ref([1])

const maxLabelQty = computed(() => Number(labelForm.qty) || 0)
const labelQuantitiesSum = computed(() =>
  labelQuantities.value.reduce((sum, q) => sum + (Number(q) || 0), 0)
)
const labelQtyExceedsMax = computed(() =>
  maxLabelQty.value > 0 && labelQuantitiesSum.value > maxLabelQty.value
)
const labelQtyIncomplete = computed(() =>
  maxLabelQty.value <= 0 || labelQuantitiesSum.value !== maxLabelQty.value
)

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

async function loadRows() {
  loading.value = true
  try {
    const res = await fetch(`${API}/records`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load deliveries.')
    const data = await res.json()
    // A set unit's label prints its set code (parent PN + sequence), never its
    // own auto-number LDYPN — so that is what scanning and searching have to match here.
    rows.value = data.map(r => ({
      ...r,
      isChild: Boolean(r.parentRowId),
      micPartNumber: r.micPartNumber ?? '',
      parentMicPartNumber: r.parentMicPartNumber ?? '',
      pn: r.breakdownCode || r.partNumber,
    }))
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const conditionOptions = computed(() => {
  const fromSheet = options.value.condition ?? []
  if (fromSheet.length) return fromSheet
  return labelForm.condition ? [labelForm.condition] : []
})

// Past this many, wrapping pills would push the print button off screen on a phone.
const MAX_CONDITION_PILLS = 6
const conditionAsPills = computed(() => conditionOptions.value.length <= MAX_CONDITION_PILLS)

const scanMatches = ref([])
const scannedCode = ref('')
const useAutoPartNumber = ref(false)
const reprintBarcode = computed(() => {
  const record = matchedDelivery.value
  if (!record) {
    return ''
  }

  const autoGenerated = record.pn ?? ''
  if (useAutoPartNumber.value) {
    return autoGenerated
  }

  return labelForm.micPartNumber || record.micPartNumber || autoGenerated
})

function loadRowForLabel(record) {
  scanMatches.value = []
  matchedDelivery.value = record
  for (const key of Object.keys(labelForm)) labelForm[key] = record[key] ?? ''
  pnSearch.value     = record.micPartNumber || record.pn || ''
  ldypnSearch.value  = record.pn ?? ''
  chemSearch.value   = record.chemical ?? ''
  error.value = ''
  closePnDropdown()
  closeLdypnDropdown()
  closeChemDropdown()
}

const pnSearch     = ref('')
const ldypnSearch  = ref('')
const chemSearch   = ref('')

watch(pnSearch, (value) => {
  const match = matchedDelivery.value
  if (match && value !== (match.micPartNumber || match.pn)) matchedDelivery.value = null
})

watch(ldypnSearch, (value) => {
  if (matchedDelivery.value && value !== matchedDelivery.value.pn) matchedDelivery.value = null
})

const filteredByPn = computed(() => {
  const q = pnSearch.value.trim().toLowerCase()
  const withMic = rows.value.filter(r => r.micPartNumber || r.pn)
  if (!q) return withMic
  return withMic.filter(r =>
    [r.micPartNumber, r.pn].some(v => String(v ?? '').toLowerCase().includes(q))
  )
})

const filteredByLdypn = computed(() => {
  const withLdypn = rows.value.filter(record => record.pn)
  const search = ldypnSearch.value.trim().toLowerCase()

  if (!search) {
    return withLdypn
  }

  return withLdypn.filter(record => String(record.pn).toLowerCase().includes(search))
})

const filteredByChemical = computed(() => {
  const q = chemSearch.value.trim().toLowerCase()
  const withChemical = rows.value.filter(r => r.chemical)
  if (!q) return withChemical
  return withChemical.filter(r =>
    [r.chemical, r.pn].some(v => String(v ?? '').toLowerCase().includes(q))
  )
})

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
  if (!event.target.closest('.pn-dropdown-cell, .pn-dropdown')) closePnDropdown()
  if (!event.target.closest('.ldypn-dropdown-cell, .ldypn-dropdown')) closeLdypnDropdown()
  if (!event.target.closest('.chem-dropdown-cell, .chem-dropdown')) closeChemDropdown()
}

// ----- Printing -----
async function printLabel() {
  if (!matchedDelivery.value) return
  error.value = ''
  if (labelQtyIncomplete.value) {
    error.value = maxLabelQty.value <= 0
      ? 'Enter a Qty before printing.'
      : `Label quantities must add up to exactly ${maxLabelQty.value} to print.`
    return
  }
  printing.value = true
  try {
    if (matchedDelivery.value.isChild) {
      const copies = labelQuantities.value.map(q => Number(q) || 0)
      await printLabelPdf({
        parentMicPartNumber: matchedDelivery.value.parentMicPartNumber || matchedDelivery.value.parentPartNumber,
        parentChemical:   matchedDelivery.value.parentChemical,
        unit: '',
        barcodeValues: copies.map(() => reprintBarcode.value),
        quantities: copies,
        pageFields: copies.map(() => ({
          chemical:        labelForm.chemical,
          description:     labelForm.description,
          supplier:        labelForm.supplier,
          arrivalDate:     labelForm.arrivalDate,
          location:        labelForm.location,
          containerNumber: labelForm.containerNumber,
          packageType:     labelForm.packageType,
          comments:        matchedDelivery.value.comments ?? '',
          conditionOptions: conditionOptions.value.map(opt => ({
            label: opt,
            checked: opt === labelForm.condition,
          })),
        })),
        footerText: labelForm.poNumber ? `PO ${labelForm.poNumber}` : '',
        fileName: `breakdown-${matchedDelivery.value.pn}`,
      }, 'breakdown')
      return
    }

    await printLabelPdf({
      ...labelForm,
      barcodeValue: reprintBarcode.value,
      quantities: labelQuantities.value.map(q => Number(q) || 0),
      conditionOptions: conditionOptions.value.map(opt => ({
        label: opt,
        checked: opt === labelForm.condition,
      })),
      footerText: labelForm.poNumber ? `PO ${labelForm.poNumber}` : '',
      fileName: `laydown-${matchedDelivery.value.pn}`,
    }, 'laydown')
  } catch (err) {
    error.value = err.message
  } finally {
    printing.value = false
  }
}

const SCAN_MODES = [
  { value: 'camera', label: 'Camera' },
  { value: 'scanner', label: 'Scanner' },
  { value: 'manual', label: 'Search' },
]

const scanMode     = ref('scanner')
const scanPanelEl  = ref(null)
const pnInputEl    = ref(null)
const scanError    = ref('')
const scanFeedback = ref(false)
let scanFeedbackTimeout = null

function applyScannedCode(value) {
  const code = String(value ?? '').trim()
  if (!code) return

  const upper = code.toUpperCase()
  const byPn = rows.value.filter(r => String(r.pn ?? '').toUpperCase() === upper)
  const byMic = rows.value.filter(r => String(r.micPartNumber ?? '').trim().toUpperCase() === upper)
  const byChemical = rows.value.filter(r => String(r.chemical ?? '').trim().toLowerCase() === code.toLowerCase())
  const matches = byPn.length ? byPn : byMic.length ? byMic : byChemical

  if (matches.length > 1) {
    scanMatches.value = matches
    scannedCode.value = code
    matchedDelivery.value = null
    error.value = ''
    flashScanFeedback()
    return
  }

  const match = matches[0]
  scanMatches.value = []

  if (match) {
    loadRowForLabel(match)
  } else {
    pnSearch.value = code
    matchedDelivery.value = null
    error.value = upper.startsWith(PN_PREFIX)
      ? `No delivery found for ${code}.`
      : `${code} does not match any recorded delivery.`
  }

  flashScanFeedback()
}

function flashScanFeedback() {
  clearTimeout(scanFeedbackTimeout)
  scanFeedback.value = false
  nextTick(() => {
    scanFeedback.value = true
    scanFeedbackTimeout = setTimeout(() => { scanFeedback.value = false }, 1500)
  })
  playBeep()
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
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
    // No audio available — the visual ripple still confirms the scan.
  }
}

function focusScanField() {
  pnInputEl.value?.focus()
  pnInputEl.value?.select()
}

function onPnEnter(event) {
  applyScannedCode(event.target.value)
  closePnDropdown()
  nextTick(focusScanField)
}

function onPanelFocusOut() {
  if (scanMode.value !== 'scanner') return
  setTimeout(() => {
    const active = document.activeElement
    const isFormControl = active && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(active.tagName)
    if (!isFormControl) focusScanField()
  }, 50)
}

const cameraFacingMode = ref('environment')
const torchOn     = ref(false)
const cameraKey   = ref(0)
const lastScanned = ref(null)

function onDetect(detectedCodes) {
  const value = detectedCodes.map(code => code.rawValue)[0] || ''
  if (!value || value === lastScanned.value) return
  lastScanned.value = value
  applyScannedCode(value)
}

function paintBoundingBox(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const { boundingBox: { x, y, width, height } } = detectedCode
    ctx.lineWidth = 2
    ctx.strokeStyle = '#007bff'
    ctx.strokeRect(x, y, width, height)
  }
}

function onCameraOn(capabilities) {
  console.debug('[Scanner] camera capabilities:', capabilities)
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

function retryCamera() {
  scanError.value = ''
  cameraKey.value++
}

function toggleCameraFacing() {
  cameraFacingMode.value = cameraFacingMode.value === 'environment' ? 'user' : 'environment'
  torchOn.value = false
}

watch(scanMode, (mode) => {
  if (mode !== 'camera') scanError.value = ''
  if (mode === 'scanner') nextTick(focusScanField)
})

onMounted(async () => {
  window.addEventListener('scroll', repositionPnDropdown, true)
  window.addEventListener('scroll', repositionChemDropdown, true)
  window.addEventListener('scroll', repositionLdypnDropdown, true)
  window.addEventListener('resize', repositionPnDropdown)
  window.addEventListener('resize', repositionLdypnDropdown)
  window.addEventListener('resize', repositionChemDropdown)
  document.addEventListener('click', onDocumentClick)

  loadRows()
  try {
    const res = await fetch(`${API}/options`, { credentials: 'include' })
    if (res.ok) options.value = await res.json()
  } catch {
    // Non-fatal: the label falls back to the delivery's own recorded values.
  }

  if (scanMode.value === 'scanner') nextTick(focusScanField)
})

onUnmounted(() => {
  clearTimeout(scanFeedbackTimeout)
  window.removeEventListener('scroll', repositionPnDropdown, true)
  window.removeEventListener('scroll', repositionChemDropdown, true)
  window.removeEventListener('scroll', repositionLdypnDropdown, true)
  window.removeEventListener('resize', repositionPnDropdown)
  window.removeEventListener('resize', repositionLdypnDropdown)
  window.removeEventListener('resize', repositionChemDropdown)
  document.removeEventListener('click', onDocumentClick)
})

const busy = computed(() => loading.value || printing.value)

const busyMessage = computed(() => {
  if (printing.value) return 'Generating the label…'
  return 'Loading records…'
})
</script>

