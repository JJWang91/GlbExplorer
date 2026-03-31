<template>
  <section v-if="accessors.length > 0" class="data-section">
    <h4 @click="toggleSection('accessors')">
      <span class="toggle-icon">{{ isExpanded('accessors') ? '▼' : '▶' }}</span>
      Accessors ({{ accessors.length }})
    </h4>
    <div v-if="isExpanded('accessors')" class="section-content">
      <div
        v-for="(accessor, index) in accessors"
        :key="index"
        class="item-card"
        :class="{ selected: selectedType === 'accessor' && selectedIndex === index }"
        @click="selectAccessor(index)"
      >
        <div class="item-header">
          <span class="header-index">Accessor {{ index }}</span>
          <span class="badge">{{ accessor.type }}</span>
          <span class="badge">{{ getComponentTypeName(accessor.componentType) }}</span>
          <span class="item-detail">Num: {{ accessor.count }}</span>
          <span v-if="accessor.bufferView !== undefined" class="item-detail">BV:{{ accessor.bufferView }}</span>
          <span v-if="accessor.byteOffset !== undefined" class="item-detail">Off:{{ accessor.byteOffset }}</span>
          <template v-for="(usage, usageIndex) in accessor.usage" :key="usageIndex">
            <span class="usage-badge">{{ usage.type }}</span>
            <span v-if="usage.type === 'mesh'" class="usage-detail">
              Mesh：{{ usage.mesh }} | Prim：{{ usage.primitive }} | Attr：{{ usage.attribute }}
            </span>
            <span v-if="usage.type === 'animation'" class="usage-detail">
              Anim：{{ usage.animation }} | {{ usage.attribute }}：{{ usage.sampler || usage.channel }}
            </span>
          </template>
        </div>
        
        <!-- Accessor Data -->
        <div v-if="selectedIndex === index" class="accessor-data-container" @click.stop>
          <div class="accessor-data-header" @click="toggleAccessorData(index)">
            <span class="toggle-icon">{{ isExpanded(`accessor_${index}`) ? '▼' : '▶' }}</span>
            Accessor Data ({{ accessor.count }} items)
          </div>
          <div v-if="isExpanded(`accessor_${index}`)" class="accessor-data-content">
            <!-- 少于100个元素直接显示 -->
            <div v-if="accessor.count <= 100" class="accessor-data-grid">
              <div
                v-for="(item, itemIndex) in getAccessorData(index)"
                :key="itemIndex"
                class="accessor-data-item"
              >
                <span class="item-index">{{ itemIndex }}:</span>
                <span class="item-value">{{ formatAccessorValue(item, accessor.type) }}</span>
              </div>
            </div>
            <!-- 超过100个元素使用分组显示 -->
            <div v-else class="accessor-data-groups">
              <template v-for="(group, groupIndex) in getAccessorDataGroups(index)" :key="`group_${index}_${groupIndex}`">
                <div class="data-group">
                  <div class="group-header" @click.stop="toggleGroup(index, groupIndex)">
                    <span class="toggle-icon">{{ isGroupExpanded(index, groupIndex) ? '▼' : '▶' }}</span>
                    <span class="group-label">{{ group.label }}</span>
                  </div>
                  <div v-if="isGroupExpanded(index, groupIndex)" class="group-content">
                    <template v-if="group.subGroups">
                      <template v-for="(subGroup, subGroupIndex) in group.subGroups" :key="`subgroup_${index}_${groupIndex}_${subGroupIndex}`">
                        <div class="data-subgroup">
                          <div class="subgroup-header" @click.stop="toggleSubGroup(index, groupIndex, subGroupIndex)">
                            <span class="toggle-icon">{{ isSubGroupExpanded(index, groupIndex, subGroupIndex) ? '▼' : '▶' }}</span>
                            <span class="subgroup-label">{{ subGroup.label }}</span>
                          </div>
                          <div v-if="isSubGroupExpanded(index, groupIndex, subGroupIndex)" class="subgroup-content">
                            <div
                              v-for="(item, itemIndex) in getAccessorDataSlice(index, subGroup.start, subGroup.end)"
                              :key="`item_${index}_${subGroup.start}_${itemIndex}`"
                              class="accessor-data-item"
                            >
                              <span class="item-index">{{ subGroup.start + itemIndex }}:</span>
                              <span class="item-value">{{ formatAccessorValue(item, accessor.type) }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                    </template>
                    <template v-else>
                      <div
                        v-for="(item, itemIndex) in getAccessorDataSlice(index, group.start, group.end)"
                        :key="`item_${index}_${group.start}_${itemIndex}`"
                        class="accessor-data-item"
                      >
                        <span class="item-index">{{ group.start + itemIndex }}:</span>
                        <span class="item-value">{{ formatAccessorValue(item, accessor.type) }}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  accessors: {
    type: Array,
    required: true
  },
  binaryData: {
    type: Uint8Array,
    default: null
  },
  jsonObject: {
    type: Object,
    default: () => ({})
  },
  selectedType: {
    type: String,
    default: 'all'
  },
  selectedIndex: {
    type: Number,
    default: -1
  },
  expandedSections: {
    type: Object,
    required: true
  },
  expandedGroups: {
    type: Object,
    required: true
  },
  expandedSubGroups: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select', 'toggleSection'])

function toggleSection(section) {
  emit('toggleSection', section)
}

function isExpanded(section) {
  return props.expandedSections.has(section)
}

function selectAccessor(index) {
  const accessor = props.accessors[index]
  if (!accessor) return

  // Calculate byte offset in binary data
  let byteOffset = 0
  let byteLength = 0

  if (accessor.bufferView !== undefined && props.jsonObject.bufferViews) {
    const bufferView = props.jsonObject.bufferViews[accessor.bufferView]
    if (bufferView) {
      byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)

      // Calculate byte length based on component type and count
      const componentSize = getComponentSize(accessor.componentType)
      const componentCount = getComponentCount(accessor.type)
      byteLength = componentSize * componentCount * accessor.count
    }
  }

  // Automatically expand accessor data
  props.expandedSections.add(`accessor_${index}`)

  emit('select', 'accessor', index, byteOffset, byteLength)
}

