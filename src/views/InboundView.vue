<template>
  <div ref="scanPanelEl" class="max-w-7xl mx-auto space-y-6" @focusout="onPanelFocusOut">

    <!-- Header — title left, action right, same row, matching the dashboard's layout. -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800">{{ INBOUND_FORM.label }}</h1>
        <p class="text-sm text-slate-500 mt-0.5">{{ INBOUND_FORM.blurb }}</p>
      </div>
      <!-- Placeholder anchor — href left for you to fill in. -->
      <a
        href="https://app.smartsheet.com/dashboards/f6gfm3Mx32m4hvGmP85QVXPFfP3jPHrrwgWCGQX1"
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shrink-0"
      >
        Go to the Smartsheet Dashboard
      </a>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Registration form + label preview -->
    <div
      class="scan-panel rounded-xl border p-6 transition-colors duration-300"
      :class="scanFeedback
        ? 'scan-pulse bg-emerald-100 border-emerald-300 shadow-lg shadow-emerald-200'
        : 'bg-white border-slate-100 shadow-sm'"
    >
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

      <!-- Form panel -->
      <div class="space-y-4">
        <div>
          <h2 class="text-base font-bold text-slate-800">New Material Entry</h2>
          <p class="text-sm text-slate-500 mt-0.5">Fields update the label preview as you type.</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Barcode</label>
          <div class="flex gap-2">
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50">
              <input v-model="barcodeForm.showScanner" type="radio" value="barcodeYes" class="accent-red-600 w-5 h-5" />
              <span class="text-sm text-slate-700">Camera</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50">
              <input v-model="barcodeForm.showScanner" type="radio" value="barcodeNo" class="accent-red-600 w-5 h-5" />
              <span class="text-sm text-slate-700">Manual entry</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50">
              <input v-model="barcodeForm.showScanner" type="radio" value="barcodeScanner" class="accent-red-600 w-5 h-5" />
              <span class="text-sm text-slate-700">Scanner</span>
            </label>
          </div>
        </div>

        <div v-if="barcodeForm.showScanner === 'barcodeYes'" class="relative rounded-lg overflow-hidden border border-slate-200">
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
            class="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors shrink-0"
          >
            Try again
          </button>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Create new material record?</label>
          <div class="flex gap-2">
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50">
              <input v-model="createNewMaterial" type="radio" value="yes" class="accent-red-600 w-5 h-5" />
              <span class="text-sm text-slate-700">Yes</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50">
              <input v-model="createNewMaterial" type="radio" value="no" class="accent-red-600 w-5 h-5" />
              <span class="text-sm text-slate-700">No</span>
            </label>
          </div>
        </div>

        <div class="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
          <p class="text-sm font-semibold text-slate-700">Search By</p>

          <div class="flex flex-col gap-1.5 relative tpn-dropdown-cell">
            <label class="form-label">TPN # <span class="text-slate-400 font-normal normal-case">(Autocompletion Supported)</span></label>
            <input
              ref="tpnInputEl"
              :value="barcodeForm.tpn"
              type="text"
              required
              autocomplete="off"
              :readonly="createNewMaterial === 'yes'"
              class="form-input"
              :class="{ 'bg-slate-100 cursor-not-allowed': createNewMaterial === 'yes' }"
              placeholder="Scan or search…"
              @focus="onTpnFocus($event)"
              @input="onTpnInput($event)"
              @keydown.escape="closeTpnDropdown"
              @keydown.enter.prevent="onTpnEnter"
            />
            <p v-if="createNewMaterial === 'yes'" class="text-xs text-amber-600">
              Predicted next TPN — not final until Smartsheet actually assigns it.
            </p>
          </div>

          <div class="flex flex-col gap-1.5 relative desc1-dropdown-cell">
            <label class="form-label">Description</label>
            <input
              :value="barcodeForm.description1"
              type="text"
              autocomplete="off"
              class="form-input"
              placeholder="Search or type…"
              @focus="desc1DD.open($event)"
              @input="desc1DD.onInput($event)"
              @keydown.escape="desc1DD.close"
            />
          </div>

          <div class="flex flex-col gap-1.5 relative desc2search-dropdown-cell">
            <label class="form-label">Description 2 <span class="text-slate-400 font-normal normal-case">(Autocompletion Supported)</span></label>
            <input
              :value="barcodeForm.description2"
              type="text"
              autocomplete="off"
              class="form-input"
              placeholder="Search or type…"
              @focus="openDesc2Dropdown($event)"
              @input="onDescription2SearchInput($event)"
              @keydown.escape="closeDesc2Dropdown"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Batch #</label>
          <input v-model="barcodeForm.batch" type="text" class="form-input" placeholder="Batch number" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="form-label">Quantity Received</label>
            <input v-model="barcodeForm.quantity" type="number" required class="form-input" placeholder="0" />
          </div>

          <div class="flex flex-col gap-1.5 relative unit-dropdown-cell">
            <label class="form-label">Unit</label>
            <input
              :value="barcodeForm.unit"
              type="text"
              required
              autocomplete="off"
              class="form-input"
              placeholder="EA, BX, PLT…"
              @focus="openUnitDropdown($event)"
              @input="onUnitInput($event)"
              @keydown.escape="closeUnitDropdown"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5 relative location-dropdown-cell">
          <label class="form-label">Location</label>
          <div
            class="form-input flex flex-wrap items-center gap-1.5 cursor-text min-h-[48px]"
            @click="focusLocationInput"
          >
            <span
              v-for="loc in barcodeForm.location"
              :key="loc"
              class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-md"
            >
              {{ loc }}
              <button
                type="button"
                @click.stop="removeLocation(loc)"
                class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 rounded leading-none text-base"
              >×</button>
            </span>
            <input
              ref="locationInputEl"
              v-model="locationSearch"
              type="text"
              :required="barcodeForm.location.length === 0"
              autocomplete="off"
              :placeholder="barcodeForm.location.length ? '' : 'Search locations…'"
              class="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
              @focus="openLocationDropdown($event)"
              @input="onLocationInput($event)"
              @keydown.escape="closeLocationDropdown"
              @keydown.backspace="onLocationBackspace"
            />
          </div>
        </div>

        <div v-if="createNewMaterial === 'yes'" class="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
          <p class="text-sm font-semibold text-slate-700">New Material Details</p>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5 relative micpn-dropdown-cell">
              <label class="form-label">MIC Part Number</label>
              <input
                :value="barcodeForm.micPartNumber"
                type="text"
                autocomplete="off"
                class="form-input"
                placeholder="Search or type…"
                @focus="micPartNumberDD.open($event)"
                @input="micPartNumberDD.onInput($event)"
                @keydown.escape="micPartNumberDD.close"
              />
            </div>
            <div class="flex flex-col gap-1.5 relative type-dropdown-cell">
              <label class="form-label">Type</label>
              <input
                :value="barcodeForm.type"
                type="text"
                autocomplete="off"
                class="form-input"
                placeholder="Search or type…"
                @focus="typeDD.open($event)"
                @input="typeDD.onInput($event)"
                @keydown.escape="typeDD.close"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5 relative brand-dropdown-cell">
              <label class="form-label">Brand</label>
              <input
                :value="barcodeForm.brand"
                type="text"
                autocomplete="off"
                class="form-input"
                placeholder="Search or type…"
                @focus="brandDD.open($event)"
                @input="brandDD.onInput($event)"
                @keydown.escape="brandDD.close"
              />
            </div>
            <div class="flex flex-col gap-1.5 relative spec-dropdown-cell">
              <label class="form-label">Spec</label>
              <input
                :value="barcodeForm.spec"
                type="text"
                autocomplete="off"
                class="form-input"
                placeholder="Search or type…"
                @focus="specDD.open($event)"
                @input="specDD.onInput($event)"
                @keydown.escape="specDD.close"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5 relative category-dropdown-cell">
              <label class="form-label">Category</label>
              <input
                :value="barcodeForm.category"
                type="text"
                autocomplete="off"
                class="form-input"
                placeholder="Search or type…"
                @focus="openCategoryDropdown($event)"
                @input="onCategoryInput($event)"
                @keydown.escape="closeCategoryDropdown"
              />
            </div>
            <div class="flex flex-col gap-1.5 relative supplier-dropdown-cell">
              <label class="form-label">Supplier</label>
              <input
                :value="barcodeForm.supplier"
                type="text"
                autocomplete="off"
                class="form-input"
                placeholder="Search or type…"
                @focus="supplierDD.open($event)"
                @input="supplierDD.onInput($event)"
                @keydown.escape="supplierDD.close"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Material Condition Received</label>
          <select v-model="barcodeForm.condition" required class="form-input">
            <option value="" disabled>Select condition…</option>
            <option v-for="opt in materialStatuses" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">
            Photos
            <span class="text-slate-400 font-normal normal-case">
              (optional — click + to attach a file · images, PDF, Word or Excel, up to {{ MAX_FILE_MB }} MB each)
            </span>
          </label>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-w-md">
            <div v-for="slot in PHOTO_SLOTS" :key="slot.key" class="flex flex-col gap-1">
              <div
                v-if="!photoSlots[slot.key]"
                class="relative aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-red-400 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center"
                @click="triggerSlotFilePicker(slot.key)"
              >
                <svg class="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div v-else class="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <!-- A PDF or Office file has no thumbnail; rendering it as an <img> would
                     just show a broken image where a filled slot should be. -->
                <img v-if="photoSlots[slot.key].isImage" :src="photoSlots[slot.key].image" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 px-1">
                  <svg class="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span class="text-[10px] text-slate-500 text-center leading-tight truncate w-full" :title="photoSlots[slot.key].fileName">
                    {{ photoSlots[slot.key].fileName }}
                  </span>
                </div>
                <button
                  type="button"
                  @click="removeSlotPhoto(slot.key)"
                  title="Remove"
                  class="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors shadow-sm leading-none text-xs"
                >×</button>
              </div>
              <button
                v-if="!photoSlots[slot.key]"
                type="button"
                @click="openCamera(slot.key)"
                title="Take photo"
                class="w-full min-h-[40px] flex items-center justify-center gap-1 px-1 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors"
              >
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Photo
              </button>
              <span class="text-[13px] text-slate-600 text-center leading-tight">{{ slot.label }}</span>
            </div>
          </div>
          <input
            :ref="el => setPhotoFileInputRef(el)"
            type="file"
            :accept="ACCEPTED_FILE_ACCEPT"
            @change="handlePhotoFileChange"
            class="hidden"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Date Created <span class="text-slate-400 font-normal normal-case">(optional — defaults to now)</span></label>
          <input v-model="barcodeForm.dateCreated" type="date" class="form-input" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Remarks</label>
          <textarea
            v-model="barcodeForm.remarks"
            rows="2"
            class="form-input resize-none"
            placeholder="Optional notes for this inbound record…"
          ></textarea>
        </div>

        <p v-if="!isDamaged && labelQtyIncomplete" class="text-xs text-amber-600 text-center font-semibold">
          {{ maxLabelQty > 0
            ? `Label quantities must add up to exactly ${maxLabelQty} before this can be recorded.`
            : 'Enter a Quantity Received before saving this inbound.' }}
        </p>

        <div class="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            @click="clearForm"
            class="px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
          <button
            v-if="isDamaged"
            type="button"
            @click="submitToQuarantine"
            :disabled="submittingQuarantine"
            class="px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ submittingQuarantine ? 'Submitting…' : 'Submit to Quarantine Area' }}
          </button>

          <button
            v-else
            type="button"
            @click="createNewInbound"
            :disabled="creating || printing || labelQtyIncomplete"
            class="px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ printing ? 'Printing…' : (creating ? 'Creating…' : 'Create Inbound &amp; Print Label') }}
          </button>
        </div>
      </div>

      <!-- Label preview -->
      <div class="flex flex-col items-center gap-3">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Label preview</p>

        <div class="label-card">
          <div class="lbl-header">
            <img src="/mic.png" alt="MIC" class="lbl-logo" />
            <div class="lbl-title">MATERIAL<br>RECEIVING</div>
          </div>

          <div class="lbl-barcode">
            <svg ref="barcodeRef"></svg>
          </div>

          <table class="lbl-fields">
            <tbody>
            <tr>
              <td colspan="2"><span class="f-label">Date Received</span><span class="f-value">{{ todayFormatted }}</span></td>
            </tr>
            <tr>
              <td colspan="2"><span class="f-label">Description</span><span class="f-value desc">{{ barcodeForm.description1 || ' ' }}</span></td>
            </tr>
            <tr>
              <td colspan="2"><span class="f-label">Description 2</span><span class="f-value desc">{{ barcodeForm.description2 || ' ' }}</span></td>
            </tr>
            <tr>
              <td><span class="f-label">MIC Part Number</span><span class="f-value">{{ barcodeForm.micPartNumber || ' ' }}</span></td>
              <td><span class="f-label">Qty / Unit</span><span class="f-value big">{{ labelQuantities[0] ? labelQuantities[0] + ' ' + (barcodeForm.unit || '') : ' ' }}</span></td>
            </tr>
            <tr>
              <td><span class="f-label">Batch #</span><span class="f-value">{{ barcodeForm.batch || ' ' }}</span></td>
              <td><span class="f-label">Location</span><span class="f-value">{{ barcodeForm.location.length ? barcodeForm.location.join(', ') : ' ' }}</span></td>
            </tr>
            <tr>
              <td colspan="2">
                <span class="f-label">Condition on Receipt</span>
                <div class="cond-row">
                  <span v-for="opt in materialStatuses" :key="opt" class="cond">
                    <span class="box">{{ barcodeForm.condition === opt ? 'X' : '' }}</span> {{ opt }}
                  </span>
                </div>
              </td>
            </tr>
            </tbody>
          </table>

          <div class="lbl-footer">
            <span>WMS v1.0</span>
            <!-- Preview always shows the first copy, so the sequence reads 1/N. -->
            <span>LABEL: 1/{{ labelQuantities.length || 1 }}</span>
            <span>{{ barcodeForm.tpn ? 'TPN ' + barcodeForm.tpn : '' }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 justify-center">
          <label class="text-sm font-medium text-slate-600" for="labelCount"># of labels</label>
          <input
            id="labelCount"
            v-model.number="labelCount"
            type="number"
            min="1"
            max="100"
            class="w-24 text-sm border border-slate-200 rounded-lg px-2.5 py-3 text-center focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>

        <div class="max-h-40 overflow-y-auto flex flex-col gap-1.5 border border-slate-100 rounded-lg p-2">
          <div v-for="(_, i) in labelQuantities" :key="i" class="flex items-center justify-between gap-2 text-sm">
            <span class="text-slate-500">Mat/Equip Qty {{ i + 1 }}</span>
            <input
              v-model.number="labelQuantities[i]"
              type="number"
              min="1"
              class="w-24 text-sm border border-slate-200 rounded-lg px-2 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
        </div>

        <p class="text-xs text-slate-500 text-center">
          Total: <strong>{{ labelQuantitiesSum }}</strong> of <strong>{{ maxLabelQty || 0 }}</strong> received
        </p>
        <p v-if="labelQtyExceedsMax" class="text-xs text-red-600 text-center font-semibold">
          Label quantities exceed the amount received ({{ maxLabelQty }}).
        </p>
        <p v-else-if="maxLabelQty <= 0" class="text-xs text-amber-600 text-center font-semibold">
          Enter a Quantity Received to enable printing.
        </p>
        <p v-else-if="labelQtyIncomplete" class="text-xs text-amber-600 text-center font-semibold">
          Label quantities must add up to exactly {{ maxLabelQty }} to print.
        </p>

        <p v-if="isDamaged" class="text-xs text-amber-600 text-center font-semibold">
          Damaged material is not labelled — it goes to the quarantine area.
        </p>

        <!-- The label prints as part of Create Inbound. This is the second chance at it,
             for a jammed printer, without going to the reprint screen. -->
        <div v-if="lastPrinted" class="w-full rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <p class="font-semibold">Inbound recorded.</p>
          <p class="mt-1 font-mono text-xs">{{ lastPrinted.tpn }}</p>
          <button
            type="button"
            @click="reprintLast"
            :disabled="printing"
            class="mt-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-md hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            {{ printing ? 'Generating…' : 'Reprint this label' }}
          </button>
        </div>
      </div>
      </div>

    </div>


    <!-- TPN dropdown — floats over the form -->
    <ul
      v-if="showTpnDropdown"
      class="tpn-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: tpnDropdownPos.top + 'px', left: tpnDropdownPos.left + 'px', width: tpnDropdownPos.width + 'px' }"
    >
      <li
        v-for="inb in filteredInbounds"
        :key="inb.rowId"
        @mousedown.prevent="selectInbound(inb)"
        class="px-3 py-3.5 text-sm hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        <div class="font-medium text-slate-800 leading-tight">{{ inb.tpn }}</div>
        <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
          <span v-if="inb.transmittalId">{{ inb.transmittalId }}</span>
          <span v-if="inb.description1">· {{ inb.description1 }}</span>
          <span v-if="inb.description2">· {{ inb.description2 }}</span>
          <span v-if="inb.micPartNumber">· {{ inb.micPartNumber }}</span>
        </div>
      </li>
      <li v-if="filteredInbounds.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No matches found
      </li>
    </ul>

    <!-- Description 2 search dropdown — floats over the form -->
    <ul
      v-if="showDesc2Dropdown"
      class="desc2search-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: desc2DropdownPos.top + 'px', left: desc2DropdownPos.left + 'px', width: desc2DropdownPos.width + 'px' }"
    >
      <li
        v-for="inb in filteredDesc2Records"
        :key="inb.rowId ?? inb.tpn"
        @mousedown.prevent="selectDesc2Record(inb)"
        class="px-3 py-3.5 text-sm hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        <div class="font-medium text-slate-800 leading-tight">{{ inb.description2 }}</div>
        <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
          <span>{{ inb.tpn }}</span>
          <span v-if="inb.description1">· {{ inb.description1 }}</span>
        </div>
      </li>
      <li v-if="filteredDesc2Records.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No matches found
      </li>
    </ul>

    <!-- Location dropdown — floats over the form -->
    <ul
      v-if="showLocationDropdown"
      class="location-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: locationDropdownPos.top + 'px', left: locationDropdownPos.left + 'px', width: locationDropdownPos.width + 'px' }"
    >
      <li
        v-for="loc in filteredLocations"
        :key="loc"
        @mousedown.prevent="toggleLocation(loc)"
        class="flex items-center gap-2 px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        <input type="checkbox" :checked="barcodeForm.location.includes(loc)" class="accent-red-600 w-5 h-5 pointer-events-none" />
        {{ loc }}
      </li>
      <li v-if="filteredLocations.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No matches found
      </li>
    </ul>

    <!-- Unit dropdown — floats over the form -->
    <ul
      v-if="showUnitDropdown"
      class="unit-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: unitDropdownPos.top + 'px', left: unitDropdownPos.left + 'px', width: unitDropdownPos.width + 'px' }"
    >
      <li
        v-for="u in filteredUnits"
        :key="u"
        @mousedown.prevent="selectUnit(u)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ u }}
      </li>
      <li v-if="filteredUnits.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No matches found
      </li>
    </ul>

    <!-- Category dropdown — floats over the form (new-material fields) -->
    <ul
      v-if="showCategoryDropdown"
      class="category-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: categoryDropdownPos.top + 'px', left: categoryDropdownPos.left + 'px', width: categoryDropdownPos.width + 'px' }"
    >
      <li
        v-for="c in filteredCategories"
        :key="c"
        @mousedown.prevent="selectCategory(c)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ c }}
      </li>
      <li v-if="filteredCategories.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No matches found
      </li>
    </ul>

    <!-- Description / Description 2 dropdowns — floats over the form -->
    <ul
      v-if="desc1DD.show.value"
      class="desc1-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: desc1DD.pos.value.top + 'px', left: desc1DD.pos.value.left + 'px', width: desc1DD.pos.value.width + 'px' }"
    >
      <li
        v-for="v in desc1DD.filtered.value"
        :key="v"
        @mousedown.prevent="desc1DD.select(v)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ v }}
      </li>
      <li v-if="desc1DD.filtered.value.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>


    <!-- MIC Part Number / Type / Brand / Spec / Supplier dropdowns — floats over the form -->
    <ul
      v-if="micPartNumberDD.show.value"
      class="micpn-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: micPartNumberDD.pos.value.top + 'px', left: micPartNumberDD.pos.value.left + 'px', width: micPartNumberDD.pos.value.width + 'px' }"
    >
      <li
        v-for="v in micPartNumberDD.filtered.value"
        :key="v"
        @mousedown.prevent="micPartNumberDD.select(v)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ v }}
      </li>
      <li v-if="micPartNumberDD.filtered.value.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

    <ul
      v-if="typeDD.show.value"
      class="type-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: typeDD.pos.value.top + 'px', left: typeDD.pos.value.left + 'px', width: typeDD.pos.value.width + 'px' }"
    >
      <li
        v-for="v in typeDD.filtered.value"
        :key="v"
        @mousedown.prevent="typeDD.select(v)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ v }}
      </li>
      <li v-if="typeDD.filtered.value.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

    <ul
      v-if="brandDD.show.value"
      class="brand-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: brandDD.pos.value.top + 'px', left: brandDD.pos.value.left + 'px', width: brandDD.pos.value.width + 'px' }"
    >
      <li
        v-for="v in brandDD.filtered.value"
        :key="v"
        @mousedown.prevent="brandDD.select(v)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ v }}
      </li>
      <li v-if="brandDD.filtered.value.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

    <ul
      v-if="specDD.show.value"
      class="spec-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: specDD.pos.value.top + 'px', left: specDD.pos.value.left + 'px', width: specDD.pos.value.width + 'px' }"
    >
      <li
        v-for="v in specDD.filtered.value"
        :key="v"
        @mousedown.prevent="specDD.select(v)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ v }}
      </li>
      <li v-if="specDD.filtered.value.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

    <ul
      v-if="supplierDD.show.value"
      class="supplier-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: supplierDD.pos.value.top + 'px', left: supplierDD.pos.value.left + 'px', width: supplierDD.pos.value.width + 'px' }"
    >
      <li
        v-for="v in supplierDD.filtered.value"
        :key="v"
        @mousedown.prevent="supplierDD.select(v)"
        class="px-3 py-3.5 text-sm text-slate-700 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ v }}
      </li>
      <li v-if="supplierDD.filtered.value.length === 0" class="px-3 py-2 text-sm text-slate-400">No matches found</li>
    </ul>

  </div>

  <!-- Damaged material notice — explains where the record goes before anything is filled in -->
  <Teleport to="body">
    <div v-if="showQuarantineNotice" class="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full flex flex-col gap-4">
        <h2 class="text-base font-bold text-slate-800">Damaged material</h2>
        <p class="text-sm text-slate-600 leading-relaxed">
          Damaged material cannot be received as a new inbound, so it will be sent to the
          quarantine area in the Smartsheet database.
        </p>
        <p class="text-sm text-slate-600 leading-relaxed">
          If this is also a new material, it will be added to the Materials DB with no stock:
          its quantity on hand stays 0, because the damaged units are recorded in quarantine
          instead of as inbound. The quantity you enter is kept on the quarantine record. No
          label is printed.
        </p>
        <div class="flex justify-end">
          <button
            type="button"
            @click="showQuarantineNotice = false"
            class="px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Camera capture modal — used to take a photo for one of the inbound photo slots -->
  <Teleport to="body">
    <div v-if="showCamera" class="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl p-4 max-w-md w-full flex flex-col gap-3">
        <p class="text-sm font-semibold text-slate-700 text-center">{{ cameraSlotLabel }}</p>
        <video ref="cameraVideo" autoplay playsinline muted class="w-full rounded-xl bg-black"></video>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="closeCamera"
            class="px-6 py-3 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="capturePhoto"
            class="px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
  <BusyOverlay :show="busy" :message="busyMessage" />

</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import BusyOverlay from '../components/BusyOverlay.vue'
import JsBarcode from 'jsbarcode'
import { QrcodeStream } from 'vue-qrcode-reader'
import { printLabelPdf } from '../composables/useLabelPrint.js'
import { INBOUND_FORM } from '../config/forms.js'
import { mergeByTpn } from '../utils/records.js'

const API = '/api'
const error = ref('')

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
  document.addEventListener('click', handleTpnOutsideClick)
  document.addEventListener('click', handleDesc2OutsideClick)
  document.addEventListener('click', handleLocationOutsideClick)
  document.addEventListener('click', handleUnitOutsideClick)
  document.addEventListener('click', handleCategoryOutsideClick)
  document.addEventListener('click', handleSimpleDropdownsOutsideClick)
  window.addEventListener('scroll', repositionTpnDropdown, true)
  window.addEventListener('scroll', repositionDesc2Dropdown, true)
  window.addEventListener('scroll', repositionLocationDropdown, true)
  window.addEventListener('scroll', repositionUnitDropdown, true)
  window.addEventListener('scroll', repositionCategoryDropdown, true)
  window.addEventListener('scroll', repositionSimpleDropdowns, true)
  window.addEventListener('resize', repositionTpnDropdown)
  window.addEventListener('resize', repositionDesc2Dropdown)
  window.addEventListener('resize', repositionLocationDropdown)
  window.addEventListener('resize', repositionUnitDropdown)
  window.addEventListener('resize', repositionCategoryDropdown)
  window.addEventListener('resize', repositionSimpleDropdowns)
})

