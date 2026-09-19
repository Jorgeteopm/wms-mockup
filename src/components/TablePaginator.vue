<template>
  <div class="flex items-center justify-between gap-4 flex-wrap px-4 py-3">

    <!-- Only the top bar carries the size selector; repeating it would let the two disagree
         on screen for a frame and reads as two separate settings. -->
    <div v-if="showPageSize" class="flex items-center gap-2">
      <label :for="selectId" class="text-sm text-slate-500">Rows per page</label>
      <select
        :id="selectId"
        :value="pageSize"
        @change="$emit('update:pageSize', Number($event.target.value))"
        class="px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700"
      >
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
      </select>
    </div>

    <p class="text-sm text-slate-500">
      <template v-if="total">
        {{ rangeStart.toLocaleString() }}–{{ rangeEnd.toLocaleString() }} of {{ total.toLocaleString() }}
      </template>
      <template v-else>No results</template>
    </p>

    <div class="flex items-center gap-1.5">
      <button type="button" :disabled="page === 1" @click="go(1)" :class="BUTTON">First</button>
      <button type="button" :disabled="page === 1" @click="go(page - 1)" :class="BUTTON">Prev</button>

      <div class="flex items-center gap-1.5 px-1">
        <input
          :value="page"
          @change="go($event.target.value)"
          type="number"
          min="1"
          :max="pageCount"
          class="w-16 px-2 py-1.5 text-sm text-center rounded-lg border border-slate-200 bg-white text-slate-700"
        />
        <span class="text-sm text-slate-500 whitespace-nowrap">of {{ pageCount }}</span>
      </div>

      <button type="button" :disabled="page === pageCount" @click="go(page + 1)" :class="BUTTON">Next</button>
      <button type="button" :disabled="page === pageCount" @click="go(pageCount)" :class="BUTTON">Last</button>
    </div>
  </div>
</template>

<script setup>
import { useId } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  pageSizes: { type: Array, required: true },
  rangeStart: { type: Number, required: true },
  rangeEnd: { type: Number, required: true },
  total: { type: Number, required: true },
  showPageSize: { type: Boolean, default: false },
})

const emit = defineEmits(['update:page', 'update:pageSize'])

// The page input is free text, so anything out of range is clamped rather than trusted.
function go(value) {
  const target = Number(value)
  if (!Number.isFinite(target)) return
  emit('update:page', Math.min(props.pageCount, Math.max(1, Math.trunc(target))))
}

// Two paginators render on the same screen, so the label cannot point at a shared id.
const selectId = useId()

// The app's secondary button, as used by the dashboard's Refresh. Kept as a constant rather
// than a scoped class: the shared styles were consolidated out of scoped blocks on purpose.
const BUTTON = 'px-2.5 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
</script>
