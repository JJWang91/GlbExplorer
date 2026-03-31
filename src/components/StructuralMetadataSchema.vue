<template>
  <div class="metadata-schema">
    <div v-if="schema.id" class="info-row">
      <span class="label">ID:</span>
      <span class="value">{{ schema.id }}</span>
    </div>
    
    <!-- Classes -->
    <div v-if="Object.keys(schema.classes).length > 0" class="metadata-subsection">
      <h6>Classes</h6>
      <div
        v-for="(classDef, className) in schema.classes"
        :key="className"
        class="metadata-class"
      >
        <div class="class-header">{{ classDef.name || className }}</div>
        <div v-if="classDef.description" class="class-description">{{ classDef.description }}</div>
        <div v-if="Object.keys(classDef.properties).length > 0" class="class-properties">
          <div
            v-for="(propDef, propName) in classDef.properties"
            :key="propName"
            class="property-item"
          >
            <div class="property-header">{{ propDef.name || propName }}</div>
            <div class="property-details">
              <span class="badge">{{ propDef.type }}</span>
              <span v-if="propDef.componentType" class="badge">{{ propDef.componentType }}</span>
              <span v-if="propDef.required" class="badge required">Required</span>
            </div>
            <div v-if="propDef.description" class="property-description">{{ propDef.description }}</div>
            <div v-if="propDef.default !== null" class="info-row">
              <span class="label">Default:</span>
              <span class="value">{{ formatValue(propDef.default, propDef.type) }}</span>
            </div>
            <div v-if="propDef.min !== null" class="info-row">
              <span class="label">Min:</span>
              <span class="value">{{ propDef.min }}</span>
            </div>
            <div v-if="propDef.max !== null" class="info-row">
              <span class="label">Max:</span>
              <span class="value">{{ propDef.max }}</span>
            </div>
            <div v-if="propDef.enumType" class="info-row">
              <span class="label">Enum:</span>
              <span class="value">{{ propDef.enumType }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  schema: {
    type: Object,
    required: true
  },
  formatValue: {
    type: Function,
    required: true
  }
})
</script>

<style scoped>
.metadata-schema {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  padding: 4px 0;
  font-size: 12px;
}

.info-row .label {
  color: #9cdcfe;
  min-width: 100px;
}

.info-row .value {
  color: #ce9178;
}

.metadata-subsection {
  margin-top: 8px;
  padding: 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.metadata-subsection h6 {
  margin: 0 0 8px 0;
  font-size: 11px;
  font-weight: 500;
  color: #9cdcfe;
}

.metadata-class {
  margin-bottom: 8px;
  padding: 8px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.class-header {
  font-size: 12px;
  font-weight: 500;
  color: #4ec9b0;
  margin-bottom: 4px;
}

.class-description {
  font-size: 11px;
  color: #808080;
  margin-bottom: 8px;
  font-style: italic;
}

.class-properties {
  margin-top: 8px;
}

.property-item {
  margin-bottom: 8px;
  padding: 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.property-header {
  font-size: 11px;
  font-weight: 500;
  color: #9cdcfe;
  margin-bottom: 4px;
}

.property-details {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 1px 6px;
  background: #0e639c;
  color: white;
  font-size: 10px;
  border-radius: 3px;
}

.badge.required {
  background: #d19a66;
}

.property-description {
  font-size: 11px;
  color: #808080;
  margin-bottom: 4px;
}
</style>
