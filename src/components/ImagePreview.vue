<template>
  <div class="item-preview">
    <img 
      v-if="imageUrl" 
      :src="imageUrl" 
      :alt="altText" 
      class="preview-image" 
      @click.stop="openImageModal(imageUrl, altText)" 
      @error="handleImageError"
    />
    <div v-else class="preview-placeholder">No preview</div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'ImagePreview'
})

const props = defineProps({
  imageUrl: {
    type: String,
    default: null
  },
  altText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['openImageModal'])

function openImageModal(url, alt) {
  emit('openImageModal', url, alt)
}

function handleImageError(event) {
  console.error('Image failed to load:', props.imageUrl)
  event.target.style.display = 'none'
}
</script>

<style scoped>
.item-preview {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  border: 1px solid #3e3e42;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e1e;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s;
  border-radius: 0;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}

.preview-image:hover {
  transform: scale(1.05);
}

.preview-placeholder {
  font-size: 10px;
  color: #808080;
  text-align: center;
  padding: 10px;
}
</style>
