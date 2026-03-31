<template>
  <div class="metadata-enums">
    <div
      v-for="(enumDef, enumName) in enums"
      :key="enumName"
      class="metadata-enum"
    >
      <div class="enum-header">{{ enumDef.name || enumName }}</div>
      <div v-if="enumDef.description" class="enum-description">{{ enumDef.description }}</div>
      <div class="enum-values">
        <div
          v-for="(valueDef, valueName) in enumDef.values"
          :key="valueName"
          class="enum-value"
        >
          <span class="value-name">{{ valueDef.name || valueName }}</span>
          <span class="value-number">: {{ valueDef.value }}</span>
          <div v-if="valueDef.description" class="value-description">{{ valueDef.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  enums: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.metadata-enums {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-enum {
  margin-bottom: 8px;
  padding: 8px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.enum-header {
  font-size: 12px;
  font-weight: 500;
  color: #4ec9b0;
  margin-bottom: 4px;
}

.enum-description {
  font-size: 11px;
  color: #808080;
  margin-bottom: 8px;
  font-style: italic;
}

.enum-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.enum-value {
  padding: 6px 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.value-name {
  color: #9cdcfe;
  font-weight: 500;
}

.value-number {
  color: #ce9178;
  margin-left: 4px;
}

.value-description {
  font-size: 10px;
  color: #808080;
  margin-top: 2px;
  font-style: italic;
}
</style>
