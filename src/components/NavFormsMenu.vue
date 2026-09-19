<template>
  <div class="shrink-0">
    <button
      ref="triggerEl"
      type="button"
      @click="toggle"
      class="flex items-center gap-1 px-2 py-2.5 rounded-lg font-medium transition-colors hover:bg-slate-50"
      :class="isActive ? 'text-red-600' : 'text-slate-500 hover:text-red-600'"
    >
      {{ label }}
      <svg
        class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': open }"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-40" @click="close" />
      <div
        v-if="open"
        class="fixed z-50 min-w-[200px] bg-white rounded-lg border border-slate-100 shadow-lg py-1"
        :style="menuStyle"
      >
        <router-link
          v-for="form in items"
          :key="form.path"
          :to="form.path"
          @click="close"
          class="block px-3 py-2 text-sm transition-colors"
          :class="route.path === form.path
            ? 'text-red-600 bg-red-50 font-semibold'
            : 'text-slate-600 hover:text-red-600 hover:bg-slate-50'"
        >
          {{ form.label }}
        </router-link>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

// Generic nav dropdown
const props = defineProps({
  label: { type: String,  required: true },
  items: { type: Array,   required: true }, 
})

const route = useRoute()

const open      = ref(false)
const triggerEl = ref(null)
const menuStyle = ref({})

const isActive = computed(() => props.items.some(f => f.path === route.path))

function reposition() {
  const rect = triggerEl.value?.getBoundingClientRect()
  if (!rect) return
  menuStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px` }
}

function toggle() {
  open.value = !open.value
  if (open.value) reposition()
}

function close() {
  open.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

// The nav strip scrolls horizontally, so a fixed menu has to follow its trigger.
onMounted(() => {
  window.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', reposition)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', reposition, true)
  window.removeEventListener('resize', reposition)
  window.removeEventListener('keydown', onKeydown)
})

watch(() => route.path, close)
</script>
