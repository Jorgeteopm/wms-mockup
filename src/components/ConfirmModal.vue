<template>
  <Teleport to="body">
    <Transition name="modal">
      <!-- Above every other overlay in the app: a blocking question that renders behind the
           panel it was asked from cannot be answered. Only BusyOverlay (900) sits higher, and
           that one takes no clicks. -->
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
        @mousedown.self="$emit('cancel')"
      >
        <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-5">
          <div class="flex flex-col gap-1.5">
            <h3 class="text-base font-bold text-slate-800">{{ title }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{{ message }}</p>
          </div>
          <div class="flex justify-end gap-3">
            <button
              ref="cancelButton"
              type="button"
              @click="$emit('cancel')"
              class="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              {{ cancelLabel }}
            </button>
            <button
              ref="confirmButton"
              type="button"
              @click="$emit('confirm')"
              class="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              :class="destructive
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400'
                : 'bg-slate-800 hover:bg-slate-900 focus-visible:ring-slate-400'"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue:   { type: Boolean, required: true },
  title:        { type: String,  default: 'Are you sure?' },
  message:      { type: String,  default: '' },
  confirmLabel: { type: String,  default: 'Confirm' },
  cancelLabel:  { type: String,  default: 'Cancel' },
  destructive:  { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

const cancelButton = ref(null)
const confirmButton = ref(null)

// Focus moves into the dialog on open, so Enter and Space act on it and not on whatever was
// focused underneath. A destructive dialog focuses Cancel - a stray Enter must not delete.
watch(() => props.modelValue, (open) => {
  if (!open) return
  nextTick(() => {
    const target = props.destructive ? cancelButton.value : confirmButton.value
    target?.focus()
  })
})

function onKeydown(event) {
  if (props.modelValue && event.key === 'Escape') emit('cancel')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>
