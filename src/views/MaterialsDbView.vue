<template>
  <div class="max-w-screen-2xl mx-auto space-y-5">

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

    <!-- Header -->
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div v-if="!embedded">
        <h1 class="text-xl font-bold text-slate-800">Materials List</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Browse the Pinnacle Peak materials database, set each item's picture and manage its files.
        </p>
      </div>
      <p v-else class="text-sm text-slate-500">
        Browse the Pinnacle Peak materials database, set each item's picture and manage its files.
      </p>

      <button
        type="button"
        @click="loadRecords"
        :disabled="loading"
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div class="flex gap-3 flex-wrap items-end">
        <div class="flex-1 min-w-[240px]">
          <label class="form-label">Search</label>
          <input
            v-model="search"
            type="text"
            placeholder="TPN, description, MIC part number, brand, supplier…"
            class="form-input"
          />
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">Category</label>
          <select v-model="categoryFilter" class="form-input">
            <option value="">All categories</option>
            <option v-for="option in categoryOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">Location</label>
          <select v-model="locationFilter" class="form-input">
            <option value="">All locations</option>
            <option v-for="option in locationOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">System</label>
          <select v-model="systemFilter" class="form-input">
            <option value="">All systems</option>
            <option v-for="option in systemOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="min-w-[160px]">
          <label class="form-label">Warehouse</label>
          <select v-model="warehouseFilter" class="form-input">
            <option value="">All warehouses</option>
            <option v-for="option in warehouseOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <label class="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-slate-50">
          <input v-model="onlyMissingPicture" type="checkbox" class="accent-brand-600 w-4 h-4" />
          <span class="text-sm text-slate-700 whitespace-nowrap">Missing picture</span>
        </label>
      </div>

      <p class="text-xs text-slate-500">
        Showing {{ filtered.length.toLocaleString() }} of {{ records.length.toLocaleString() }} materials.
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

      <div class="overflow-x-auto">
        <table class="w-full min-w-[1900px] text-sm">
          <thead>
            <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th
                v-for="col in columns"
                :key="col.key"
                class="px-3 py-3 whitespace-nowrap"
                :class="[
                  col.kind === 'number' ? 'text-right' : 'text-left',
                  col.kind === 'image' ? 'w-[84px]' : 'cursor-pointer select-none hover:text-slate-700',
                  col.key === 'TPN' ? 'sticky-tpn bg-slate-50' : '',
                ]"
                @click="col.kind !== 'image' && toggleSort(col.field)"
              >
                {{ col.label }}{{ col.kind === 'image' ? '' : sortIndicator(col.field) }}
              </th>
              <th class="px-3 py-3 text-center cursor-pointer select-none hover:text-slate-700" @click="toggleSort('attachmentCount')">Files{{ sortIndicator('attachmentCount') }}</th>
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
              <td
                v-for="col in columns"
                :key="col.key"
                class="px-3 py-2"
                :class="cellClass(col, record)"
              >
                <!-- Lazy so a 200-row page does not queue 200 image requests up front -->
                <template v-if="col.kind === 'image'">
                  <img
                    v-if="record[col.field] && imageUrls[record[col.field].id]"
                    :src="imageUrls[record[col.field].id]"
                    :alt="record[col.field].altText || record.tpn"
                    loading="lazy"
                    decoding="async"
                    @click.stop="openImage(record, col)"
                    class="w-14 h-14 object-cover rounded-lg border border-slate-200 bg-white cursor-zoom-in hover:border-brand-300 transition-colors"
                  />
                  <div
                    v-else
                    class="w-14 h-14 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300"
                  >
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                </template>

                <template v-else-if="col.kind === 'number'">
                  {{ formatQty(record[col.field]) }}
                </template>

                <template v-else-if="col.key === 'CATEGORY'">
                  <span
                    v-if="record.category"
                    :class="NEUTRAL_PILL"
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                  >
                    {{ record.category }}
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </template>

                <!-- The colour is on the cell itself, so the whole column reads as a status
                     band down the table. -->
                <template v-else-if="col.key === 'INVENTORY_STATUS'">
                  {{ record.inventoryStatus || '—' }}
                </template>

                <template v-else-if="col.key === 'DESCRIPTION_1' || col.key === 'DESCRIPTION_2'">
                  <div class="truncate" :title="record[col.field]">{{ record[col.field] || '—' }}</div>
                </template>

                <template v-else>
                  {{ record[col.field] || '—' }}
                </template>
              </td>

              <td class="px-3 py-2 text-center">
                <span
                  v-if="record.attachmentCount"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  {{ record.attachmentCount }}
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>

              <!-- Pinned to the right edge: the table is ~1900px wide, and reaching Adjustments
                   meant scrolling the whole way across and losing sight of the row. -->
              <td class="sticky-actions px-3 py-2 text-center bg-white group-hover:bg-slate-50 transition-colors">
                <!-- .stop so the row click underneath does not also open the drawer -->
                <button
                  type="button"
                  @click.stop="openAdjustment(record)"
                  class="px-2.5 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Adjustments
                </button>
              </td>
            </tr>

            <tr v-if="!loading && filtered.length === 0">
              <td :colspan="columns.length + 2" class="px-5 py-10 text-center text-slate-400 text-sm">
                No materials match these filters.
              </td>
            </tr>

            <tr v-if="loading">
              <td :colspan="columns.length + 2" class="px-5 py-10">
                <div class="flex items-center justify-center gap-2.5 text-sm text-slate-400">
                  <svg class="animate-spin h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Loading the catalog…
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
        <!-- The backdrop dims but does not close. The panel holds editable fields, and a stray
             click on the table behind it should never be able to throw away an edit. -->
        <div class="absolute inset-0 bg-slate-900/40" />

        <div class="relative w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Material</p>
              <h2 class="text-lg font-bold text-slate-800 truncate">{{ detail.tpn || 'Untitled' }}</h2>
              <p class="text-sm text-slate-500 truncate">{{ detail.description2 || detail.description1 || '—' }}</p>
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
              <h3 class="text-sm font-semibold text-slate-700">Picture</h3>

              <div class="flex items-start gap-4">
                <img
                  v-if="detail.picture && imageUrls[detail.picture.id]"
                  :src="imageUrls[detail.picture.id]"
                  :alt="detail.tpn"
                  @click="openImage(detail, { field: 'picture', label: 'Picture' })"
                  class="w-32 h-32 object-cover rounded-xl border border-slate-200 bg-white cursor-zoom-in hover:border-brand-300 transition-colors"
                />
                <div
                  v-else
                  class="w-32 h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300"
                >
                  <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>

                <div class="flex-1 space-y-2">
                  <p class="text-xs text-slate-500">
                    This is the image the material is shown with. Uploading replaces the current one.
                  </p>
                  <label class="inline-block px-3 py-2 text-sm font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 cursor-pointer transition-colors">
                    {{ detail.picture ? 'Replace picture' : 'Upload picture' }}
                    <input type="file" accept="image/*" class="hidden" @change="onPictureSelected" />
                  </label>
                </div>
              </div>
            </section>

            <!-- Quantities -->
            <section class="space-y-3">
              <h3 class="text-sm font-semibold text-slate-700">Quantities</h3>

              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Qty on Hand</p>
                  <p class="text-2xl font-bold mt-0.5" :class="qtyOnHandTextClass(detail.qtyOnHand)">
                    {{ formatQty(detail.qtyOnHand) }}
                  </p>
                </div>
                <div class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Inventory</p>
                  <p class="text-2xl font-bold text-slate-700 mt-0.5">{{ formatQty(detail.totalInventory) }}</p>
                </div>
              </div>

              <p class="text-xs text-slate-400">
                Both are formula columns in Smartsheet, calculated from the inbound and outbound
                movements. They cannot be edited here.
              </p>
            </section>

            <!-- Details -->
            <section class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-slate-700">Details</h3>
                <span v-if="detailsDirty" class="text-xs font-semibold text-amber-700">Unsaved changes</span>
              </div>

              <form @submit.prevent="saveDetails" class="space-y-3">
                <div class="flex flex-col gap-1.5">
                  <label class="form-label">TPN</label>
                  <p class="px-3 py-2.5 text-sm text-slate-400 bg-gray-50 border border-gray-200 rounded-lg">{{ detail.tpn || '—' }}</p>
                  <p class="text-xs text-slate-400">Assigned at the moment of creation, non-editable.</p>
                </div>

                <div v-for="field in DETAIL_FIELDS" :key="field.key" class="flex flex-col gap-1.5">
                  <label class="form-label">{{ field.label }}</label>
                  <textarea
                    v-if="field.key === 'remark'"
                    v-model="edit[field.key]"
                    rows="2"
                    class="form-input"
                  ></textarea>

                  <!-- Location holds several values: chips plus a search box, as on the intake form -->
                  <div
                    v-else-if="field.key === 'location'"
                    class="form-input flex flex-wrap items-center gap-1.5 cursor-text min-h-[48px]"
                    @click="locationInputEl?.focus()"
                  >
                    <span
                      v-for="loc in editLocations"
                      :key="loc"
                      class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1.5 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-md"
                    >
                      {{ loc }}
                      <button
                        type="button"
                        @click.stop="removeLocation(loc)"
                        class="w-6 h-6 flex items-center justify-center text-brand-400 hover:text-brand-600 hover:bg-brand-100 rounded leading-none text-base"
                      >×</button>
                    </span>
                    <!-- Function ref: a string ref inside this v-for would come back as an array -->
                    <input
                      :ref="el => (locationInputEl = el)"
                      v-model="locationSearch"
                      type="text"
                      autocomplete="off"
                      :placeholder="editLocations.length ? '' : 'Search locations…'"
                      class="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
                      @focus="openSuggestions('location', $event)"
                      @input="openSuggestions('location', $event)"
                      @blur="closeSuggestionsSoon"
                      @keydown.escape="closeSuggestions"
                      @keydown.backspace="onLocationBackspace"
                      @keydown.enter.prevent="addTypedLocation"
                    />
                  </div>

                  <input
                    v-else
                    v-model="edit[field.key]"
                    type="text"
                    autocomplete="off"
                    class="form-input"
                    @focus="openSuggestions(field.key, $event)"
                    @input="openSuggestions(field.key, $event)"
                    @blur="closeSuggestionsSoon"
                    @keydown.escape="closeSuggestions"
                  />
                </div>

                <div v-if="detailsError" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  {{ detailsError }}
                </div>

                <div class="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    :disabled="!detailsDirty"
                    @click="resetDetails"
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

            <!-- Attachments -->
            <section class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-slate-700">Attachments</h3>
                <label class="px-3 py-1.5 text-sm font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 cursor-pointer transition-colors">
                  Add files
                  <input type="file" multiple class="hidden" @change="onFilesSelected" />
                </label>
              </div>

              <div v-if="attachmentsLoading" class="flex items-center gap-2 text-sm text-slate-400">
                <svg class="animate-spin h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Loading attachments…
              </div>

              <p v-else-if="attachments.length === 0" class="text-sm text-slate-400">
                No files attached to this material yet.
              </p>

              <ul v-else class="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                <li
                  v-for="attachment in attachments"
                  :key="attachment.id"
                  class="flex items-center gap-3 px-4 py-2.5"
                >
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-700 truncate" :title="attachment.name">
                      {{ attachment.name }}
                    </p>
                    <p class="text-xs text-slate-400">
                      {{ attachment.sizeInKb ? `${attachment.sizeInKb} KB` : '' }}
                      <span v-if="attachment.createdBy"> · {{ attachment.createdBy }}</span>
                    </p>
                  </div>

                  <!-- An image opens in the viewer, in place. Anything else still needs the
                       browser: a tab renders a PDF far better than anything built here. -->
                  <button
                    v-if="isImageAttachment(attachment)"
                    type="button"
                    @click="openAttachmentImage(attachment)"
                    class="shrink-0 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    View
                  </button>

                  <!-- Plain link, not fetch(): the browser handles the tab and the save
                       dialog itself, and the session cookie rides along on same-origin. -->
                  <a
                    v-else-if="isViewable(attachment)"
                    :href="attachmentUrl(attachment)"
                    target="_blank"
                    rel="noopener"
                    class="shrink-0 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    View
                  </a>

                  <a
                    :href="attachmentUrl(attachment, { download: true })"
                    class="shrink-0 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Download
                  </a>

                  <button
                    type="button"
                    @click="removeAttachment(attachment)"
                    class="shrink-0 px-2.5 py-1 text-xs font-semibold text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    Delete
                  </button>
                </li>
              </ul>

              <p class="text-xs text-slate-400">
                Images, PDF, Word and Excel files up to {{ MAX_ATTACHMENT_MB }} MB each.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Suggestions for the detail inputs - fixed and teleported, since the drawer scrolls -->
    <Teleport to="body">
      <ul
        v-if="suggest.field && suggestions.length"
        class="fixed z-[600] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
        :style="{ top: suggest.top + 'px', left: suggest.left + 'px', width: suggest.width + 'px' }"
      >
        <!-- Location picks several values, so its rows carry a checkbox and stay listed once
             ticked. pointer-events-none on the box: the row's mousedown does the toggling. -->
        <li
          v-for="option in suggestions"
          :key="option"
          @mousedown.prevent="pickSuggestion(option)"
          class="text-sm text-slate-700 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-b-0"
          :class="suggest.field === 'location' ? 'flex items-center gap-2 px-3 py-3.5' : 'px-3 py-2'"
        >
          <input
            v-if="suggest.field === 'location'"
            type="checkbox"
            :checked="editLocations.includes(option)"
            class="accent-brand-600 w-5 h-5 pointer-events-none"
          />
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
              <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Material</p>
              <p class="text-sm font-semibold text-slate-800">{{ adjustment.record.tpn }}</p>
              <p class="text-sm text-slate-500">{{ adjustment.record.description2 || adjustment.record.description1 || '—' }}</p>
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
              <label class="form-label">Quantity <span class="label-zh">{{ adjustment.record.unit }}</span></label>
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
                <p class="text-2xl font-bold text-slate-800 mt-0.5">
                  <span v-if="adjustment.stock === null" class="text-slate-300">…</span>
                  <template v-else>{{ adjustment.stock.toLocaleString() }}</template>
                </p>
              </div>
              <div class="rounded-xl border px-4 py-3" :class="afterIsNegative ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-slate-50'">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">After adjustment</p>
                <p class="text-2xl font-bold mt-0.5" :class="afterIsNegative ? 'text-brand-600' : 'text-slate-800'">
                  {{ adjustmentAfter === null ? '—' : adjustmentAfter.toLocaleString() }}
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="form-label">Remarks <span class="text-slate-400 font-normal">(optional)</span></label>
              <textarea v-model="adjustment.remarks" rows="2" placeholder="Reason for the adjustment…" class="form-input"></textarea>
            </div>

            <div v-if="afterIsNegative" class="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-4 py-3">
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
import ImageViewer from '../components/ImageViewer.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { NEUTRAL_PILL, QTY_ON_HAND_CELL, QTY_ON_HAND_EMPTY_CELL, inventoryStatusClass } from '../config/statusColors.js'

