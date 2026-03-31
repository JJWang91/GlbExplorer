<template>
  <div class="json-tree">
    <json-node
      :data="data"
      :key-name="''"
      :path="''"
      :expanded-keys="expandedKeys"
      :level="0"
      @select="onSelect"
      @toggle="onToggle"
      @select-mesh-primitive="onSelectMeshPrimitive"
    />
  </div>
</template>

<script setup>
import JsonNode from './JsonNode.vue'

const props = defineProps({
  data: {
    type: [Object, Array, String, Number, Boolean],
    default: null
  },
  expandedKeys: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['select', 'toggle', 'selectMeshPrimitive'])

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
.json-tree {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px;
}
</style>
