<template>
  <section v-if="textures.length > 0" class="data-section">
    <h4 @click="toggleSection('textures')">
      <span class="toggle-icon">{{ isExpanded('textures') ? '▼' : '▶' }}</span>
      Textures ({{ textures.length }})
    </h4>
    <div v-if="isExpanded('textures')" class="section-content">
      <div
        v-for="(texture, index) in textures"
        :key="index"
        class="item-card with-preview"
        :class="{ selected: selectedType === 'texture' && selectedIndex === index }"
        @click="selectItem('texture', index)"
      >
        <div class="item-left">
          <div class="item-header">
            <span class="header-texture">Texture {{ index }}</span>
          </div>
          <div class="item-details">
            <div v-if="texture.source !== undefined" class="detail-row">
              <span class="detail-label">Source：</span>
              <span class="detail-value">{{ texture.source }}</span>
            </div>
            <div v-if="texture.sampler !== undefined" class="detail-row">
              <span class="detail-label">Sampler：</span>
              <span class="detail-value">{{ texture.sampler }}</span>
            </div>
          </div>
          <div v-if="texture.usage && texture.usage.length > 0" class="item-usage">
            <div v-for="(usage, usageIndex) in texture.usage" :key="usageIndex" class="usage-item">
              <div class="usage-info">
                <div class="usage-line">
                  <span class="usage-text">Mat：{{ usage.material }} </span>
                  <span class="usage-text">Attr：{{ usage.attribute }}</span>
                </div>
                <div v-if="usage.mesh !== undefined" class="usage-line">
                  <span class="usage-text">Mesh：{{ usage.mesh }} </span>
                  <span class="usage-text">Prim：{{ usage.primitive }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="item-right">
          <ImagePreview
            :image-url="getImageUrl(texture.source)"
            :alt-text="`Texture ${index}`"
            @open-image-modal="openImageModal"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import ImagePreview from './ImagePreview.vue'

const props = defineProps({
  textures: {
    type: Array,
    required: true
  },
  jsonObject: {
    type: Object,
    default: () => ({})
  },
  binaryData: {
    type: Uint8Array,
    default: null
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
  }
})

const emit = defineEmits(['select', 'toggleSection', 'openImageModal'])

function toggleSection(section) {
  emit('toggleSection', section)
}

function isExpanded(section) {
  return props.expandedSections.has(section)
}

function selectItem(type, index) {
  emit('select', type, index)
}

function openImageModal(url, alt) {
  emit('openImageModal', url, alt)
}

// Get image URL for preview
function getImageUrl(imageIndex) {
  const images = props.jsonObject.images || []
  const image = images[imageIndex]
  if (!image) return null
  
  // Handle external URI
  if (image.uri) {
    // Check if it's a data URI
    if (image.uri.startsWith('data:')) {
      return image.uri
    } else {
      // For external files, we can't directly access them
      // In a real app, you might need to load them from a server
      return null
    }
  }
  
  // Handle bufferView (embedded images)
  if (image.bufferView !== undefined && props.binaryData) {
    const bufferViews = props.jsonObject.bufferViews || []
    const bufferView = bufferViews[image.bufferView]
    if (bufferView) {
      const byteOffset = bufferView.byteOffset || 0
      const byteLength = bufferView.byteLength
      const imageData = props.binaryData.subarray(byteOffset, byteOffset + byteLength)
      const blob = new Blob([imageData], { type: image.mimeType || 'image/jpeg' })
      return URL.createObjectURL(blob)
    }
  }
  
  return null
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
  padding: 7px 10px;
  background: #2d2d30;
  font-size: 11px;
  font-weight: 500;
  color: #cccccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
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
  padding: 6px;
  background: #1e1e1e;
}

.item-card {
  padding: 6px 10px;
  margin-bottom: 5px;
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

.item-card.with-preview {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.item-left {
  flex: 1;
}

.item-right {
  flex-shrink: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #4ec9b0;
  flex-wrap: wrap;
}

.header-texture {
  color: #9cdcfe;
}

.item-detail {
  font-size: 10px;
  color: #808080;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 0;
}

.detail-label {
  color: #808080;
  font-size: 9px;
}

.detail-value {
  color: #ce9178;
  font-size: 10px;
}

.item-usage {
  margin-top: 4px;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
}

.usage-badge {
  display: inline-block;
  padding: 1px 3px;
  background: #504636;
  color: #d4c496;
  font-size: 8px;
  border-radius: 2px;
  font-weight: 600;
}

.usage-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.usage-line {
  display: flex;
  align-items: center;
  gap: 4px;
}

.usage-text {
  font-size: 9px;
  color: #808080;
}

.usage-text:first-child {
  color: #ce9178;
}
</style>
