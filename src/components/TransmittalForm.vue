<template>
  <div class="max-w-7xl mx-auto bg-white sm:rounded-2xl shadow-lg overflow-hidden">

    <!-- Branded header -->
    <div class="bg-red-600 px-4 sm:px-8 py-4 sm:py-5 flex items-center gap-3 sm:gap-5 flex-wrap">
      <img src="/mic.png" alt="MIC" class="h-10 sm:h-14 object-contain brightness-0 invert shrink-0" />
      <div class="flex-1 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-white font-bold text-base sm:text-xl leading-tight">
            P2 – New Material Picking &amp; Requisition Form
          </h1>
          <p class="text-red-200 text-sm mt-0.5">新領料申請單</p>
        </div>
        <button
          v-if="!isDeclined && (!isSignMode || currentStage)"
          type="button"
          @click="autoFillForm"
          class="mt-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors shrink-0"
        >
          ✨ Auto-fill (demo)
        </button>
      </div>
    </div>

    <div v-if="loading" class="p-12 text-center text-slate-400">
      Loading transmittal…
    </div>

    <div v-else-if="loadError" class="p-12 text-center text-red-500 font-semibold">
      {{ loadError }}
    </div>

    <div v-else class="p-4 sm:p-8 space-y-8 sm:space-y-10">

      <!-- ── Sign-mode status banner ── -->
      <div
        v-if="isSignMode"
        class="rounded-xl border px-4 py-3 text-sm font-semibold flex items-center justify-between gap-3 flex-wrap"
        :class="isDeclined
          ? 'bg-red-50 border-red-200 text-red-700'
          : isPartialDeliveryMode
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : currentStage
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-green-50 border-green-200 text-green-700'"
      >
        <template v-if="isDeclined">
          <div class="flex flex-col gap-1">
            <span>❌ Request Declined — this transmittal was rejected by the Approver. / 申請已被核准人拒絕。</span>
            <span v-if="form.declineReason" class="font-normal text-red-600">Reason: {{ form.declineReason }}</span>
          </div>
        </template>
        <template v-else-if="isPartialDeliveryMode">
          <div class="flex flex-col gap-0.5">
            <span>⚠ Material Partially Delivered — update Transfer Qty for highlighted rows, then submit. / 部分交貨 — 請更新標示列的調撥數量後提交。</span>
            <span class="font-normal text-amber-700 text-xs">Only rows with status "Material Partially Delivered" are editable. / 僅「部分交貨」狀態的列可編輯。</span>
          </div>
        </template>
        <template v-else-if="currentStage">Awaiting {{ STAGE_LABELS[currentStage] }} signature. / 等待{{ STAGE_LABELS[currentStage] }}簽名。</template>
        <template v-else>
          <span>✅ Fully signed — workflow complete. / 全部簽署完成。</span>
          <a
            v-if="hasRecipientId"
            :href="recipientIdImageUrl"
            target="_blank"
            rel="noopener"
            class="underline font-semibold whitespace-nowrap"
          >View Recipient ID / 查看收件人證件照片</a>
        </template>
      </div>

      <!-- ── Section 1: Request Information ── -->
      <div>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 class="text-base font-bold text-slate-800 uppercase tracking-wider">
            Request Information <span class="text-slate-400 font-normal normal-case tracking-normal">/ 申請資訊</span>
          </h2>
        </div>

        <div class="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-x-5 gap-y-5">

          <!-- Company -->
          <div class="sm:col-span-2 md:col-span-4 flex flex-col gap-1.5">
            <label class="form-label">Company Requesting Material <span class="label-zh">申請廠商</span></label>
            <input v-model="form.company" :disabled="isSignMode" type="text" placeholder="e.g. MMI Construction" class="form-input" />
          </div>
          <!-- BOQ -->
          <div class="md:col-span-2 flex flex-col gap-1.5">
            <label class="form-label">BOQ # <span class="label-zh">BOQ編號</span></label>
            <input v-model="form.boq" :disabled="isSignMode" type="text" placeholder="BOQ-2026-XXXX" class="form-input" />
          </div>
          <!-- Date of Application -->
          <div class="md:col-span-2 flex flex-col gap-1.5">
            <label class="form-label">Date of Application <span class="label-zh">申請日期</span></label>
            <input v-model="form.dateApplication" :disabled="isSignMode" type="date" :min="today" class="form-input" />
          </div>
          <!-- Application Results -->
          <div class="md:col-span-2 flex flex-col gap-1.5">
            <label class="form-label">Application Results <span class="label-zh">申請結果</span></label>
            <input v-model="form.applicationResults" :disabled="isSignMode" type="text" placeholder="Pending / Approved…" class="form-input" />
          </div>
          <!-- Date Needed — sits with the other request dates rather than after the urgency block -->
          <div class="md:col-span-2 flex flex-col gap-1.5">
            <label class="form-label">Date Needed By <span class="label-zh">需求日期</span></label>
            <input
              v-model="form.dateNeeded"
              :disabled="isSignMode"
              type="date"
              :min="form.urgency && form.dateApplication ? form.dateApplication : today"
              :max="form.urgency && form.dateApplication ? urgentMaxDateNeeded : undefined"
              class="form-input"
            />
            <p v-if="form.urgency && form.dateApplication" class="text-xs text-red-500">
              Urgent: same day or next day only / 緊急：僅限當天或次日
            </p>
          </div>

          <!-- Applicant Name -->
          <div class="sm:col-span-2 md:col-span-3 flex flex-col gap-1.5">
            <label class="form-label">Applicant Name &amp; Phone <span class="label-zh">申請人/電話</span></label>
            <input v-model="form.applicantName" :disabled="isSignMode" type="text" placeholder="Full name / +63 9XX XXX XXXX" class="form-input" />
          </div>
          <!-- Email -->
          <div class="sm:col-span-2 md:col-span-3 flex flex-col gap-1.5">
            <label class="form-label">Requestor Email <span class="label-zh">申請人電郵</span></label>
            <input v-model="form.requestorEmail" :disabled="isSignMode" type="email" placeholder="name@company.com" class="form-input" />
          </div>

          <!-- Urgency — takes the whole row when unchecked, so the fields below cannot
               drift up into the gap the urgency inputs leave behind. -->
          <div :class="form.urgency ? 'md:col-span-2' : 'sm:col-span-2 md:col-span-6'" class="flex flex-col gap-1.5">
            <label class="form-label">Urgency <span class="label-zh">緊急</span></label>
            <div class="flex items-center gap-2 py-2">
              <input
                v-model="form.urgency"
                :disabled="isSignMode"
                type="checkbox"
                id="urgencyCheckbox"
                class="w-4 h-4 accent-red-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <label for="urgencyCheckbox" class="text-sm text-slate-700 cursor-pointer select-none">Urgent / 緊急</label>
            </div>
          </div>
          <!-- Urgency Level - enabled only when Urgent is checked -->
          <div v-if="form.urgency" class="sm:col-span-2 md:col-span-4 flex flex-col gap-1.5">
            <label class="form-label">Urgency Level <span class="label-zh">緊急程度</span></label>
            <div class="flex items-center gap-4 py-2 flex-wrap">
              <label
                v-for="level in URGENCY_LEVELS"
                :key="level"
                class="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer select-none"
                :class="isSignMode ? 'opacity-60 cursor-not-allowed' : ''"
              >
                <input
                  v-model="form.urgencyLevel"
                  :value="level"
                  :disabled="isSignMode"
                  type="radio"
                  name="urgencyLevel"
                  class="w-4 h-4 accent-red-600 cursor-pointer disabled:cursor-not-allowed"
                />
                {{ level }}
              </label>
            </div>
          </div>
          <!-- Urgency Reason -->
          <div v-if="form.urgency" class="sm:col-span-2 md:col-span-6 flex flex-col gap-1.5">
            <label class="form-label">Urgency Reason <span class="label-zh">緊急原因</span></label>
            <input
              v-model="form.urgencyReason"
              :disabled="isSignMode"
              type="text"
              placeholder="Describe why this is urgent… / 說明緊急原因…"
              class="form-input"
            />
          </div>
          <!-- Reason -->
          <div class="sm:col-span-2 md:col-span-3 flex flex-col gap-1.5">
            <label class="form-label">Reason <span class="label-zh">原因</span></label>
            <textarea
              v-model="form.reason"
              :disabled="isSignMode"
              placeholder="Describe why these materials are needed…"
              class="form-input resize-none flex-1 min-h-[96px]"
            ></textarea>
          </div>
          <!-- The sheet's Remark column, shown as the MIC Transmittal ID. Set by the requester
               here; afterwards it is the dashboard that edits it, so this is read-only once the
               transmittal exists. -->
          <div class="sm:col-span-2 md:col-span-3 flex flex-col gap-1.5">
            <label class="form-label">MIC Transmittal ID <span class="label-zh">MIC 傳遞單編號</span></label>
            <input
              v-model="form.remark"
              :disabled="isSignMode"
              type="text"
              placeholder="MIC transmittal ID…"
              class="form-input"
            />
          </div>

          <!-- Comments — the parent row's own Remarks cell. The same column carries each item's
               note on its child row; this one belongs to the transmittal as a whole. Edited from
               the dashboard once the transmittal exists. -->
          <div
            class="sm:col-span-2 md:col-span-3 flex flex-col gap-1.5"
            :class="{ hidden: !(!isSignMode || form.comments) }"
          >
            <label class="form-label">Comments <span class="label-zh">備註</span></label>
            <textarea
              v-if="!isSignMode"
              v-model="form.comments"
              placeholder="Optional note about this transmittal…"
              class="form-input resize-none flex-1 min-h-[96px]"
            ></textarea>
            <span v-else class="form-input is-static flex-1 min-h-[96px] whitespace-pre-wrap">
              {{ form.comments }}
            </span>
          </div>

          <!-- Pickup Location -->
          <div
            class="sm:col-span-2 md:col-span-3 flex flex-col gap-1.5"
            :class="{ hidden: !((isSignMode && currentStage === 'warehouse') || form.pickupLocation) }"
          >
            <label class="form-label">Pickup Location <span class="label-zh">取貨地點</span></label>
            <input
              v-if="isSignMode && currentStage === 'warehouse'"
              v-model="form.pickupLocation"
              type="text"
              placeholder="Warehouse name, block, shelf…"
              class="form-input"
            />
            <span v-else class="form-input is-static flex items-center">
              {{ form.pickupLocation }}
            </span>
          </div>
          <!-- Pickup Timeframe -->
          <div
            class="sm:col-span-2 md:col-span-3 flex flex-col gap-1.5"
            :class="{ hidden: !((isSignMode && currentStage === 'warehouse') || pickupTimeframe) }"
          >
            <label class="form-label">Pickup Timeframe <span class="label-zh">取貨時段</span></label>
            <div v-if="isSignMode && currentStage === 'warehouse'" class="flex items-center gap-2">
              <input v-model="pickupTimeStart" type="time" class="form-input" />
              <span class="text-slate-400">–</span>
              <input v-model="pickupTimeEnd" type="time" class="form-input" />
            </div>
            <span v-else class="form-input is-static flex items-center">
              {{ pickupTimeframe }}
            </span>
          </div>

          <!-- The two fulfilment dates, kept together: scheduled pickup and actual picking -->
          <div
            class="sm:col-span-1 md:col-span-3 flex flex-col gap-1.5"
            :class="{ hidden: !(canEditItems || form.datePickup) }"
          >
            <label class="form-label">Date of Pickup <span class="label-zh">取貨日期</span></label>
            <input
              v-if="canEditItems"
              v-model="form.datePickup"
              type="date"
              :min="today"
              class="form-input"
            />
            <span v-else class="form-input is-static flex items-center">
              {{ displayDate(form.datePickup) }}
            </span>
          </div>
          <div
            class="sm:col-span-1 md:col-span-3 flex flex-col gap-1.5"
            :class="{ hidden: !(currentStage === 'recipient' || form.datePicking) }"
          >
            <label class="form-label">Date of Picking <span class="label-zh">領料日期</span></label>
            <input
              v-if="currentStage === 'recipient'"
              v-model="form.datePicking"
              type="date"
              :min="today"
              class="form-input"
            />
            <span v-else class="form-input is-static flex items-center">
              {{ displayDate(form.datePicking) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Section 2.1: Partial Delivery — step 1, scheduling the pickup and notifying the
           recipient. The delivery itself is signed for further down. -->
      <div v-if="isPartialDeliveryMode">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 class="text-base font-bold text-slate-800 uppercase tracking-wider">
            Partial Delivery Acknowledgement <span class="text-slate-400 font-normal normal-case tracking-normal">/ 部分交貨確認</span>
          </h2>
        </div>

        <div class="mb-4 flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <!-- Pickup details for this delivery -->
          <div class="flex flex-wrap items-end gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="form-label text-slate-800">
                Date of Pickup {{ pdVersion }} <span class="label-zh text-slate-400">取貨日期 {{ pdVersion }}</span>
                <span class="text-red-500 ml-0.5">*</span>
              </label>
              <input
                v-model="pdDatePickup"
                :disabled="pdAcknowledged"
                type="date"
                class="form-input"
              />
            </div>
            <div class="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label class="form-label text-slate-800">
                Pickup Location {{ pdVersion }} <span class="label-zh text-slate-400">取貨地點 {{ pdVersion }}</span>
                <span class="text-red-500 ml-0.5">*</span>
              </label>
              <input
                v-model="pdPickupLocation"
                :disabled="pdAcknowledged"
                type="text"
                placeholder="Warehouse name, block, shelf… / 倉庫、區塊、貨架…"
                class="form-input"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="form-label text-slate-800">
                Pickup Timeframe {{ pdVersion }} <span class="label-zh text-slate-400">取貨時段 {{ pdVersion }}</span>
                <span class="text-red-500 ml-0.5">*</span>
              </label>
              <div class="flex items-center gap-2">
                <input v-model="pdPickupTimeStart" :disabled="pdAcknowledged" type="time" class="form-input" />
                <span class="text-slate-300">–</span>
                <input v-model="pdPickupTimeEnd" :disabled="pdAcknowledged" type="time" class="form-input" />
              </div>
            </div>
          </div>

          <!-- Step 1 gate: the recipient has to be told where and when to collect before
               the delivery can be signed off. -->
          <div v-if="!pdAcknowledged" class="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-slate-500 flex-1 min-w-[220px]">
              The recipient will be emailed these pickup details. Sign-off unlocks once the notification is sent.
              / 收件人將收到取貨資訊，通知寄出後才能進行簽收。
            </p>
            <button
              type="button"
              @click="sendPdAcknowledgement"
              :disabled="acknowledging"
              class="px-6 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="acknowledging" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              {{ acknowledging ? 'Sending… / 傳送中…' : 'Send Notification to Recipient / 通知收件人' }}
            </button>
          </div>
          <div v-else class="border-t border-slate-200 pt-4 flex items-center gap-2 text-xs font-semibold text-green-700">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Recipient notified — ready for sign-off. / 已通知收件人，可進行簽收。
          </div>
        </div>
      </div>

      <!-- ── Section 2: Materials List ── -->
      <div>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 class="text-base font-bold text-slate-800 uppercase tracking-wider">
            Materials List <span class="text-slate-400 font-normal normal-case tracking-normal">/ 材料清單</span>
          </h2>
        </div>

        <div class="overflow-x-auto rounded-xl">
          <table class="materials-table w-full min-w-[900px] text-sm">
            <thead>
              <tr class="bg-red-600 text-white">
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">#</th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Part Number<br /><span class="font-normal text-red-200 text-xs">零件編號</span></th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Type<br /><span class="font-normal text-red-200 text-xs">類型</span></th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Description<br /><span class="font-normal text-red-200 text-xs">描述</span></th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Product<br /><span class="font-normal text-red-200 text-xs">產品</span></th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Unit<br /><span class="font-normal text-red-200 text-xs">單位</span></th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Qty<br /><span class="font-normal text-red-200 text-xs">數量</span></th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Transfer Qty<br /><span class="font-normal text-red-200 text-xs">調撥數量</span></th>
                <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">Remarks<br /><span class="font-normal text-red-200 text-xs">備註</span></th>
                <th v-if="!isSignMode" class="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, index) in tableRows" :key="row.id">
              <tr
                @click="onRowClick(row, $event)"
                :class="[
                  (row._fullyDelivered && isPartialDeliveryMode)
                    ? 'bg-green-50'
                    : hasHistory(row)
                      ? 'bg-slate-100'
                      : isRowEditableInPartialDelivery(row)
                        ? 'bg-amber-50'
                        : index % 2 === 1 ? 'bg-red-50' : 'bg-white',
                  hasHistory(row) ? 'cursor-pointer' : ''
                ]"
              >
                <td class="border border-gray-200 px-3 py-2 text-slate-500 font-semibold">{{ index + 1 }}</td>
                <td class="desc-dropdown-cell border border-gray-200 p-1.5 relative">
                  <input
                    :value="row.partNumber"
                    :disabled="isSignMode"
                    type="text"
                    placeholder="PN-XXXXX"
                    class="table-input"
                    autocomplete="off"
                    @focus="openRowDropdown(row, $event, 'partNumber')"
                    @input="onSearchInput(row, $event, 'partNumber')"
                    @keydown.escape="closeDropdown"
                  />
                </td>
                <td class="border border-gray-200 p-1.5"><input v-model="row.type" :disabled="isSignMode" type="text" placeholder="Structural…" class="table-input" /></td>
                <td class="desc-dropdown-cell border border-gray-200 p-1.5 relative">
                  <input
                    :value="row.description"
                    :disabled="isSignMode"
                    type="text"
                    placeholder="Item description"
                    class="table-input"
                    autocomplete="off"
                    @focus="openRowDropdown(row, $event, 'description')"
                    @input="onSearchInput(row, $event, 'description')"
                    @keydown.escape="closeDropdown"
                  />
                </td>
                <td class="border border-gray-200 p-1.5"><input v-model="row.product" :disabled="isSignMode" type="text" placeholder="Brand / model" class="table-input" /></td>
                <td class="border border-gray-200 p-1.5"><input v-model="row.unit" :disabled="isSignMode" type="text" placeholder="PCS" class="table-input" /></td>
                <td class="border border-gray-200 p-1.5"><input v-model="row.qty" :disabled="isSignMode" type="text" placeholder="0" class="table-input" /></td>
                <td
                  class="border p-1.5"
                  :class="(row._fullyDelivered && isPartialDeliveryMode)
                    ? 'border-green-300 bg-green-50'
                    : hasHistory(row)
                      ? 'border-gray-200 bg-slate-50'
                      : rowErrors[row.childRowId]
                        ? 'border-red-400 bg-red-50'
                        : isRowEditableInPartialDelivery(row)
                          ? 'border-slate-300 bg-slate-100'
                          : (currentStage === 'recipient' && inboundAutoFilled[row.childRowId])
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-gray-200'"
                >
                  <div class="flex items-center gap-1.5">
                    <!-- With a delivery history this row represents the Initial delivery,
                         so it shows that figure; the editable entry moves to the last row. -->
                    <span
                      v-if="hasHistory(row)"
                      class="table-input flex-1 min-w-0 flex items-center font-semibold"
                      :class="row._fullyDelivered ? 'text-green-700' : 'text-slate-700'"
                    >
                      <span class="px-1.5 py-0.5 mr-1.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 leading-none">Initial</span>
                      {{ initialEntry(row)?.transferQty ?? '—' }}
                    </span>
                    <input
                      v-else
                      v-model="row.transferQty"
                      :disabled="isTransferQtyDisabled(row)"
                      type="text"
                      placeholder="0"
                      class="table-input flex-1 min-w-0"
                      @input="rowErrors[row.childRowId] && validatePDRows()"
                    />
                    <!-- History affordance. The whole row toggles too; this stays as the
                         explicit target. Labelled with how many further deliveries are
                         hidden — a count says more per pixel than a generic "History" in a
                         column this narrow, and offering it at all only makes sense when
                         something is actually collapsed underneath. -->
                    <button
                      v-if="laterEntries(row).length"
                      type="button"
                      @click.stop="toggleHistory(row.childRowId)"
                      :title="`${deliveredTotal(row)} delivered across ${row.deliveryHistory.length} deliveries`"
                      class="shrink-0 h-6 pl-1 pr-1.5 flex items-center gap-0.5 rounded-md border text-[10px] font-bold leading-none transition-colors"
                      :class="row._fullyDelivered
                        ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'"
                    >
                      <svg
                        class="w-3 h-3 shrink-0 transition-transform"
                        :class="{ 'rotate-90': expandedHistory.has(row.childRowId) }"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                      >
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      {{ expandedHistory.has(row.childRowId) ? 'Hide' : `+${laterEntries(row).length}` }}
                    </button>
                  </div>
                  <p v-if="hasHistory(row)" class="mt-1 pt-1 border-t border-dashed border-slate-300 text-[10px] text-slate-400 leading-none">
                    Delivered — {{ initialEntry(row)?.date || 'n/a' }}
                  </p>
                  <span v-if="currentStage === 'recipient' && inboundAutoFilled[row.childRowId]" class="text-[10px] text-emerald-600 font-semibold leading-none">↑ auto</span>
                  <span
                    v-if="isPartialDeliveryMode && row._fullyDelivered"
                    class="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 text-[10px] font-bold text-green-700 bg-green-100 border border-green-300 rounded-full leading-none"
                  >✓ Closed</span>
                  <!-- With a history the editable input lives in the trailing row, so the
                       validation message belongs there rather than on this one. -->
                  <p v-if="rowErrors[row.childRowId] && !hasHistory(row)" class="text-[10px] text-red-600 font-semibold mt-0.5 leading-tight">
                    {{ rowErrors[row.childRowId] }}
                  </p>
                </td>
                <td class="border border-gray-200 p-1.5">
                  <!-- Mirrors the Transfer Qty cell: with history, this row is the Initial
                       delivery, so it shows that delivery's own remark. -->
                  <span
                    v-if="hasHistory(row)"
                    class="table-input flex items-center text-slate-600"
                  >{{ initialEntry(row)?.remarks || '—' }}</span>
                  <input
                    v-else-if="isRowEditableInPartialDelivery(row)"
                    v-model="row.pdRemarks"
                    type="text"
                    placeholder="PD remark"
                    class="table-input"
                  />
                  <input
                    v-else
                    v-model="row.remarks"
                    :disabled="!['warehouse', 'recipient'].includes(currentStage)"
                    type="text"
                    placeholder="Optional"
                    class="table-input"
                  />
                </td>
                <td v-if="!isSignMode" class="border border-gray-200 px-2 py-1.5 text-center">
                  <button
                    type="button"
                    @click="deleteRow(row.id)"
                    class="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
              <template v-if="expandedHistory.has(row.childRowId)">
                <tr
                  v-for="entry in laterEntries(row)"
                  :key="`${row.id}-h${entry.version}`"
                  class="pd-child bg-white"
                >
                  <td class="border border-gray-200 px-3 py-2 text-right">
                    <svg class="w-3.5 h-3.5 inline-block text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="9 10 4 15 9 20"/>
                      <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
                    </svg>
                  </td>
                  <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.partNumber || '—' }}</span></td>
                  <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.type || '—' }}</span></td>
                  <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.description || '—' }}</span></td>
                  <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.product || '—' }}</span></td>
                  <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.unit || '—' }}</span></td>
                  <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.qty || '—' }}</span></td>
                  <td class="border border-gray-200 p-1.5">
                    <span class="table-input flex items-center gap-1.5">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 leading-none">PD{{ entry.version }}</span>
                      <span class="font-semibold text-slate-700">{{ entry.transferQty }}</span>
                    </span>
                    <p class="mt-1 pt-1 border-t border-dashed border-slate-300 text-[10px] text-slate-400 leading-none">
                      Delivered — {{ entry.date || 'n/a' }}
                    </p>
                  </td>
                  <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-600">{{ entry.remarks || '—' }}</span></td>
                  <td v-if="!isSignMode" class="border border-gray-200 px-2 py-1.5"></td>
                </tr>
              </template>

              <tr
                v-if="hasHistory(row) && isRowEditableInPartialDelivery(row)"
                class="pd-child pd-active bg-amber-50"
              >
                <td class="border border-gray-200 px-3 py-2 text-right">
                  <svg class="w-3.5 h-3.5 inline-block text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="9 10 4 15 9 20"/>
                    <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
                  </svg>
                </td>
                <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.partNumber || '—' }}</span></td>
                <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.type || '—' }}</span></td>
                <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.description || '—' }}</span></td>
                <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.product || '—' }}</span></td>
                <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.unit || '—' }}</span></td>
                <td class="border border-gray-200 p-1.5"><span class="table-input flex items-center text-slate-400">{{ row.qty || '—' }}</span></td>
                <td
                  class="border p-1.5"
                  :class="rowErrors[row.childRowId] ? 'border-red-400 bg-red-50' : 'border-gray-200'"
                >
                  <div class="flex items-center gap-1.5">
                    <span class="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white leading-none">PD{{ pdVersion }}</span>
                    <input
                      v-model="row.transferQty"
                      :disabled="pdOutboundSaved"
                      type="text"
                      placeholder="0"
                      class="table-input flex-1 min-w-0 bg-white border border-gray-200 rounded-md disabled:bg-slate-100 disabled:text-slate-500"
                      @input="rowErrors[row.childRowId] && validatePDRows()"
                    />
                  </div>
                  <!-- Ceiling for this batch: ordered qty minus everything delivered so far. -->
                  <p class="mt-1 pt-1 border-t border-dashed border-slate-300 text-[10px] leading-none"
                     :class="remainingQty(row) > 0 ? 'text-slate-400' : 'text-red-600 font-semibold'">
                    Max Qty: {{ remainingQty(row) }}
                  </p>
                  <p v-if="rowErrors[row.childRowId]" class="text-[10px] text-red-600 font-semibold mt-0.5 leading-tight">
                    {{ rowErrors[row.childRowId] }}
                  </p>
                </td>
                <td class="border border-gray-200 p-1.5">
                  <input
                    v-model="row.pdRemarks"
                    :disabled="pdOutboundSaved"
                    type="text"
                    placeholder="PD remark"
                    class="table-input bg-white border border-gray-200 rounded-md disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </td>
                <td v-if="!isSignMode" class="border border-gray-200 px-2 py-1.5"></td>
              </tr>
              </template>

              <tr v-if="tableRows.length === 0">
                <td :colspan="isSignMode ? 9 : 10" class="text-center text-slate-400 py-10 text-sm">
                  No items yet — click <strong>+ Add Row</strong> below to start adding materials.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!isSignMode" class="mt-4">
          <button
            type="button"
            @click="addRow"
            class="px-5 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            + Add Row / 新增列
          </button>
        </div>

        <div v-if="isPartialDeliveryMode && pdAcknowledged" class="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            @click="savePdOutbound"
            :disabled="savingPdOutbound || pdOutboundSaved"
            class="px-5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="savingPdOutbound">Creating… / 創建中…</span>
            <span v-else-if="pdOutboundSaved">✓ Outbound Items Created / 已創建出庫記錄</span>
            <span v-else>Create Outbound Items / 創建出庫記錄</span>
          </button>
        </div>

        <div v-if="isSignMode && currentStage === 'recipient' && hasManualItems" class="mt-4 flex items-center gap-3">
          <button
            type="button"
            @click="saveInboundProgress"
            :disabled="savingInbound"
            class="px-5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="savingInbound">Creating… / 創建中…</span>
            <span v-else>Create Outbound Items / 創建出庫記錄</span>
          </button>
          <span v-if="inboundSaveStatus === 'ok'" class="text-sm text-emerald-600 font-medium">✓ Saved / 已保存</span>
          <span v-if="inboundSaveStatus === 'error'" class="text-sm text-red-500 font-medium">✗ Failed / 保存失敗</span>
        </div>

        <div v-if="isSignMode && currentStage === 'recipient' && !recipientSigningStarted" class="mt-4 flex justify-end">
          <button
            type="button"
            @click="showNoShowModal = true"
            :disabled="submittingNoShow"
            class="px-6 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Recipient No-Show / 收件人未到場
          </button>
        </div>
      </div>

      <!-- Description dropdown — teleported to body so it floats over the table -->
      <Teleport to="body">
        <ul
          v-if="activeRow"
          class="material-dropdown fixed z-[100] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl"
          :style="{ top: dropdownPos.top + 'px', left: dropdownPos.left + 'px', width: dropdownPos.width + 'px' }"
        >
          <li
            v-for="mat in filterMaterials(activeRow._search)"
            :key="mat.partNumber + mat.description"
            @mousedown.prevent="selectMaterial(activeRow, mat)"
            class="px-3 py-2 text-sm hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
          >
            <!-- Searching by part number leads with it, so the eye lands on what was typed -->
            <template v-if="activeField === 'partNumber'">
              <div class="font-bold text-slate-800 leading-tight">{{ mat.partNumber || '—' }}</div>
              <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
                <span v-if="mat.product">{{ mat.product }}</span>
                <span v-if="mat.description">· {{ mat.description }}</span>
                <span v-if="mat.brand" class="font-semibold text-slate-500">· {{ mat.brand }}</span>
              </div>
            </template>
            <template v-else>
              <div class="font-medium text-slate-800 leading-tight">{{ mat.description }}</div>
              <div class="text-xs text-slate-400 mt-0.5 flex gap-2 flex-wrap">
                <span v-if="mat.partNumber">{{ mat.partNumber }}</span>
                <span v-if="mat.type">· {{ mat.type }}</span>
                <span v-if="mat.product">· {{ mat.product }}</span>
                <span v-if="mat.brand" class="font-semibold text-slate-500">· {{ mat.brand }}</span>
              </div>
            </template>
          </li>
          <li v-if="materialsLoading" class="px-3 py-2 text-sm text-slate-400">
            Loading the catalog…
          </li>
          <li v-else-if="materialsError" class="px-3 py-2 text-sm text-red-600">
            The materials list did not load.
            <button type="button" @mousedown.prevent="loadMaterials()" class="ml-1 font-semibold underline hover:text-red-700">Retry</button>
          </li>
          <li v-else-if="filterMaterials(activeRow._search).length === 0" class="px-3 py-2 text-sm text-slate-400">
            No matches found
          </li>
        </ul>
      </Teleport>

      <!-- Camera capture modal — used to take a photo of the recipient ID -->
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
                Cancel / 取消
              </button>
              <button
                type="button"
                @click="capturePhoto"
                class="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Capture / 拍攝
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ── Section 3: Signatures ── -->
      <div v-if="!isPartialDeliveryMode">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 class="text-base font-bold text-slate-800 uppercase tracking-wider">
            Signatures <span class="text-slate-400 font-normal normal-case tracking-normal">/ 簽名</span>
          </h2>
        </div>
        <!-- ── Progress strip ── -->
        <div class="flex items-center mt-4 mb-8">
          <template v-for="(step, i) in progressSteps" :key="step.key">
            <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors"
                :class="{
                  'bg-green-500 border-green-500 text-white': progressSigState(step.key) === 'signed',
                  'bg-red-600   border-red-600   text-white': progressSigState(step.key) === 'active',
                  'bg-white     border-gray-200  text-gray-300': progressSigState(step.key) === 'pending'
                }"
              >
                <span v-if="progressSigState(step.key) === 'signed'">✓</span>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <span
                class="text-xs font-semibold text-center leading-tight"
                :class="{
                  'text-green-600': progressSigState(step.key) === 'signed',
                  'text-red-600':   progressSigState(step.key) === 'active',
                  'text-gray-400':  progressSigState(step.key) === 'pending'
                }"
              >{{ step.label.split(' / ')[0] }}</span>
              <span
                v-if="progressSigState(step.key) === 'signed' && progressSignerName(step.key)"
                class="text-xs text-gray-500 text-center max-w-[96px] truncate"
              >{{ progressSignerName(step.key) }}</span>
            </div>
            <div
              v-if="i < progressSteps.length - 1"
              class="flex-none h-0.5 w-6 sm:w-12 mb-6 shrink-0"
              :class="progressSigState(progressSteps[i + 1].key) !== 'pending' ? 'bg-green-400' : 'bg-gray-200'"
            ></div>
          </template>
        </div>

        <!-- ── Active signature card ── -->
        <div v-if="canSeeSignatureCard" :key="formKey" class="flex justify-center">
        <div class="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div class="flex items-center justify-center gap-2 mb-5">
            <div class="w-1 h-5 bg-red-600 rounded-full"></div>
            <span class="text-sm font-bold text-slate-700">{{ activeStepTitle }}</span>
          </div>

          <!-- Warehouse step -->
          <template v-if="currentStage === 'warehouse'">

            <p class="text-sm text-slate-500 mb-4 text-center">Draw your signature below using your mouse or touchscreen. Click <em>Clear</em> to redo. / 請在框內簽名。</p>
            <div class="flex justify-center">
              <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 w-full max-w-sm">
                <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <div class="w-1 h-5 bg-red-600 rounded-full"></div>
                  <span class="text-sm font-bold text-slate-700">Warehouse Signatory / 倉庫簽名人</span>
                </div>

                <!-- Acknowledged By -->
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700">
                    Acknowledged By <span class="font-normal text-slate-400">確認人</span>
                    <span class="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    v-model="acknowledgeName"
                    type="text"
                    placeholder="Full name of acknowledging person / 確認人全名"
                    :disabled="warehouseAlreadySigned"
                    class="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 max-w-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>

                <!-- Acknowledgement notice -->
                <div class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <p class="text-xs text-blue-700 leading-relaxed">
                    By signing below, you acknowledge that you have reviewed and are aware of the materials to be released as listed in this transmittal. / 於下方簽名，即表示您確認已審閱本傳遞單所列材料，並知悉需出庫的物料內容。
                  </p>
                </div>

                <canvas
                  :ref="el => setCanvasRef(el, 'warehouse')"
                  width="220" height="90"
                  :class="warehouseAlreadySigned
                    ? 'border-2 border-slate-200 rounded-xl bg-white w-full max-w-xs cursor-not-allowed opacity-70'
                    : 'border-2 border-red-200 border-dashed rounded-xl bg-white w-full max-w-xs touch-none cursor-crosshair'"
                  @mousedown="!warehouseAlreadySigned && startDraw('warehouse', $event)"
                  @mouseup="!warehouseAlreadySigned && stopDraw('warehouse')"
                  @mouseleave="!warehouseAlreadySigned && stopDraw('warehouse')"
                  @mousemove="!warehouseAlreadySigned && draw('warehouse', $event)"
                  @touchstart.prevent="!warehouseAlreadySigned && startDraw('warehouse', $event)"
                  @touchmove.prevent="!warehouseAlreadySigned && draw('warehouse', $event)"
                  @touchend.prevent="!warehouseAlreadySigned && stopDraw('warehouse')"
                ></canvas>
                <button v-if="!warehouseAlreadySigned" type="button" @click="clearSignature('warehouse')" class="text-xs text-slate-400 hover:text-red-500 underline transition-colors self-start">
                  Clear / 清除
                </button>
              </div>
            </div>

          </template>

          <!-- Recipient step -->
          <template v-else-if="currentStage === 'recipient'">

            <!-- Gate: show start button until user taps it -->
            <div v-if="!recipientSigningStarted" class="flex justify-center py-8">
              <button
                type="button"
                @click="recipientSigningStarted = true"
                class="px-10 py-3 text-base font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow"
              >
                Start Signing Process / 開始簽署流程
              </button>
            </div>

            <template v-else>
            <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p class="text-xs text-amber-700 leading-relaxed font-medium">
                Fill in Transfer Qty, Remarks, and Date of Picking in the materials table above, then complete the recipient details below. / 請先在上方材料清單填寫調撥數量、備註及領料日期，再填寫以下收件人資訊。
              </p>
            </div>
            <div class="flex justify-center">
              <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 w-full max-w-sm">
                <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <div class="w-1 h-5 bg-red-600 rounded-full"></div>
                  <span class="text-sm font-bold text-slate-700">Recipient / 收件人</span>
                </div>

                <input
                  v-model="signatureNames.recipient"
                  type="text"
                  placeholder="Recipient Name / 收件人姓名"
                  class="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 max-w-xs"
                />
                <input
                  v-model="recipientCompanyName"
                  type="text"
                  placeholder="Company Name / 公司名稱"
                  class="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 max-w-xs"
                />
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-slate-600">Attach Recipient ID / 附上收件人證件照片</label>
                  <div class="flex gap-2 flex-wrap">
                    <button type="button" @click="openCamera('recipient')" class="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      Take Photo / 拍照
                    </button>
                    <button type="button" @click="triggerFilePicker" class="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Choose File / 選擇檔案
                    </button>
                    <input :ref="el => setRecipientIdFileInputRef(el)" type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.tiff,.gif" @change="handleRecipientIdChange" class="hidden" />
                  </div>
                  <div v-if="recipientIdImage" class="flex items-center gap-2 mt-1">
                    <img :src="recipientIdImage" class="max-h-24 rounded-lg border border-gray-200 object-contain" />
                    <button type="button" @click="clearRecipientId" class="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors self-start">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Remove / 移除
                    </button>
                  </div>
                  <span v-if="recipientIdFileName" class="text-xs text-emerald-600">{{ recipientIdFileName }}</span>
                </div>
                <canvas
                  :ref="el => setCanvasRef(el, 'recipient')"
                  width="220" height="90"
                  class="border-2 border-red-200 border-dashed rounded-xl bg-white w-full max-w-xs touch-none cursor-crosshair"
                  @mousedown="startDraw('recipient', $event)" @mouseup="stopDraw('recipient')"
                  @mouseleave="stopDraw('recipient')" @mousemove="draw('recipient', $event)"
                  @touchstart.prevent="startDraw('recipient', $event)" @touchmove.prevent="draw('recipient', $event)"
                  @touchend.prevent="stopDraw('recipient')"
                ></canvas>
                <button type="button" @click="clearSignature('recipient')" class="text-xs text-slate-400 hover:text-red-500 underline transition-colors self-start">
                  Clear / 清除
                </button>
              </div>
            </div>

            </template><!-- end v-else recipientSigningStarted -->
          </template><!-- end recipient stage -->

          <!-- Requester and approver stages -->
          <template v-else>
            <template v-for="sig in signatures" :key="sig.key">
              <div v-if="sigState(sig.key) === 'active'" class="flex flex-col items-center gap-2 max-w-sm mx-auto">
                <p class="text-sm text-slate-500 mb-1 text-center">Draw in the box using your mouse or touchscreen. Click <em>Clear</em> to redo.</p>
 
                <!-- Approver: action required disclaimer -->
                <template v-if="sig.key === 'approver'">
                  <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 flex flex-col gap-2.5">
                    <div class="flex items-start gap-2">
                      <span class="text-amber-500 text-base leading-none mt-0.5 shrink-0">⚠</span>
                      <div class="flex flex-col gap-0.5">
                        <p class="text-xs font-bold text-amber-800">Action Required / 需要操作</p>
                        <p class="text-xs text-amber-700 leading-relaxed">
                          Review this request and <strong>Approve</strong> or <strong>Decline</strong> it.
                          Declining stops the workflow and requires a written reason.
                          / 審查申請並選擇<strong>批准</strong>或<strong>拒絕</strong>。拒絕將停止流程並需填寫原因。
                        </p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button type="button" @click="approverDecision = 'approved'"
                        class="flex-1 py-1.5 text-xs font-bold rounded-lg border-2 transition-colors"
                        :class="approverDecision === 'approved' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-green-400 hover:text-green-700'"
                      >✓ Approve / 批准</button>
                      <button type="button" @click="approverDecision = 'declined'"
                        class="flex-1 py-1.5 text-xs font-bold rounded-lg border-2 transition-colors"
                        :class="approverDecision === 'declined' ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-red-400 hover:text-red-700'"
                      >✕ Decline / 拒絕</button>
                    </div>
                    <div v-if="approverDecision" class="flex flex-col gap-1">
                      <label class="text-xs font-semibold text-slate-700">Name / 姓名</label>
                      <input
                        v-model="signatureNames[sig.key]"
                        type="text"
                        placeholder="Name / 姓名"
                        :readonly="userMatchesStage && sig.key === currentStage"
                        class="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                        :class="userMatchesStage && sig.key === currentStage ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''"
                      />
                    </div>
                    <div v-if="approverDecision === 'declined'" class="flex flex-col gap-1">
                      <label class="text-xs font-semibold text-red-700">
                        Reason for Decline <span class="font-normal text-red-500">*</span>
                        <span class="font-normal text-slate-400 ml-1">拒絕原因</span>
                      </label>
                      <textarea v-model="declineReason" placeholder="Describe why this request is being declined… / 說明拒絕原因…" rows="3" class="form-input resize-none text-xs"></textarea>
                    </div>
                  </div>
                </template>

                <input
                  v-if="sig.key !== 'approver'"
                  v-model="signatureNames[sig.key]"
                  type="text"
                  placeholder="Name / 姓名"
                  :readonly="userMatchesStage && sig.key === currentStage"
                  class="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                  :class="userMatchesStage && sig.key === currentStage ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''"
                />
                <p v-if="userMatchesStage && user && sig.key === currentStage && (sig.key !== 'approver' || approverDecision === 'approved')" class="text-xs text-slate-400 -mt-1">
                  {{ user.email }} · {{ user.company }}
                </p>



                <template v-if="sig.key !== 'approver' || approverDecision === 'approved'">
                  <canvas
                    :ref="el => setCanvasRef(el, sig.key)"
                    width="220" height="90"
                    class="border-2 border-red-200 border-dashed rounded-xl bg-white w-full touch-none cursor-crosshair"
                    @mousedown="startDraw(sig.key, $event)" @mouseup="stopDraw(sig.key)"
                    @mouseleave="stopDraw(sig.key)" @mousemove="draw(sig.key, $event)"
                    @touchstart.prevent="startDraw(sig.key, $event)" @touchmove.prevent="draw(sig.key, $event)"
                    @touchend.prevent="stopDraw(sig.key)"
                  ></canvas>
                  <button type="button" @click="clearSignature(sig.key)" class="text-xs text-slate-400 hover:text-red-500 underline transition-colors self-start">Clear / 清除</button>
                </template>
              </div>
            </template>
          </template>

        </div>
        </div>
      </div>

      <!-- Section 3.1: Partial Delivery Signatures -->
      <div v-if="isPartialDeliveryMode && pdAcknowledged">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-1 h-6 bg-red-600 rounded-full"></div>
          <h2 class="text-base font-bold text-slate-800 uppercase tracking-wider">
            Partial Delivery Sign-off <span class="text-slate-400 font-normal normal-case tracking-normal">/
              部分交貨簽核</span>
          </h2>
        </div>
        <div v-if="!pdOutboundSaved" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p class="text-xs text-amber-700 leading-relaxed font-medium">
            Enter the Transfer Qty for this delivery in the materials table above, then use
            <strong>Create Outbound Items</strong> to record it. Signing unlocks afterwards and the quantities are final.
            / 請先在上方材料清單填寫本次調撥數量，並點擊<strong>創建出庫記錄</strong>。之後即可簽收，數量將無法修改。
          </p>
        </div>

        <!-- PD Recipient signature block -->
        <div v-if="pdOutboundSaved" class="mb-4 flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <!-- Recorded here rather than at acknowledgement: this is the day the batch was
               actually collected, so it's only known once it's being signed for. -->
          <div class="flex flex-wrap items-end gap-4 pb-4 border-b border-slate-200">
            <div class="flex flex-col gap-1.5">
              <label class="form-label text-slate-800">
                PD Date {{ pdVersion }} <span class="label-zh text-slate-400">部分交貨日期 {{ pdVersion }}</span>
                <span class="text-red-500 ml-0.5">*</span>
              </label>
              <input v-model="updateDate" type="date" class="form-input" />
            </div>
            <p class="text-xs text-slate-500 pb-1 flex-1 min-w-[220px]">
              The date this delivery was collected. Recorded in Smartsheet and stamped on the updated PDF.
              / 本次取貨日期，將記錄在 Smartsheet 並印在更新的 PDF 上。
            </p>
          </div>
          <div class="flex flex-wrap gap-6 items-start">
            <!-- Name + Company -->
            <div class="flex flex-col gap-3 flex-1 min-w-[240px]">
              <div class="flex flex-col gap-1.5">
                <label class="form-label text-slate-800">Recipient Name <span
                    class="font-normal text-slate-400">收件人姓名</span> <span class="text-red-500">*</span></label>
                <input v-model="pdRecipientName" type="text" placeholder="Full name / 全名" class="form-input" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="form-label text-slate-800">Company Name <span
                    class="font-normal text-slate-400">公司名稱</span> <span class="text-red-500">*</span></label>
                <input v-model="pdRecipientCompany" type="text" placeholder="Company / 公司" class="form-input" />
              </div>
              <!-- ID Image -->
              <div class="flex flex-col gap-1">
                <label class="form-label text-slate-800">Recipient ID / 收件人證件照片 <span
                    class="text-red-500">*</span></label>
                <div class="flex gap-2 flex-wrap">
                  <button type="button" @click="openCamera('pd')"
                    class="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Take Photo / 拍照
                  </button>
                  <button type="button" @click="triggerPdFilePicker"
                    class="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Choose File / 選擇檔案
                  </button>
                  <input :ref="el => setPdRecipientIdFileInputRef(el)" type="file"
                    accept="image/*,.png,.jpg,.jpeg,.webp,.tiff,.gif" @change="handlePdRecipientIdChange"
                    class="hidden" />
                </div>
                <div v-if="pdRecipientIdImage" class="flex items-center gap-2 mt-1">
                  <img :src="pdRecipientIdImage" class="max-h-20 rounded-lg border border-slate-200 object-contain" />
                  <button type="button" @click="clearPdRecipientId"
                    class="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors self-start">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Remove / 移除
                  </button>
                </div>
                <span v-if="pdRecipientIdFileName" class="text-xs text-emerald-600">{{ pdRecipientIdFileName }}</span>
              </div>
            </div>
            <!-- Signature canvas -->
            <div class="flex flex-col gap-2 flex-1 min-w-[240px]">
              <label class="form-label text-slate-800">Recipient Signature / 收件人簽名 <span
                  class="text-red-500">*</span></label>
              <canvas :ref="el => setCanvasRef(el, 'pdRecipient')" width="220" height="90"
                class="border-2 border-slate-300 border-dashed rounded-xl bg-white w-full touch-none cursor-crosshair"
                @mousedown="startDrawPd($event)" @mouseup="stopDrawPd()" @mouseleave="stopDrawPd()"
                @mousemove="drawPd($event)" @touchstart.prevent="startDrawPd($event)"
                @touchmove.prevent="drawPd($event)" @touchend.prevent="stopDrawPd()"></canvas>
              <button type="button" @click="clearSignature('pdRecipient')"
                class="text-xs text-slate-400 hover:text-red-500 underline transition-colors self-start">
                Clear / 清除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Toast notifications ── -->
      <Teleport to="body">
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 pointer-events-none items-center">
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

      <!-- ── Submit ── -->
      <div v-if="canSeeSignatureCard" class="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <button
          type="button"
          @click="exitWithoutSaving"
          class="px-6 py-3 text-base font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all w-full sm:w-auto"
        >
          Exit without saving / 不儲存離開
        </button>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <!-- Save Progress (warehouse step only) -->
          <button
            v-if="currentStage === 'warehouse'"
            type="button"
            @click="handleSaveProgressClick"
            :disabled="savingProgress || submitting"
            class="px-6 py-3 text-base font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <svg v-if="savingProgress" class="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ savingProgress ? 'Saving…' : 'Save Progress / 儲存進度' }}
          </button>
          <!-- Main submit / sign button -->
          <div v-if="(!isSignMode || currentStage) && !isDeclined && (currentStage !== 'recipient' || recipientSigningStarted)"
               class="flex flex-col items-center gap-1 w-full sm:w-auto">
            <button
              type="button"
              @click="submitForm"
              :disabled="submitting || (currentStage === 'recipient' && hasManualItems && !inboundProgressSaved)"
              class="px-10 py-3 text-base font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg
                v-if="submitting"
                class="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ submitButtonLabel }}
            </button>
            <span
              v-if="currentStage === 'recipient' && hasManualItems && !inboundProgressSaved"
              class="text-xs text-slate-500 font-medium text-center"
            >Create Outbound Items first / 請先創建出庫記錄</span>
          </div>

          <!-- Partial delivery update button -->
          <button
            v-if="isPartialDeliveryMode && pdAcknowledged && pdOutboundSaved"
            type="button"
            @click="submitTransferUpdate"
            :disabled="submitting || !pdOutboundSaved"
            class="px-10 py-3 text-base font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <svg v-if="submitting" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span v-if="isPartialDeliveryMode">
              {{ submitting ? 'Completing… / 完成中…' : 'Complete Current Partial Delivery / 完成當前部分交貨' }}
            </span>
            <span v-else>
              {{ submitting ? 'Updating… / 更新中…' : 'Update Transfer Qty / 更新調撥數量' }}
            </span>
          </button>
        </div>
      </div>

    </div><!-- /p-8 -->
  </div>

  <ConfirmModal
    v-model="showExitModal"
    title="Exit without saving? / 不儲存離開？"
    message="All unsaved data will be lost. / 所有未儲存的資料將會遺失。"
    confirm-label="Exit / 離開"
    cancel-label="Stay / 留下"
    :destructive="true"
    @confirm="onExitConfirm"
    @cancel="showExitModal = false"
  />

  <ConfirmModal
    v-model="showNoShowModal"
    title="Confirm Recipient No-Show / 確認收件人未到場"
    message="This will record that the recipient did not show up for the scheduled pickup. The transmittal status will be flagged for supervisory review and will remain awaiting the recipient step. / 此操作將記錄收件人未按預定時間到場取貨，該轉運單狀態將被標記以供主管審查，並將維持在等待收件人的步驟。"
    confirm-label="Confirm No-Show / 確認未到場"
    cancel-label="Cancel / 取消"
    :destructive="true"
    @confirm="confirmNoShow"
    @cancel="showNoShowModal = false"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmModal from './ConfirmModal.vue'