onUnmounted(() => {
  document.removeEventListener('click', handleTpnOutsideClick)
  document.removeEventListener('click', handleDesc2OutsideClick)
  document.removeEventListener('click', handleLocationOutsideClick)
  document.removeEventListener('click', handleUnitOutsideClick)
  document.removeEventListener('click', handleCategoryOutsideClick)
  document.removeEventListener('click', handleSimpleDropdownsOutsideClick)
  window.removeEventListener('scroll', repositionTpnDropdown, true)
  window.removeEventListener('scroll', repositionDesc2Dropdown, true)
  window.removeEventListener('scroll', repositionLocationDropdown, true)
  window.removeEventListener('scroll', repositionUnitDropdown, true)
  window.removeEventListener('scroll', repositionCategoryDropdown, true)
  window.removeEventListener('scroll', repositionSimpleDropdowns, true)
  window.removeEventListener('resize', repositionTpnDropdown)
  window.removeEventListener('resize', repositionDesc2Dropdown)
  window.removeEventListener('resize', repositionLocationDropdown)
  window.removeEventListener('resize', repositionUnitDropdown)
  window.removeEventListener('resize', repositionCategoryDropdown)
  window.removeEventListener('resize', repositionSimpleDropdowns)
  cameraStream?.getTracks().forEach(track => track.stop())
  clearTimeout(scanFeedbackTimeout)
})