function toggleAccessorData(index) {
  const section = `accessor_${index}`
  if (props.expandedSections.has(section)) {
    props.expandedSections.delete(section)
  } else {
    props.expandedSections.add(section)
  }
}

function getAccessorData(index) {
  const accessor = props.accessors[index]
  if (!accessor || !props.binaryData) return []
  
  // Calculate byte offset in binary data
  let byteOffset = 0
  
  if (accessor.bufferView !== undefined && props.jsonObject.bufferViews) {
    const bufferView = props.jsonObject.bufferViews[accessor.bufferView]
    if (bufferView) {
      byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
    }
  }
  
  // Parse the data
  return parseAccessorData(accessor, byteOffset, props.binaryData)
}

function getComponentTypeName(componentType) {
  const types = {
    5120: 'BYTE',
    5121: 'UNSIGNED_BYTE',
    5122: 'SHORT',
    5123: 'UNSIGNED_SHORT',
    5125: 'UNSIGNED_INT',
    5126: 'FLOAT'
  }
  return types[componentType] || `TYPE_${componentType}`
}

function getComponentSize(componentType) {
  const sizes = {
    5120: 1, // BYTE
    5121: 1, // UNSIGNED_BYTE
    5122: 2, // SHORT
    5123: 2, // UNSIGNED_SHORT
    5125: 4, // UNSIGNED_INT
    5126: 4  // FLOAT
  }
  return sizes[componentType] || 1
}

function getComponentCount(type) {
  const counts = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16
  }
  return counts[type] || 1
}

function parseAccessorData(accessor, byteOffset, binaryData) {
  if (!binaryData || !binaryData.buffer) return []
  
  const componentSize = getComponentSize(accessor.componentType)
  const componentCount = getComponentCount(accessor.type)
  const stride = componentSize * componentCount
  const data = []
  
  // Calculate the actual offset in the underlying ArrayBuffer
  const actualOffset = (binaryData.byteOffset || 0) + byteOffset
  
  let view
  switch (accessor.componentType) {
    case 5120: // BYTE
      view = new Int8Array(binaryData.buffer, actualOffset, accessor.count * componentCount)
      break
    case 5121: // UNSIGNED_BYTE
      view = new Uint8Array(binaryData.buffer, actualOffset, accessor.count * componentCount)
      break
    case 5122: // SHORT
      view = new Int16Array(binaryData.buffer, actualOffset, accessor.count * componentCount)
      break
    case 5123: // UNSIGNED_SHORT
      view = new Uint16Array(binaryData.buffer, actualOffset, accessor.count * componentCount)
      break
    case 5125: // UNSIGNED_INT
      view = new Uint32Array(binaryData.buffer, actualOffset, accessor.count * componentCount)
      break
    case 5126: // FLOAT
      view = new Float32Array(binaryData.buffer, actualOffset, accessor.count * componentCount)
      break
    default:
      return data
  }
  
  for (let i = 0; i < accessor.count; i++) {
    const item = []
    for (let j = 0; j < componentCount; j++) {
      item.push(view[i * componentCount + j])
    }
    data.push(item)
  }
  
  return data
}

