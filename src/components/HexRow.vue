<template>
  <div
    class="hex-row"
    :class="{ highlighted: highlighted }"
    @click="onClick"
  >
    <span class="row-offset">{{ formatOffset(row.offset) }}</span>
    <div class="row-hex-container">
      <span
        ref="hexSpanRef"
        class="row-hex"
        :class="{ highlighted: highlighted }"
        v-html="row.hexString"
        @mousemove="onHexMouseMove"
        @mouseleave="onMouseLeave"
      ></span>
      <div
        v-if="hoveredByte !== -1"
        class="hex-highlight"
        :style="hexHighlightStyle"
      ></div>
    </div>
    <div class="row-ascii-container">
      <span
        ref="asciiSpanRef"
        class="row-ascii"
        :class="{ highlighted: highlighted }"
        v-html="row.asciiString"
        @mousemove="onAsciiMouseMove"
        @mouseleave="onMouseLeave"
      ></span>
      <div
        v-if="hoveredByte !== -1"
        class="ascii-highlight"
        :style="asciiHighlightStyle"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { formatOffset } from '../utils/hexViewerUtils.js'

const props = defineProps({
  row: {
    type: Object,
    required: true
  },
  highlighted: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'hover'])

const hoveredByte = ref(-1)
const hexSpanRef = ref(null)
const asciiSpanRef = ref(null)

function onClick(event) {
  emit('click', props.row.offset, event)
}

function onHexMouseMove(event) {
  const span = event.target
  const rect = span.getBoundingClientRect()
  const containerRect = span.parentElement.getBoundingClientRect()
  const x = event.clientX - containerRect.left
  const spanLeft = rect.left - containerRect.left
  
  // 使用span的实际宽度进行计算
  const byteIndex = calculateHexByteIndex(x - spanLeft, rect.width)
  if (byteIndex !== -1) {
    hoveredByte.value = byteIndex
    emit('hover', props.row.offset + byteIndex)
  } else {
    hoveredByte.value = -1
    emit('hover', -1)
  }
}

function onAsciiMouseMove(event) {
  const span = event.target
  const rect = span.getBoundingClientRect()
  const containerRect = span.parentElement.getBoundingClientRect()
  const x = event.clientX - containerRect.left
  const spanLeft = rect.left - containerRect.left
  
  // 使用span的实际宽度进行计算
  const byteIndex = calculateAsciiByteIndex(x - spanLeft, rect.width)
  if (byteIndex !== -1) {
    hoveredByte.value = byteIndex
    emit('hover', props.row.offset + byteIndex)
  } else {
    hoveredByte.value = -1
    emit('hover', -1)
  }
}

function onMouseLeave() {
  hoveredByte.value = -1
  emit('hover', -1)
}

function calculateHexByteIndex(x, containerWidth) {
  // 计算HEX区域的字节索引
  if (x < 0) return -1
  const totalBytes = 16
  const byteWidth = containerWidth / totalBytes
  const index = Math.floor(x / byteWidth)
  return index < 16 ? index : -1
}

function calculateAsciiByteIndex(x, containerWidth) {
  // 计算ASCII区域的字节索引
  if (x < 0) return -1
  const byteWidth = containerWidth / 16
  const index = Math.floor(x / byteWidth)
  return index < 16 ? index : -1
}

const hexHighlightStyle = computed(() => {
  if (hoveredByte.value === -1 || !hexSpanRef.value) return {}
  
  // 计算每个字节的平均宽度
  const totalBytes = 16
  const byteWidth = hexSpanRef.value.offsetWidth / totalBytes
  
  // 高亮元素相对于容器定位
  const left = hoveredByte.value * byteWidth + 'px'
  const width = byteWidth + 'px'
  
  return {
    left,
    width
  }
})

const asciiHighlightStyle = computed(() => {
  if (hoveredByte.value === -1 || !asciiSpanRef.value) return {}
  
  // 基于span的实际宽度计算
  const totalBytes = 16
  const byteWidth = asciiSpanRef.value.offsetWidth / totalBytes
  const left = hoveredByte.value * byteWidth + 'px'
  const width = byteWidth + 'px'
  
  return {
    left,
    width
  }
})
</script>

<style scoped>
.hex-row {
  display: flex;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 20px;
  padding: 0 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.hex-row:hover {
  background: #2a2d2e;
}

.hex-row.highlighted {
  background: rgba(14, 99, 156, 0.2);
}

.row-offset {
  width: 80px;
  color: #858585;
  flex-shrink: 0;
}

.row-hex-container {
  flex: 1;
  margin-right: 16px;
  white-space: pre;
  position: relative;
}

.row-hex {
  color: #a9b7c6;
  position: relative;
  display: inline-block;
}

.row-hex.highlighted {
  color: #4ec9b0;
}

.row-ascii-container {
  width: 128px;
  flex-shrink: 0;
  white-space: pre;
  position: relative;
}

.row-ascii {
  color: #ce9178;
  position: relative;
  display: inline-block;
}

.row-ascii.highlighted {
  color: #dcdcaa;
}

.hex-highlight {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  background: rgba(255, 255, 0, 0.3);
  pointer-events: none;
  z-index: 1;
}

.ascii-highlight {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  background: rgba(255, 255, 0, 0.3);
  pointer-events: none;
  z-index: 1;
}

.row-hex,
.row-ascii {
  position: relative;
}
</style>