// ----- Registration form -----
const barcodeForm = ref({
  showScanner: 'barcodeScanner',
  tpn: '',
  batch: '',
  quantity: '',
  unit: '',
  location: [],
  condition: '',
  remarks: '',
  dateCreated: '',
  description1: '',
  description2: '',
  micPartNumber: '',
  type: '',
  spec: '',
  brand: '',
  category: '',
  supplier: ''
})
const scanError = ref('')
const matchedInbound = ref(null)
const createNewMaterial = ref('no')

const tpnInputEl = ref(null)
const scanPanelEl = ref(null)
watch(() => barcodeForm.value.showScanner, (value) => {
  if (value === 'barcodeScanner') nextTick(() => tpnInputEl.value?.focus())
})

function onTpnFocus(event) {
  if (createNewMaterial.value !== 'yes') openTpnDropdown(event)
}

function onPanelFocusOut() {
  if (barcodeForm.value.showScanner !== 'barcodeScanner') return
  setTimeout(() => {
    const active = document.activeElement
    const isFormControl = active && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(active.tagName)
    if (!isFormControl) {
      tpnInputEl.value?.focus()
      tpnInputEl.value?.select()
    }
  }, 50)
}

function armReclaimOnWindowFocus() {
  window.addEventListener('focus', () => {
    nextTick(() => { tpnInputEl.value?.focus(); tpnInputEl.value?.select() })
  }, { once: true })
}