import { user } from '../composables/useAuth.js'
import { effectiveRole, hasRole } from '../utils/roles.js'

const props = defineProps({
  id: { type: String, default: null }
})

const router = useRouter()


// ----- Signature workflow -----
const STAGE_LABELS = {
  requester: 'Requester',
  approver: 'Approver',
  warehouse: 'Warehouse',
  recipient: 'Recipient'
}

const isSignMode = computed(() => !!props.id)

// Reads the raw role, not effectiveRole: testing resolves to admin everywhere else, and this
// button is the one thing an admin must not get.
const isTesting = computed(() => user.value?.role === 'testing')

// Maps the stage name to the role that should act on it
const STAGE_ROLE = { approver: 'warehouse', warehouse: 'recipient' }

// Roles that can see all stages (approver + admin-level)
const FULL_ACCESS_ROLES = new Set(['admin', 'approver'])

const fullAccess = computed(() =>
  !user.value?.role || FULL_ACCESS_ROLES.has(effectiveRole(user.value))
)

// Whether this user can see + interact with the active signature card.
// Stage names are offset: warehouse role acts at 'recipient' stage.
const canSeeSignatureCard = computed(() => {
  if (!isSignMode.value) return true
  if (fullAccess.value) return true
  if (!currentStage.value) return false // completed, nothing to show
  const role = effectiveRole(user.value)
  if (role === 'warehouse') return currentStage.value === 'warehouse' || currentStage.value === 'recipient'
  return true
})

