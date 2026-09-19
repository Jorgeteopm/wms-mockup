<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[600] bg-slate-900/80 flex flex-col"
      @click.self="emit('close')"
    >
      <div class="flex items-center justify-between gap-3 px-4 py-3 text-white shrink-0">
        <div class="min-w-0">
          <p class="text-sm font-semibold truncate">{{ title }}</p>
          <p v-if="subtitle" class="text-xs text-white/60 truncate">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          aria-label="Close"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="relative flex-1 min-h-0 flex items-center justify-center p-4" @click.self="emit('close')">
        <div
          v-if="loading || downloading"
          class="absolute inset-0 flex items-center justify-center gap-2.5 text-sm text-white/70 pointer-events-none"
        >
          <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Loading the image…
        </div>

        <p v-if="showFailure" class="text-sm text-white/70">This image could not be loaded.</p>

        <img
          v-if="src"
          :src="src"
          :alt="title"
          @load="onImageLoad"
          @error="onImageError"
          class="max-w-full max-h-full object-contain rounded-lg bg-white transition-opacity duration-200"
          :class="downloading && !hasRendered ? 'opacity-0' : 'opacity-100'"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  src: { type: String, default: '' },
  title: { type: String, default: 'Image' },
  subtitle: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const downloading = ref(false)
const failed = ref(false)
const hasRendered = ref(false)

watch(() => props.src, (src) => {
  failed.value = false
  downloading.value = Boolean(src)
}, { immediate: true })

const showFailure = computed(() => {
  if (props.loading || downloading.value) return false
  return failed.value || !props.src
})

watch(() => props.show, (open) => {
  if (!open) hasRendered.value = false
})

function onImageLoad() {
  downloading.value = false
  hasRendered.value = true
}

function onImageError() {
  downloading.value = false
  failed.value = true
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>
