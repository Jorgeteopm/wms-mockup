<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[900] bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-none"
    >
      <div class="bg-white rounded-2xl px-8 py-7 shadow-xl flex flex-col items-center gap-4 max-w-sm w-full">
        <svg class="animate-spin h-9 w-9 text-red-600" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>

        <p class="text-sm font-semibold text-slate-800 text-center">{{ message }}</p>

        <!-- Smartsheet writes are slow enough that people assume something broke. so yeah, kill me plz and throw the body into the fkn playa dalila -->
        <p class="text-xs text-slate-500 text-center">
          This can take a few seconds. Please don't close or refresh this page.
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  message: { type: String, default: 'Working…' },
})
</script>