// True when the logged-in user's role matches the stage they are being asked to sign
const userMatchesStage = computed(() =>
  isSignMode.value &&
  !!user.value &&
  !!currentStage.value &&
  STAGE_ROLE[currentStage.value] === user.value.role
)
const loading = ref(isSignMode.value)
const loadError = ref(null)
const signatureStatus = ref(null)
const signedStages = ref([])
const currentStage = ref(isSignMode.value ? null : 'requester')
const isDeclined = ref(false)
const approverDecision = ref(null)   // null | 'approved' | 'declined'
const declineReason = ref('')
const savingProgress = ref(false)
const transmittalStatus = ref(null)
const rowErrors = ref({})

const expandedHistory = ref(new Set())

function toggleHistory(childRowId) {
  const next = new Set(expandedHistory.value)
  next.has(childRowId) ? next.delete(childRowId) : next.add(childRowId)
  expandedHistory.value = next
}

function deliveredTotal(row) {
  return (row.deliveryHistory || []).reduce((sum, h) => sum + Number(h.transferQty || 0), 0)
}

function hasHistory(row) {
  return isPartialDeliveryMode.value && (row.deliveryHistory?.length ?? 0) > 0
}

function initialEntry(row) {
  return (row.deliveryHistory || [])[0] ?? null
}

