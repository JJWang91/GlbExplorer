<template>
  <div class="parsed-data-view">
    <div v-if="!hasData" class="no-data">
      No GLB file loaded
    </div>
    <div v-else class="data-content">
      <div class="image-modal" v-if="showImageModal" @click="closeImageModal">
        <div class="modal-content" @click.stop>
          <button class="modal-close" @click="closeImageModal">&times;</button>
          <img :src="currentImageUrl" :alt="currentImageAlt" class="modal-image" />
        </div>
      </div>

      <div class="tabs-header">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <div class="tab-content">
        <div v-show="activeTab === 'geometry'" class="tab-panel">
          <AccessorsView :accessors="filteredAccessors" :binary-data="binaryData" :json-object="jsonObject"
            :selected-type="selectedType" :selected-index="selectedIndex" :expanded-sections="expandedSections"
            :expanded-groups="expandedGroups" :expanded-sub-groups="expandedSubGroups" @select="selectItem"
            @toggle-section="toggleSection" />
          
          <section v-if="filteredBufferViews.length > 0" class="data-section">
            <h4 @click="toggleSection('bufferViews')">
              <span class="toggle-icon">{{ isExpanded('bufferViews') ? '▼' : '▶' }}</span>
              BufferViews ({{ filteredBufferViews.length }})
            </h4>
            <div v-if="isExpanded('bufferViews')" class="section-content">
              <div v-for="(bufferView, index) in filteredBufferViews" :key="index" class="item-card">
                <div class="item-header">BufferView {{ index }}</div>
                <div class="item-details">
                  <span class="badge">Buffer {{ bufferView.buffer }}</span>
                </div>
                <div class="item-detail">Offset: {{ bufferView.byteOffset || 0 }}</div>
                <div class="item-detail">Length: {{ bufferView.byteLength }}</div>
                <div v-if="bufferView.byteStride" class="item-detail">Stride: {{ bufferView.byteStride }}</div>
                <div v-if="bufferView.target" class="item-detail">Target: {{ getTargetName(bufferView.target) }}</div>
              </div>
            </div>
          </section>

          <section v-if="filteredBuffers.length > 0" class="data-section">
            <h4 @click="toggleSection('buffers')">
              <span class="toggle-icon">{{ isExpanded('buffers') ? '▼' : '▶' }}</span>
              Buffers ({{ filteredBuffers.length }})
            </h4>
            <div v-if="isExpanded('buffers')" class="section-content">
              <div v-for="(buffer, index) in filteredBuffers" :key="index" class="item-card">
                <div class="item-header">Buffer {{ index }}</div>
                <div v-if="buffer.uri" class="item-name">{{ buffer.uri }}</div>
                <div class="item-detail">Byte Length: {{ buffer.byteLength }}</div>
              </div>
            </div>
          </section>
        </div>

        <div v-show="activeTab === 'material'" class="tab-panel">
          <section v-if="filteredMaterials.length > 0" class="data-section">
            <h4 @click="toggleSection('materials')">
              <span class="toggle-icon">{{ isExpanded('materials') ? '▼' : '▶' }}</span>
              Materials ({{ filteredMaterials.length }})
            </h4>
            <div v-if="isExpanded('materials')" class="section-content">
              <div v-for="(material, index) in filteredMaterials" :key="index" class="item-card"
                :class="{ selected: selectedType === 'material' && selectedIndex === index }"
                @click="selectItem('material', index)">
                <div class="item-header">Material {{ index }}</div>
                <div v-if="material.name" class="item-name">{{ material.name }}</div>
                <div class="item-details">
                  <span v-if="material.pbrMetallicRoughness" class="badge">PBR</span>
                  <span v-if="material.normalTexture" class="badge">Normal</span>
                  <span v-if="material.emissiveTexture" class="badge">Emissive</span>
                </div>
              </div>
            </div>
          </section>

          <TexturesView :textures="filteredTextures" :json-object="jsonObject" :binary-data="binaryData"
            :selected-type="selectedType" :selected-index="selectedIndex" :expanded-sections="expandedSections"
            @select="selectItem" @toggle-section="toggleSection" @open-image-modal="openImageModal" />

          <ImagesView :images="filteredImages" :json-object="jsonObject" :binary-data="binaryData"
            :selected-type="selectedType" :selected-index="selectedIndex" :expanded-sections="expandedSections"
            @select="selectItem" @toggle-section="toggleSection" @open-image-modal="openImageModal" />
        </div>

        <div v-show="activeTab === 'scene'" class="tab-panel">
          <section v-if="jsonObject.scene !== undefined" class="data-section">
            <h4 @click="toggleSection('scene')">
              <span class="toggle-icon">{{ isExpanded('scene') ? '▼' : '▶' }}</span>
              Default Scene
            </h4>
            <div v-if="isExpanded('scene')" class="section-content">
              <div class="info-row">
                <span class="label">Scene Index:</span>
                <span class="value">{{ jsonObject.scene }}</span>
              </div>
            </div>
          </section>

          <section v-if="filteredScenes.length > 0" class="data-section">
            <h4 @click="toggleSection('scenes')">
              <span class="toggle-icon">{{ isExpanded('scenes') ? '▼' : '▶' }}</span>
              Scenes ({{ filteredScenes.length }})
            </h4>
            <div v-if="isExpanded('scenes')" class="section-content">
              <div v-for="(scene, index) in filteredScenes" :key="index" class="item-card"
                :class="{ selected: selectedType === 'scene' && selectedIndex === index }"
                @click="selectItem('scene', index)">
                <div class="item-header">Scene {{ index }}</div>
                <div v-if="scene.name" class="item-name">{{ scene.name }}</div>
                <div class="item-detail">Nodes: {{ scene.nodes?.length || 0 }}</div>
              </div>
            </div>
          </section>

          <section v-if="filteredNodes.length > 0" class="data-section">
            <h4 @click="toggleSection('nodes')">
              <span class="toggle-icon">{{ isExpanded('nodes') ? '▼' : '▶' }}</span>
              Nodes ({{ filteredNodes.length }})
            </h4>
            <div v-if="isExpanded('nodes')" class="section-content">
              <div v-for="(node, index) in filteredNodes" :key="index" class="item-card"
                :class="{ selected: selectedType === 'node' && selectedIndex === index }"
                @click="selectItem('node', index)">
                <div class="item-header">Node {{ index }}</div>
                <div v-if="node.name" class="item-name">{{ node.name }}</div>
                <div class="item-details">
                  <span v-if="node.mesh !== undefined">Mesh: {{ node.mesh }}</span>
                  <span v-if="node.children">Children: {{ node.children.length }}</span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="filteredMeshes.length > 0" class="data-section">
            <h4 @click="toggleSection('meshes')">
              <span class="toggle-icon">{{ isExpanded('meshes') ? '▼' : '▶' }}</span>
              Meshes ({{ filteredMeshes.length }})
            </h4>
            <div v-if="isExpanded('meshes')" class="section-content">
              <div v-for="(mesh, mIndex) in filteredMeshes" :key="mIndex" class="mesh-card"
                :class="{ 'mesh-selected': selectedMeshIndex === mIndex }">
                <div class="item-card"
                  :class="{ selected: selectedType === 'mesh' && selectedIndex === mIndex, 'mesh-highlighted': selectedMeshIndex === mIndex && selectedPrimitiveIndex === -1 }"
                  @click="selectItem('mesh', mIndex)">
                  <div class="item-header">Mesh {{ mIndex }}</div>
                  <div v-if="mesh.name" class="item-name">{{ mesh.name }}</div>
                  <div class="item-detail">Primitives: {{ mesh.primitives?.length || 0 }}</div>
                </div>
                <div v-if="mesh.primitives && mesh.primitives.length > 0 && (selectedMeshIndex === mIndex || isExpanded(`mesh_primitives_${mIndex}`))" class="primitives-list">
                  <div v-for="(primitive, pIndex) in mesh.primitives" :key="pIndex"
                    class="primitive-card"
                    :class="{ 'primitive-highlighted': selectedMeshIndex === mIndex && selectedPrimitiveIndex === pIndex }">
                    <div class="primitive-header">
                      <span class="primitive-index">Primitive {{ pIndex }}</span>
                      <span v-if="primitive.material !== undefined" class="badge">Material {{ primitive.material }}</span>
                      <span v-if="primitive.mode !== undefined" class="badge">Mode {{ getPrimitiveModeName(primitive.mode) }}</span>
                    </div>
                    <div class="primitive-attributes">
                      <div v-if="primitive.indices !== undefined" class="attr-item">
                        <span class="attr-name">indices:</span>
                        <span class="attr-value">Accessor {{ primitive.indices }}</span>
                      </div>
                      <div v-for="(accIdx, attrName) in primitive.attributes" :key="attrName" class="attr-item">
                        <span class="attr-name">{{ attrName }}:</span>
                        <span class="attr-value">Accessor {{ accIdx }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-show="activeTab === 'animation'" class="tab-panel">
          <section v-if="filteredAnimations.length > 0" class="data-section">
            <h4 @click="toggleSection('animations')">
              <span class="toggle-icon">{{ isExpanded('animations') ? '▼' : '▶' }}</span>
              Animations ({{ filteredAnimations.length }})
            </h4>
            <div v-if="isExpanded('animations')" class="section-content">
              <div v-for="(animation, index) in filteredAnimations" :key="index" class="item-card"
                :class="{ selected: selectedType === 'animation' && selectedIndex === index }"
                @click="selectItem('animation', index)">
                <div class="item-header">Animation {{ index }}</div>
                <div v-if="animation.name" class="item-name">{{ animation.name }}</div>
                <div class="item-detail">Channels: {{ animation.channels?.length || 0 }}</div>
                <div class="item-detail">Samplers: {{ animation.samplers?.length || 0 }}</div>
              </div>
            </div>
          </section>
          <div v-if="filteredAnimations.length === 0" class="empty-tab">
            No animations in this model
          </div>
        </div>

        <div v-show="activeTab === 'metadata'" class="tab-panel">
          <section v-if="jsonObject.asset" class="data-section">
            <h4 @click="toggleSection('asset')">
              <span class="toggle-icon">{{ isExpanded('asset') ? '▼' : '▶' }}</span>
              Asset Info
            </h4>
            <div v-if="isExpanded('asset')" class="section-content">
              <div class="info-row">
                <span class="label">Version:</span>
                <span class="value">{{ jsonObject.asset.version }}</span>
              </div>
              <div v-if="jsonObject.asset.generator" class="info-row">
                <span class="label">Generator:</span>
                <span class="value">{{ jsonObject.asset.generator }}</span>
              </div>
              <div v-if="jsonObject.asset.copyright" class="info-row">
                <span class="label">Copyright:</span>
                <span class="value">{{ jsonObject.asset.copyright }}</span>
              </div>
            </div>
          </section>

          <StructuralMetadataView :structural-metadata="structuralMetadata" :expanded-sections="expandedSections"
            :format-value="formatValue" @toggle-section="toggleSection" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import StructuralMetadataView from './StructuralMetadataView.vue'
import AccessorsView from './AccessorsView.vue'
import TexturesView from './TexturesView.vue'
import ImagesView from './ImagesView.vue'

const props = defineProps({
  jsonObject: {
    type: Object,
    default: () => ({})
  },
  binaryData: {
    type: Uint8Array,
    default: null
  },
  structuralMetadata: {
    type: Object,
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
  selectedMeshIndex: {
    type: Number,
    default: -1
  },
  selectedPrimitiveIndex: {
    type: Number,
    default: -1
  }
})

const emit = defineEmits(['select'])

const activeTab = ref('geometry')
const expandedSections = ref(new Set(['accessors', 'materials', 'textures']))
const expandedGroups = ref(new Set())
const expandedSubGroups = ref(new Set())

const tabs = computed(() => [
  { 
    id: 'geometry', 
    label: '几何数据',
    count: (props.jsonObject.accessors?.length || 0) + 
           (props.jsonObject.bufferViews?.length || 0) + 
           (props.jsonObject.buffers?.length || 0)
  },
  { 
    id: 'material', 
    label: '材质纹理',
    count: (props.jsonObject.materials?.length || 0) + 
           (props.jsonObject.textures?.length || 0) + 
           (props.jsonObject.images?.length || 0)
  },
  { 
    id: 'scene', 
    label: '场景结构',
    count: (props.jsonObject.scenes?.length || 0) + 
           (props.jsonObject.nodes?.length || 0) + 
           (props.jsonObject.meshes?.length || 0)
  },
  { 
    id: 'animation', 
    label: '动画',
    count: props.jsonObject.animations?.length || 0
  },
  { 
    id: 'metadata', 
    label: '元数据',
    count: props.structuralMetadata ? 1 : 0
  }
])

watch(() => props.selectedMeshIndex, (newVal) => {
  if (newVal >= 0) {
    activeTab.value = 'scene'
    expandedSections.value.add('meshes')
    nextTick(() => {
      const highlighted = document.querySelector('.mesh-selected')
      if (highlighted) {
        highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }
})

const showImageModal = ref(false)
const currentImageUrl = ref('')
const currentImageAlt = ref('')

const hasData = computed(() => Object.keys(props.jsonObject).length > 0)

const filteredScenes = computed(() => props.jsonObject.scenes || [])
const filteredNodes = computed(() => props.jsonObject.nodes || [])
const filteredMeshes = computed(() => props.jsonObject.meshes || [])

const filteredAccessors = computed(() => {
  const accessors = props.jsonObject.accessors || []
  return accessors.map((accessor, index) => {
    const usage = findAccessorUsage(index)
    return { ...accessor, usage }
  })
})

const filteredBufferViews = computed(() => props.jsonObject.bufferViews || [])
const filteredBuffers = computed(() => props.jsonObject.buffers || [])
const filteredMaterials = computed(() => props.jsonObject.materials || [])

const filteredTextures = computed(() => {
  const textures = props.jsonObject.textures || []
  return textures.map((texture, index) => {
    const usage = findTextureUsage(index)
    return { ...texture, usage }
  })
})

const filteredImages = computed(() => props.jsonObject.images || [])
const filteredAnimations = computed(() => props.jsonObject.animations || [])

function isExpanded(section) {
  return expandedSections.value.has(section)
}

function toggleSection(section) {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section)
  } else {
    expandedSections.value.add(section)
  }
}

function selectItem(type, index) {
  emit('select', type, index)
}

function formatValue(value, type) {
  if (value === null || value === undefined) return 'N/A'
  switch (type) {
    case 'SCALAR': return value.toString()
    case 'VEC2':
    case 'VEC3':
    case 'VEC4':
    case 'MAT2':
    case 'MAT3':
    case 'MAT4':
      if (Array.isArray(value)) {
        return `[${value.map(v => typeof v === 'number' ? v.toFixed(4) : v).join(', ')}]`
      }
      return value.toString()
    case 'STRING': return value.toString()
    case 'BOOLEAN': return value ? 'true' : 'false'
    default: return value.toString()
  }
}

function getTargetName(target) {
  const targets = { 34962: 'ARRAY_BUFFER', 34963: 'ELEMENT_ARRAY_BUFFER' }
  return targets[target] || `TARGET_${target}`
}

function getPrimitiveModeName(mode) {
  const modes = {
    0: 'POINTS', 1: 'LINES', 2: 'LINE_LOOP', 3: 'LINE_STRIP',
    4: 'TRIANGLES', 5: 'TRIANGLE_STRIP', 6: 'TRIANGLE_FAN'
  }
  return modes[mode] || `MODE_${mode}`
}

function findAccessorUsage(accessorIndex) {
  const meshes = props.jsonObject.meshes || []
  const animations = props.jsonObject.animations || []
  const usages = []
  
  meshes.forEach((mesh, meshIndex) => {
    if (mesh.primitives) {
      mesh.primitives.forEach((primitive, primIndex) => {
        const attributes = primitive.attributes
        if (attributes) {
          Object.entries(attributes).forEach(([attribute, accessorIdx]) => {
            if (accessorIdx === accessorIndex) {
              usages.push({
                type: 'mesh',
                mesh: mesh.name ? `${mesh.name} (${meshIndex})` : meshIndex,
                primitive: primIndex,
                attribute
              })
            }
          })
        }
        if (primitive.indices === accessorIndex) {
          usages.push({
            type: 'mesh',
            mesh: mesh.name ? `${mesh.name} (${meshIndex})` : meshIndex,
            primitive: primIndex,
            attribute: 'indices'
          })
        }
      })
    }
  })
  
  animations.forEach((animation, animIndex) => {
    if (animation.channels && animation.samplers) {
      animation.samplers.forEach((sampler, samplerIndex) => {
        if (sampler.input === accessorIndex) {
          usages.push({
            type: 'animation',
            animation: animation.name ? `${animation.name} (${animIndex})` : animIndex,
            sampler: samplerIndex,
            attribute: 'input'
          })
        }
        if (sampler.output === accessorIndex) {
          usages.push({
            type: 'animation',
            animation: animation.name ? `${animation.name} (${animIndex})` : animIndex,
            sampler: samplerIndex,
            attribute: 'output'
          })
        }
      })
    }
  })
  
  return usages
}

function findTextureUsage(textureIndex) {
  const materials = props.jsonObject.materials || []
  const usages = []
  
  materials.forEach((material, matIndex) => {
    const materialName = material.name ? `${material.name} (${matIndex})` : matIndex
    
    if (material.pbrMetallicRoughness) {
      if (material.pbrMetallicRoughness.baseColorTexture?.index === textureIndex) {
        usages.push({ type: 'material', material: materialName, attribute: 'baseColorTexture' })
      }
      if (material.pbrMetallicRoughness.metallicRoughnessTexture?.index === textureIndex) {
        usages.push({ type: 'material', material: materialName, attribute: 'metallicRoughnessTexture' })
      }
    }
    if (material.normalTexture?.index === textureIndex) {
      usages.push({ type: 'material', material: materialName, attribute: 'normalTexture' })
    }
    if (material.occlusionTexture?.index === textureIndex) {
      usages.push({ type: 'material', material: materialName, attribute: 'occlusionTexture' })
    }
    if (material.emissiveTexture?.index === textureIndex) {
      usages.push({ type: 'material', material: materialName, attribute: 'emissiveTexture' })
    }
  })
  
  return usages
}

function openImageModal(url, alt) {
  currentImageUrl.value = url
  currentImageAlt.value = alt
  showImageModal.value = true
}

function closeImageModal() {
  showImageModal.value = false
  currentImageUrl.value = ''
  currentImageAlt.value = ''
}
</script>

<style scoped>
.parsed-data-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #808080;
  font-size: 14px;
}

.data-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  flex-shrink: 0;
  overflow-x: auto;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #808080;
  font-size: 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn:hover {
  color: #cccccc;
  background: #3c3c3c;
}

.tab-btn.active {
  color: #ffffff;
  border-bottom-color: #2196F3;
  background: #1e1e1e;
}

.tab-count {
  background: #3c3c3c;
  color: #cccccc;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.tab-btn.active .tab-count {
  background: #2196F3;
  color: white;
}

.tab-content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.tab-panel {
  padding: 8px;
}

.empty-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #808080;
  font-size: 13px;
}

.data-section {
  border: 1px solid #3e3e42;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.data-section:last-child {
  margin-bottom: 0;
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

.item-details {
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

.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  background: #252526;
  padding: 5px 5px 0px 5px;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: 0px;
  right: 0px;
  background: transparent;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 16px;
  cursor: pointer;
  z-index: 1001;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-image {
  max-width: 100%;
  max-height: 80vh;
  min-width: 128px;
  min-height: 128px;
  object-fit: contain;
  border-radius: 0;
}

.mesh-card {
  margin-bottom: 8px;
}

.mesh-card.mesh-selected {
  border-left: 3px solid #0e639c;
  padding-left: 2px;
}

.item-card.mesh-highlighted {
  background: rgba(14, 99, 156, 0.25);
  border-color: #0e639c;
  box-shadow: 0 0 6px rgba(14, 99, 156, 0.3);
}

.primitives-list {
  margin-left: 16px;
  margin-top: 4px;
  border-left: 2px solid #3e3e42;
  padding-left: 8px;
}

.primitive-card {
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  font-size: 11px;
}

.primitive-card.primitive-highlighted {
  background: rgba(0, 255, 255, 0.08);
  border-color: #00cccc;
  box-shadow: 0 0 4px rgba(0, 255, 255, 0.2);
}

.primitive-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.primitive-index {
  font-weight: 500;
  color: #4ec9b0;
}

.primitive-attributes {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attr-item {
  display: flex;
  gap: 6px;
  font-size: 11px;
}

.attr-name {
  color: #9cdcfe;
  min-width: 100px;
}

.attr-value {
  color: #ce9178;
}
</style>