defineProps({ embedded: { type: Boolean, default: false } })

const MAX_ATTACHMENT_MB = 25

const PAGE_SIZES = [10, 25, 50, 100, 200]
const DEFAULT_PAGE_SIZE = 25
const PAGE_SIZE_KEY = 'materialsDb.pageSize'

// Remembered per browser - it is a viewing preference, not data anyone else needs. Reads can
// throw outright in a private window or with site data blocked, so both sides are guarded.
function storedPageSize() {
  try {
    const saved = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return PAGE_SIZES.includes(saved) ? saved : DEFAULT_PAGE_SIZE
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

const records = ref([])
const columns = ref([])
// Signed URLs for every cell image on screen, Picture and Barcode alike, keyed by image id.
const imageUrls = ref({})

// Full-size URLs are cached apart from the thumbnails: same image ids, different signed URLs,
// and mixing them would put a 160px thumbnail in the viewer.
const fullImageUrls = ref({})
const viewer = reactive({ show: false, src: '', title: '', subtitle: '', loading: false })

// window.confirm blocks the tab and looks nothing like the app. This wraps ConfirmModal, which
// is event based, in the promise shape the call sites want.
const confirmDialog = reactive({
  show: false,
  title: '',
  message: '',
  confirmLabel: 'Yes',
  cancelLabel: 'No',
  destructive: false,
})
let settlePendingConfirm = null

function askConfirm(options) {
  // Any dialog still waiting is answered No, so its caller never hangs.
  settlePendingConfirm?.(false)

  Object.assign(confirmDialog, {
    confirmLabel: 'Yes',
    cancelLabel: 'No',
    destructive: false,
  }, options, { show: true })

  return new Promise(resolve => { settlePendingConfirm = resolve })
}

function settleConfirm(answer) {
  confirmDialog.show = false
  const resolve = settlePendingConfirm
  settlePendingConfirm = null
  resolve?.(answer)
}
const loading = ref(false)
const error = ref('')

const busy = ref(false)
const busyMessage = ref('Working…')
const toast = ref(null)

const search = ref('')
const categoryFilter = ref('')
const locationFilter = ref('')
const systemFilter = ref('')
const warehouseFilter = ref('')
const onlyMissingPicture = ref(false)
const page = ref(1)
const pageSize = ref(storedPageSize())

const detail = ref(null)
const attachments = ref([])
const attachmentsLoading = ref(false)

// null while closed; a plain object while open, so the template unwraps its fields directly.
const adjustment = ref(null)

const adjustmentDelta = computed(() => {
  const n = Number(adjustment.value?.quantity)
  return Number.isFinite(n) && n > 0 ? n : null
})

const adjustmentAfter = computed(() => {
  if (!adjustment.value || adjustmentDelta.value === null || adjustment.value.stock === null) return null
  const signed = adjustment.value.direction === 'negative' ? -adjustmentDelta.value : adjustmentDelta.value
  return adjustment.value.stock + signed
})

const afterIsNegative = computed(() => adjustmentAfter.value !== null && adjustmentAfter.value < 0)

const canSubmitAdjustment = computed(() =>
  adjustmentDelta.value !== null && adjustment.value?.stock !== null && !afterIsNegative.value && !busy.value
)

async function openAdjustment(record) {
  // stock starts null and is filled from the ledger: the figure in the table is a sheet
  // formula that can lag behind by however long since someone last opened the sheet.
  // reactive() first, then mutate that: writing to the plain object after assigning it to
  // the ref reaches the data but never triggers a render, so the figure stays on "…".
  const current = reactive({ record, direction: 'positive', quantity: '', remarks: '', error: '', stock: null })
  adjustment.value = current

  try {
    const res = await fetch(`/api/materials-db/${record.rowId}/stock`, { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to read the stock.')
    // The modal may have been closed and reopened on another row while this was in flight
    if (adjustment.value !== current) return
    current.stock = Number(data.totalInventory) || 0
  } catch (e) {
    if (adjustment.value === current) current.error = e.message
  }
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
    const res = await fetch(`/api/materials-db/${current.record.rowId}/adjustments`, {
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
    showToast(data.message)
    // The totals are sheet formulas over the ledger, so the truthful figure comes from a
    // fresh read rather than from patching the row with the number we expect.
    await loadRecords()
  } catch (e) {
    current.error = e.message
  } finally {
    busy.value = false
  }
}

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3500)
}

function formatQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value ? String(value) : '—'
  return n.toLocaleString()
}

function cellClass(col, record) {
  if (col.kind === 'image') return ''

  if (col.kind === 'number') {
    const base = 'text-right whitespace-nowrap'
    if (col.key === 'QTY_ON_HAND') return `${base} font-semibold border-y ${qtyOnHandClass(record.qtyOnHand)}`
    return `${base} text-slate-600`
  }

  if (col.key === 'INVENTORY_STATUS') {
    const colors = inventoryStatusClass(record.inventoryStatus)
    if (!colors) return 'text-slate-600 whitespace-nowrap'
    return `${colors} border-y font-semibold whitespace-nowrap`
  }

  if (col.key === 'TPN') return 'sticky-tpn bg-white group-hover:bg-slate-50 transition-colors font-semibold text-slate-800 whitespace-nowrap'
  if (col.key === 'DESCRIPTION_1' || col.key === 'DESCRIPTION_2') return 'text-slate-700 max-w-[280px]'
  return 'text-slate-600 whitespace-nowrap'
}

// Text-only variant for the drawer tile, which already sits on its own card.
function qtyOnHandTextClass(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'text-slate-400'
  if (n <= 0) return 'text-brand-700'
  return 'text-blue-900'
}

// Blue band as the resting state, red once there is nothing left to give. Keeping the shortage
// in the number itself matters: the Inventory Status column can be scrolled out of view.
function qtyOnHandClass(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'text-slate-400'
  if (n <= 0) return QTY_ON_HAND_EMPTY_CELL
  return QTY_ON_HAND_CELL
}

// Options come from the data rather than the sheet's picklists, so a filter can never offer
// a value that matches nothing.
function optionsFrom(field) {
  const seen = new Set()
  for (const record of records.value) {
    const value = String(record[field] ?? '').trim()
    if (value) seen.add(value)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

const categoryOptions = computed(() => optionsFrom('category'))
const locationOptions = computed(() => optionsFrom('location'))
const systemOptions = computed(() => optionsFrom('system'))
const warehouseOptions = computed(() => optionsFrom('warehouse'))

const SEARCH_FIELDS = ['tpn', 'micPartNumber', 'description1', 'description2', 'type', 'spec', 'brand', 'supplier']

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()

  return records.value.filter(record => {
    if (categoryFilter.value && record.category !== categoryFilter.value) return false
    if (locationFilter.value && record.location !== locationFilter.value) return false
    if (systemFilter.value && record.system !== systemFilter.value) return false
    if (warehouseFilter.value && record.warehouse !== warehouseFilter.value) return false
    if (onlyMissingPicture.value && record.picture) return false

    if (!query) return true
    return SEARCH_FIELDS.some(field => String(record[field] ?? '').toLowerCase().includes(query))
  })
})

const sortKey = ref(null)
const sortDir = ref('asc')

// Quantities arrive as strings from Smartsheet; compared as text, 9 would sort after 1000.
// Derived from the column descriptors so a numeric column added to the map sorts as a number
// rather than as text, where "9" lands after "10".
const NUMERIC_KEYS = computed(() => {
  const keys = new Set(['attachmentCount'])
  for (const col of columns.value) {
    if (col.kind === 'number') keys.add(col.field)
  }
  return keys
})

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

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

// Blank cells go last whichever way the column is sorted. Sorting Qty on Hand descending
// is asking for the stock, not for the hundreds of rows with no figure at all.
function compareRecords(a, b, key, dir) {
  const av = a[key]
  const bv = b[key]
  const aBlank = isBlank(av)
  const bBlank = isBlank(bv)
  if (aBlank && bBlank) return 0
  if (aBlank) return 1
  if (bBlank) return -1

  if (NUMERIC_KEYS.value.has(key)) {
    return (Number(av) - Number(bv)) * dir
  }

  // numeric: true keeps TPN-US0009 ahead of TPN-US0010
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir
}

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) => compareRecords(a, b, key, dir))
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const pageRecords = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sorted.value.slice(start, start + pageSize.value)
})

