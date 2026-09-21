<template>
  <div class="max-w-7xl mx-auto space-y-4 sm:space-y-6">

    <div v-if="!embedded">
      <h1 class="text-xl font-bold text-slate-800">{{ LAYDOWN_FORM.label }}</h1>
      <p class="text-sm text-slate-500 mt-0.5">{{ LAYDOWN_FORM.blurb }}</p>
    </div>


    <!-- Registration form + label preview -->
    <div class="rounded-xl border bg-white border-slate-100 shadow-sm p-4 sm:p-6">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

      <!-- Form panel -->
      <div class="space-y-4">
        <div>
          <h2 class="text-base font-bold text-slate-800">New Inbound</h2>
          <p class="text-sm text-slate-500 mt-0.5">Fields marked * are required. They update the label preview as you type.</p>
        </div>

        <!--
          Which code the barcode carries, on the label and on the row. Grouped with the MIC
          Part Number because that is the field it switches away from.
        -->
        <div class="rounded-lg bg-slate-100 border border-slate-200 p-3 space-y-2">
          <label class="flex items-center gap-2.5 cursor-pointer">
            <input v-model="useAutoPartNumber" type="checkbox" class="accent-brand-600 w-4 h-4" />
            <span class="text-sm font-semibold text-slate-700">Display the auto generated Part Number for the barcode?</span>
          </label>
          <p class="text-xs text-slate-500">
            <template v-if="useAutoPartNumber">
              The barcode uses the part number Smartsheet assigns on save. The preview shows
              <span class="font-mono font-semibold">{{ predictedPn || '—' }}</span>, the number
              expected next; the label itself prints with whatever was actually assigned.
            </template>
            <template v-else>
              The barcode uses the MIC Part Number below.
            </template>
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">
            MIC Part Number
            <span v-if="!useAutoPartNumber" class="text-brand-500">*</span>
            <span v-else class="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            v-model="form.micPartNumber"
            type="text"
            class="form-input"
            :class="micPartNumberConflict ? 'border-brand-400 ring-2 ring-brand-100' : ''"
            placeholder="MIC part number"
          />
          <p v-if="micPartNumberConflict" class="text-xs text-brand-600 font-semibold">
            Already used by {{ micPartNumberConflictLabel }} - the barcode would match two different Core Units.
          </p>
        </div>

        <div class="flex flex-col gap-1.5 relative chemical-dropdown-cell">
          <label class="form-label">
            Chemical <span class="text-brand-500">*</span>
            <span class="text-slate-400 font-normal normal-case">(Autocompletion Supported)</span>
          </label>
          <input
            :value="form.chemical"
            type="text"
            autocomplete="off"
            class="form-input"
            placeholder="Pick one or type a new chemical…"
            @focus="chemicalPicklist.open($event)"
            @input="chemicalPicklist.onInput($event)"
            @keydown.escape="chemicalPicklist.close()"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Description <span class="text-brand-500">*</span></label>
          <input v-model="form.description" type="text" class="form-input" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="form-label">Purchase Order (PO) Number <span class="text-brand-500">*</span></label>
            <input v-model="form.poNumber" type="text" class="form-input" placeholder="PO-0000" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="form-label">Serial Number <span class="text-brand-500">*</span></label>
            <input v-model="form.serialNumber" type="text" class="form-input" placeholder="Serial number" />
          </div>
        </div>

        <p class="group-label">Delivery Information</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="form-label">Arrival Date <span class="text-brand-500">*</span></label>
            <input v-model="form.arrivalDate" type="date" required class="form-input" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Arrival Time <span class="text-brand-500">*</span></label>
            <input v-model="form.arrivalTime" type="time" class="form-input" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="form-label">Container # <span class="text-brand-500">*</span></label>
            <input v-model="form.containerNumber" type="text" required class="form-input" placeholder="Container number" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Tracking Number</label>
            <input v-model="form.trackingNumber" type="text" class="form-input" placeholder="e.g. 1Z999AA10123456784" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Received By <span class="text-brand-500">*</span></label>
            <input v-model="form.receivedBy" type="text" required class="form-input" placeholder="Name" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Delivery Company / Carrier <span class="text-brand-500">*</span></label>
          <select v-if="options.deliveryCompany" v-model="form.deliveryCompany" class="form-input">
            <option value="">Select carrier…</option>
            <option v-for="opt in options.deliveryCompany" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else v-model="form.deliveryCompany" type="text" class="form-input" />
        </div>

        <p class="group-label">Vendor Information</p>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Supplier Information</label>
          <select v-if="options.supplier" v-model="form.supplier" class="form-input">
            <option value="">Select supplier…</option>
            <option v-for="opt in options.supplier" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <textarea
            v-else
            v-model="form.supplier"
            rows="2"
            class="form-input resize-y"
            placeholder="Supplier name — Enter for a new line"
          ></textarea>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">System <span class="text-brand-500">*</span></label>
          <select v-if="options.system" v-model="form.system" class="form-input">
            <option value="">Select system…</option>
            <option v-for="opt in options.system" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-else v-model="form.system" type="text" class="form-input" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Warehouse <span class="text-brand-500">*</span></label>
          <input v-model="form.warehouse" type="text" class="form-input" placeholder="Laydown Yard" />
        </div>

        <p class="group-label">Package Details</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5 relative brand-dropdown-cell">
            <label class="form-label">
              Brand <span class="text-brand-500">*</span>
              <span class="text-slate-400 font-normal normal-case">(Autocompletion Supported)</span>
            </label>
            <input
              :value="form.brand"
              type="text"
              autocomplete="off"
              class="form-input"
              placeholder="Pick one or type a new brand…"
              @focus="brandPicklist.open($event)"
              @input="brandPicklist.onInput($event)"
              @keydown.escape="brandPicklist.close()"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Type <span class="text-brand-500">*</span></label>
            <select v-if="options.type" v-model="form.type" class="form-input">
              <option value="">Select type…</option>
              <option v-for="opt in options.type" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else v-model="form.type" type="text" class="form-input" placeholder="Material type" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Origin <span class="text-brand-500">*</span></label>
            <select v-if="options.origin" v-model="form.origin" class="form-input">
              <option value="">Select origin…</option>
              <option v-for="opt in options.origin" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else v-model="form.origin" type="text" class="form-input" placeholder="Country / plant" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="form-label">Quantity <span class="text-brand-500">*</span></label>
            <input v-model="form.qty" type="number" min="0" required class="form-input" placeholder="0" />
          </div>

          <div class="flex flex-col gap-1.5 relative location-dropdown-cell">
            <label class="form-label">
              Location <span class="text-brand-500">*</span>
              <span class="text-slate-400 font-normal normal-case">(Autocompletion Supported)</span>
            </label>
            <input
              :value="form.location"
              type="text"
              required
              autocomplete="off"
              class="form-input"
              placeholder="Pick one or type a new location…"
              @focus="locationPicklist.open($event)"
              @input="locationPicklist.onInput($event)"
              @keydown.escape="locationPicklist.close()"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="form-label">Package Type <span class="text-brand-500">*</span></label>
            <select v-if="options.packageType" v-model="form.packageType" class="form-input">
              <option value="">Select type…</option>
              <option v-for="opt in options.packageType" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else v-model="form.packageType" type="text" class="form-input" placeholder="Pallet, Box…" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="form-label">Condition on Arrival <span class="text-brand-500">*</span></label>
            <select v-if="options.condition" v-model="form.condition" class="form-input">
              <option value="">Select condition…</option>
              <option v-for="opt in options.condition" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else v-model="form.condition" type="text" class="form-input" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">Comments</label>
          <textarea
            v-model="form.comments"
            rows="2"
            class="form-input resize-none"
            placeholder="Optional notes for this delivery…"
          ></textarea>
        </div>

        <p class="group-label">Documentation Upload</p>

        <div class="flex flex-col gap-1.5">
          <label class="form-label">
            Packing List and Pictures
            <span class="text-slate-400 font-normal normal-case">
              (optional — click + to attach a file, or the camera to take a photo)
            </span>
          </label>

          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-w-md">
            <div v-for="(file, i) in files" :key="i" class="flex flex-col gap-1">
              <div class="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img v-if="file.isImage" :src="file.data" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg class="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <button
                  type="button"
                  @click="removeFile(i)"
                  title="Remove"
                  class="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center text-white bg-brand-600 rounded-full hover:bg-brand-700 transition-colors shadow-sm leading-none text-xs"
                >×</button>
              </div>
              <span class="text-[13px] text-slate-600 text-center leading-tight truncate" :title="file.name">{{ file.name }}</span>
            </div>

            <div class="flex flex-col gap-1">
              <div
                class="relative aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50 transition-colors cursor-pointer flex items-center justify-center"
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
              <span class="text-[13px] text-slate-600 text-center leading-tight">Add file</span>
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
            Images, PDF, Word or Excel · up to {{ MAX_FILE_MB }} MB each<span v-if="files.length">
            · {{ files.length }} attached, {{ formatSize(totalBytes) }} total</span>
          </p>
        </div>

        <div class="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            @click="reset"
            class="px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            @click="submit"
            :disabled="submitting || printing"
            class="px-6 py-3 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ printing ? 'Printing…' : (submitting ? 'Creating…' : 'Create Inbound & Print Label') }}
          </button>
        </div>

        <p class="text-xs text-slate-500 text-right">
          The label prints after the delivery is created — Smartsheet assigns the part number
          on insert, so it cannot be printed before then.
        </p>

        <div v-if="lastPrinted" class="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <p class="font-semibold">Delivery recorded.</p>
          <p class="mt-1 font-mono text-xs">{{ lastPrinted.barcodeValue }}</p>
          <button
            type="button"
            @click="reprintLast"
            :disabled="printing"
            class="mt-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
          >
            {{ printing ? 'Generating…' : 'Reprint this label' }}
          </button>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Label preview</p>

        <div class="label-card">
          <div class="lbl-header">
            <img src="/wms-icon-color.png" alt="WMS" class="lbl-logo" />
            <div class="lbl-title">EQUIPMENT<br>RECEIVING</div>
          </div>

          <div class="lbl-barcode">
            <svg ref="barcodeRef"></svg>
          </div>

          <table class="lbl-fields">
            <tbody>
              <tr>
                <td><span class="f-label">Chemical</span><span class="f-value lead multiline">{{ form.chemical || ' ' }}</span></td>
                <td><span class="f-label">Description</span><span class="f-value lead multiline">{{ form.description || ' ' }}</span></td>
              </tr>
              <tr>
                <td><span class="f-label">Arrival Date</span><span class="f-value">{{ form.arrivalDate || ' ' }}</span></td>
                <td><span class="f-label">Received By</span><span class="f-value">{{ form.receivedBy || ' ' }}</span></td>
              </tr>
              <tr>
                <td><span class="f-label">Supplier</span><span class="f-value desc multiline">{{ form.supplier || ' ' }}</span></td>
                <td><span class="f-label">Container #</span><span class="f-value">{{ form.containerNumber || ' ' }}</span></td>
              </tr>
              <tr>
                <td><span class="f-label">Qty</span><span class="f-value big">{{ labelQuantities[0] || ' ' }}</span></td>
                <td><span class="f-label">Location</span><span class="f-value">{{ form.location || ' ' }}</span></td>
              </tr>
              <tr>
                <td><span class="f-label">Package Type</span><span class="f-value">{{ form.packageType || ' ' }}</span></td>
                <td><span class="f-label">Serial Number</span><span class="f-value">{{ form.serialNumber || ' ' }}</span></td>
              </tr>
              <tr>
                <td colspan="2"><span class="f-label">System</span><span class="f-value">{{ form.system || ' ' }}</span></td>
              </tr>
              <tr>
                <td colspan="2">
                  <span class="f-label">Condition on Arrival</span>
                  <div class="cond-row">
                    <span v-for="opt in nonMoldConditions" :key="opt" class="cond">
                      <span class="box">{{ form.condition === opt ? 'X' : '' }}</span> {{ opt }}
                    </span>
                    <span class="cond-group">
                      <span v-for="opt in moldConditions" :key="opt" class="cond">
                        <span class="box">{{ form.condition === opt ? 'X' : '' }}</span> {{ opt }}
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
            <!-- Preview always shows the first copy, so the sequence reads 1/N. -->
            <span>LABEL: 1/{{ labelQuantities.length || 1 }}</span>
            <span>{{ form.poNumber ? 'PO ' + form.poNumber : '' }}</span>
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
            class="w-24 text-sm border border-slate-200 rounded-lg px-2.5 py-3 text-center focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div class="max-h-40 overflow-y-auto flex flex-col gap-1.5 border border-slate-100 rounded-lg p-2">
          <div v-for="(_, i) in labelQuantities" :key="i" class="flex items-center justify-between gap-2 text-sm">
            <span class="text-slate-500">Mat/Equip Qty {{ i + 1 }}</span>
            <input
              v-model.number="labelQuantities[i]"
              type="number"
              min="1"
              class="w-24 text-sm border border-slate-200 rounded-lg px-2 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        <p class="text-xs text-slate-500 text-center">
          Total: <strong>{{ labelQuantitiesSum }}</strong> of <strong>{{ maxLabelQty || 0 }}</strong> received
        </p>
        <p v-if="labelQtyExceedsMax" class="text-xs text-brand-600 text-center font-semibold">
          Label quantities exceed the quantity received ({{ maxLabelQty }}).
        </p>
        <p v-else-if="maxLabelQty <= 0" class="text-xs text-amber-600 text-center font-semibold">
          Enter a Quantity to enable printing.
        </p>
        <p v-else-if="labelQtyIncomplete" class="text-xs text-amber-600 text-center font-semibold">
          Label quantities must add up to exactly {{ maxLabelQty }} to print.
        </p>

      </div>
      </div>

    </div>

    <ul
      v-if="locationPicklist.show"
      class="location-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: locationPicklist.pos.top + 'px', left: locationPicklist.pos.left + 'px', width: locationPicklist.pos.width + 'px' }"
    >
      <li
        v-for="opt in locationPicklist.filtered"
        :key="opt"
        @mousedown.prevent="locationPicklist.select(opt)"
        class="px-3 py-3 text-sm text-slate-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ opt }}
      </li>
      <li v-if="locationPicklist.filtered.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No match — “{{ form.location }}” will be added as a new location
      </li>
    </ul>

    <!-- Brand dropdown — same growable picklist behaviour as Location -->
    <ul
      v-if="brandPicklist.show"
      class="brand-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: brandPicklist.pos.top + 'px', left: brandPicklist.pos.left + 'px', width: brandPicklist.pos.width + 'px' }"
    >
      <li
        v-for="opt in brandPicklist.filtered"
        :key="opt"
        @mousedown.prevent="brandPicklist.select(opt)"
        class="px-3 py-3 text-sm text-slate-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ opt }}
      </li>
      <li v-if="brandPicklist.filtered.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No match — “{{ form.brand }}” will be added as a new brand
      </li>
    </ul>

    <!-- Chemical dropdown — same growable picklist behaviour as Location and Brand -->
    <ul
      v-if="chemicalPicklist.show"
      class="chemical-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: chemicalPicklist.pos.top + 'px', left: chemicalPicklist.pos.left + 'px', width: chemicalPicklist.pos.width + 'px' }"
    >
      <li
        v-for="opt in chemicalPicklist.filtered"
        :key="opt"
        @mousedown.prevent="chemicalPicklist.select(opt)"
        class="px-3 py-3 text-sm text-slate-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ opt }}
      </li>
      <li v-if="chemicalPicklist.filtered.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No match — “{{ form.chemical }}” will be added as a new chemical
      </li>
    </ul>

    <!-- Location dropdown — floats over the form. Free text is allowed: an unknown value
         is registered as a new picklist option when the delivery is saved. -->
    <ul
      v-if="locationPicklist.show"
      class="location-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: locationPicklist.pos.top + 'px', left: locationPicklist.pos.left + 'px', width: locationPicklist.pos.width + 'px' }"
    >
      <li
        v-for="opt in locationPicklist.filtered"
        :key="opt"
        @mousedown.prevent="locationPicklist.select(opt)"
        class="px-3 py-3 text-sm text-slate-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ opt }}
      </li>
      <li v-if="locationPicklist.filtered.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No match — “{{ form.location }}” will be added as a new location
      </li>
    </ul>

    <!-- Brand dropdown — same growable picklist behaviour as Location -->
    <ul
      v-if="brandPicklist.show"
      class="brand-dropdown fixed z-[500] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
      :style="{ top: brandPicklist.pos.top + 'px', left: brandPicklist.pos.left + 'px', width: brandPicklist.pos.width + 'px' }"
    >
      <li
        v-for="opt in brandPicklist.filtered"
        :key="opt"
        @mousedown.prevent="brandPicklist.select(opt)"
        class="px-3 py-3 text-sm text-slate-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        {{ opt }}
      </li>
      <li v-if="brandPicklist.filtered.length === 0" class="px-3 py-2 text-sm text-slate-400">
        No match — “{{ form.brand }}” will be added as a new brand
      </li>
    </ul>

  </div>

  <!-- Camera capture modal — same widget as the transmittal form's recipient-ID capture. -->
  <Teleport to="body">
    <div v-if="showCamera" class="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl p-4 max-w-md w-full flex flex-col gap-3">
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
  <BusyOverlay :show="busy" :message="busyMessage" />

