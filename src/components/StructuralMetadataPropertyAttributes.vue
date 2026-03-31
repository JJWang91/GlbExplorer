<template>
  <div class="metadata-property-attributes">
    <div
      v-for="(attr, index) in propertyAttributes"
      :key="index"
      class="metadata-attribute"
    >
      <div class="attribute-header">{{ attr.name }}</div>
      <div class="info-row">
        <span class="label">Class:</span>
        <span class="value">{{ attr.class }}</span>
      </div>
      <div class="info-row">
        <span class="label">Attribute:</span>
        <span class="value">{{ attr.attribute }}</span>
      </div>
      <div v-if="Object.keys(attr.properties).length > 0" class="attribute-properties">
        <div
          v-for="(prop, propName) in attr.properties"
          :key="propName"
          class="attribute-property"
        >
          <span class="property-name">{{ propName }}</span>
          <span class="property-value">{{ prop }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  propertyAttributes: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.metadata-property-attributes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-attribute {
  margin-bottom: 8px;
  padding: 8px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.attribute-header {
  font-size: 12px;
  font-weight: 500;
  color: #4ec9b0;
  margin-bottom: 4px;
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

.attribute-properties {
  margin-top: 8px;
  padding: 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.attribute-property {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 11px;
  border-bottom: 1px solid #3e3e42;
}

.attribute-property:last-child {
  border-bottom: none;
}

.property-name {
  color: #9cdcfe;
}

.property-value {
  color: #ce9178;
  font-size: 11px;
}
</style>
