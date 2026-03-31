<template>
  <div class="metadata-property-textures">
    <div
      v-for="(texture, index) in propertyTextures"
      :key="index"
      class="metadata-texture"
    >
      <div class="texture-header">{{ texture.name }}</div>
      <div class="info-row">
        <span class="label">Class:</span>
        <span class="value">{{ texture.class }}</span>
      </div>
      <div v-if="Object.keys(texture.properties).length > 0" class="texture-properties">
        <div
          v-for="(prop, propName) in texture.properties"
          :key="propName"
          class="texture-property"
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
  propertyTextures: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.metadata-property-textures {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-texture {
  margin-bottom: 8px;
  padding: 8px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.texture-header {
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

.texture-properties {
  margin-top: 8px;
  padding: 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.texture-property {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 11px;
  border-bottom: 1px solid #3e3e42;
}

.texture-property:last-child {
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