function laterEntries(row) {
  return (row.deliveryHistory || []).slice(1)
}

function onRowClick(row, event) {
  if (!hasHistory(row)) return
  if (event.target.closest('input, textarea, select, button, a, label')) return
  toggleHistory(row.childRowId)
}
const updateDate = ref('')
const pdVersion = ref(1)
// 'acknowledgement' until the recipient has been emailed the pickup details, then 'signoff'.
const pdStage = ref(null)
const acknowledging = ref(false)
// Outbound rows for the current batch are written before signing, so the sign-off request
// carries only form data. Reset whenever a quantity changes so an edited batch can't be
// signed against inventory rows that no longer match.
const savingPdOutbound = ref(false)
// TPN -> total qty already written as Outbound for this transmittal, read back from the
// warehouse sheet rather than remembered client-side, so a refresh mid-batch doesn't offer
// to record the same movement twice.
const pdOutboundRecorded = ref({})

// From the audit log: an outbound batch exists that has not been signed off yet. This used
// to be inferred by comparing outbound totals in the inbound sheet against the delivered qty
// on the transmittal, which only holds when every past batch left matching rows - one
// missing or TPN-less row offset it permanently. This was fucking nasty on prod
const pdOutboundPending = ref(false)

// Opens the step without waiting for a reload. The log above is what a refresh comes back to.
const pdOutboundJustSaved = ref(false)
const pdAcknowledged = computed(() => pdStage.value === 'signoff')
const acknowledgeName = ref('')