const rangeStart = computed(() => (page.value - 1) * pageSize.value + 1)
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, filtered.value.length))

// ----- Editable details -----
// `suggestions` names the list from /api/inbound/materials-picklists that feeds the field,
// the same source the intake form autocompletes from. Remark has no list.
const DETAIL_FIELDS = [
  { key: 'micPartNumber', label: 'MIC Part Number', suggestions: 'micPartNumbers' },
  { key: 'description1', label: 'Description 1', suggestions: 'descriptions1' },
  { key: 'description2', label: 'Description 2', suggestions: 'descriptions2' },
  { key: 'type', label: 'Type', suggestions: 'types' },
  { key: 'spec', label: 'Spec', suggestions: 'specs' },
  { key: 'unit', label: 'Unit', suggestions: 'units' },
  { key: 'location', label: 'Location', suggestions: 'locations' },
  { key: 'brand', label: 'Brand', suggestions: 'brands' },
  { key: 'category', label: 'Category', suggestions: 'categories' },
  { key: 'supplier', label: 'Supplier', suggestions: 'suppliers' },
  { key: 'remark', label: 'Remark', suggestions: null },
]

const picklists = ref({})
const edit = reactive({})
const detailsError = ref('')

async function loadPicklists() {
  try {
    const res = await fetch('/api/inbound/materials-picklists', { credentials: 'include' })
    if (res.ok) picklists.value = await res.json()
  } catch {
    // Inputs still work as plain text without suggestions
  }
}

