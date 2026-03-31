<template>
  <section v-if="structuralMetadata" class="data-section">
    <h4 @click="toggleSection('structuralMetadata')">
      <span class="toggle-icon">{{ isExpanded('structuralMetadata') ? '▼' : '▶' }}</span>
      Structural Metadata (EXT_structural_metadata)
    </h4>
    <div v-if="isExpanded('structuralMetadata')" class="section-content">
      <!-- Schema -->
      <div v-if="structuralMetadata.schema" class="metadata-section">
        <h5>Schema</h5>
        <StructuralMetadataSchema :schema="structuralMetadata.schema" :format-value="formatValue" />

        <!-- Enums -->
        <div v-if="structuralMetadata.schema.enums && Object.keys(structuralMetadata.schema.enums).length > 0" class="metadata-subsection">
          <h6>Enums</h6>
          <StructuralMetadataEnums :enums="structuralMetadata.schema.enums" />
        </div>
      </div>

      <!-- Property Tables -->
      <div v-if="structuralMetadata.propertyTables && structuralMetadata.propertyTables.length > 0" class="metadata-section">
        <h5>Property Tables</h5>
        <StructuralMetadataPropertyTables :property-tables="structuralMetadata.propertyTables" />
      </div>

      <!-- Property Attributes -->
      <div v-if="structuralMetadata.propertyAttributes && structuralMetadata.propertyAttributes.length > 0" class="metadata-section">
        <h5>Property Attributes</h5>
        <StructuralMetadataPropertyAttributes :property-attributes="structuralMetadata.propertyAttributes" />
      </div>

      <!-- Property Textures -->
      <div v-if="structuralMetadata.propertyTextures && structuralMetadata.propertyTextures.length > 0" class="metadata-section">
        <h5>Property Textures</h5>
        <StructuralMetadataPropertyTextures :property-textures="structuralMetadata.propertyTextures" />
      </div>
    </div>
  </section>
</template>

<script setup>
import StructuralMetadataSchema from './StructuralMetadataSchema.vue'
import StructuralMetadataEnums from './StructuralMetadataEnums.vue'
import StructuralMetadataPropertyTables from './StructuralMetadataPropertyTables.vue'
import StructuralMetadataPropertyAttributes from './StructuralMetadataPropertyAttributes.vue'
import StructuralMetadataPropertyTextures from './StructuralMetadataPropertyTextures.vue'

const props = defineProps({
  structuralMetadata: {
    type: Object,
    default: null
  },
  expandedSections: {
    type: Object,
    required: true
  },
  formatValue: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['toggleSection'])

function toggleSection(section) {
  emit('toggleSection', section)
}

function isExpanded(section) {
  return props.expandedSections.has(section)
}
</script>

<style scoped>
.data-section {
  border: 1px solid #3e3e42;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.data-section h4 {
  margin: 0;
  padding: 8px 12px;
  background: #2d2d30;
  font-size: 12px;
  font-weight: 500;
  color: #cccccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.data-section h4:hover {
  background: #3c3c3c;
}

.toggle-icon {
  font-size: 10px;
  color: #858585;
}

.section-content {
  padding: 8px;
  background: #1e1e1e;
}

.metadata-section {
  margin-bottom: 12px;
  padding: 8px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
}

.metadata-section:last-child {
  margin-bottom: 0;
}

.metadata-section h5 {
  margin: 0 0 8px 0;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: #4ec9b0;
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
  padding: 0;
  font-size: 10px;
  font-weight: 600;
  color: #9cdcfe;
}
</style>