function formatAccessorValue(value, type) {
  if (!Array.isArray(value)) return value.toString()
  
  // Format based on type
  switch (type) {
    case 'SCALAR':
      return value[0].toString()
    case 'VEC2':
      return `[${value[0].toFixed(4)}, ${value[1].toFixed(4)}]`
    case 'VEC3':
      return `[${value[0].toFixed(4)}, ${value[1].toFixed(4)}, ${value[2].toFixed(4)}]`
    case 'VEC4':
      return `[${value[0].toFixed(4)}, ${value[1].toFixed(4)}, ${value[2].toFixed(4)}, ${value[3].toFixed(4)}]`
    case 'MAT2':
      return `[[${value[0].toFixed(4)}, ${value[1].toFixed(4)}], [${value[2].toFixed(4)}, ${value[3].toFixed(4)}]]`
    case 'MAT3':
      return `[[${value[0].toFixed(4)}, ${value[1].toFixed(4)}, ${value[2].toFixed(4)}], [${value[3].toFixed(4)}, ${value[4].toFixed(4)}, ${value[5].toFixed(4)}], [${value[6].toFixed(4)}, ${value[7].toFixed(4)}, ${value[8].toFixed(4)}]]`
    case 'MAT4':
      return `[[${value[0].toFixed(4)}, ${value[1].toFixed(4)}, ${value[2].toFixed(4)}, ${value[3].toFixed(4)}], [${value[4].toFixed(4)}, ${value[5].toFixed(4)}, ${value[6].toFixed(4)}, ${value[7].toFixed(4)}], [${value[8].toFixed(4)}, ${value[9].toFixed(4)}, ${value[10].toFixed(4)}, ${value[11].toFixed(4)}], [${value[12].toFixed(4)}, ${value[13].toFixed(4)}, ${value[14].toFixed(4)}, ${value[15].toFixed(4)}]]`
    default:
      return value.toString()
  }
}

// 生成Accessor数据的分组结构
function getAccessorDataGroups(index) {
  const accessor = props.accessors[index]
  if (!accessor) return []
  
  const groups = []
  const totalItems = accessor.count
  
  // 超过10000个元素时使用二级分组
  if (totalItems > 10000) {
    const groupSize = 1000
    const subGroupSize = 100
    const totalGroups = Math.ceil(totalItems / groupSize)
    
    for (let i = 0; i < totalGroups; i++) {
      const start = i * groupSize
      const end = Math.min((i + 1) * groupSize, totalItems)
      const subGroups = []
      
      // 创建二级分组
      const totalSubGroups = Math.ceil((end - start) / subGroupSize)
      for (let j = 0; j < totalSubGroups; j++) {
        const subStart = start + j * subGroupSize
        const subEnd = Math.min(subStart + subGroupSize, end)
        subGroups.push({
          start: subStart,
          end: subEnd,
          label: `[${subStart}...${subEnd - 1}] (${subEnd - subStart} items)`
        })
      }
      
      groups.push({
        start,
        end,
        label: `[${start}...${end - 1}] (${end - start} items)`,
        subGroups
      })
    }
  } 
  // 100-10000个元素时使用一级分组
  else if (totalItems > 100) {
    const groupSize = 100
    const totalGroups = Math.ceil(totalItems / groupSize)
    
    for (let i = 0; i < totalGroups; i++) {
      const start = i * groupSize
      const end = Math.min((i + 1) * groupSize, totalItems)
      groups.push({
        start,
        end,
        label: `[${start}...${end - 1}] (${end - start} items)`,
        subGroups: null
      })
    }
  }
  // 少于100个元素时不分组
  else {
    groups.push({
      start: 0,
      end: totalItems,
      label: `[0...${totalItems - 1}] (${totalItems} items)`,
      subGroups: null
    })
  }
  
  return groups
}

// 检查一级分组是否展开
function isGroupExpanded(accessorIndex, groupIndex) {
  const key = `${accessorIndex}_${groupIndex}`
  return props.expandedGroups.has(key)
}