function reclaimScannerFocus() {
  nextTick(() => { tpnInputEl.value?.focus(); tpnInputEl.value?.select() })
  armReclaimOnWindowFocus()
}
// The last label sent to the printer, kept so it can be reprinted after the form is cleared.
const lastPrinted = ref(null)

// Damaged material is not received as stock, so it is never labelled - it goes to quarantine.
const DAMAGED_CONDITION = 'Damaged'
const isDamaged = computed(() => barcodeForm.value.condition === DAMAGED_CONDITION)

const showQuarantineNotice = ref(false)

// let's show that modal to explain the obvious
watch(isDamaged, (damaged) => {
  if (damaged) showQuarantineNotice.value = true
})

// this field needs to be cleaned between selections of "yes" and "no" for createNewMaterial
let tpnBeforeNewMaterial = ''

async function loadNextTpn() {
  try {
    const res = await fetch('/api/inbound/next-tpn', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to predict next TPN')
    const data = await res.json()

    // the only place this is going to trigger, because duh
    if (createNewMaterial.value !== 'yes') return

    if (data.nextTpn) barcodeForm.value.tpn = data.nextTpn
  } catch {
    console.warn('Could not predict next TPN')
  }
}

watch(createNewMaterial, (value) => {
  if (value === 'yes') {
    tpnBeforeNewMaterial = barcodeForm.value.tpn
    loadNextTpn()
    return
  }

  barcodeForm.value.tpn = tpnBeforeNewMaterial
  tpnBeforeNewMaterial = ''
})

function clearForm() {
  barcodeForm.value = {
    showScanner: 'barcodeNo',
    tpn: '',
    batch: '',
    quantity: '',
    unit: '',
    location: [],
    condition: '',
    remarks: '',
    dateCreated: '',
    description1: '',
    description2: '',
    micPartNumber: '',
    type: '',
    spec: '',
    brand: '',
    category: '',
    supplier: ''
  }
  matchedInbound.value = null
  lastScannedTpn.value = null
  tpnBeforeNewMaterial = ''
  createNewMaterial.value = 'no'
  clearPhotos()
}

const creating = ref(false)

// This is needed for things like the bug today, just before submitting everythin
// we need to check that the TPN is still actually free
async function confirmTpnStillFree() {
  if (createNewMaterial.value !== 'yes') return true

  let nextTpn = null
  try {
    const res = await fetch('/api/inbound/next-tpn', { credentials: 'include', cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to re-check the next TPN')
    nextTpn = (await res.json()).nextTpn
  } catch {
    console.warn('Could not re-check the next TPN before submitting')
    return true
  }

  const taken = String(barcodeForm.value.tpn ?? '').trim()
  if (!nextTpn || nextTpn === taken) return true

  barcodeForm.value.tpn = nextTpn

  showToast(
    `${taken} was taken while you were filling this in. This material is now ${nextTpn} — check the form and submit again.`,
    'warning'
  )
  return false
}

// One click: record the inbound, print its label, clear the form. The label goes out only
// after the record exists, so a failed save never leaves a printed label with no record
// behind it.
async function createNewInbound() {
  if (isDamaged.value) {
    showQuarantineNotice.value = true
    return
  }

  if (labelQtyIncomplete.value) {
    showToast(maxLabelQty.value <= 0
      ? 'Enter a Quantity Received before creating the inbound.'
      : `Label quantities must add up to exactly ${maxLabelQty.value}.`, 'warning')
    return
  }

  if (!(await confirmTpnStillFree())) return

  creating.value = true
  error.value = ''
  const isNewMaterial = createNewMaterial.value === 'yes'
  try {
    if (isNewMaterial) {
      showToast('Creating material catalog record…', 'warning')
    }

    const res = await fetch(`${API}/inbound`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Sent only when reusing an existing material — the backend skips it when
        // createNewMaterial is true, since a brand-new predicted TPN isn't a valid
        // picklist option yet.
        tpn: barcodeForm.value.tpn,
        batch: barcodeForm.value.batch,
        quantity: barcodeForm.value.quantity,
        unit: barcodeForm.value.unit,
        location: barcodeForm.value.location,
        condition: barcodeForm.value.condition,
        remarks: barcodeForm.value.remarks,
        description1: barcodeForm.value.description1,
        description2: barcodeForm.value.description2,
        micPartNumber: barcodeForm.value.micPartNumber,
        photos: PHOTO_SLOTS
          .filter(slot => photoSlots.value[slot.key])
          .map(slot => ({ key: slot.key, label: slot.label, image: photoSlots.value[slot.key].image })),
        createNewMaterial: isNewMaterial,
        type: barcodeForm.value.type,
        spec: barcodeForm.value.spec,
        brand: barcodeForm.value.brand,
        category: barcodeForm.value.category,
        supplier: barcodeForm.value.supplier
      })
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || 'Failed to create inbound record.')
    }

    const data = await res.json().catch(() => ({}))
    if (isNewMaterial) {
      showToast(
        data.materialRowId ? 'Material catalog record created.' : 'Material catalog record could not be created (check server logs).',
        data.materialRowId ? 'success' : 'error'
      )
    }
    showToast('Inbound record created.', 'success')

    // Captured before the reset, then printed after it: a print failure must not cost the
    // clerk the record, and the payload is what the reprint button reuses.
    const payload = buildLabelPayload()
    lastPrinted.value = payload
    clearForm()

    creating.value = false
    await printLabel(payload)
  } catch (e) {
    showToast(e.message || 'Failed to create inbound record.', 'error')
  } finally {
    creating.value = false
  }
}

