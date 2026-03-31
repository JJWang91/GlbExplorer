<template>
  <div class="hex-group">
    <div class="group-header" @click="toggle">
      <span class="toggle-icon">{{ expanded ? '▼' : '▶' }}</span>
      <span class="group-label">{{ group.label }}</span>
    </div>
    <div v-if="expanded" class="group-content">
      <template v-for="(subGroup, subIndex) in group.subGroups" :key="subIndex">
        <div class="hex-subgroup">
          <div class="subgroup-header" @click="toggleSubGroup(subIndex)">
            <span class="toggle-icon">{{ subGroupExpanded[subIndex] ? '▼' : '▶' }}</span>
            <span class="subgroup-label">{{ subGroup.label }}</span>
          </div>
          <div v-if="subGroupExpanded[subIndex]" class="subgroup-content">
            <HexRow
              v-for="(row, rowIndex) in getRows(subGroup.start, subGroup.end)"
              :key="rowIndex"
              :row="row"
              :highlighted="isRowHighlighted(row.offset)"
              @click="onRowClick"
              @hover="onRowHover"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import HexRow from './HexRow.vue'
import { generateHexRows } from '../utils/hexViewerUtils.js'

const props = defineProps({
  group: {
    type: Object,
    required: true
  },
  data: {
    type: Uint8Array,
    default: null
  },
  highlightRange: {
    type: Object,
    default: () => ({ start: -1, end: -1 })
  },
  forceExpand: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['rowClick', 'rowHover'])

const expanded = ref(false)
const subGroupExpanded = ref({})

// Watch forceExpand to auto-expand group and first subgroup
watch(() => props.forceExpand, (val) => {
  if (val) {
    expanded.value = true
    // Auto-expand first subgroup to show data
    if (props.group.subGroups && props.group.subGroups.length > 0) {
      subGroupExpanded.value[0] = true
    }
  }
})

function toggle() {
  expanded.value = !expanded.value
}

function toggleSubGroup(index) {
  subGroupExpanded.value[index] = !subGroupExpanded.value[index]
}

function getRows(start, end) {
  return generateHexRows(props.data, start, end)
}

function isRowHighlighted(rowOffset) {
  if (props.highlightRange.start < 0) return false
  const rowEnd = rowOffset + 16
  return props.highlightRange.start < rowEnd && props.highlightRange.end > rowOffset
}

function onRowClick(offset, event) {
  emit('rowClick', offset, event)
}

function onRowHover(offset) {
  emit('rowHover', offset)
}
</script>

<style scoped>
.hex-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #2d2d30;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  font-weight: 500;
  color: #cccccc;
}

.group-header:hover {
  background: #3c3c3c;
}

.toggle-icon {
  font-size: 10px;
  color: #858585;
}

.group-label {
  flex: 1;
}

.group-content {
  padding: 4px;
  background: #1e1e1e;
}

.hex-subgroup {
  margin-bottom: 4px;
}

.subgroup-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #252526;
  cursor: pointer;
  user-select: none;
  font-size: 11px;
  font-weight: 500;
  color: #9cdcfe;
}

.subgroup-header:hover {
  background: #2a2d2e;
}

.subgroup-label {
  flex: 1;
}

.subgroup-content {
  padding: 2px 0;
}
</style>
