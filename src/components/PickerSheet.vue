<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[550] flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-slate-900/40" @click="emit('close')"></div>

      <div
        class="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl
               flex flex-col max-h-[80vh] sm:max-h-[70vh]"
      >
        <div class="px-4 py-3 border-b border-slate-100">
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden"></div>
          <h3 class="text-sm font-bold text-slate-800">{{ title }}</h3>
          <input
            v-model="search"
            type="text"
            autocomplete="off"
            :placeholder="`Search ${title.toLowerCase()}…`"
            class="form-input text-base sm:text-sm mt-2"
          />
        </div>

        <ul class="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
          <!-- Free text the catalog does not know about. Offered as its own row so a value can
               still be typed in, which a picker would otherwise take away. -->
          <li
            v-if="showCustomRow"
            @click="pick(search.trim())"
            class="flex items-center gap-3 px-4 py-3.5 text-sm cursor-pointer active:bg-red-50 hover:bg-red-50"
          >
            <span class="text-slate-400 shrink-0">Use</span>
            <span class="flex-1 font-semibold text-slate-800">{{ search.trim() }}</span>
          </li>

          <li
            v-for="option in filtered"
            :key="option"
            @click="pick(option)"
            class="flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700 cursor-pointer active:bg-red-50 hover:bg-red-50"
          >
            <input
              v-if="multiple"
              type="checkbox"
              :checked="isSelected(option)"
              class="accent-red-600 w-5 h-5 pointer-events-none shrink-0"
            />
            <span class="flex-1">{{ option }}</span>
            <svg
              v-if="!multiple && isSelected(option)"
              class="w-4 h-4 text-red-600 shrink-0"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
            >
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </li>

          <li v-if="filtered.length === 0 && !showCustomRow" class="px-4 py-4 text-sm text-slate-400">
            No matches found
          </li>
        </ul>

        <div class="px-4 py-3 border-t border-slate-100 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            @click="emit('close')"
            class="w-full px-6 py-3 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors"
          >
            Done{{ multiple && modelValue.length ? ` (${modelValue.length})` : '' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  modelValue: { type: [String, Array], default: '' },
  options: { type: Array, default: () => [] },
  title: { type: String, default: 'Select' },
  multiple: { type: Boolean, default: false },
  allowCustom: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'close'])

const search = ref('')

// Every opening starts from the full list. A filter left over from last time reads as a
// missing option.
watch(() => props.show, (open) => {
  if (open) search.value = ''
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(option => String(option ?? '').toLowerCase().includes(q))
})

const showCustomRow = computed(() => {
  if (!props.allowCustom) return false
  const typed = search.value.trim()
  if (!typed) return false
  return !props.options.some(option => String(option ?? '') === typed)
})

function isSelected(option) {
  if (props.multiple) return props.modelValue.includes(option)
  return props.modelValue === option
}

// Multi-select stays open so several values can be ticked in one pass; single-select closes,
// because the choice is already made.
function pick(option) {
  if (!props.multiple) {
    emit('update:modelValue', option)
    emit('close')
    return
  }

  const next = [...props.modelValue]
  const idx = next.indexOf(option)
  if (idx === -1) next.push(option)
  else next.splice(idx, 1)
  emit('update:modelValue', next)
}
</script>
