<template>
  <section v-if="images.length > 0" class="data-section">
    <h4 @click="toggleSection('images')">
      <span class="toggle-icon">{{ isExpanded('images') ? '▼' : '▶' }}</span>
      Images ({{ images.length }})
    </h4>
    <div v-if="isExpanded('images')" class="section-content">
      <div
        v-for="(image, index) in images"
        :key="index"
        class="item-card with-preview"
        :class="{ selected: selectedType === 'image' && selectedIndex === index }"
        @click="selectItem('image', index)"
      >
        <div class="item-content">
          <div class="item-header">Image {{ index }}</div>
          <div v-if="image.name" class="item-name">{{ image.name }}</div>
          <div v-if="image.uri" class="item-detail">URI: {{ image.uri }}</div>
          <div v-if="image.bufferView !== undefined" class="item-detail">BufferView: {{ image.bufferView }}</div>
          <div v-if="image.mimeType" class="item-detail">MIME: {{ image.mimeType }}</div>
        </div>
        <ImagePreview 
          :image-url="getImageUrl(index)" 
          :alt-text="`Image ${index}`" 
          @open-image-modal="openImageModal" 
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import ImagePreview from './ImagePreview.vue'

const props = defineProps({
  images: {
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
  const images = props.images || []
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

.item-card {
  padding: 8px 12px;
  margin-bottom: 6px;
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
  gap: 12px;
}

.item-content {
  flex: 1;
}

.item-header {
  font-size: 12px;
  font-weight: 500;
  color: #4ec9b0;
  margin-bottom: 4px;
}

.item-name {
  font-size: 11px;
  color: #9cdcfe;
  margin-bottom: 4px;
}

.item-detail {
  font-size: 11px;
  color: #808080;
  margin-top: 2px;
}
</style>