</template>


<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import BusyOverlay from '../components/BusyOverlay.vue'
import JsBarcode from 'jsbarcode'
import { LAYDOWN_FORM } from '../config/forms.js'
import { buildLaydownPn } from '../config/laydownPn.js'
import { printLabelPdf } from '../composables/useLabelPrint.js'

// Set when rendered as a tab of the Laydown Yard Mini Portal: the hub owns the page
// header, so this view drops its own. Nothing else about the form changes.
defineProps({ embedded: { type: Boolean, default: false } })

const API = '/api/rosegarden'
// Shared catalogue API (Paco's): the form reads location/brand/chemical/system from here and
// registers any new growable value here before submitting.
const CATALOGUES = '/api/catalogues'
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

// Human labels for the "missing fields" message — the raw keys would be unreadable.
const FIELD_LABELS = {
  arrivalDate: 'Arrival Date', arrivalTime: 'Arrival Time', trackingNumber: 'Tracking Number',
  receivedBy: 'Received By', deliveryCompany: 'Delivery Company / Carrier',
  supplier: 'Supplier Information', poNumber: 'PO Number', serialNumber: 'Serial Number',
  system: 'System', warehouse: 'Warehouse', packageType: 'Package Type', condition: 'Condition on Arrival',
  comments: 'Comments', qty: 'Quantity', location: 'Location', description: 'Description', chemical: 'Chemical',
  containerNumber: 'Container #', micPartNumber: 'MIC Part Number', brand: 'Brand',
  type: 'Type', origin: 'Origin',
}