function resetDetails() {
  detailsError.value = ''
  locationSearch.value = ''
  for (const field of DETAIL_FIELDS) {
    edit[field.key] = String(detail.value?.[field.key] ?? '')
  }
}

// ----- Location: several values in one text cell -----
// The sheet stores them comma-separated, the same shape the intake's /locations endpoint
// splits. Chips are a view over that string; the string is what gets saved and compared.
const locationSearch = ref('')
const locationInputEl = ref(null)

function splitLocations(value) {
  return String(value ?? '').split(',').map(v => v.trim()).filter(Boolean)
}

const editLocations = computed(() => splitLocations(edit.location))

function setLocations(list) {
  edit.location = list.join(', ')
}

function toggleLocation(loc) {
  const list = editLocations.value
  if (list.includes(loc)) {
    setLocations(list.filter(item => item !== loc))
  } else {
    setLocations([...list, loc])
  }
  locationSearch.value = ''
  locationInputEl.value?.focus()
}

function removeLocation(loc) {
  setLocations(editLocations.value.filter(item => item !== loc))
}

function onLocationBackspace() {
  if (locationSearch.value === '' && editLocations.value.length) {
    setLocations(editLocations.value.slice(0, -1))
  }
}

// Enter adds what was typed even if it is not in the list - the column is not restricted,
// and a new yard location has to be enterable somewhere.
function addTypedLocation() {
  const typed = locationSearch.value.trim()
  if (!typed) return
  if (!editLocations.value.includes(typed)) setLocations([...editLocations.value, typed])
  locationSearch.value = ''
}