// Pickup timeframe (warehouse stage only) — two time inputs combined into one string for Smartsheet
// Standard warehouse hours, pre-filled for the warehouse step so the common case needs no
// typing. Only a default - the fields stay editable and a saved value always wins.
const DEFAULT_PICKUP_START = '08:00'
const DEFAULT_PICKUP_END = '17:00'

const pickupTimeStart = ref('')
const pickupTimeEnd = ref('')
const pickupTimeframe = computed(() =>
  (pickupTimeStart.value && pickupTimeEnd.value) ? `${pickupTimeStart.value} - ${pickupTimeEnd.value}` : ''
)

// Pickup details for the current PD batch. Kept separate from the warehouse-stage
// pickup fields: those describe the original scheduled pickup, these describe where
// and when this particular partial delivery was handed over.
const pdDatePickup = ref('')
const pdPickupLocation = ref('')
const pdPickupTimeStart = ref('')
const pdPickupTimeEnd = ref('')
const pdPickupTimeframe = computed(() =>
  (pdPickupTimeStart.value && pdPickupTimeEnd.value) ? `${pdPickupTimeStart.value} - ${pdPickupTimeEnd.value}` : ''
)

// PD recipient fields (partial delivery update step)
const pdRecipientName = ref('')
const pdRecipientCompany = ref('')
const pdRecipientIdImage = ref(null)
const pdRecipientIdFileName = ref('')
let pdRecipientIdFileInputEl = null
function setPdRecipientIdFileInputRef(el) { pdRecipientIdFileInputEl = el }
function triggerPdFilePicker() { pdRecipientIdFileInputEl?.click() }
function clearPdRecipientId() {
  pdRecipientIdImage.value = null
  pdRecipientIdFileName.value = ''
  if (pdRecipientIdFileInputEl) pdRecipientIdFileInputEl.value = ''
}
function handlePdRecipientIdChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!ALLOWED_ID_IMAGE_TYPES.includes(file.type)) {
    alert('Please select a PNG, JPG, JPEG, WEBP, TIFF or GIF image. / 請選擇圖片格式。')
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    pdRecipientIdImage.value = reader.result
    pdRecipientIdFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

const canEditItems = computed(() =>
  isSignMode.value && currentStage.value === 'warehouse'
)

const warehouseAlreadySigned = computed(() =>
  currentStage.value === 'warehouse' &&
  !!acknowledgeName.value?.trim() &&
  !!signatureImages.value?.warehouse
)


const isPartialDeliveryMode = computed(() =>
  isSignMode.value &&
  signatureStatus.value === 'Completed' &&
  transmittalStatus.value === 'Material Partially Delivered' &&
  hasRole(user.value, 'warehouse', 'admin')
)

function isRowEditableInPartialDelivery(row) {
  return isPartialDeliveryMode.value
    && pdAcknowledged.value
    && row.transmittalStatus === 'Material Partially Delivered'
    && !row._fullyDelivered
}

function isTransferQtyDisabled(row) {
  if (isRowEditableInPartialDelivery(row)) return false
  if (!['warehouse', 'recipient'].includes(currentStage.value)) return true
  return currentStage.value === 'recipient' && !!inboundAutoFilled.value[row.childRowId]
}

// Progress strip: 4 steps — requester, approver, warehouse, recipient
const progressSteps = [
  { key: 'requester', label: 'Requester / 申請人' },
  { key: 'approver',  label: 'Approver / 核准人'  },
  { key: 'warehouse', label: 'Warehouse / 倉庫'   },
  { key: 'recipient', label: 'Recipient / 收件人'  },
]

function progressSigState(key) {
  return sigState(key)
}

function progressSignerName(key) {
  return signatureNames[key] || ''
}

const activeStepTitle = computed(() => {
  const step = progressSteps.find(s => s.key === currentStage.value)
  return step?.label ?? ''
})

function sigState(key) {
  if (signedStages.value.includes(key)) return 'signed'
  if (key === currentStage.value) return 'active'
  return 'pending'
}

const recipientIdImageUrl = computed(() => `/api/transmittals/${props.id}/recipient-id`)

const submitButtonLabel = computed(() => {
  if (!isSignMode.value) return submitting.value ? 'Submitting… / 提交中…' : 'Submit Form / 提交'
  if (submitting.value) return 'Saving…'
  if (currentStage.value === 'approver' && approverDecision.value === 'declined') return 'Decline & Sign / 拒絕並簽名'
  if (currentStage.value === 'approver' && approverDecision.value === 'approved') return 'Approve & Sign / 批准並簽名'
  if (currentStage.value === 'warehouse') return 'Sign as Warehouse / 倉庫簽名'
  if (currentStage.value === 'recipient') return 'Sign as Recipient / 收件人簽名'
  return `Sign as ${STAGE_LABELS[currentStage.value]}`
})

// ----- Header form state -----
const form = reactive({
  company: '',
  boq: '',
  dateApplication: '',
  applicationResults: '',
  applicantName: '',
  requestorEmail: '',
  dateNeeded: '',
  datePicking: '',
  reason: '',
  pickupLocation: '',
  remark: '',
  comments: '',
  datePickup: '',
  urgency: false,
  urgencyLevel: '',
  urgencyReason: ''
})

// Must match the "Urgency Level options in Smartsheet
const URGENCY_LEVELS = ['Low / 低度', 'Medium / 中度', 'High / 高度']

function displayDate(iso) {
  const [year, month, day] = String(iso ?? '').split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const today = toLocalDateStr(new Date())

const urgentMaxDateNeeded = computed(() => {
  if (!form.dateApplication) return undefined
  const d = new Date(form.dateApplication + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return toLocalDateStr(d)
})

watch(() => [form.urgency, form.dateApplication], () => {
  if (!form.urgency || !form.dateApplication || !form.dateNeeded) return
  if (form.dateNeeded < form.dateApplication || form.dateNeeded > urgentMaxDateNeeded.value) {
    form.dateNeeded = ''
  }
})

// Convenience default: picking an application date pre-fills Date Needed By two days
// later. Skipped when Urgent is on — that mode has its own same-day/next-day window,
// and the watch above would just wipe an out-of-range value anyway.
watch(() => form.dateApplication, (value) => {
  if (isSignMode.value || form.urgency || !value) return
  const d = new Date(value + 'T00:00:00')
  d.setDate(d.getDate() + 2)
  form.dateNeeded = toLocalDateStr(d)
})

// Unchecking Urgent clears its dependent fields so stale level/reason never submit.
watch(() => form.urgency, (isUrgent) => {
  if (!isUrgent) {
    form.urgencyLevel = ''
    form.urgencyReason = ''
  }
})

// ----- Materials listue -----
const materials = ref([])
const activeRow = ref(null)
// Which cell opened the catalogue dropdown - the list leads with whatever was searched on.
const activeField = ref('description')
const dropdownPos = ref({ top: 0, left: 0, width: 0 })
let anchorEl = null

const materialsLoading = ref(false)
const materialsError = ref('')

// The catalog read is a full-sheet pull from Smartsheet and does fail now and then. A failed
// load used to leave the dropdown on "No matches found" until the page was reloaded - and a
// 502 body, being an object, would even break the filter. So: retry, keep an array no matter
// what, and let the dropdown offer a retry.
// Esta esta kbrona, le quedo ccingona al claudio
async function loadMaterials({ attempts = 3 } = {}) {
  if (materialsLoading.value) return
  materialsLoading.value = true
  materialsError.value = ''

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch('/api/materials', { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data?.message || data?.error || `Materials list returned ${res.status}`)
      }
      materials.value = data
      materialsLoading.value = false
      return
    } catch (e) {
      console.warn(`Could not load materials list (attempt ${attempt}/${attempts}):`, e.message)
      if (attempt < attempts) await new Promise(r => setTimeout(r, 800 * attempt))
      else materialsError.value = e.message || 'Could not load the materials list.'
    }
  }

  materialsLoading.value = false
}

onMounted(async () => {
  if (isSignMode.value) {
    await loadTransmittal()
  } else {
    await loadMaterials()
    await nextTick()
    captureBlankSnapshots()
  }

  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('scroll', repositionDropdown, true)
  window.addEventListener('resize', repositionDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('scroll', repositionDropdown, true)
  window.removeEventListener('resize', repositionDropdown)
  cameraStream?.getTracks().forEach(track => track.stop())
})

function handleOutsideClick(event) {
  if (
    !event.target.closest('.desc-dropdown-cell') &&
    !event.target.closest('.material-dropdown')
  ) {
    closeDropdown()
  }
}

function repositionDropdown() {
  if (!activeRow.value || !anchorEl) return
  const rect = anchorEl.getBoundingClientRect()
  dropdownPos.value = {
    top: rect.bottom + 2,
    left: rect.left,
    width: Math.max(rect.width, 288)
  }
}

function closeDropdown() {
  activeRow.value = null
  anchorEl = null
}

// Trimmed so a trailing space does not turn a good query into "No matches found"
function filterMaterials(search) {
  const q = String(search ?? '').trim().toLowerCase()
  if (!q) return materials.value
  return materials.value.filter(m =>
    [m.description, m.partNumber]
      .some(v => String(v ?? '').toLowerCase().includes(q))
  )
}

// Part numbers the catalog does not carry. Returns null when a row has no part number at all,
// which cannot be checked against anything. An empty catalog returns no complaints: the list
// may simply have failed to load, and the server checks again before writing anything.
function unknownPartNumbers() {
  const entered = tableRows.value.map(row => String(row.partNumber ?? '').trim())
  if (entered.some(pn => !pn)) return null
  if (!materials.value.length) return []

  const known = new Set(
    materials.value.map(m => String(m.partNumber ?? '').trim().toUpperCase())
  )
  const missing = entered.filter(pn => !known.has(pn.toUpperCase()))
  return [...new Set(missing)]
}

// The same catalogue dropdown hangs off two cells - part number and description. `field` says
// which one opened it, so the typed text lands in that cell and seeds the search from it.
function openRowDropdown(row, event, field = 'description') {
  if (isSignMode.value) return
  // Opening the list is the natural moment to recover from a failed load
  if (materials.value.length === 0 && !materialsLoading.value) loadMaterials()
  row._search = row[field]
  activeField.value = field
  anchorEl = event.target
  activeRow.value = row
  repositionDropdown()
}

function onSearchInput(row, event, field = 'description') {
  if (isSignMode.value) return

  // A leading space is easy to pick up from a scanner or a paste and matches nothing, so it
  // never makes it into the field. Written back to the DOM because when the stripped value
  // equals what is already bound, Vue sees no change and leaves the stray space on screen.
  const value = String(event.target.value).replace(/^\s+/, '')
  if (event.target.value !== value) event.target.value = value

  row[field] = value
  row._search = value
  activeField.value = field
  anchorEl = event.target
  activeRow.value = row
  repositionDropdown()
}

function selectMaterial(row, mat) {
  row.partNumber  = mat.partNumber
  row.type        = mat.type
  row.description = mat.description
  row.product     = mat.product
  row.unit        = mat.unit
  row.warehouse   = mat.warehouse
  row._search     = mat.description
  closeDropdown()
}

// ----- Table rows -----
let nextId = 1
const tableRows = ref(
  isSignMode.value ? [] : Array.from({ length: 1 }, () => createEmptyRow())
)

function createEmptyRow() {
  return {
    id: nextId++,
    _open: false,
    _search: '',
    partNumber: '',
    type: '',
    description: '',
    product: '',
    unit: '',
    qty: '',
    warehouse: '',
    transferQty: '',
    remarks: ''
  }
}

function addRow() {
  tableRows.value.push(createEmptyRow())
}

function deleteRow(id) {
  tableRows.value = tableRows.value.filter(r => r.id !== id)
}

async function saveInboundProgress() {
  if (savingInbound.value) return
  const filled = tableRows.value.filter(
    r => !inboundAutoFilled.value[r.childRowId] && String(r.transferQty ?? '').trim()
  ).map(r => ({ partNumber: r.partNumber, transferQty: r.transferQty, qty: r.qty }))

  const hasExistingOutbound = tableRows.value.some(r => inboundAutoFilled.value[r.childRowId])

  if (filled.length === 0) {
    if (hasExistingOutbound) {
      inboundProgressSaved.value = true
      inboundSaveStatus.value = 'ok'
      showToast('Outbound already recorded — nothing left to create. / 出庫已登記，無需重複建立。')
      setTimeout(() => { inboundSaveStatus.value = null }, 4000)
      return
    }
    showToast('No manual items with Transfer Qty to save. / 沒有可保存的手動項目。', 'warning')
    return
  }

  for (const item of filled) {
    const tqty = Number(item.transferQty)
    if (!Number.isFinite(tqty) || tqty < 0) {
      showToast(`Invalid Transfer Qty for ${item.partNumber || 'an item'}. Cannot be negative. / 調撥數量不可為負數。`, 'error')
      return
    }
    const maxQty = Number(item.qty)
    if (Number.isFinite(maxQty) && tqty > maxQty) {
      showToast(`Transfer Qty for ${item.partNumber || 'an item'} exceeds ordered Qty (${maxQty}). / 調撥數量超過訂購數量。`, 'error')
      return
    }
  }

  const manualItems = filled.filter(item => Number(item.transferQty) > 0)
  if (manualItems.length === 0) {
    if (hasExistingOutbound) {
      inboundProgressSaved.value = true
      inboundSaveStatus.value = 'ok'
      showToast('Outbound already recorded — nothing left to create. / 出庫已登記，無需重複建立。')
      setTimeout(() => { inboundSaveStatus.value = null }, 4000)
      return
    }
    showToast('At least one item must have a Transfer Qty greater than 0. / 至少一個項目的調撥數量必須大於 0。', 'warning')
    return
  }

  savingInbound.value = true
  inboundSaveStatus.value = null
  try {
    const res = await fetch(`/api/transmittals/${props.id}/save-inbound`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: manualItems }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to save.')
    inboundSaveStatus.value = 'ok'
    await loadTransmittal()
    inboundProgressSaved.value = true
    setTimeout(() => { inboundSaveStatus.value = null }, 4000)
  } catch (err) {
    inboundSaveStatus.value = 'error'
    showToast(err.message || 'Failed to save to inbound sheet.', 'error')
  } finally {
    savingInbound.value = false
  }
}

// ----- Signatures -----
const signatures = [
  { key: 'requester', label: 'Requester / 申請人' },
  { key: 'approver', label: 'Approver / 核准人' },
  { key: 'warehouse', label: 'Warehouse / 倉庫' },
  { key: 'recipient', label: 'Recipient / 收件人' }
]

const signatureNames = reactive(
  Object.fromEntries(signatures.map(sig => [sig.key, '']))
)

const canvasRefs = {}
const drawingState = {}
const blankSnapshots = {}

// ----- Recipient ID image -----
const ALLOWED_ID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/tiff', 'image/gif']
const recipientIdImage = ref(null)
const recipientIdFileName = ref('')
const recipientCompanyName = ref('')
const hasRecipientId = ref(false)
const recipientSigningStarted = ref(false)
const signatureImages = ref({})
const inboundAutoFilled     = ref({})
const savingInbound         = ref(false)
const inboundSaveStatus     = ref(null) // 'ok' | 'error' | null
const inboundProgressSaved  = ref(false)

const hasManualItems = computed(() =>
  tableRows.value.some(r => !inboundAutoFilled.value[r.childRowId])
)
// Plain (non-reactive) ref — `ref="x"` inside v-for would make x.value an array.
let recipientIdFileInputEl = null
function setRecipientIdFileInputRef(el) {
  recipientIdFileInputEl = el
}
function triggerFilePicker() {
  recipientIdFileInputEl?.click()
}

function clearRecipientId() {
  recipientIdImage.value = null
  recipientIdFileName.value = ''
  if (recipientIdFileInputEl) recipientIdFileInputEl.value = ''
}

// ----- Camera capture (recipient ID — regular or partial-delivery) -----
const showCamera = ref(false)
const cameraVideo = ref(null)
let cameraStream = null
let cameraTarget = 'recipient' // 'recipient' | 'pd'

async function openCamera(target = 'recipient') {
  cameraTarget = target
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  } catch {
    alert('Could not access camera. / 無法存取相機。')
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
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  const dataUrl = canvas.toDataURL('image/png')
  const fileName = `photo-${Date.now()}.png`
  if (cameraTarget === 'pd') {
    pdRecipientIdImage.value = dataUrl
    pdRecipientIdFileName.value = fileName
  } else {
    recipientIdImage.value = dataUrl
    recipientIdFileName.value = fileName
  }
  closeCamera()
}

function handleRecipientIdChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!ALLOWED_ID_IMAGE_TYPES.includes(file.type)) {
    alert('Please select a PNG, JPG, JPEG, WEBP, TIFF or GIF image. / 請選擇 PNG、JPG、JPEG、WEBP、TIFF 或 GIF 圖片。')
    event.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    recipientIdImage.value = reader.result
    recipientIdFileName.value = file.name
  }
  reader.readAsDataURL(file)
}

