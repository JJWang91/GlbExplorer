<template>
  <div class="json-node" :style="{ paddingLeft: level * 16 + 'px' }">
    <!-- Object or Array -->
    <template v-if="isObject || isArray">
      <div
        class="node-header"
        :class="{ expandable: true, expanded: isExpanded, 'mesh-primitive-node': isMeshOrPrimitive }"
        @click="toggle"
      >
        <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span v-if="keyName" class="key-name">"{{ keyName }}":</span>
        <span class="bracket">{{ isArray ? '[' : '{' }}</span>
        <span v-if="!isExpanded" class="collapsed-info">
          {{ isArray ? `${data.length} items` : `${Object.keys(data).length} keys` }}
          {{ isArray ? ']' : '}' }}
        </span>
      </div>

      <div v-if="isExpanded" class="node-children">
        <template v-for="(value, key) in data" :key="key">
          <json-node
            :data="value"
            :key-name="String(key)"
            :path="currentPath + '.' + key"
            :expanded-keys="expandedKeys"
            :level="level + 1"
            @select="onSelect"
            @toggle="onToggle"
            @select-mesh-primitive="onSelectMeshPrimitive"
          />
        </template>
        <div class="node-footer" :style="{ paddingLeft: level * 16 + 'px' }">
          <span class="bracket">{{ isArray ? ']' : '}' }}</span>
        </div>
      </div>
    </template>

    <!-- Primitive Value -->
    <template v-else>
      <div
        class="node-value"
        :class="{ clickable: hasBufferInfo }"
        @click="onValueClick"
      >
        <span v-if="keyName" class="key-name">"{{ keyName }}":</span>
        <span :class="valueClass">{{ formattedValue }}</span>
        <span v-if="bufferInfo" class="buffer-info">
          [offset: {{ bufferInfo.byteOffset }}, length: {{ bufferInfo.byteLength }}]
        </span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: [Object, Array, String, Number, Boolean],
    required: true
  },
  keyName: {
    type: String,
    default: ''
  },
  path: {
    type: String,
    default: ''
  },
  expandedKeys: {
    type: Set,
    default: () => new Set()
  },
  level: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['select', 'toggle', 'selectMeshPrimitive'])

const isObject = computed(() => typeof props.data === 'object' && props.data !== null && !Array.isArray(props.data))
const isArray = computed(() => Array.isArray(props.data))
const currentPath = computed(() => {
  if (props.level === 0) {
    // For root level, use keyName directly
    return props.keyName
  }
  return props.path || props.keyName
})

const isExpanded = computed(() => {
  // Root node is always expanded
  if (props.level === 0) {
    return true
  }
  return props.expandedKeys.has(currentPath.value)
})

const formattedValue = computed(() => {
  if (typeof props.data === 'string') return `"${props.data}"`
  if (typeof props.data === 'boolean') return props.data ? 'true' : 'false'
  if (props.data === null) return 'null'
  if (typeof props.data === 'number') {
    // Format large numbers with commas
    return props.data.toString()
  }
  return String(props.data)
})

const valueClass = computed(() => {
  const type = typeof props.data
  if (type === 'string') return 'string-value'
  if (type === 'number') return 'number-value'
  if (type === 'boolean') return 'boolean-value'
  if (props.data === null) return 'null-value'
  return ''
})

// Extract buffer information for accessors and bufferViews
const bufferInfo = computed(() => {
  if (!props.path) return null

  // Check if this is an accessor with bufferView
  if (props.path.includes('accessors')) {
    const match = props.path.match(/accessors\.(\d+)/)
    if (match && props.keyName === 'bufferView') {
      // This is a bufferView reference in an accessor
      return { type: 'accessor', index: parseInt(match[1]), bufferView: props.data }
    }
    if (match && (props.keyName === 'byteOffset' || props.keyName === 'count' || props.keyName === 'componentType')) {
      return { type: 'accessor', index: parseInt(match[1]), property: props.keyName }
    }
  }

  // Check if this is a bufferView with buffer reference
  if (props.path.includes('bufferViews')) {
    const match = props.path.match(/bufferViews\.(\d+)/)
    if (match) {
      return { type: 'bufferView', index: parseInt(match[1]) }
    }
  }

  return null
})

const hasBufferInfo = computed(() => {
  return bufferInfo.value !== null
})

const isMeshOrPrimitive = computed(() => {
  const path = currentPath.value
  return /\.?meshes\.\d+$/.test(path) || /\.?meshes\.\d+\.primitives\.\d+$/.test(path)
})

function toggle() {
  emit('toggle', currentPath.value, !isExpanded.value)
  // Check if this is a mesh or primitive node and emit selection
  checkMeshPrimitiveSelection()
}

function checkMeshPrimitiveSelection() {
  const path = currentPath.value
  // Match meshes.X.primitives.Y
  const primMatch = path.match(/\.?meshes\.(\d+)\.primitives\.(\d+)$/)
  if (primMatch) {
    emit('selectMeshPrimitive', parseInt(primMatch[1]), parseInt(primMatch[2]))
    return
  }
  // Match meshes.X
  const meshMatch = path.match(/\.?meshes\.(\d+)$/)
  if (meshMatch) {
    emit('selectMeshPrimitive', parseInt(meshMatch[1]), -1)
    return
  }
}

function onValueClick() {
  // Calculate byte offset and length if this is buffer-related data
  if (bufferInfo.value) {
    // This would need access to the full glTF JSON to calculate actual offsets
    // For now, emit the path for the parent to handle
    emit('select', currentPath.value)
  }
}

function onSelect(path, offset, length) {
  emit('select', path, offset, length)
}

function onToggle(key, expanded) {
  emit('toggle', key, expanded)
}

function onSelectMeshPrimitive(meshIndex, primitiveIndex) {
  emit('selectMeshPrimitive', meshIndex, primitiveIndex)
}
</script>

<style scoped>
.json-node {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.node-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 1px 0;
  user-select: none;
}

.node-header:hover {
  background: #2a2d2e;
}

.node-header.mesh-primitive-node {
  border-left: 3px solid #0e639c;
  padding-left: 4px;
  cursor: pointer;
}

.node-header.mesh-primitive-node:hover {
  background: rgba(14, 99, 156, 0.15);
}

.toggle-icon {
  font-size: 10px;
  color: #858585;
  margin-right: 4px;
  width: 12px;
  text-align: center;
}

.key-name {
  color: #9cdcfe;
  margin-right: 4px;
}

.bracket {
  color: #ffd700;
}

.collapsed-info {
  color: #808080;
  margin-left: 4px;
}

.node-value {
  display: flex;
  align-items: center;
  padding: 1px 0;
  padding-left: 16px;
}

.node-value.clickable {
  cursor: pointer;
}

.node-value.clickable:hover {
  background: #2a2d2e;
}

.string-value {
  color: #ce9178;
}

.number-value {
  color: #b5cea8;
}

.boolean-value {
  color: #569cd6;
}

.null-value {
  color: #569cd6;
}

.buffer-info {
  color: #6a9955;
  margin-left: 8px;
  font-size: 11px;
}

.node-footer {
  padding: 1px 0;
}
</style>