const submittingQuarantine = ref(false)

async function submitToQuarantine() {
  if (submittingQuarantine.value) return

  // bogus check to bypass the validations when the damaged option is selected
  if (!String(barcodeForm.value.tpn ?? '').trim()) {
    showToast('A TPN is required before sending to quarantine.', 'warning')
    return
  }

  if (!(Number(String(barcodeForm.value.quantity ?? '').trim()) > 0)) {
    showToast('Enter a Quantity Received greater than zero before sending to quarantine.', 'warning')
    return
  }

  // No label is printed on this path, but the TPN still has to be one nobody has taken.
  if (!(await confirmTpnStillFree())) return

  submittingQuarantine.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/inbound/quarantine`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: barcodeForm.value.location,
        tpn: barcodeForm.value.tpn,
        batch: barcodeForm.value.batch,
        quantity: barcodeForm.value.quantity,
        unit: barcodeForm.value.unit,
        condition: barcodeForm.value.condition,
        remarks: barcodeForm.value.remarks,
        description1: barcodeForm.value.description1,
        description2: barcodeForm.value.description2,
        micPartNumber: barcodeForm.value.micPartNumber,
        photos: PHOTO_SLOTS
          .filter(slot => photoSlots.value[slot.key])
          .map(slot => ({ key: slot.key, label: slot.label, image: photoSlots.value[slot.key].image })),
        createNewMaterial: createNewMaterial.value === 'yes',
        type: barcodeForm.value.type,
        spec: barcodeForm.value.spec,
        brand: barcodeForm.value.brand,
        category: barcodeForm.value.category,
        supplier: barcodeForm.value.supplier,
      })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Failed to send to quarantine.')

    showToast(data.message || 'Sent to the quarantine area.', data.failedPhotos?.length ? 'warning' : 'success')
    clearForm()
  } catch (e) {
    showToast(e.message || 'Failed to submit to quarantine.', 'error')
  } finally {
    submittingQuarantine.value = false
  }
}

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

const PHOTO_SLOTS = [
  { key: 'itemPhoto',  label: 'Item Photo' },
  { key: 'leftSide',   label: 'Left Side View' },
  { key: 'rightSide',  label: 'Right Side View' },
  { key: 'topSide',    label: 'Top View' },
  { key: 'bottomSide', label: 'Bottom View' },
  { key: 'rearView',   label: 'Rear View' },
]

const photoSlots = ref({
  itemPhoto:  null,
  leftSide:   null,
  rightSide:  null,
  topSide:    null,
  bottomSide: null,
  rearView:   null,
}) // each slot is either null or { image: dataUrl, fileName }

const showCamera = ref(false)
const cameraVideo = ref(null)
let cameraStream = null

// Which slot the shared file input / camera capture is currently targeting.
const activeSlotKey = ref(null)
const cameraSlotLabel = computed(() =>
  PHOTO_SLOTS.find(s => s.key === activeSlotKey.value)?.label ?? ''
)

// Plain (non-reactive) ref — the file input is only needed imperatively.
let photoFileInputEl = null
function setPhotoFileInputRef(el) {
  photoFileInputEl = el
}
function triggerSlotFilePicker(key) {
  activeSlotKey.value = key
  photoFileInputEl?.click()

  if (barcodeForm.value.showScanner === 'barcodeScanner') armReclaimOnWindowFocus()
}

function removeSlotPhoto(key) {
  photoSlots.value[key] = null
}

function clearPhotos() {
  for (const slot of PHOTO_SLOTS) photoSlots.value[slot.key] = null
  if (photoFileInputEl) photoFileInputEl.value = ''
}

function handlePhotoFileChange(event) {
  const file = event.target.files?.[0]
  if (!file || !activeSlotKey.value) return

  if (!isAcceptedFile(file)) {
    error.value = `${file.name} is not an image, PDF, Word or Excel file.`
    event.target.value = ''
    return
  }

  if (file.size > MAX_FILE_BYTES) {
    error.value = `${file.name} is ${formatSize(file.size)}, over the ${MAX_FILE_MB} MB limit.`
    event.target.value = ''
    return
  }

  const key = activeSlotKey.value
  const reader = new FileReader()
  reader.onload = () => {
    photoSlots.value[key] = { image: reader.result, fileName: file.name, isImage: file.type.startsWith('image/') }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

async function openCamera(key) {
  activeSlotKey.value = key
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  } catch {
    error.value = 'Could not access camera.'
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
  if (barcodeForm.value.showScanner === 'barcodeScanner') reclaimScannerFocus()
}

function capturePhoto() {
  const video = cameraVideo.value
  if (!video || !activeSlotKey.value) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  photoSlots.value[activeSlotKey.value] = {
    image: canvas.toDataURL('image/png'),
    fileName: `${activeSlotKey.value}-${Date.now()}.png`,
    isImage: true,
  }
  closeCamera()
}

function todayISO() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
const todayFormatted = computed(() => {
  const [y, m, d] = todayISO().split('-')
  return `${m}/${d}/${y}`
})

// ----- Barcode preview -----
const barcodeRef = ref(null)

function drawBarcode(target, value) {
  if (!target) return
  const v = (value || '').trim()
  if (!v) { target.innerHTML = ''; return }
  try {
    JsBarcode(target, v, { format: 'CODE39', width: 2, height: 60, displayValue: true, margin: 0 })
  } catch (e) {
    console.error('[InboundView] JsBarcode failed for TPN', JSON.stringify(v), e)
    target.innerHTML = ''
  }
}

watch(() => barcodeForm.value.tpn, async (value) => {
  await nextTick()
  drawBarcode(barcodeRef.value, value)
}, { immediate: true })

const printing = ref(false)
const labelCount = ref(1)
const labelQuantities = ref([1])

// The quantity actually on record for this print run — the amount just being
// received. The sum of labelQuantities must never exceed it, otherwise printing
// e.g. 5 labels of 100 for a 100-unit receipt would silently claim 500 units received.
const maxLabelQty = computed(() => Number(barcodeForm.value.quantity) || 0)
const labelQuantitiesSum = computed(() =>
  labelQuantities.value.reduce((sum, q) => sum + (Number(q) || 0), 0)
)
const labelQtyExceedsMax = computed(() =>
  maxLabelQty.value > 0 && labelQuantitiesSum.value > maxLabelQty.value
)
// Print is only allowed once the label quantities add up to exactly the amount
// received/on record — not less (incomplete), not more (labelQtyExceedsMax), and
// not when nothing's been entered yet (maxLabelQty === 0, e.g. blank Quantity
// Received in Register mode before anything's typed).
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

// Re-derive the even split whenever the label count or the governing quantity
// changes, so the fields start sensible — the user can still hand-edit any of
// them afterward (validated against the total via labelQtyExceedsMax).
watch(labelCount, redistributeLabelQuantities)
watch(maxLabelQty, redistributeLabelQuantities)

// Snapshot of everything the label needs, taken before the form is cleared so the reprint
// button still works afterwards.
function buildLabelPayload() {
  return {
    tpn: barcodeForm.value.tpn,
    description1: barcodeForm.value.description1,
    description2: barcodeForm.value.description2,
    micPartNumber: barcodeForm.value.micPartNumber,
    batch: barcodeForm.value.batch,
    quantities: [...labelQuantities.value],
    unit: barcodeForm.value.unit,
    location: [...barcodeForm.value.location],
    condition: barcodeForm.value.condition,
    conditionOptions: materialStatuses.value,
    dateReceived: new Date().toISOString()
  }
}

async function printLabel(payload) {
  printing.value = true
  try {
    await printLabelPdf(payload)
    showToast('Label ready to print.', 'success')
  } catch (e) {
    showToast(e.message || 'Failed to print label.', 'error')
  } finally {
    printing.value = false
    if (barcodeForm.value.showScanner === 'barcodeScanner') reclaimScannerFocus()
  }
}

function reprintLast() {
  if (lastPrinted.value) printLabel(lastPrinted.value)
}

// ----- Scanner -----
// QrcodeStream fires @detect on every video frame the code stays in view, so
// without a guard it re-overwrites the input dozens of times a second and the
// user can never manually edit/clear it. lastScannedTpn gates that: once a code
// is shown, repeat detections of the SAME code are ignored until the user
// manually edits the field (onTpnInput clears the lock) or a DIFFERENT code
// is scanned.
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

async function loadMaterialStatuses() {
  try {
    const res = await fetch('/api/inbound/material-statuses', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load material statuses')
    materialStatuses.value = await res.json()
  } catch {
    console.warn('Could not load material statuses list')
  }
}

// ----- Existing inbounds lookup (TPN search dropdown) -----
const inbounds = ref([])
const materialsList = ref([])
const showTpnDropdown = ref(false)
const tpnDropdownPos = ref({ top: 0, left: 0, width: 0 })
let tpnAnchorEl = null

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

// Prefill the data iteratively 
const combinedTpnRecords = computed(() => mergeByTpn(materialsList.value, inbounds.value))

function filterInbounds(search) {
  const q = String(search ?? '').toLowerCase()
  if (!q) return combinedTpnRecords.value
  return combinedTpnRecords.value.filter(inb =>
    [inb.tpn, inb.barcodeTpn, inb.description1, inb.description2, inb.micPartNumber, inb.transmittalId]
      .some(v => String(v ?? '').toLowerCase().includes(q))
  )
}

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

function onTpnInput(event) {
  barcodeForm.value.tpn = event.target.value
  lastScannedTpn.value = null // manual edit — resets the scan lock so the next detection (even of the same code) is accepted
  matchedInbound.value = null
  tpnAnchorEl = event.target
  showTpnDropdown.value = true
  repositionTpnDropdown()
}

function closeTpnDropdown() {
  showTpnDropdown.value = false
  tpnAnchorEl = null
}

const showDesc2Dropdown = ref(false)
const desc2DropdownPos = ref({ top: 0, left: 0, width: 0 })
let desc2AnchorEl = null

function filterByDescription2(search) {
  const q = String(search ?? '').toLowerCase()
  const withDesc2 = combinedTpnRecords.value.filter(inb => inb.description2)
  if (!q) return withDesc2
  return withDesc2.filter(inb => String(inb.description2).toLowerCase().includes(q))
}

// A computed, not a plain ref snapshotted at focus/input time — see filteredInbounds above.
const filteredDesc2Records = computed(() => filterByDescription2(barcodeForm.value.description2))

function repositionDesc2Dropdown() {
  if (!showDesc2Dropdown.value || !desc2AnchorEl) return
  const rect = desc2AnchorEl.getBoundingClientRect()
  desc2DropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
}

function openDesc2Dropdown(event) {
  desc2AnchorEl = event.target
  showDesc2Dropdown.value = true
  repositionDesc2Dropdown()
}

function onDescription2SearchInput(event) {
  barcodeForm.value.description2 = event.target.value
  matchedInbound.value = null
  desc2AnchorEl = event.target
  showDesc2Dropdown.value = true
  repositionDesc2Dropdown()
}

function closeDesc2Dropdown() {
  showDesc2Dropdown.value = false
  desc2AnchorEl = null
}

function selectDesc2Record(inb) {
  // A new material keeps its own predicted TPN. This record's belongs to another material,
  // and the field is read-only in that mode, so it could not be corrected afterwards.
  if (createNewMaterial.value !== 'yes') barcodeForm.value.tpn = inb.tpn

  matchedInbound.value = inb
  applyMatchedInbound(inb)
  closeDesc2Dropdown()
}

function handleDesc2OutsideClick(event) {
  if (!event.target.closest('.desc2search-dropdown-cell') && !event.target.closest('.desc2search-dropdown')) {
    closeDesc2Dropdown()
  }
}

function onTpnEnter() {
  const value = barcodeForm.value.tpn
  if (!value) return
  flashScanFeedback()
  const inb = combinedTpnRecords.value.find(inb => inb.tpn === value) || null
  matchedInbound.value = inb
  applyMatchedInbound(inb)
  closeTpnDropdown()

  if (barcodeForm.value.showScanner === 'barcodeScanner') {
    nextTick(() => tpnInputEl.value?.select())
  }
}

// Auto-fills the fields the form has a direct counterpart for, from the matched
// inbound record. Qty is left alone since it's this transaction's own received count.
function applyMatchedInbound(inb) {
  if (!inb) return
  if (inb.batch) barcodeForm.value.batch = inb.batch
  if (inb.unit) barcodeForm.value.unit = inb.unit
  if (Array.isArray(inb.location) && inb.location.length) barcodeForm.value.location = [...inb.location]
  if (inb.condition) barcodeForm.value.condition = inb.condition
  if (inb.remark) barcodeForm.value.remarks = inb.remark
  if (inb.description1) barcodeForm.value.description1 = inb.description1
  if (inb.description2) barcodeForm.value.description2 = inb.description2
  if (inb.micPartNumber) barcodeForm.value.micPartNumber = inb.micPartNumber
  if (inb.type) barcodeForm.value.type = inb.type
  if (inb.spec) barcodeForm.value.spec = inb.spec
  if (inb.brand) barcodeForm.value.brand = inb.brand
  if (inb.category) barcodeForm.value.category = inb.category
  if (inb.supplier) barcodeForm.value.supplier = inb.supplier
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

// ----- Existing locations lookup (Location multi-select dropdown) -----
const locations = ref([])
const locationSearch = ref('')
const showLocationDropdown = ref(false)
const locationDropdownPos = ref({ top: 0, left: 0, width: 0 })
const filteredLocations = ref([])
const locationInputEl = ref(null)
let locationAnchorEl = null

async function loadLocations() {
  try {
    const res = await fetch('/api/inbound/locations', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load locations')
    locations.value = await res.json()
  } catch {
    console.warn('Could not load locations list')
  }
}

function filterLocations(search) {
  // locations is already sourced from the materials list (GET /api/inbound/locations) —
  // that's the source of truth for reference data; the inbound sheet is transactional only.
  const q = String(search ?? '').toLowerCase()
  if (!q) return locations.value
  return locations.value.filter(loc => String(loc ?? '').toLowerCase().includes(q))
}

function repositionLocationDropdown() {
  if (!showLocationDropdown.value || !locationAnchorEl) return
  const rect = locationAnchorEl.getBoundingClientRect()
  locationDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 240) }
}

function openLocationDropdown(event) {
  locationAnchorEl = event.target
  showLocationDropdown.value = true
  filteredLocations.value = filterLocations(locationSearch.value)
  repositionLocationDropdown()
}

function onLocationInput(event) {
  locationSearch.value = event.target.value
  locationAnchorEl = event.target
  showLocationDropdown.value = true
  filteredLocations.value = filterLocations(locationSearch.value)
  repositionLocationDropdown()
}

function closeLocationDropdown() {
  showLocationDropdown.value = false
  locationAnchorEl = null
}

function focusLocationInput() {
  locationInputEl.value?.focus()
}

function toggleLocation(loc) {
  const idx = barcodeForm.value.location.indexOf(loc)
  if (idx === -1) barcodeForm.value.location.push(loc)
  else barcodeForm.value.location.splice(idx, 1)
  locationSearch.value = ''
  filteredLocations.value = filterLocations('')
  focusLocationInput()
}

function removeLocation(loc) {
  const idx = barcodeForm.value.location.indexOf(loc)
  if (idx !== -1) barcodeForm.value.location.splice(idx, 1)
}

function onLocationBackspace() {
  if (locationSearch.value === '' && barcodeForm.value.location.length) {
    barcodeForm.value.location.pop()
  }
}

function handleLocationOutsideClick(event) {
  if (!event.target.closest('.location-dropdown-cell') && !event.target.closest('.location-dropdown')) {
    closeLocationDropdown()
  }
}

// ----- Existing units lookup (Unit search dropdown) -----
const units = ref([])
const showUnitDropdown = ref(false)
const unitDropdownPos = ref({ top: 0, left: 0, width: 0 })
const filteredUnits = ref([])
let unitAnchorEl = null

async function loadUnits() {
  try {
    const res = await fetch('/api/inbound/units', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load units')
    units.value = await res.json()
  } catch {
    console.warn('Could not load units list')
  }
}

function filterUnits(search) {
  // units is already sourced from the materials list (GET /api/inbound/units).
  const q = String(search ?? '').toLowerCase()
  if (!q) return units.value
  return units.value.filter(u => String(u ?? '').toLowerCase().includes(q))
}

function repositionUnitDropdown() {
  if (!showUnitDropdown.value || !unitAnchorEl) return
  const rect = unitAnchorEl.getBoundingClientRect()
  unitDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 160) }
}

function openUnitDropdown(event) {
  unitAnchorEl = event.target
  showUnitDropdown.value = true
  filteredUnits.value = filterUnits(barcodeForm.value.unit)
  repositionUnitDropdown()
}

function onUnitInput(event) {
  barcodeForm.value.unit = event.target.value
  unitAnchorEl = event.target
  showUnitDropdown.value = true
  filteredUnits.value = filterUnits(barcodeForm.value.unit)
  repositionUnitDropdown()
}

function closeUnitDropdown() {
  showUnitDropdown.value = false
  unitAnchorEl = null
}

function selectUnit(u) {
  barcodeForm.value.unit = u
  closeUnitDropdown()
}

function handleUnitOutsideClick(event) {
  if (!event.target.closest('.unit-dropdown-cell') && !event.target.closest('.unit-dropdown')) {
    closeUnitDropdown()
  }
}

// ----- Materials list picklists (Category has no inbound-side equivalent; Description
// 1/2 suggestion lists also live here since the materials list, not the inbound
// transaction log, is the source of truth for reference/autocomplete data) -----
const materialCategories = ref([])
const materialDescriptions1 = ref([])
const materialDescriptions2 = ref([])
const materialMicPartNumbers = ref([])
const materialTypes = ref([])
const materialBrands = ref([])
const materialSpecs = ref([])
const materialSuppliers = ref([])

async function loadMaterialsPicklists() {
  try {
    const res = await fetch('/api/inbound/materials-picklists', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load materials picklists')
    const data = await res.json()
    materialCategories.value = data.categories ?? []
    materialDescriptions1.value = data.descriptions1 ?? []
    materialDescriptions2.value = data.descriptions2 ?? []
    materialMicPartNumbers.value = data.micPartNumbers ?? []
    materialTypes.value = data.types ?? []
    materialBrands.value = data.brands ?? []
    materialSpecs.value = data.specs ?? []
    materialSuppliers.value = data.suppliers ?? []
  } catch {
    console.warn('Could not load materials picklists')
  }
}

// Generic autocomplete factory for the remaining new-material fields (MIC Part Number,
// Type, Brand, Spec, Supplier) — same open/input/close/select/reposition pattern as
// Category/Unit/etc, just parameterized to avoid five near-identical copies.
function useSimpleAutocomplete(getList, setValue) {
  const show = ref(false)
  const pos = ref({ top: 0, left: 0, width: 0 })
  const filtered = ref([])
  let anchorEl = null

  function filter(search) {
    const q = String(search ?? '').toLowerCase()
    if (!q) return getList()
    return getList().filter(v => String(v ?? '').toLowerCase().includes(q))
  }
  function reposition() {
    if (!show.value || !anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    pos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 200) }
  }
  function open(event) {
    anchorEl = event.target
    show.value = true
    filtered.value = filter(event.target.value)
    reposition()
  }
  function onInput(event) {
    setValue(event.target.value)
    anchorEl = event.target
    show.value = true
    filtered.value = filter(event.target.value)
    reposition()
  }
  function close() {
    show.value = false
    anchorEl = null
  }
  function select(v) {
    setValue(v)
    close()
  }

  return { show, pos, filtered, open, onInput, close, select, reposition }
}

const micPartNumberDD = useSimpleAutocomplete(() => materialMicPartNumbers.value, v => { barcodeForm.value.micPartNumber = v })
const typeDD = useSimpleAutocomplete(() => materialTypes.value, v => { barcodeForm.value.type = v })
const brandDD = useSimpleAutocomplete(() => materialBrands.value, v => { barcodeForm.value.brand = v })
const specDD = useSimpleAutocomplete(() => materialSpecs.value, v => { barcodeForm.value.spec = v })
const supplierDD = useSimpleAutocomplete(() => materialSuppliers.value, v => { barcodeForm.value.supplier = v })
const desc1DD = useSimpleAutocomplete(() => materialDescriptions1.value, v => { barcodeForm.value.description1 = v })

const simpleDropdowns = [
  [micPartNumberDD, 'micpn'], [typeDD, 'type'], [brandDD, 'brand'], [specDD, 'spec'], [supplierDD, 'supplier'],
  [desc1DD, 'desc1']
]

function handleSimpleDropdownsOutsideClick(event) {
  for (const [dd, key] of simpleDropdowns) {
    if (!event.target.closest(`.${key}-dropdown-cell`) && !event.target.closest(`.${key}-dropdown`)) {
      dd.close()
    }
  }
}

function repositionSimpleDropdowns() {
  for (const [dd] of simpleDropdowns) dd.reposition()
}

// ----- Category search dropdown (new-material fields) -----
const showCategoryDropdown = ref(false)
const categoryDropdownPos = ref({ top: 0, left: 0, width: 0 })
const filteredCategories = ref([])
let categoryAnchorEl = null

function filterCategories(search) {
  const q = String(search ?? '').toLowerCase()
  if (!q) return materialCategories.value
  return materialCategories.value.filter(c => String(c ?? '').toLowerCase().includes(q))
}

function repositionCategoryDropdown() {
  if (!showCategoryDropdown.value || !categoryAnchorEl) return
  const rect = categoryAnchorEl.getBoundingClientRect()
  categoryDropdownPos.value = { top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 200) }
}

function openCategoryDropdown(event) {
  categoryAnchorEl = event.target
  showCategoryDropdown.value = true
  filteredCategories.value = filterCategories(barcodeForm.value.category)
  repositionCategoryDropdown()
}

function onCategoryInput(event) {
  barcodeForm.value.category = event.target.value
  categoryAnchorEl = event.target
  showCategoryDropdown.value = true
  filteredCategories.value = filterCategories(barcodeForm.value.category)
  repositionCategoryDropdown()
}

function closeCategoryDropdown() {
  showCategoryDropdown.value = false
  categoryAnchorEl = null
}

function selectCategory(c) {
  barcodeForm.value.category = c
  closeCategoryDropdown()
}

function handleCategoryOutsideClick(event) {
  if (!event.target.closest('.category-dropdown-cell') && !event.target.closest('.category-dropdown')) {
    closeCategoryDropdown()
  }
}


const busy = computed(() => creating.value || submittingQuarantine.value || printing.value)

const busyMessage = computed(() => {
  if (creating.value) return 'Creating the inbound record…'
  if (submittingQuarantine.value) return 'Sending to the quarantine area…'
  return 'Generating the label…'
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
.lbl-logo { height: 0.32in; width: auto; }
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
.f-value.desc { font-size: 11px; font-weight: 500; min-height: 0.4in; }
.cond-row { display: flex; gap: 0.12in; align-items: center; padding-top: 0.02in; flex-wrap: wrap; }
.cond { display: flex; align-items: center; gap: 0.04in; font-size: 10px; font-weight: 600; }
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