function captureBlankSnapshots() {
  for (const key of Object.keys(canvasRefs)) {
    blankSnapshots[key] = canvasRefs[key].toDataURL()
  }
}

function setCanvasRef(el, key) {
  if (el) canvasRefs[key] = el
}

// Works for both mouse and touch events. Canvas is drawn at a fixed
// internal resolution (220x90) but stretched to fill its container via
// `w-full`, so client coords must be rescaled to canvas pixel space.
function getEventPos(canvas, event) {
  const rect = canvas.getBoundingClientRect()
  const point = event.touches?.[0] ?? event.changedTouches?.[0] ?? event
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY,
  }
}

function startDraw(key, event) {
  if (key !== currentStage.value) return
  drawingState[key] = true
  const canvas = canvasRefs[key]
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  ctx.beginPath()
  const { x, y } = getEventPos(canvas, event)
  ctx.moveTo(x, y)
}

function stopDraw(key) {
  drawingState[key] = false
  const ctx = canvasRefs[key]?.getContext('2d')
  if (ctx) ctx.beginPath()
}

function draw(key, event) {
  if (key !== currentStage.value) return
  if (!drawingState[key]) return
  const canvas = canvasRefs[key]
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  const { x, y } = getEventPos(canvas, event)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#1e293b'
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

// PD recipient canvas draw — separate handlers because currentStage is null in partial delivery mode
let pdDrawing = false
function startDrawPd(event) {
  pdDrawing = true
  const canvas = canvasRefs['pdRecipient']
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  ctx.beginPath()
  const { x, y } = getEventPos(canvas, event)
  ctx.moveTo(x, y)
}
function stopDrawPd() {
  pdDrawing = false
  const ctx = canvasRefs['pdRecipient']?.getContext('2d')
  if (ctx) ctx.beginPath()
}
function drawPd(event) {
  if (!pdDrawing) return
  const canvas = canvasRefs['pdRecipient']
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  const { x, y } = getEventPos(canvas, event)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#1e293b'
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function clearSignature(key) {
  const canvas = canvasRefs[key]
  if (!canvas) return
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
}

// ----- Load existing transmittal (sign mode) -----
async function loadTransmittal() {
  loading.value = true
  loadError.value = null
  try {
    const res = await fetch(`/api/transmittals/${props.id}`, { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to load transmittal.')

    Object.assign(form, data.form)
    const isPDMode = data.transmittalStatus === 'Material Partially Delivered'
    tableRows.value = data.items.map(item => {
      const smartsheetDelivered = Number(item.transferQty || 0)
      const originalQty         = Number(item.qty || 0)
      const isPartialRow        = isPDMode && item.transmittalStatus === 'Material Partially Delivered'
      const _fullyDelivered     = isPDMode && originalQty > 0 && smartsheetDelivered >= originalQty
      const hasPDHistory        = (item.deliveryHistory?.length ?? 0) > 0
      const shouldZero          = isPartialRow || _fullyDelivered
      return {
        id: nextId++,
        _open: false,
        _search: '',
        ...item,
        _fullyDelivered,
        _smartsheetDelivered: smartsheetDelivered,
        transferQty: shouldZero ? '0' : item.transferQty,
      }
    })
    rowErrors.value = {}
    Object.assign(signatureNames, data.signatureNames)
    recipientCompanyName.value = data.signatureNames.recipientCompanyName || ''
    signatureStatus.value = data.signatureStatus
    transmittalStatus.value = data.transmittalStatus || null
    pdVersion.value = data.pdVersion ?? 1
    pdStage.value = data.pdStage ?? null
    pdOutboundPending.value = data.pdOutboundPending ?? false
    if (pdStage.value) {
      pdOutboundJustSaved.value = false
      await loadPdOutboundRecorded()
      tableRows.value.forEach(row => {
        const pending = Number(pdOutboundRecorded.value[row.partNumber] ?? 0)
                      - Number(row._smartsheetDelivered ?? 0)
        if (pending > 0) row.transferQty = String(pending)
      })
    }
    if (pdStage.value === 'signoff') {
      pdDatePickup.value      = data.pdDatePickup      || pdDatePickup.value
      pdPickupLocation.value  = data.pdPickupLocation  || pdPickupLocation.value
      const [start, end]      = String(data.pdPickupTimeframe || '').split(' - ')
      if (start) pdPickupTimeStart.value = start
      if (end)   pdPickupTimeEnd.value   = end
    }
    signedStages.value = data.signedStages
    hasRecipientId.value = data.hasRecipientId
    currentStage.value = data.currentStage
    isDeclined.value = data.isDeclined || false

    // Pre-fill name when the logged-in user's role matches the current stage
    if (user.value && data.currentStage && STAGE_ROLE[user.value.role] === data.currentStage) {
      signatureNames[data.currentStage] = user.value.name
    }
    acknowledgeName.value = data.form.acknowledgeName || ''
    // Falls back to the standard hours only when the sheet has nothing stored, and only at
    // the warehouse step - filling them in later would show a timeframe nobody agreed to.
    const [loadedStart, loadedEnd] = (data.form.pickupTimeframe || '').split(' - ')
    const atWarehouseStep = data.currentStage === 'warehouse'
    pickupTimeStart.value = loadedStart || (atWarehouseStep ? DEFAULT_PICKUP_START : '')
    pickupTimeEnd.value = loadedEnd || (atWarehouseStep ? DEFAULT_PICKUP_END : '')
    signatureImages.value = data.signatures || {}

    // Must set loading=false before nextTick so canvases are in the DOM
    // when captureBlankSnapshots runs — otherwise blankSnapshots never gets set.
    loading.value = false
    await nextTick()
    captureBlankSnapshots()

    // Pre-populate warehouse canvas from a previously saved signature
    if (data.currentStage === 'warehouse' && data.signatures?.warehouse) {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRefs['warehouse']
        if (canvas) canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = data.signatures.warehouse
    }

    if (data.currentStage === 'recipient') {
      try {
        const inboundRes = await fetch(`/api/transmittals/${props.id}/inbound-qty`, { credentials: 'include' })
        if (inboundRes.ok) {
          const qtyMap = await inboundRes.json()
          tableRows.value.forEach(row => {
            if (row.partNumber && qtyMap[row.partNumber] !== undefined) {
              row.transferQty = String(qtyMap[row.partNumber])
              inboundAutoFilled.value[row.childRowId] = true
            }
          })
        }
      } catch {
        // non-fatal: user can enter transfer qty manually
      }
    }
  } catch (err) {
    loadError.value = err.message || 'Failed to load transmittal.'
    loading.value = false
  }
}

watch(() => props.id, (newId) => {
  if (newId) loadTransmittal()
})

// ----- Test data -----
const TEST_DATA = {
  form: {
    company: 'MMI',
    boq: 'BOQ-2026-0042',
    dateApplication: '2026-06-04',
    applicationResults: 'Pending',
    applicantName: 'Juan Perez/ +63 917 123 4767',
    requestorEmail: 'jdelacruz@teopm.com',
    dateNeeded: '2026-06-10',
    reason: 'Materials required for Phase 2 structural works at Site B. Shortage due to increased scope approved in revision 3.',
    pickupLocation: '',
    remark: 'MIC-2026-0042',
    comments: 'Urgent - coordinate with site supervisor before release.'
  },
  items: [
    { partNumber: 'PN-10042', type: 'Structural',  description: 'Anchor Bolt M16 x 100mm',        product: 'Hilti HIT-Z',  unit: 'PCS', qty: '200', warehouse: 'WH-A', transferQty: '200', remarks: 'Grade 8.8' },
    { partNumber: 'PN-20188', type: 'Electrical',  description: 'Cable Tray 100x50mm Galvanized',  product: 'Legrand KX',   unit: 'M',   qty: '50',  warehouse: 'WH-B', transferQty: '50',  remarks: 'Hot-dip galvanized' },
    { partNumber: 'PN-30071', type: 'Plumbing',    description: 'UPVC Pipe 2" Class 10',           product: 'Neltex',       unit: 'LEN', qty: '30',  warehouse: 'WH-A', transferQty: '30',  remarks: '6m per length' },
    { partNumber: 'PN-40015', type: 'Mechanical',  description: 'Gate Valve 2" PN16',              product: 'AVK',          unit: 'PCS', qty: '8',   warehouse: 'WH-C', transferQty: '8',   remarks: 'Flanged ends' },
    { partNumber: 'PN-50203', type: 'Civil',       description: 'Concrete Nails 3"',               product: 'Generic',      unit: 'KG',  qty: '15',  warehouse: 'WH-A', transferQty: '15',  remarks: 'Hardened steel' },
  ]
}

function fillTestData() {
  Object.assign(form, TEST_DATA.form)


  const shuffled = [...TEST_DATA.items].sort(() => Math.random() - 0.5)

  tableRows.value = shuffled.map((item, i) => ({
    id: tableRows.value[i]?.id ?? nextId++,
    ...item
  }))
}

// ----- Demo auto-fill --------------------------------------------------------
// Mockup helper: fills only the EMPTY fields of the current stage with valid
// sample data (real catalogue part numbers so submit passes) and draws a
// signature, so any stage is one click away from submitting/signing.
function addDays(dateStr, n) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d)
}

function drawSignatureOn(key) {
  const canvas = canvasRefs[key]
  if (!canvas) return false
  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(w * 0.08, h * 0.70)
  ctx.bezierCurveTo(w * 0.20, h * 0.10, w * 0.32, h * 0.92, w * 0.46, h * 0.45)
  ctx.bezierCurveTo(w * 0.62, h * 0.02, w * 0.74, h * 0.88, w * 0.94, h * 0.28)
  ctx.stroke()
  return true
}

const ID_PLACEHOLDER =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" rx="12" fill="#e2e8f0"/><rect x="20" y="24" width="90" height="110" rx="6" fill="#cbd5e1"/><text x="130" y="60" font-family="Segoe UI" font-size="15" fill="#475569">ID — DEMO</text><text x="130" y="90" font-family="Segoe UI" font-size="13" fill="#64748b">Site Foreman</text></svg>')

function setFieldIfEmpty(obj, key, value) {
  if (!String(obj[key] ?? '').trim()) obj[key] = value
}

function autoFillForm() {
  if (!isSignMode.value) {
    // --- Create form: request info (empty fields only) ---
    setFieldIfEmpty(form, 'company', 'MMI Construction')
    setFieldIfEmpty(form, 'boq', 'BOQ-2026-0042')
    setFieldIfEmpty(form, 'dateApplication', today)
    setFieldIfEmpty(form, 'applicationResults', 'Approved')
    setFieldIfEmpty(form, 'applicantName', 'Juan Perez / +63 917 123 4767')
    setFieldIfEmpty(form, 'requestorEmail', 'jperez@mmi.com')
    setFieldIfEmpty(form, 'dateNeeded', addDays(today, 5))
    setFieldIfEmpty(form, 'reason', 'Phase 2 structural works at Site B — scope revision 3 approved.')
    setFieldIfEmpty(form, 'comments', 'Coordinate with the site supervisor before release.')

    // --- Material rows: fill blanks with real catalogue items; keep ≥ 3 rows ---
    const cat = materials.value || []
    const demoQty = ['120', '6', '2500', '40', '8']
    while (tableRows.value.length < 3) tableRows.value.push(createEmptyRow())
    tableRows.value.forEach((row, i) => {
      if (!String(row.partNumber ?? '').trim() && cat.length) {
        const m = cat[i % cat.length]
        row.partNumber = m.partNumber; row.type = m.type; row.description = m.description
        row.product = m.product; row.unit = m.unit; row.warehouse = m.warehouse
      }
      if (!String(row.qty ?? '').trim()) row.qty = demoQty[i] ?? '10'
      if (!String(row.transferQty ?? '').trim()) row.transferQty = row.qty
    })

    setFieldIfEmpty(signatureNames, 'requester', form.applicantName)
    drawSignatureOn('requester')
  } else {
    // --- Sign mode: fill the current stage ---
    const stage = currentStage.value
    if (!stage) return
    if (stage === 'approver') {
      setFieldIfEmpty(signatureNames, 'approver', user.value?.name || 'Emily Chen')
      if (!approverDecision.value) approverDecision.value = 'approved'
    } else if (stage === 'warehouse') {
      if (!acknowledgeName.value?.trim()) acknowledgeName.value = user.value?.name || 'Marcus Reyes'
      setFieldIfEmpty(form, 'pickupLocation', 'Pinnacle Peak — Dock 2')
      if (!pickupTimeStart.value) pickupTimeStart.value = DEFAULT_PICKUP_START
      if (!pickupTimeEnd.value) pickupTimeEnd.value = DEFAULT_PICKUP_END
      if (!form.datePickup) form.datePickup = addDays(today, 2)
    } else if (stage === 'recipient') {
      if (!recipientSigningStarted.value) recipientSigningStarted.value = true
      setFieldIfEmpty(signatureNames, 'recipient', 'Site Foreman')
      if (!recipientCompanyName.value?.trim()) recipientCompanyName.value = form.company || 'MMI Construction'
      if (!form.datePicking) form.datePicking = today
      if (!recipientIdImage.value) { recipientIdImage.value = ID_PLACEHOLDER; recipientIdFileName.value = 'id-demo.png' }
    }
    // The stage's signature canvas can mount/enable only after the fields above
    // are set (e.g. approver decision, recipient "start signing"), so draw next tick.
    nextTick(() => drawSignatureOn(stage))
  }
  showToast('Demo data filled in. / 已填入示範資料。', 'success')
}

// ----- Reset form -----
const formKey = ref(0)

function resetForm() {
    Object.assign(form, {
      company: '', boq: '', dateApplication: '', applicationResults: '',
      applicantName: '', requestorEmail: '', dateNeeded: '', datePicking: '',
      reason: '', pickupLocation: '', remark: '', comments: '', datePickup: '',
      urgency: false, urgencyLevel: '', urgencyReason: ''
    })

    tableRows.value = Array.from({ length: 1 }, () => createEmptyRow())
    for (const key of signatures.map(s => s.key)) signatureNames[key] = ''

    signatureImages.value = {}
    signedStages.value = []
    currentStage.value = 'requester'
    isDeclined.value = false
    approverDecision.value = null
    declineReason.value = ''
    transmittalStatus.value = null
    updateDate.value = ''
    pdVersion.value = 1
    pdStage.value = null
    acknowledgeName.value = ''
    pickupTimeStart.value = ''
    pickupTimeEnd.value = ''
    inboundAutoFilled.value = {}

    recipientIdImage.value = null
    recipientIdFileName.value = ''
    recipientCompanyName.value = ''
    if (recipientIdFileInputEl) recipientIdFileInputEl.value = ''

    pdRecipientName.value = ''
    pdRecipientCompany.value = ''
    pdRecipientIdImage.value = null
    pdRecipientIdFileName.value = ''
    pdDatePickup.value = ''
    pdPickupLocation.value = ''
    pdPickupTimeStart.value = ''
    pdPickupTimeEnd.value = ''
    if (pdRecipientIdFileInputEl) pdRecipientIdFileInputEl.value = ''

    formKey.value++

    nextTick(() => {
      captureBlankSnapshots()
    })
  }

const showExitModal = ref(false)

function exitWithoutSaving() {
  showExitModal.value = true
}

function onExitConfirm() {
  showExitModal.value = false
  resetForm()
  if (isSignMode.value) router.push('/')
}

// ----- Recipient No-Show -----
const showNoShowModal = ref(false)
const submittingNoShow = ref(false)

async function confirmNoShow() {
  showNoShowModal.value = false
  if (submittingNoShow.value) return
  submittingNoShow.value = true
  try {
    const res = await fetch(`/api/transmittals/${props.id}/no-show`, {
      method: 'PATCH',
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to record No-Show.')
    showToast('Recorded as No-Show. / 已標記為未到場。')
    resetForm()
    router.push('/')
  } catch (err) {
    showToast(err.message || 'Failed to record No-Show.', 'error')
  } finally {
    submittingNoShow.value = false
  }
}

// ----- Save progress (warehouse combined step) -----
function handleSaveProgressClick() {
  if (!acknowledgeName.value.trim()) {
    showToast('Please enter the Acknowledged By name before saving. / 請輸入確認人姓名後再儲存。', 'warning')
    return
  }
  saveProgress()
}

async function saveProgress() {
  if (savingProgress.value) return
  savingProgress.value = true
  try {
    const res = await fetch(`/api/transmittals/${props.id}/save-progress`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datePicking:              form.datePicking,
        datePickup:               form.datePickup,
        warehouseAcknowledgment:  true,
        acknowledgeName:          acknowledgeName.value,
        warehouseSignatureDataUrl: (() => {
          const c = canvasRefs['warehouse']
          return c && blankSnapshots['warehouse'] && c.toDataURL() !== blankSnapshots['warehouse']
            ? c.toDataURL()
            : undefined
        })(),
        items: tableRows.value.map(r => ({ childRowId: r.childRowId, transferQty: r.transferQty, remarks: r.remarks })),
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to save progress.')
    showToast('Progress saved — signature step unlocked. / 進度已儲存，簽名步驟已解鎖。')
    await loadTransmittal()
  } catch (err) {
    showToast(err.message || 'Failed to save progress.', 'error')
  } finally {
    savingProgress.value = false
  }
}

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

// ----- Submit -----
const submitting = ref(false)

async function submitForm() {
  if (submitting.value) return

  const stage = currentStage.value
  if (!stage) return

  const name = stage === 'warehouse'
    ? acknowledgeName.value?.trim()
    : signatureNames[stage]?.trim()
  if (!name) {
    const label    = stage === 'warehouse' ? 'Acknowledged By' : STAGE_LABELS[stage]
    const labelZh  = stage === 'warehouse' ? '確認人' : STAGE_LABELS[stage]
    showToast(`Please enter the ${label} name. / 請輸入${labelZh}姓名。`, 'warning')
    return
  }
  const canvas = canvasRefs[stage]
  if (!canvas || canvas.toDataURL() === blankSnapshots[stage]) {
    showToast(`Please draw the ${STAGE_LABELS[stage]} signature. / 請繪製${STAGE_LABELS[stage]}簽名。`, 'warning')
    return
  }
  if (stage === 'approver' && !approverDecision.value) {
    showToast('Please select Approve or Decline before signing. / 請在簽名前選擇批准或拒絕。', 'warning')
    return
  }
  if (stage === 'approver' && approverDecision.value === 'declined' && !declineReason.value.trim()) {
    showToast('Please enter a reason for declining. / 請輸入拒絕原因。', 'warning')
    return
  }
  if (stage === 'requester' && tableRows.value.some(r => !String(r.qty ?? '').trim())) {
    showToast('Please enter Qty for all items. / 請輸入所有項目的數量。', 'warning')
    return
  }
  if (stage === 'requester') {
    const unknown = unknownPartNumbers()
    if (unknown === null) {
      showToast('Please enter a part number for every item. / 請為每個項目輸入料號。', 'warning')
      return
    }
    if (unknown.length) {
      showToast(
        `Not in Materials DB: ${unknown.join(', ')}. Please register the material before requesting it. / 材料未登錄於 Materials DB，請先建檔後再申請。`,
        'error'
      )
      return
    }
  }
  if (!isSignMode.value && form.urgency && !form.urgencyLevel) {
    showToast('Please select an Urgency Level. / 請選擇緊急程度。', 'warning')
    return
  }
  if (stage === 'warehouse' && !form.datePickup) {
    showToast('Please enter the Date of Pickup. / 請輸入取貨日期。', 'warning')
    return
  }
  if (stage === 'warehouse' && !form.pickupLocation?.trim()) {
    showToast('Please enter the Pickup Location. / 請輸入取貨地點。', 'warning')
    return
  }
  if (stage === 'warehouse' && (!pickupTimeStart.value || !pickupTimeEnd.value)) {
    showToast('Please enter the Pickup Timeframe. / 請輸入取貨時段。', 'warning')
    return
  }
  if (stage === 'warehouse' && pickupTimeEnd.value <= pickupTimeStart.value) {
    showToast('Pickup Timeframe end must be after the start. / 取貨時段結束時間須晚於開始時間。', 'warning')
    return
  }
  if (stage === 'recipient' && !form.datePicking) {
    showToast('Please enter the Date of Picking. / 請輸入領料日期。', 'warning')
    return
  }
  // A blank Transfer Qty means nothing was delivered for that line, same as an explicit 0 —
  // and a blank is exactly what a zero line comes back as after the outbound is created and
  // the transmittal is reloaded. What the signature cannot record is a delivery where
  // nothing moved at all.
  if (stage === 'recipient' && !tableRows.value.some(r => Number(String(r.transferQty ?? '').trim() || 0) > 0)) {
    showToast('At least one item must have a Transfer Qty greater than 0. / 至少一個項目的調撥數量必須大於 0。', 'warning')
    return
  }
  if (stage === 'recipient' && tableRows.value.some(r => Number(String(r.transferQty ?? '').trim() || 0) < 0)) {
    showToast('Transfer Qty cannot be negative. / 調撥數量不可為負數。', 'warning')
    return
  }
  if (stage === 'recipient' && !signatureNames.recipient?.trim()) {
    showToast('Please enter the Recipient name. / 請輸入收件人姓名。', 'warning')
    return
  }
  if (stage === 'recipient' && !recipientCompanyName.value?.trim()) {
    showToast('Please enter the Recipient company name. / 請輸入收件人公司名稱。', 'warning')
    return
  }
  if (stage === 'recipient' && !recipientIdImage.value) {
    showToast('Please attach the Recipient ID image. / 請附上收件人證件照片。', 'warning')
    return
  }

  submitting.value = true

  try {
    if (!isSignMode.value) {
      const payload = {
        ...form,
        items: tableRows.value.map(({ id, _open, _search, ...rest }) => rest),
        signatures: Object.fromEntries(
          Object.keys(canvasRefs).map(key => [key, canvasRefs[key].toDataURL()])
        ),
        signatureNames: { ...signatureNames }
      }

      const res = await fetch(`/api/transmittals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Submission failed.')

      // if (data.pdfBase64) {
      //   downloadPdf(data.pdfBase64, data.pdfFileName || 'transmittal.pdf')
      // }

      showToast('Form submitted successfully! / 表單提交成功！')
      resetForm()
    } else {
      const payload = {
        stage,
        signatureName:            name,
        signatureDataUrl:         canvas.toDataURL(),
        items: (stage === 'recipient' || stage === 'warehouse')
          ? tableRows.value.map(r => ({
              childRowId:  r.childRowId,
              transferQty: stage === 'recipient' && String(r.transferQty ?? '').trim() === ''
                ? '0'
                : r.transferQty,
              remarks: r.remarks,
            }))
          : undefined,
        datePicking:              stage === 'recipient' ? form.datePicking : undefined,
        datePickup:               stage === 'warehouse' ? form.datePickup      : undefined,
        pickupLocation:           stage === 'warehouse' ? form.pickupLocation  : undefined,
        pickupTimeframe:          stage === 'warehouse' ? pickupTimeframe.value : undefined,
        approverDecision:         stage === 'approver'  ? approverDecision.value : undefined,
        declineReason:            stage === 'approver' && approverDecision.value === 'declined' ? declineReason.value.trim() : undefined,
        warehouseAcknowledgment:  stage === 'warehouse' ? true : undefined,
        acknowledgeName:          stage === 'warehouse' ? acknowledgeName.value : undefined,
        recipientName:            stage === 'recipient' ? signatureNames.recipient : undefined,
        recipientCompanyName:     stage === 'recipient' ? recipientCompanyName.value : undefined,
        recipientIdImage:         stage === 'recipient' ? recipientIdImage.value   : undefined,
      }

      const res = await fetch(`/api/transmittals/${props.id}/sign`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save signature.')


      // if (data.pdfBase64) {
      //   downloadPdf(data.pdfBase64, data.pdfFileName || 'transmittal.pdf')
      // }

      showToast(`${STAGE_LABELS[stage]} signature saved! / 簽名已儲存！`)
      resetForm()
      router.push('/')
    }
  } catch (err) {
    console.error('Submission failed:', err)
    showToast(err.message || 'Submission failed. Please check the server connection.', 'error')
  } finally {
    submitting.value = false
  }
}

const pdOutboundSaved = computed(() => pdOutboundJustSaved.value || pdOutboundPending.value)

function remainingQty(row) {
  const originalQty = Number(row.qty || 0)
  const alreadyDone = row._smartsheetDelivered ?? (row.deliveryHistory || []).reduce((sum, h) => sum + Number(h.transferQty || 0), 0)
  return originalQty - alreadyDone
}

function validatePDRows() {
  const errors = {}
  for (const row of tableRows.value) {
    if (!isRowEditableInPartialDelivery(row)) continue
    const raw = String(row.transferQty ?? '').trim()
    const newQty = raw === '' ? 0 : Number(raw)
    const remaining = remainingQty(row)

    if (!Number.isFinite(newQty) || newQty < 0) {
      errors[row.childRowId] = 'Must be 0 or more'
    } else if (newQty === 0) {
      continue                                   // nothing delivered on this line
    } else if (remaining <= 0) {
      errors[row.childRowId] = 'Already fully delivered'
    } else if (newQty > remaining) {
      errors[row.childRowId] = `Max remaining: ${remaining}`
    }
  }
  rowErrors.value = errors
  return Object.keys(errors).length === 0
}

function pdMovedRows() {
  return tableRows.value.filter(
    r => isRowEditableInPartialDelivery(r) && Number(String(r.transferQty ?? '').trim() || 0) > 0
  )
}

async function loadPdOutboundRecorded() {
  try {
    const res = await fetch(`/api/transmittals/${props.id}/outbound-recorded`, { credentials: 'include' })
    pdOutboundRecorded.value = res.ok ? await res.json() : {}
  } catch {
    // Nothing to compare against. The gate stays shut until this succeeds, or until a save
    // in this session opens it.
    pdOutboundRecorded.value = {}
  }
}

async function savePdOutbound() {
  if (savingPdOutbound.value || pdOutboundSaved.value) return
  if (!validatePDRows()) {
    showToast('Fix the highlighted quantities first. / 請先修正標示的數量。', 'warning')
    return
  }

  const items = pdMovedRows().map(r => ({
    childRowId:  r.childRowId,
    partNumber:  r.partNumber,
    transferQty: r.transferQty,
    qty:         r.qty,
    pdRemarks:   r.pdRemarks ?? '',
  }))

  if (items.length === 0) {
    showToast('At least one item must have a Transfer Qty greater than 0. / 至少一個項目的調撥數量必須大於 0。', 'warning')
    return
  }

  savingPdOutbound.value = true
  try {
    const res = await fetch(`/api/transmittals/${props.id}/save-inbound`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to create outbound items.')

    pdOutboundJustSaved.value = true
    await loadPdOutboundRecorded()
    showToast(`${items.length} outbound item(s) created. / 已創建 ${items.length} 筆出庫記錄。`)
  } catch (err) {
    showToast(err.message || 'Failed to create outbound items.', 'error')
  } finally {
    savingPdOutbound.value = false
  }
}

async function sendPdAcknowledgement() {
  if (acknowledging.value) return

  if (!pdDatePickup.value) {
    showToast('Please enter the Date of Pickup. / 請輸入取貨日期。', 'warning')
    return
  }
  if (!pdPickupLocation.value?.trim()) {
    showToast('Please enter the Pickup Location. / 請輸入取貨地點。', 'warning')
    return
  }
  if (!pdPickupTimeStart.value || !pdPickupTimeEnd.value) {
    showToast('Please enter the Pickup Timeframe. / 請輸入取貨時段。', 'warning')
    return
  }
  if (pdPickupTimeEnd.value <= pdPickupTimeStart.value) {
    showToast('Pickup Timeframe end must be after the start. / 取貨時段結束時間須晚於開始時間。', 'warning')
    return
  }

  acknowledging.value = true
  try {
    const res = await fetch(`/api/transmittals/${props.id}/pd-acknowledge`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datePickup:      pdDatePickup.value,
        pickupLocation:  pdPickupLocation.value.trim(),
        pickupTimeframe: pdPickupTimeframe.value,
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to notify the recipient.')

    showToast(
      data.notified
        ? 'Recipient notified — you can now record the delivery. / 已通知收件人，現在可以登記交貨。'
        : 'Pickup details saved, but no requestor email is on file. / 取貨資訊已儲存，但查無申請人電子郵件。',
      data.notified ? 'success' : 'warning'
    )
    await loadTransmittal()
  } catch (err) {
    showToast(err.message || 'Failed to notify the recipient.', 'error')
  } finally {
    acknowledging.value = false
  }
}

async function submitTransferUpdate() {
  if (submitting.value) return

  if (!updateDate.value) {
    showToast(`Please enter PD Date ${pdVersion.value}. / 請輸入 PD Date ${pdVersion.value}。`, 'warning')
    return
  }

  const editableRows = tableRows.value.filter(r => isRowEditableInPartialDelivery(r))
  if (editableRows.length === 0) {
    showToast('No partially-delivered items found to update. / 找不到可更新的部分交貨項目。', 'warning')
    return
  }
  if (!validatePDRows()) {
    showToast('Fix the highlighted quantities first. / 請先修正標示的數量。', 'warning')
    return
  }
  if (pdMovedRows().length === 0) {
    showToast('At least one item must have a Transfer Qty greater than 0. / 至少一個項目的調撥數量必須大於 0。', 'warning')
    return
  }
  if (!pdRecipientName.value?.trim()) {
    showToast('Please enter the Recipient name. / 請輸入收件人姓名。', 'warning')
    return
  }
  if (!pdRecipientCompany.value?.trim()) {
    showToast('Please enter the Recipient company name. / 請輸入收件人公司名稱。', 'warning')
    return
  }
  const pdCanvas = canvasRefs['pdRecipient']
  if (!pdCanvas || pdCanvas.toDataURL() === blankSnapshots['pdRecipient']) {
    showToast('Please draw the Recipient signature. / 請繪製收件人簽名。', 'warning')
    return
  }
  if (!pdRecipientIdImage.value) {
    showToast('Please attach the Recipient ID image. / 請附上收件人證件照片。', 'warning')
    return
  }
  submitting.value = true
  try {
    const res = await fetch(`/api/transmittals/${props.id}/update-transfer`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updateDate:           updateDate.value,
        items:                editableRows.map(r => ({
          childRowId:  r.childRowId,
          transferQty: String(r.transferQty ?? '').trim() === '' ? 0 : r.transferQty,
          pdRemarks:   r.pdRemarks ?? '',
        })),
        recipientName:        pdRecipientName.value.trim(),
        recipientCompanyName: pdRecipientCompany.value.trim(),
        signatureDataUrl:     pdCanvas.toDataURL(),
        recipientIdImage:     pdRecipientIdImage.value,
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to update transfer quantities.')

    showToast('Transfer quantities updated successfully! / 調撥數量更新成功！')
    // Clear PD fields before reloading. updateDate included: it's this batch's collection
    // date, and leaving it behind would pre-fill the next batch with a stale one.
    updateDate.value = ''
    pdRecipientName.value = ''
    pdRecipientCompany.value = ''
    pdRecipientIdImage.value = null
    pdRecipientIdFileName.value = ''
    pdDatePickup.value = ''
    pdPickupLocation.value = ''
    pdPickupTimeStart.value = ''
    pdPickupTimeEnd.value = ''
    if (pdRecipientIdFileInputEl) pdRecipientIdFileInputEl.value = ''
    clearSignature('pdRecipient')
    await loadTransmittal()
    if (data.allFulfilled) {
      transmittalStatus.value = null
      currentStage.value      = null
    }
  } catch (err) {
    console.error('Transfer update failed:', err)
    showToast(err.message || 'Failed to update. Please check the server connection.', 'error')
  } finally {
    submitting.value = false
  }
}

function downloadPdf(base64, fileName) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<style scoped>
.materials-table { border-collapse: separate; border-spacing: 0; }
.materials-table tbody td { border-width: 0 1px 1px 0; }
.materials-table tbody tr > td:first-child { border-left-width: 1px; }
.materials-table tbody tr.pd-child > td:first-child  { box-shadow: inset 3px 0 0 #cbd5e1; }
.materials-table tbody tr.pd-active > td:first-child { box-shadow: inset 3px 0 0 #f59e0b; }

.materials-table thead tr:first-child th:first-child { border-top-left-radius: 0.75rem; }
.materials-table thead tr:first-child th:last-child  { border-top-right-radius: 0.75rem; }
.materials-table tbody tr:last-child td:first-child  { border-bottom-left-radius: 0.75rem; }
.materials-table tbody tr:last-child td:last-child   { border-bottom-right-radius: 0.75rem; }
</style>
