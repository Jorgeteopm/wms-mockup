<template>
  <div
    v-show="overflowing"
    ref="track"
    @pointerdown="jumpTo"
    @wheel.prevent="onWheel"
    class="drag-bar-track"
  >
    <div
      ref="thumb"
      @pointerdown.stop="startDrag"
      class="drag-bar-thumb"
      :class="{ 'is-dragging': dragging }"
      :style="{ width: `${thumbWidth}px`, transform: `translateX(${thumbLeft}px)` }"
    >
      <span class="drag-bar-grip" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

// A scrollbar drawn by us rather than the browser's. The native one cannot be styled past
// a colour and a thickness, and on Firefox not even that much, so the two lists ended up
// looking different. This is the same control everywhere.
const props = defineProps({
  // The element that actually scrolls. Passed as a ref from the parent, so it can be null
  // on the first render and arrive once the table mounts.
  target: { type: Object, default: null },
  // Never let the thumb get so small it is hard to grab, however wide the table is.
  minThumb: { type: Number, default: 48 }
})

const track = ref(null)
const thumb = ref(null)
const dragging = ref(false)

// Measured rather than computed from the DOM on every render: reading layout inside a
// computed would force a reflow on each scroll frame.
const scrollWidth = ref(0)
const clientWidth = ref(0)
const scrollLeft = ref(0)
const trackWidth = ref(0)

const overflowing = computed(() => scrollWidth.value - clientWidth.value > 1)

const thumbWidth = computed(() => {
  if (!overflowing.value) return 0
  const proportional = trackWidth.value * (clientWidth.value / scrollWidth.value)
  return Math.max(props.minThumb, Math.round(proportional))
})

// How far the thumb can travel, and how far the content can travel. The ratio between the
// two is what turns a pixel of drag into a pixel of scroll.
const thumbTravel = computed(() => Math.max(0, trackWidth.value - thumbWidth.value))
const scrollTravel = computed(() => Math.max(0, scrollWidth.value - clientWidth.value))

const thumbLeft = computed(() => {
  if (scrollTravel.value === 0) return 0
  return (scrollLeft.value / scrollTravel.value) * thumbTravel.value
})

function measure() {
  const el = props.target
  if (!el) return

  scrollWidth.value = el.scrollWidth
  clientWidth.value = el.clientWidth
  scrollLeft.value = el.scrollLeft
  trackWidth.value = track.value?.clientWidth ?? 0
}

function onTargetScroll() {
  // Only the position changes while scrolling, so the rest is left alone.
  scrollLeft.value = props.target?.scrollLeft ?? 0
}

function scrollToThumb(left) {
  if (!props.target || thumbTravel.value === 0) return
  const clamped = Math.min(Math.max(left, 0), thumbTravel.value)
  props.target.scrollLeft = (clamped / thumbTravel.value) * scrollTravel.value
}

let grabOffset = 0

function startDrag(event) {
  measure()
  dragging.value = true
  // Where inside the thumb the pointer landed, so it does not jump to centre itself.
  grabOffset = event.clientX - thumb.value.getBoundingClientRect().left
  // Capture on the thumb, so the drag survives the pointer leaving the bar entirely.
  thumb.value.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onDrag(event) {
  if (!dragging.value) return
  const trackLeft = track.value.getBoundingClientRect().left
  scrollToThumb(event.clientX - trackLeft - grabOffset)
}

function endDrag() {
  dragging.value = false
}

// A wheel over the bar scrolls the table sideways. A native bar does this for free; ours
// is an ordinary div, so it has to be forwarded. Vertical wheels count too, because most
// mice only have that axis.
function onWheel(event) {
  if (!props.target) return
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  props.target.scrollLeft += delta
}

// Clicking the empty part of the track moves the thumb there, like a native bar.
function jumpTo(event) {
  measure()
  const trackLeft = track.value.getBoundingClientRect().left
  scrollToThumb(event.clientX - trackLeft - thumbWidth.value / 2)
}

// The target's own box rarely changes, but the table inside it grows with the rows, so
// both are watched.
let observer = null

function observe(el) {
  observer?.disconnect()
  if (!el) return

  el.addEventListener('scroll', onTargetScroll, { passive: true })
  observer = new ResizeObserver(measure)
  observer.observe(el)
  if (el.firstElementChild) observer.observe(el.firstElementChild)
  nextTick(measure)
}

watch(() => props.target, (el, previous) => {
  previous?.removeEventListener('scroll', onTargetScroll)
  observe(el)
}, { immediate: true })

let trackObserver = null

onMounted(() => {
  trackObserver = new ResizeObserver(measure)
  trackObserver.observe(track.value)

  window.addEventListener('resize', measure)
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag)
  nextTick(measure)
})

onUnmounted(() => {
  window.removeEventListener('resize', measure)
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', endDrag)
  props.target?.removeEventListener('scroll', onTargetScroll)
  observer?.disconnect()
  trackObserver?.disconnect()
})

defineExpose({ measure })
</script>

<style scoped>
.drag-bar-track {
  position: relative;
  height: 18px;
  padding: 4px 6px;
  cursor: pointer;
  /* The table underneath scrolls with the pointer on touch devices; this bar should not. */
  touch-action: none;
}

.drag-bar-track::before {
  content: '';
  position: absolute;
  inset: 7px 6px;
  border-radius: 9999px;
  background: #e2e8f0;
}

.drag-bar-thumb {
  position: absolute;
  top: 3px;
  left: 6px;
  height: 12px;
  border-radius: 9999px;
  background: #94a3b8;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 120ms ease;
}

.drag-bar-thumb:hover {
  background: #64748b;
}

.drag-bar-thumb.is-dragging {
  background: #475569;
  cursor: grabbing;
}

/* Three lines in the middle, so the thumb reads as something to grab rather than a bar. */
.drag-bar-grip {
  width: 10px;
  height: 6px;
  background-image: linear-gradient(to right, #f8fafc 2px, transparent 2px);
  background-size: 4px 100%;
  opacity: 0.8;
}
</style>