// 切换一级分组展开状态
function toggleGroup(accessorIndex, groupIndex) {
  const key = `${accessorIndex}_${groupIndex}`
  if (props.expandedGroups.has(key)) {
    props.expandedGroups.delete(key)
  } else {
    props.expandedGroups.add(key)
  }
}

// 检查二级分组是否展开
function isSubGroupExpanded(accessorIndex, groupIndex, subGroupIndex) {
  const key = `${accessorIndex}_${groupIndex}_${subGroupIndex}`
  return props.expandedSubGroups.has(key)
}

// 切换二级分组展开状态
function toggleSubGroup(accessorIndex, groupIndex, subGroupIndex) {
  const key = `${accessorIndex}_${groupIndex}_${subGroupIndex}`
  if (props.expandedSubGroups.has(key)) {
    props.expandedSubGroups.delete(key)
  } else {
    props.expandedSubGroups.add(key)
  }
}

// 获取指定范围的数据切片
function getAccessorDataSlice(index, start, end) {
  const allData = getAccessorData(index)
  return allData.slice(start, end)
}
</script>

<style scoped>
.data-section {
  border: 1px solid #3e3e42;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.data-section h4 {
  margin: 0;
  padding: 6px 10px;
  background: #2d2d30;
  font-size: 11px;
  font-weight: 500;
  color: #cccccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.data-section h4:hover {
  background: #3c3c3c;
}

.toggle-icon {
  font-size: 9px;
  color: #858585;
}

.section-content {
  padding: 6px;
  background: #1e1e1e;
}

.item-card {
  padding: 4px 8px;
  margin-bottom: 4px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.item-card:last-child {
  margin-bottom: 0;
}

.item-card:hover {
  background: #2a2d2e;
  border-color: #0e639c;
}

.item-card.selected {
  background: rgba(14, 99, 156, 0.2);
  border-color: #0e639c;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  color: #4ec9b0;
  flex-wrap: wrap;
}

.header-index {
  color: #9cdcfe;
  font-size: 12px;
}

.badge {
  display: inline-block;
  padding: 1px 3px;
  background: #0e639c;
  color: white;
  font-size: 8px;
  border-radius: 2px;
}

.item-detail {
  font-size: 10px;
  color: #808080;
}

.usage-badge {
  display: inline-block;
  padding: 1px 3px;
  background: #504636;
  color: #d4c496;
  font-size: 12px;
  border-radius: 2px;
  font-weight: 600;
}

.usage-detail {
  color: #808080;
}

.accessor-data-container {
  margin-top: 8px;
  border-top: 1px solid #3e3e42;
  padding-top: 8px;
}

.accessor-data-header {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  font-weight: 500;
  color: #4ec9b0;
  cursor: pointer;
  padding: 2px 0;
  user-select: none;
}

.accessor-data-header:hover {
  color: #61dafb;
}

.accessor-data-content {
  margin-top: 5px;
}

.accessor-data-grid {
  max-height: 300px;
  overflow: auto;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  background: #252526;
}

.accessor-data-item {
  display: flex;
  padding: 6px 5px;
  border-bottom: 1px solid #3e3e42;
  font-size: 9px;
}

.accessor-data-item:last-child {
  border-bottom: none;
}

.accessor-data-item:hover {
  background: #2a2d2e;
}

.item-index {
  color: #858585;
  min-width: 20px;
  margin-right: 4px;
}

.item-value {
  color: #ce9178;
  word-break: break-all;
}

/* 分组样式 */
.accessor-data-groups {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.data-group {
  border: 1px solid #3e3e42;
  border-radius: 4px;
  background: #252526;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  cursor: pointer;
  user-select: none;
  background: #2d2d30;
}

.group-header:hover {
  background: #3c3c3c;
}

.group-label {
  font-size: 9px;
  color: #9cdcfe;
}

.group-content {
  padding: 7px;
  background: #1e1e1e;
}

.data-subgroup {
  border: 1px solid #3e3e42;
  border-radius: 4px;
  margin-bottom: 4px;
  background: #252526;
}

.data-subgroup:last-child {
  margin-bottom: 0;
}

.subgroup-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 5px;
  cursor: pointer;
  user-select: none;
  background: #2d2d30;
}

.subgroup-header:hover {
  background: #3c3c3c;
}

.subgroup-label {
  font-size: 9px;
  color: #9cdcfe;
}

.subgroup-content {
  padding: 4px;
  background: #1e1e1e;
}
</style>