const detailsDirty = computed(() => {
  if (!detail.value) return false
  return DETAIL_FIELDS.some(field => String(edit[field.key] ?? '') !== String(detail.value[field.key] ?? ''))
})

async function saveDetails() {
  if (!detailsDirty.value || !detail.value) return
  const record = detail.value

  const fields = {}
  for (const field of DETAIL_FIELDS) {
    if (String(edit[field.key] ?? '') !== String(record[field.key] ?? '')) fields[field.key] = edit[field.key]
  }

  busy.value = true
  busyMessage.value = 'Saving the material…'
  detailsError.value = ''

  try {
    const res = await fetch(`/api/materials-db/${record.rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fields }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to update the material.')

    // Patch the row in place from what the sheet stored: the table and the drawer share the
    // object, so both update without reloading the catalog.
    for (const field of DETAIL_FIELDS) record[field.key] = data.record[field.key]
    resetDetails()
    showToast('Material updated.')
  } catch (e) {
    detailsError.value = e.message
  } finally {
    busy.value = false
  }
}

// ----- Suggestion dropdown (one for all inputs) -----
// Same fixed-and-repositioned pattern as every other floating menu in the app: the drawer
// scrolls, and an absolutely positioned list would be clipped by it.
const suggest = reactive({ field: null, top: 0, left: 0, width: 0 })
let suggestAnchor = null
let suggestCloseTimer = null

const suggestions = computed(() => {
  if (!suggest.field) return []
  const field = DETAIL_FIELDS.find(f => f.key === suggest.field)
  const list = field?.suggestions ? (picklists.value[field.suggestions] ?? []) : []

  // Location searches on the chip box's own input. Picked values stay in the list, shown
  // ticked, so the row can be clicked again to remove it.
  const isLocation = suggest.field === 'location'
  const query = String(isLocation ? locationSearch.value : edit[suggest.field] ?? '').trim().toLowerCase()

  const matches = query
    ? list.filter(option => String(option).toLowerCase().includes(query))
    : list
  return matches.slice(0, 50)
})

function repositionSuggestions() {
  if (!suggest.field || !suggestAnchor) return
  const rect = suggestAnchor.getBoundingClientRect()
  suggest.top = rect.bottom + 2
  suggest.left = rect.left
  suggest.width = Math.max(rect.width, 200)
}

function openSuggestions(fieldKey, event) {
  clearTimeout(suggestCloseTimer)
  suggestAnchor = event.target
  suggest.field = fieldKey
  repositionSuggestions()
}

function closeSuggestions() {
  suggest.field = null
  suggestAnchor = null
}

// Deferred so a mousedown on an option lands before the input's blur closes the list
function closeSuggestionsSoon() {
  suggestCloseTimer = setTimeout(closeSuggestions, 150)
}

function pickSuggestion(option) {
  if (suggest.field === 'location') {
    // Stays open: picking one location usually means picking another right after
    toggleLocation(option)
    return
  }
  if (suggest.field) edit[suggest.field] = option
  closeSuggestions()
}

onMounted(() => {
  window.addEventListener('scroll', repositionSuggestions, true)
  window.addEventListener('resize', repositionSuggestions)
})

onUnmounted(() => {
  window.removeEventListener('scroll', repositionSuggestions, true)
  window.removeEventListener('resize', repositionSuggestions)
  clearTimeout(suggestCloseTimer)
})

// A filter change can leave the viewer past the end of the shorter result set.
watch([search, categoryFilter, locationFilter, systemFilter, warehouseFilter, onlyMissingPicture, sortKey, sortDir], () => { page.value = 1 })

watch(pageSize, (size, previous) => {
  // Anchor on the row that was at the top of the page. Keeping the page number instead would
  // land on completely different rows - page 5 of 25 is nowhere near page 5 of 200.
  const firstVisible = (page.value - 1) * previous
  page.value = Math.floor(firstVisible / size) + 1

  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(size))
  } catch {
    // A browser that refuses to store just forgets the preference next visit.
  }
})

// Picture URLs are signed and expire after ~30 minutes, so they are fetched for the rows on
// screen instead of all at once. Revisiting a page after the expiry re-requests them.
watch(pageRecords, async (rows) => {
  const imageFields = columns.value.filter(col => col.kind === 'image').map(col => col.field)
  const missing = []
  for (const record of rows) {
    for (const field of imageFields) {
      const image = record[field]
      if (image && !imageUrls.value[image.id]) missing.push(image.id)
    }
  }

  if (missing.length === 0) return

  try {
    const res = await fetch('/api/materials-db/picture-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ imageIds: missing }),
    })
    if (!res.ok) return
    const { urls } = await res.json()
    imageUrls.value = { ...imageUrls.value, ...urls }
  } catch {
    // A missing thumbnail is not worth an error banner - the placeholder already reads as "no image".
  }
}, { immediate: true })

async function openImage(record, col) {
  const image = record[col.field]
  if (!image) return

  viewer.title = `${col.label} - ${record.tpn || 'Material'}`
  viewer.subtitle = record.description2 || record.description1 || ''
  viewer.show = true

  const cached = fullImageUrls.value[image.id]
  if (cached) {
    viewer.src = cached
    viewer.loading = false
    return
  }

  // The thumbnail stands in while the big one is fetched, so the frame is never empty.
  viewer.src = imageUrls.value[image.id] ?? ''
  viewer.loading = !viewer.src

  try {
    const res = await fetch('/api/materials-db/picture-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ imageIds: [image.id], size: 1600 }),
    })
    if (!res.ok) throw new Error('Failed to load the image.')
    const { urls } = await res.json()
    const url = urls[image.id]
    if (!url) throw new Error('No URL returned for this image.')

    fullImageUrls.value = { ...fullImageUrls.value, [image.id]: url }
    viewer.src = url
  } catch {
    // Whatever the thumbnail gave us stays on screen; the viewer says so if there was nothing.
  } finally {
    viewer.loading = false
  }
}

async function loadRecords() {
  loading.value = true
  error.value = ''

  try {
    const res = await fetch('/api/materials-db/records', { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to load the catalog.')

    records.value = data.records
    columns.value = data.columns ?? []
    imageUrls.value = {}
    fullImageUrls.value = {}
  } catch (e) {
    error.value = e.message || 'Failed to load the catalog.'
  } finally {
    loading.value = false
  }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

async function openDetail(record) {
  detail.value = record
  attachments.value = []
  resetDetails()
  await loadAttachments()
}

async function closeDetail() {
  if (detailsDirty.value) {
    const discard = await askConfirm({
      title: 'Discard changes?',
      message: 'This material has unsaved changes. Closing now will lose them.',
      destructive: true,
    })
    if (!discard) return
  }
  closeSuggestions()
  detail.value = null
  attachments.value = []
}

async function loadAttachments() {
  if (!detail.value) return
  attachmentsLoading.value = true

  try {
    const res = await fetch(`/api/materials-db/${detail.value.rowId}/attachments`, { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to load the attachments.')
    attachments.value = data.attachments
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    attachmentsLoading.value = false
  }
}

async function onPictureSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !detail.value) return

  busy.value = true
  busyMessage.value = 'Uploading the picture…'

  try {
    const image = await readAsDataUrl(file)
    const res = await fetch(`/api/materials-db/${detail.value.rowId}/picture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ image, name: file.name }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to upload the picture.')

    // Patch the row in place so the table and the drawer both show the new image without
    // reloading 1,500 records.
    detail.value.picture = data.picture
    if (data.picture) {
      const urls = await fetchPictureUrls([data.picture.id])
      imageUrls.value = { ...imageUrls.value, ...urls }
    }
    showToast('Picture updated.')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    busy.value = false
  }
}

