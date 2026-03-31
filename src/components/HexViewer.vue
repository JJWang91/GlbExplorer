<template>
  <div class="hex-viewer">
    <div class="hex-header">
      <span class="header-offset">Offset</span>
      <span class="header-hex">00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span>
      <span class="header-ascii">ASCII</span>
    </div>
    <div class="hex-content" ref="contentRef">
      <div v-if="hasGroups" class="hex-groups">
        <div v-if="accessorGroups.length > 0" class="group-category">
          <h4>Accessors</h4>
          <HexGroup
            v-for="(group, index) in accessorGroups"
            :key="`accessor_${index}`"
            :group="group"
            :data="props.data"
            :highlight-range="props.highlightRange"
            :force-expand="props.expandedAccessorIndices.includes(index)"
            @row-click="onRowClick"
            @row-hover="onRowHover"
          />
        </div>

        <div v-if="bufferViewGroups.length > 0" class="group-category">
          <h4>BufferViews</h4>
          <HexGroup
            v-for="(group, index) in bufferViewGroups"
            :key="`bufferView_${index}`"
            :group="group"
            :data="props.data"
            :highlight-range="props.highlightRange"
            @row-click="onRowClick"
            @row-hover="onRowHover"
          />
        </div>
        
        <div v-if="otherData.subGroups" class="group-category">
          <h4>Other Data</h4>
          <HexGroup
            :group="otherData"
            :data="props.data"
            :highlight-range="props.highlightRange"
            @row-click="onRowClick"
            @row-hover="onRowHover"
          />
        </div>
      </div>
      
      <div v-else class="hex-rows">
        <HexRow
          v-for="(row, index) in allRows"
          :key="index"
          :row="row"
          :highlighted="isRowHighlighted(row.offset)"
          @click="onRowClick"
          @hover="onRowHover"
        />
      </div>
    </div>
    

    
    <div v-if="showTip" ref="tipRef" class="data-tip" :style="tipStyle">
      <div class="tip-header">
        <span class="tip-title">Row Data ({{ formatOffset(tipOffset) }})</span>
        <button class="tip-close" @click="closeTip">×</button>
      </div>
      <div class="tip-content">
        <div v-if="tipData.dataType" class="tip-source">
          <span v-if="tipData.dataType.type === 'accessor'" class="source-label">
            Accessor {{ tipData.dataType.index }} ({{ tipData.accessorType }})
          </span>
          <span v-else-if="tipData.dataType.type === 'bufferView'" class="source-label">
            BufferView {{ tipData.dataType.index }}
          </span>
        </div>
        
        <div v-if="tipData.values && tipData.values.length > 0" class="tip-section">
          <div class="tip-label">{{ tipData.typeName }}[{{ tipData.values.length }}]:</div>
          <div class="tip-value">
            <span v-if="tipData.typeName === 'FLOAT32'">
              {{ tipData.values.map(v => typeof v === 'number' ? v.toFixed(6) : v).join(', ') }}
            </span>
            <span v-else>
              {{ tipData.values.join(', ') }}
            </span>
          </div>
        </div>
        
        <div v-else-if="tipData.int8 && tipData.int8.length > 0" class="tip-section">
          <div class="tip-label">INT8[{{ tipData.int8.length }}]:</div>
          <div class="tip-value">{{ tipData.int8.join(', ') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import HexRow from './HexRow.vue'
import HexGroup from './HexGroup.vue'
import { formatOffset, generateHexRow, generateSubGroups, getComponentSize, getComponentCount, getComponentTypeName } from '../utils/hexViewerUtils.js'

const props = defineProps({
  data: {
    type: Uint8Array,
    default: null
  },
  highlightRange: {
    type: Object,
    default: () => ({ start: -1, end: -1 })
  },
  jsonObject: {
    type: Object,
    default: () => ({})
  },
  expandedAccessorIndices: {
    type: Array,
    default: () => ([])
  }
})

const emit = defineEmits(['select'])

const contentRef = ref(null)
const tipRef = ref(null)
const selectedByte = ref(-1)
const rowHeight = 20
const bytesPerRow = 16

const showTip = ref(false)
const tipOffset = ref(0)
const tipData = ref({})
const tipStyle = ref({})
const clickedRect = ref(null)

const totalRows = computed(() => {
  if (!props.data) return 0
  return Math.ceil(props.data.length / bytesPerRow)
})

const allRows = computed(() => {
  if (!props.data) return []
  const rows = []
  for (let i = 0; i < totalRows.value; i++) {
    rows.push(generateHexRow(props.data, i * bytesPerRow, bytesPerRow))
  }
  return rows
})

function isRowHighlighted(rowOffset) {
  if (props.highlightRange.start < 0) return false
  const rowEnd = rowOffset + bytesPerRow
  return props.highlightRange.start < rowEnd && props.highlightRange.end > rowOffset
}

function onRowClick(offset, event) {
  selectedByte.value = offset
  emit('select', offset)
  showTipData(offset, event)
}

function onRowHover(offset) {
  // 这里可以添加hover事件的处理逻辑
  // 例如，更新全局的hover状态，或者触发其他组件的联动
  console.log('Hovered byte:', offset)
}

function showTipData(offset, event) {
  if (!props.data) return
  tipOffset.value = offset
  tipData.value = parseRowData(offset)
  clickedRect.value = event.target.getBoundingClientRect()
  showTip.value = true
  import('vue').then(({ nextTick }) => {
    nextTick(() => adjustTipPosition())
  })
}

function adjustTipPosition() {
  if (!tipRef.value || !clickedRect.value) return
  const rect = clickedRect.value
  const tipWidth = 400
  const minTipHeight = 150
  const actualTipHeight = tipRef.value.offsetHeight || minTipHeight
  let top = rect.top - actualTipHeight - 5
  let left = rect.left
  
  if (top < 0) top = rect.bottom + 5
  if (left + tipWidth > window.innerWidth) left = window.innerWidth - tipWidth - 10
  if (left < 0) left = 10
  if (top + actualTipHeight > window.innerHeight) top = window.innerHeight - actualTipHeight - 10
  
  tipStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 999999
  }
}

function getDataTypeAtOffset(offset) {
  if (!props.jsonObject) return null
  
  if (props.jsonObject.accessors && props.jsonObject.bufferViews) {
    for (let i = 0; i < props.jsonObject.accessors.length; i++) {
      const accessor = props.jsonObject.accessors[i]
      if (accessor.bufferView !== undefined) {
        const bufferView = props.jsonObject.bufferViews[accessor.bufferView]
        if (bufferView) {
          const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
          const componentSize = getComponentSize(accessor.componentType)
          const componentCount = getComponentCount(accessor.type)
          const byteLength = componentSize * componentCount * accessor.count
          const end = start + byteLength
          
          if (offset >= start && offset < end) {
            return {
              type: 'accessor',
              index: i,
              accessorType: accessor.type,
              componentType: accessor.componentType,
              componentSize: componentSize,
              componentCount: componentCount
            }
          }
        }
      }
    }
  }
  
  if (props.jsonObject.bufferViews) {
    for (let i = 0; i < props.jsonObject.bufferViews.length; i++) {
      const bufferView = props.jsonObject.bufferViews[i]
      const start = bufferView.byteOffset || 0
      const end = start + bufferView.byteLength
      
      if (offset >= start && offset < end) {
        return {
          type: 'bufferView',
          index: i,
          byteLength: bufferView.byteLength
        }
      }
    }
  }
  
  return null
}

function parseRowData(offset) {
  if (!props.data || offset + 16 > props.data.length) return {}
  
  const dataType = getDataTypeAtOffset(offset)
  const result = { dataType }
  
  if (!dataType) {
    const int8Values = []
    for (let i = 0; i < 16 && offset + i < props.data.length; i++) {
      const int8View = new DataView(props.data.buffer, props.data.byteOffset + offset + i, 1)
      int8Values.push(int8View.getInt8(0))
    }
    result.int8 = int8Values
    result.typeName = 'INT8'
    return result
  }
  
  if (dataType.type === 'accessor') {
    const values = []
    const componentSize = dataType.componentSize
    const maxElements = Math.floor(16 / componentSize)
    
    for (let i = 0; i < maxElements && offset + (i + 1) * componentSize <= props.data.length; i++) {
      const viewOffset = props.data.byteOffset + offset + i * componentSize
      
      switch (dataType.componentType) {
        case 5120: values.push(new DataView(props.data.buffer, viewOffset, 1).getInt8(0)); break
        case 5121: values.push(new DataView(props.data.buffer, viewOffset, 1).getUint8(0)); break
        case 5122: values.push(new DataView(props.data.buffer, viewOffset, 2).getInt16(0, true)); break
        case 5123: values.push(new DataView(props.data.buffer, viewOffset, 2).getUint16(0, true)); break
        case 5125: values.push(new DataView(props.data.buffer, viewOffset, 4).getUint32(0, true)); break
        case 5126: values.push(new DataView(props.data.buffer, viewOffset, 4).getFloat32(0, true)); break
      }
    }
    
    result.values = values
    result.typeName = getComponentTypeName(dataType.componentType)
    result.accessorType = dataType.accessorType
    result.componentCount = dataType.componentCount
  } else if (dataType.type === 'bufferView') {
    const values = []
    for (let i = 0; i < 16 && offset + i < props.data.length; i++) {
      values.push(props.data[offset + i])
    }
    result.values = values
    result.typeName = 'UINT8'
  }
  
  return result
}

function closeTip() {
  showTip.value = false
}

const hasGroups = computed(() => {
  return props.jsonObject && (props.jsonObject.bufferViews || props.jsonObject.accessors)
})

const bufferViewGroups = computed(() => {
  if (!props.jsonObject.bufferViews) return []
  
  return props.jsonObject.bufferViews.map((bufferView, index) => {
    const start = bufferView.byteOffset || 0
    const end = start + bufferView.byteLength
    return {
      label: `BufferView ${index} (${formatOffset(start)} - ${formatOffset(end)})`,
      start,
      end,
      subGroups: generateSubGroups(start, end)
    }
  })
})

const accessorGroups = computed(() => {
  if (!props.jsonObject.accessors || !props.jsonObject.bufferViews) return []
  
  return props.jsonObject.accessors.map((accessor, index) => {
    if (accessor.bufferView !== undefined) {
      const bufferView = props.jsonObject.bufferViews[accessor.bufferView]
      if (bufferView) {
        const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
        const componentSize = getComponentSize(accessor.componentType)
        const componentCount = getComponentCount(accessor.type)
        const byteLength = componentSize * componentCount * accessor.count
        const end = start + byteLength
        
        return {
          label: `Accessor ${index} (${accessor.type}) - ${formatOffset(start)} - ${formatOffset(end)}`,
          start,
          end,
          subGroups: generateSubGroups(start, end)
        }
      }
    }
    return null
  }).filter(Boolean)
})

const otherData = computed(() => {
  if (!props.data) return []
  
  const usedRanges = []
  
  if (props.jsonObject.bufferViews) {
    props.jsonObject.bufferViews.forEach(bufferView => {
      const start = bufferView.byteOffset || 0
      const end = start + bufferView.byteLength
      usedRanges.push({ start, end })
    })
  }
  
  usedRanges.sort((a, b) => a.start - b.start)
  const mergedRanges = []
  let currentRange = null
  
  for (const range of usedRanges) {
    if (!currentRange) {
      currentRange = { ...range }
    } else if (range.start <= currentRange.end) {
      currentRange.end = Math.max(currentRange.end, range.end)
    } else {
      mergedRanges.push(currentRange)
      currentRange = { ...range }
    }
  }
  if (currentRange) mergedRanges.push(currentRange)
  
  let lastEnd = 0
  const unusedRanges = []
  
  for (const range of mergedRanges) {
    if (range.start > lastEnd) {
      unusedRanges.push({ start: lastEnd, end: range.start })
    }
    lastEnd = range.end
  }
  
  if (lastEnd < props.data.length) {
    unusedRanges.push({ start: lastEnd, end: props.data.length })
  }
  
  if (unusedRanges.length === 0) return []
  
  const totalStart = unusedRanges[0].start
  const totalEnd = unusedRanges[unusedRanges.length - 1].end
  
  return {
    label: `Other Data (${formatOffset(totalStart)} - ${formatOffset(totalEnd)})`,
    start: totalStart,
    end: totalEnd,
    subGroups: generateSubGroups(totalStart, totalEnd)
  }
})

watch(() => props.highlightRange, (newRange) => {
  if (newRange.start >= 0 && contentRef.value) {
    const rowIndex = Math.floor(newRange.start / bytesPerRow)
    const scrollPosition = rowIndex * rowHeight
    contentRef.value.scrollTop = scrollPosition - contentRef.value.clientHeight / 2
  }
}, { immediate: true })

onMounted(() => {
  if (contentRef.value) {
    contentRef.value.scrollTop = 0
  }
  document.addEventListener('click', handleClickOutside)
})

function handleClickOutside(event) {
  const tipElement = document.querySelector('.data-tip')
  if (tipElement && !tipElement.contains(event.target) && !event.target.closest('.hex-row')) {
    closeTip()
  }
}

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.hex-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.hex-header {
  display: flex;
  padding: 8px 8px 8px 8px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 500;
  color: #cccccc;
}

.header-offset {
  width: 80px;
  flex-shrink: 0;
  padding-left: 12px;
}

.header-hex {
  flex: 1;
  /* margin-right: 16px; */
  padding-left: 12px;
}

.header-ascii {
  width: 128px;
  flex-shrink: 0;
}

.hex-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.hex-groups {
  padding: 8px;
}

.group-category {
  margin-bottom: 12px;
}

.group-category h4 {
  margin: 0 0 8px 0;
  padding: 6px 8px;
  background: #252526;
  font-size: 12px;
  font-weight: 600;
  color: #4ec9b0;
}

.hex-rows {
  padding: 8px;
}



.data-tip {
  position: fixed;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 999999;
  min-width: 300px;
  max-width: 500px;
}

.tip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  border-radius: 4px 4px 0 0;
}

.tip-title {
  font-size: 12px;
  font-weight: 500;
  color: #cccccc;
}

.tip-close {
  background: none;
  border: none;
  color: #858585;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tip-close:hover {
  color: #cccccc;
}

.tip-content {
  padding: 12px;
}

.tip-source {
  margin-bottom: 8px;
  padding: 6px 8px;
  background: #1e1e1e;
  border-radius: 3px;
}

.source-label {
  font-size: 11px;
  color: #4ec9b0;
  font-weight: 500;
}

.tip-section {
  margin-bottom: 8px;
}

.tip-section:last-child {
  margin-bottom: 0;
}

.tip-label {
  font-size: 11px;
  color: #9cdcfe;
  margin-bottom: 4px;
}

.tip-value {
  font-size: 12px;
  color: #ce9178;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  word-break: break-all;
}
</style>