const OPTIONAL_FIELDS = ['comments', 'supplier', 'trackingNumber']

const EMPTY_FORM = {
  arrivalDate:    '',
  arrivalTime:    '',
  trackingNumber:  '',
  receivedBy:      '',
  deliveryCompany: '',
  supplier:        '',
  poNumber:        '',
  serialNumber:    '',
  system:          '',
  warehouse:       'Laydown Yard',
  packageType:     '',
  condition:       '',
  comments:        '',
  qty:             '',
  location:        '',
  description:     '',
  chemical:        '',
  containerNumber: '',
  micPartNumber:   '',
  brand:           '',
  type:            '',
  origin:          '',
}

const form       = reactive({ ...EMPTY_FORM })
const files      = ref([])
const options    = ref({})
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
const submitting = ref(false)
const printing   = ref(false)
const labelCount = ref(1)
const labelQuantities = ref([1])

const maxLabelQty = computed(() => Number(form.qty) || 0)
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
const fileInput  = ref(null)
const totalBytes = computed(() => files.value.reduce((sum, f) => sum + f.size, 0))

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

async function onFilesPicked(event) {
  const picked = [...event.target.files]
  for (const file of picked) {
    if (!isAcceptedFile(file)) {
      showToast(`${file.name} is not an image, PDF, Word or Excel file.`, 'error')
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast(`${file.name} is ${formatSize(file.size)}, over the ${MAX_FILE_MB} MB limit.`, 'error')
      continue
    }
    try {
      files.value.push({
        name:    file.name,
        size:    file.size,
        isImage: file.type.startsWith('image/'),
        data:    await readAsDataUrl(file),
      })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }
  event.target.value = ''
}
function createGrowablePicklist(field) {
  const show = ref(false)
  const pos  = ref({ top: 0, left: 0, width: 0 })
  let anchorEl = null

  const filtered = computed(() => {
    const all = options.value[field] ?? []
    const q = String(form[field] ?? '').trim().toLowerCase()
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
    form[field] = event.target.value
    open(event)
  }

  function select(option) {
    form[field] = option
    close()
  }

  function close() {
    show.value = false
    anchorEl = null
  }

  return reactive({ show, pos, filtered, reposition, open, onInput, select, close })
}

const locationPicklist = createGrowablePicklist('location')
const brandPicklist    = createGrowablePicklist('brand')
const chemicalPicklist = createGrowablePicklist('chemical')

function onDocumentClick(event) {
  if (!event.target.closest('.chemical-dropdown-cell, .chemical-dropdown')) chemicalPicklist.close()
  if (!event.target.closest('.location-dropdown-cell, .location-dropdown')) locationPicklist.close()
  if (!event.target.closest('.brand-dropdown-cell, .brand-dropdown')) brandPicklist.close()
}

const barcodeRef = ref(null)
const useAutoPartNumber = ref(false)

// Only feeds the preview. The label itself prints after saving, with the number Smartsheet
// actually assigned, so a prediction that drifts never reaches paper.
const predictedPn = ref('')

async function loadPredictedPn() {
  if (!useAutoPartNumber.value) return
  try {
    const res = await fetch(`${API}/next-id`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to read the next part number')
    const { nextId } = await res.json()
    predictedPn.value = buildLaydownPn(nextId)
  } catch {
    predictedPn.value = ''
    console.warn('[LaydownForm] Could not predict the next part number')
  }
}

watch(useAutoPartNumber, value => { if (value) loadPredictedPn() })

const barcodeValue = computed(() => {
  if (useAutoPartNumber.value) {
    return predictedPn.value
  }
  return String(form.micPartNumber ?? '').trim()
})

const usedMicPartNumbers = ref(new Map())

async function loadUsedMicPartNumbers() {
  try {
    const res = await fetch(`${API}/mic-part-numbers`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to load MIC part numbers')
    usedMicPartNumbers.value = new Map(Object.entries(await res.json()))
  } catch {
    console.warn('[LaydownForm] Could not load existing MIC part numbers')
  }
}

const micPartNumberConflict = computed(() => {
  const key = String(form.micPartNumber ?? '').trim().toUpperCase()
  if (!key) return null
  return usedMicPartNumbers.value.get(key) ?? null
})

const micPartNumberConflictLabel = computed(() => {
  const holder = micPartNumberConflict.value
  if (!holder) return ''
  const material = [holder.chemical, holder.micPartNumber, holder.description].filter(Boolean).join(' · ')
  return holder.isSetUnit ? `${material} (set unit)` : material
})

const conditionOptions = computed(() => {
  const fromSheet = options.value.condition ?? []
  if (fromSheet.length) return fromSheet
  return form.condition ? [form.condition] : []
})

const isMoldOption = opt => String(opt ?? '').trim().toLowerCase() === 'mold'
const moldConditions = computed(() => conditionOptions.value.filter(isMoldOption))
const nonMoldConditions = computed(() => conditionOptions.value.filter(o => !isMoldOption(o)))

function drawBarcode(target, value) {
  if (!target) return
  const v = String(value ?? '').trim()
  if (!v) { target.innerHTML = ''; return }
  try {
    JsBarcode(target, v, { format: 'CODE39', width: 2, height: 60, displayValue: true, margin: 0 })
  } catch (e) {
    console.error('[LaydownForm] JsBarcode failed for', JSON.stringify(v), e)
    target.innerHTML = ''
  }
}

watch(barcodeValue, async (value) => {
  await nextTick()
  drawBarcode(barcodeRef.value, value)
}, { immediate: true })

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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

function dataUrlBytes(dataUrl) {
  const base64 = String(dataUrl).slice(String(dataUrl).indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor(base64.length * 3 / 4) - padding)
}

function capturePhoto() {
  const video = cameraVideo.value
  if (!video) return
  const canvas = document.createElement('canvas')
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  const data = canvas.toDataURL('image/png')
  files.value.push({
    name:    `photo-${Date.now()}.png`,
    size:    dataUrlBytes(data),
    isImage: true,
    data,
  })
  closeCamera()
}

function removeFile(index) {
  files.value.splice(index, 1)
}

function reset() {
  Object.assign(form, EMPTY_FORM)
  files.value = []
  if (fileInput.value) fileInput.value.value = ''
}

function buildLabelPayload(code) {
  return {
    ...form,
    barcodeValue: code,
    quantities: labelQuantities.value.map(q => Number(q) || 0),
    conditionOptions: conditionOptions.value.map(opt => ({
      label: opt,
      checked: opt === form.condition,
    })),
    footerText: form.poNumber ? `PO ${form.poNumber}` : '',
    fileName: `laydown-${code}`,
  }
}

function labelCodeFor(saved) {
  const mic = String(form.micPartNumber ?? '').trim()
  if (useAutoPartNumber.value) return saved?.partNumber || mic
  return mic || saved?.partNumber || ''
}

const lastPrinted = ref(null)

async function printLabel(payload) {
  printing.value = true
  try {
    await printLabelPdf(payload, 'laydown')
  } catch (err) {
    showToast(
      `The delivery was recorded as ${payload.barcodeValue}, but its label did not print (${err.message}) — reprint it below or from Reprint Labels.`,
      'error'
    )
  } finally {
    printing.value = false
  }
}

function reprintLast() {
  if (lastPrinted.value) printLabel(lastPrinted.value)
}

// Register a new growable value (location/brand/chemical) in the shared catalogue before the
// delivery is recorded. A value already on the list is skipped; a duplicate (409) is harmless.
async function ensureCatalogue(path, bodyField, optionKey, value) {
  const v = String(value ?? '').trim()
  if (!v || (options.value[optionKey] ?? []).includes(v)) return
  await fetch(`${CATALOGUES}/rosegarden/${path}`, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ [bodyField]: v }),
  }).catch(() => {}) // the delivery POST validates the catalogue anyway
}

async function submit() {
  const requiredFields = Object.keys(EMPTY_FORM).filter(field => {
    if (useAutoPartNumber.value && field === 'micPartNumber') {
      return false
    }
    return !OPTIONAL_FIELDS.includes(field)
  })

  const missing = requiredFields.filter(field => !String(form[field] ?? '').trim())
  if (missing.length) {
    const names = missing.map(k => FIELD_LABELS[k] ?? k)
    showToast(
      names.length > 3
        ? `${names.length} fields are still empty, starting with ${names.slice(0, 3).join(', ')}.`
        : `Please fill in ${names.join(', ')}.`,
      'warning'
    )
    return
  }

  if (micPartNumberConflict.value) {
    showToast(
      `MIC Part Number is already used by ${micPartNumberConflictLabel.value}. It has to be unique — the barcode encodes it.`,
      'error'
    )
    return
  }

  const oversized = files.value.find(f => f.size > MAX_FILE_BYTES)
  if (oversized) {
    showToast(`${oversized.name} is over the ${MAX_FILE_MB} MB limit. Remove it before submitting.`, 'error')
    return
  }

  if (labelQtyIncomplete.value) {
    showToast(maxLabelQty.value <= 0
      ? 'Enter a Quantity before creating the delivery.'
      : `Label quantities must add up to exactly ${maxLabelQty.value}.`, 'warning')
    return
  }

  submitting.value = true
  try {
    // New location/brand/chemical are registered through the catalogue API first.
    await Promise.all([
      ensureCatalogue('locations', 'locationName', 'location', form.location),
      ensureCatalogue('brands',    'brand',        'brand',    form.brand),
      ensureCatalogue('chemicals', 'chemical',     'chemical', form.chemical),
    ])

    const res = await fetch(`${API}/materials`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        files: files.value,
        barcodeSource: useAutoPartNumber.value ? 'auto' : 'mic',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 409 && data.conflict) {
        usedMicPartNumbers.value.set(String(form.micPartNumber ?? '').trim().toUpperCase(), data.conflict)
      }
      throw new Error(data.message || 'Failed to record delivery.')
    }

    showToast(data.message || 'Delivery recorded.')

    const code = labelCodeFor(data)
    if (code) {
      lastPrinted.value = buildLabelPayload(code)
      await printLabel(lastPrinted.value)
    } else {
      showToast('The delivery was recorded, but no code came back for its label — print it from Reprint Labels.', 'warning')
    }

    reset()
    loadUsedMicPartNumbers()
    loadPredictedPn()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  window.addEventListener('scroll', chemicalPicklist.reposition, true)
  window.addEventListener('scroll', locationPicklist.reposition, true)
  window.addEventListener('scroll', brandPicklist.reposition, true)
  window.addEventListener('resize', chemicalPicklist.reposition)
  window.addEventListener('resize', locationPicklist.reposition)
  window.addEventListener('resize', brandPicklist.reposition)
  document.addEventListener('click', onDocumentClick)

  loadUsedMicPartNumbers()

  try {
    const jsonOr = (fallback) => (res) => (res.ok ? res.json() : fallback)
    const [opts, locations, brands, chemicals, systems] = await Promise.all([
      fetch(`${API}/options`,                    { credentials: 'include' }).then(jsonOr({})),
      fetch(`${CATALOGUES}/rosegarden/locations`, { credentials: 'include' }).then(jsonOr([])),
      fetch(`${CATALOGUES}/rosegarden/brands`,    { credentials: 'include' }).then(jsonOr([])),
      fetch(`${CATALOGUES}/rosegarden/chemicals`, { credentials: 'include' }).then(jsonOr([])),
      fetch(`${CATALOGUES}/systems`,              { credentials: 'include' }).then(jsonOr([])),
    ])
    options.value = {
      ...opts, // condition, origin, packageType, type
      location: locations.map(x => x.locationName).filter(Boolean),
      brand:    brands.map(x => x.brand).filter(Boolean),
      chemical: chemicals.map(x => x.chemical).filter(Boolean),
      system:   systems.map(x => x.systemName).filter(Boolean),
    }
  } catch {
    // nothing personnel kid, huh (nothing to worry here)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', chemicalPicklist.reposition, true)
  window.removeEventListener('scroll', locationPicklist.reposition, true)
  window.removeEventListener('scroll', brandPicklist.reposition, true)
  window.removeEventListener('resize', chemicalPicklist.reposition)
  window.removeEventListener('resize', locationPicklist.reposition)
  window.removeEventListener('resize', brandPicklist.reposition)
  document.removeEventListener('click', onDocumentClick)
  // Leaving the tab with the modal open would keep the camera light on until reload.
  cameraStream?.getTracks().forEach(track => track.stop())
})

const busy = computed(() => submitting.value || printing.value)

const busyMessage = computed(() => {
  if (printing.value) return 'Generating the label…'
  return 'Creating the delivery…'
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