async function fetchPictureUrls(imageIds) {
  const res = await fetch('/api/materials-db/picture-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ imageIds }),
  })
  if (!res.ok) return {}
  const { urls } = await res.json()
  return urls
}

async function onFilesSelected(event) {
  const selected = [...(event.target.files ?? [])]
  event.target.value = ''
  if (selected.length === 0 || !detail.value) return

  busy.value = true
  busyMessage.value = selected.length > 1 ? 'Uploading the files…' : 'Uploading the file…'

  try {
    const files = []
    for (const file of selected) {
      files.push({ name: file.name, data: await readAsDataUrl(file) })
    }

    const res = await fetch(`/api/materials-db/${detail.value.rowId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ files }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to upload the files.')

    await loadAttachments()
    detail.value.attachmentCount = attachments.value.length
    showToast(data.message, data.failed?.length ? 'error' : 'success')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    busy.value = false
  }
}

// Only these render in a tab; a Word or Excel file would just download anyway, so it gets
// no View button at all rather than one that silently behaves like Download.
const INLINE_TYPES = ['image/', 'application/pdf', 'text/plain']

function isViewable(attachment) {
  const type = String(attachment.mimeType ?? '').toLowerCase()
  return INLINE_TYPES.some(prefix => type.startsWith(prefix))
}

function isImageAttachment(attachment) {
  return String(attachment.mimeType ?? '').toLowerCase().startsWith('image/')
}

// No round trip for the URL here: the attachment route already streams the file inline, and
// the browser sends the session cookie with it because it is same-origin.
function openAttachmentImage(attachment) {
  viewer.title = attachment.name
  viewer.subtitle = detail.value?.tpn ?? ''
  viewer.src = attachmentUrl(attachment)
  viewer.loading = false
  viewer.show = true
}

function attachmentUrl(attachment, { download = false } = {}) {
  const base = `/api/materials-db/${detail.value.rowId}/attachments/${attachment.id}/file`
  return download ? `${base}?download=1` : base
}

async function removeAttachment(attachment) {
  const confirmed = await askConfirm({
    title: 'Delete this file?',
    message: `"${attachment.name}" will be removed from this material. This cannot be undone.`,
    destructive: true,
  })
  if (!confirmed) return

  busy.value = true
  busyMessage.value = 'Deleting the file…'

  try {
    const res = await fetch(
      `/api/materials-db/${detail.value.rowId}/attachments/${attachment.id}`,
      { method: 'DELETE', credentials: 'include' }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to delete the attachment.')

    await loadAttachments()
    detail.value.attachmentCount = attachments.value.length
    showToast('Attachment deleted.')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadRecords()
  loadPicklists()
})
</script>

<style scoped>
/* The two columns that stay put while the table scrolls sideways: TPN names the row, Actions
   acts on it. Each shadow falls on the side the content scrolls under, so it only shows once
   something is actually hidden beneath the cell.
   TPN is not the first column - Picture and Barcode precede it - so it travels normally until
   it reaches the left edge and then slides over them. */
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
