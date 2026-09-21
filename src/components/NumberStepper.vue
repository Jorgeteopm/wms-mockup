<template>
  <div class="inline-flex items-stretch rounded-lg border border-slate-200 overflow-hidden bg-white">
    <button
      type="button"
      :disabled="atMin"
      @click="step(-1)"
      :aria-label="`Decrease ${label}`"
      class="stepper-btn"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M5 12h14"/>
      </svg>
    </button>

    <input
      :value="modelValue"
      type="number"
      inputmode="numeric"
      :min="min"
      :max="max"
      :aria-label="label"
      class="stepper-input"
      @input="onInput($event)"
      @blur="onBlur"
    />

    <button
      type="button"
      :disabled="atMax"
      @click="step(1)"
      :aria-label="`Increase ${label}`"
      class="stepper-btn"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: Number.MAX_SAFE_INTEGER },
  label: { type: String, default: 'value' },
})

const emit = defineEmits(['update:modelValue'])

const current = computed(() => {
  const n = Number(props.modelValue)
  return Number.isFinite(n) ? n : props.min
})

const atMin = computed(() => current.value <= props.min)
const atMax = computed(() => current.value >= props.max)

function clamp(n) {
  if (n < props.min) return props.min
  if (n > props.max) return props.max
  return n
}

function step(direction) {
  emit('update:modelValue', clamp(current.value + direction))
}

// Typing is left alone while the field is in flight - clamping mid-keystroke turns "10" into
// the min the moment the field is cleared to retype it. The blur handler settles it.
function onInput(event) {
  const raw = event.target.value
  if (raw === '') {
    emit('update:modelValue', '')
    return
  }
  const n = Number(raw)
  if (Number.isFinite(n)) emit('update:modelValue', n)
}

function onBlur() {
  emit('update:modelValue', clamp(current.value))
}
</script>

<style scoped>
.stepper-btn {
  @apply w-11 flex items-center justify-center text-slate-600 bg-slate-50
         active:bg-slate-200 hover:bg-slate-100 transition-colors
         disabled:opacity-40 disabled:pointer-events-none;
}

.stepper-input {
  @apply w-16 text-center text-base font-semibold text-slate-800 bg-transparent
         border-x border-slate-200 focus:outline-none focus:bg-brand-50/40;
}

/* The native spinner arrows are the thing this component exists to replace. */
.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stepper-input {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
