<template>
  <div id="app">
    <!-- 2x2 Grid Layout -->
    <div class="grid-container">
      <!-- Top Left: 3D Preview with Header and Status -->
      <div class="grid-item json-item">
        <div class="panel json-panel">
          <div class="panel-header">
            <h3>GLB/glTF Model Viewer</h3>
            <div class="header-controls">
              <div class="url-input-group">
                <input 
                  type="text" 
                  v-model="glbUrl" 
                  placeholder="输入GLB/glTF模型URL..." 
                  @keyup.enter="loadFromUrl"
                  @dblclick="$event.target.select()"
                  class="url-input"
                />
                <button @click="loadFromUrl" :disabled="isLoading" class="load-btn">
                  {{ isLoading ? '加载中...' : '加载' }}
                </button>
              </div>
              <input type="file" accept=".glb,.gltf" @change="handleFileUpload" ref="fileInputRef" class="file-input" />
            </div>
          </div>
          <div id="preview-container">
            <div class="scene-controls">
              <select v-model="shadingMode" @change="updateShadingMode" title="着色模式">
                <option value="default">默认着色</option>
                <option value="normal">法向着色</option>
                <option value="uv">UV着色</option>
              </select>
              <label class="switch" title="双面渲染">
                <input type="checkbox" v-model="doubleSidedRender" @change="updateDoubleSidedRender" />
                <span class="slider"></span>
              </label>
              <label class="switch" title="线框模式">
                <input type="checkbox" v-model="wireframeMode" @change="updateWireframeMode" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="status-section">
              <span>File: {{ fileName || 'No file loaded' }}</span>
              <span>Type: {{ modelType.toUpperCase() }}</span>
              <span>Size: {{ formatBytes(fileSize) }}</span>
              <span>Version: {{ glbVersion }}</span>
              <span v-if="modelType === 'glb'">JSON Chunk: {{ formatBytes(jsonChunkSize) }}</span>
              <span v-if="modelType === 'glb'">Binary Chunk: {{ formatBytes(binaryChunkSize) }}</span>
              <span v-if="modelType === 'gltf'">Buffers: {{ binaryChunkSize ? formatBytes(binaryChunkSize) : 'External' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Right: JSON Structure -->
      <div class="grid-item json-item">
        <div class="panel json-panel">
          <div class="panel-header">
            <h3>JSON Structure</h3>
            <div class="panel-tools">
              <button @click="copyJson" title="复制JSON到剪贴板">复制JSON</button>
            </div>
          </div>
          <div class="panel-content">
            <json-tree :data="jsonObject" :expanded-keys="expandedKeys" @select="onJsonSelect" @toggle="onJsonToggle" @select-mesh-primitive="onMeshPrimitiveSelect" />
          </div>
        </div>
      </div>

      <!-- Bottom Left: Hex Viewer -->
      <div class="grid-item hex-item">
        <div class="panel hex-panel">
          <div class="panel-header">
            <h3>Hex View</h3>
            <div class="panel-tools">
            </div>
          </div>
          <div class="panel-content">
            <hex-viewer :data="binaryDataArray" :highlight-range="highlightRange" :json-object="jsonObject"
              :expanded-accessor-indices="expandedAccessorIndices"
              @select="onHexSelect" />
          </div>
        </div>
      </div>

      <!-- Bottom Right: Parsed Data -->
      <div class="grid-item parsed-item">
        <div class="panel parsed-panel">
          <div class="panel-header">
            <h3>Parsed Data</h3>
            <div class="panel-tools">
            </div>
          </div>
          <div class="panel-content">
            <parsed-data-view :json-object="jsonObject" :binary-data="binaryDataArray"
              :structural-metadata="structuralMetadata" :selected-type="selectedChunkType"
              :selected-index="selectedDataIndex"
              :selected-mesh-index="selectedMeshIndex" :selected-primitive-index="selectedPrimitiveIndex"
              @select="onParsedDataSelect" />
          </div>
        </div>
      </div>
    </div>

    <a href="https://github.com/JJWang91/GlbExplorer" target="_blank" rel="noopener noreferrer" class="github-fab" title="GitHub Repository">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"></path>
      </svg>
    </a>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import JsonTree from './components/JsonTree.vue'
import HexViewer from './components/HexViewer.vue'
import ParsedDataView from './components/ParsedDataView.vue'
import { applyShadingMode, restoreOriginalMaterials } from './utils/shadingUtils.js'
import { loadGltfFromUrl, processGltfFile, combineGltfBuffers } from './utils/gltfLoader.js'

// State
const jsonObject = ref({})
const binaryDataArray = ref(null)
const expandedKeys = ref(new Set())
const selectedOffset = ref('0x00000000')
const highlightRange = ref({ start: -1, end: -1 })
const selectedChunkType = ref('all')
const selectedDataIndex = ref(-1)
const structuralMetadata = ref(null)

// Mesh/Primitive selection state
const selectedMeshIndex = ref(-1)
const selectedPrimitiveIndex = ref(-1)
const expandedAccessorIndices = ref([])

// Panel width state
const panelWidths = ref({
  left: 30,
  middle: 40,
  right: 30
})

// Resize state
const isResizing = ref(false)
const currentResizer = ref(null)
const startX = ref(0)
const startWidths = ref({ left: 0, middle: 0, right: 0 })

// Refs
const mainContainerRef = ref(null)
const fileInputRef = ref(null)

// File info
const fileName = ref('')
const fileSize = ref(0)
const glbVersion = ref('-')
const jsonChunkSize = ref(0)
const binaryChunkSize = ref(0)

// URL loading state
const glbUrl = ref('')
const isLoading = ref(false)
const modelType = ref('glb')

// Three.js
let scene, camera, renderer, model, controls, gridHelper
const doubleSidedRender = ref(false)
const shadingMode = ref('default')
const wireframeMode = ref(false)
const originalMaterials = ref(new Map())
// Map from "meshIndex-primitiveIndex" to THREE.Mesh for 3D highlighting
const meshPrimitiveObjects = ref(new Map())

onMounted(() => {
  initScene()
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)

  // Add drag and drop support
  const container = document.getElementById('app')
  if (container) {
    container.addEventListener('dragover', onDragOver)
    container.addEventListener('drop', onDrop)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)

  const container = document.getElementById('app')
  if (container) {
    container.removeEventListener('dragover', onDragOver)
    container.removeEventListener('drop', onDrop)
  }
})

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}

function onDrop(e) {
  e.preventDefault()
  
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext !== 'glb' && ext !== 'gltf') {
      alert('请拖入 .glb 或 .gltf 文件')
      return
    }
    clearOtherInputStates('drop')
    processFile(file)
  }
}

function clearOtherInputStates(source) {
  if (source === 'file' || source === 'drop') {
    glbUrl.value = ''
  }
  if (source === 'url' || source === 'drop') {
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

function initScene() {
  const container = document.getElementById('preview-container')
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
  camera.position.set(0, 0, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.appendChild(renderer.domElement)

  // Add OrbitControls for interactive camera
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7)
  scene.add(directionalLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
  backLight.position.set(-5, 0, -5)
  scene.add(backLight)

  // Grid
  gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
  scene.add(gridHelper)

  function animate() {
    requestAnimationFrame(animate)
    // Update controls
    if (controls) {
      controls.update()
    }
    renderer.render(scene, camera)
  }

  animate()

  // Handle resize
  window.addEventListener('resize', () => {
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
  })
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  clearOtherInputStates('file')
  processFile(file)
}

function processFile(file) {
  fileName.value = file.name
  fileSize.value = file.size
  
  const ext = file.name.toLowerCase().split('.').pop()
  modelType.value = ext

  if (ext === 'gltf') {
    processGltfFileWrapper(file)
  } else {
    const reader = new FileReader()
    reader.onload = function (e) {
      const arrayBuffer = e.target.result
      parseGLBWithWorker(arrayBuffer)
      loadModelFromArrayBuffer(arrayBuffer)
    }
    reader.readAsArrayBuffer(file)
  }
}

async function processGltfFileWrapper(file) {
  isLoading.value = true
  try {
    const result = await processGltfFile(file)
    
    if (!result) {
      throw new Error('processGltfFile返回空结果')
    }
    
    const { gltfJson, buffers } = result
    
    if (!gltfJson) {
      throw new Error('无效的glTF JSON数据')
    }
    
    if (!buffers) {
      throw new Error('缓冲区数据加载失败')
    }
    
    jsonObject.value = gltfJson
    glbVersion.value = '2.0'
    jsonChunkSize.value = JSON.stringify(gltfJson).length
    
    initializeExpandedKeys(gltfJson)
    
    const validBuffers = buffers.filter(b => b !== null && b !== undefined)
    if (validBuffers.length > 0) {
      const { combinedBuffer, updatedBufferViews } = combineGltfBuffers(gltfJson, buffers)
      binaryDataArray.value = combinedBuffer
      binaryChunkSize.value = combinedBuffer.length
      
      if (!jsonObject.value.bufferViews) {
        jsonObject.value.bufferViews = updatedBufferViews
      }
    } else {
      binaryDataArray.value = null
      binaryChunkSize.value = 0
    }
    
    structuralMetadata.value = gltfJson.extensions?.EXT_structural_metadata || null
    
    loadModelFromGltfJson(gltfJson, file)
  } catch (error) {
    console.error('Error processing glTF file:', error)
    alert(`glTF文件处理失败: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function loadFromUrl() {
  const url = glbUrl.value.trim()
  if (!url) {
    alert('请输入GLB或glTF模型的URL')
    return
  }

  clearOtherInputStates('url')
  isLoading.value = true
  
  try {
    const urlPath = url.split('?')[0]
    const ext = urlPath.split('.').pop().toLowerCase()
    modelType.value = ext
    
    if (ext === 'gltf') {
      await loadGltfFromUrlWrapper(url)
    } else {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      
      const urlFileName = urlPath.substring(urlPath.lastIndexOf('/') + 1) || 'remote_model.glb'
      fileName.value = urlFileName
      fileSize.value = arrayBuffer.byteLength
      
      parseGLBWithWorker(arrayBuffer)
      loadModelFromArrayBuffer(arrayBuffer)
    }
  } catch (error) {
    console.error('Error loading model from URL:', error)
    alert(`加载失败: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function loadGltfFromUrlWrapper(url) {
  try {
    const result = await loadGltfFromUrl(url)
    
    if (!result) {
      throw new Error('loadGltfFromUrl返回空结果')
    }
    
    const { gltfJson, buffers, resources } = result
    
    if (!gltfJson) {
      throw new Error('无效的glTF JSON数据')
    }
    
    if (!buffers) {
      throw new Error('缓冲区数据加载失败')
    }
    
    const urlPath = url.split('?')[0]
    const urlFileName = urlPath.substring(urlPath.lastIndexOf('/') + 1) || 'remote_model.gltf'
    fileName.value = urlFileName
    
    jsonObject.value = gltfJson
    glbVersion.value = '2.0'
    jsonChunkSize.value = JSON.stringify(gltfJson).length
    
    initializeExpandedKeys(gltfJson)
    
    const validBuffers = buffers.filter(b => b !== null && b !== undefined)
    if (validBuffers.length > 0) {
      const { combinedBuffer, updatedBufferViews } = combineGltfBuffers(gltfJson, buffers)
      binaryDataArray.value = combinedBuffer
      binaryChunkSize.value = combinedBuffer.length
      fileSize.value = combinedBuffer.length
      
      if (!jsonObject.value.bufferViews) {
        jsonObject.value.bufferViews = updatedBufferViews
      }
    } else {
      binaryDataArray.value = null
      binaryChunkSize.value = 0
      fileSize.value = 0
    }
    
    structuralMetadata.value = gltfJson.extensions?.EXT_structural_metadata || null
    
    loadModelFromGltfUrl(url)
  } catch (error) {
    console.error('Error loading glTF from URL:', error)
    throw error
  }
}

function parseGLBWithWorker(arrayBuffer) {
  const worker = new Worker(new URL('./utils/glbParserWorker.js', import.meta.url), { type: 'module' })
  
  worker.onmessage = (e) => {
    const response = e.data
    if (response.success) {
      const data = response.data
      glbVersion.value = data.glbVersion
      jsonChunkSize.value = data.jsonChunkSize
      jsonObject.value = data.jsonObject
      structuralMetadata.value = data.structuralMetadata
      binaryChunkSize.value = data.binaryChunkSize

      initializeExpandedKeys(jsonObject.value)

      if (data.binaryChunkSize > 0) {
        binaryDataArray.value = new Uint8Array(arrayBuffer, data.binStart, data.binaryChunkSize)
      } else {
        binaryDataArray.value = null
      }
    } else {
      console.error('GLB Worker Parsing Error:', response.error)
    }
    worker.terminate()
  }

  worker.onerror = (err) => {
    console.error('Worker failed:', err)
    worker.terminate()
  }

  // Pass arrayBuffer to worker.
  worker.postMessage(arrayBuffer)
}

function initializeExpandedKeys(obj, prefix = '') {
  // Expand root level keys
  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key
      // Expand all root level keys
      expandedKeys.value.add(fullKey)
    })
  }
}

// Copy JSON to clipboard
function copyJson() {
  if (!jsonObject.value || Object.keys(jsonObject.value).length === 0) {
    alert('没有可复制的JSON数据')
    return
  }

  const jsonString = JSON.stringify(jsonObject.value, null, 2)

  navigator.clipboard.writeText(jsonString).then(() => {
    alert('JSON已复制到剪贴板！')
  }).catch(err => {
    console.error('复制失败:', err)
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = jsonString
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('JSON已复制到剪贴板！')
  })
}

function updateDoubleSidedRender() {
  if (!scene) return
  
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          material.side = doubleSidedRender.value ? THREE.DoubleSide : THREE.FrontSide
        })
      } else {
        child.material.side = doubleSidedRender.value ? THREE.DoubleSide : THREE.FrontSide
      }
    }
  })
  
  if (renderer) {
    renderer.render(scene, camera)
  }
}

function updateWireframeMode() {
  if (!scene) return

  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      const applyWireframe = (material) => {
        if (material) {
          material.wireframe = wireframeMode.value
          material.needsUpdate = true
        }
      }
      
      if (Array.isArray(child.material)) {
        child.material.forEach(applyWireframe)
      } else {
        applyWireframe(child.material)
      }
    }
  })

  if (renderer) {
    renderer.render(scene, camera)
  }
}

function updateShadingMode() {
  if (!scene || !model) return

  if (shadingMode.value === 'default') {
    restoreOriginalMaterials(scene, originalMaterials.value)
  } else {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!originalMaterials.value.has(child)) {
          originalMaterials.value.set(child, child.material)
        }
      }
    })
    applyShadingMode(scene, shadingMode.value)
  }

  // 确保着色模式切换后，保持线框模式的状态
  updateWireframeMode()

  if (renderer) {
    renderer.render(scene, camera)
  }
}

function loadModelFromArrayBuffer(arrayBuffer) {
  const loader = new GLTFLoader()

  loader.load(
    URL.createObjectURL(new Blob([arrayBuffer])),
    function (gltf) {
      handleLoadedGltf(gltf)
    },
    undefined,
    function (error) {
      console.error('Error loading model:', error)
    }
  )
}

function loadModelFromGltfJson(gltfJson, file) {
  const loader = new GLTFLoader()
  
  const jsonBlob = new Blob([JSON.stringify(gltfJson)], { type: 'application/json' })
  const jsonUrl = URL.createObjectURL(jsonBlob)
  
  const manager = new THREE.LoadingManager()
  manager.setURLModifier((url) => {
    if (url.startsWith('blob:')) {
      return url
    }
    return url
  })
  
  loader.manager = manager
  
  loader.load(
    jsonUrl,
    function (gltf) {
      URL.revokeObjectURL(jsonUrl)
      handleLoadedGltf(gltf)
    },
    undefined,
    function (error) {
      console.error('Error loading glTF:', error)
      URL.revokeObjectURL(jsonUrl)
    }
  )
}

function loadModelFromGltfUrl(url) {
  const loader = new GLTFLoader()
  
  loader.load(
    url,
    function (gltf) {
      handleLoadedGltf(gltf)
    },
    undefined,
    function (error) {
      console.error('Error loading glTF from URL:', error)
    }
  )
}

function handleLoadedGltf(gltf) {
  if (model) {
    scene.remove(model)
  }

  model = gltf.scene
  scene.add(model)

  meshPrimitiveObjects.value.clear()
  if (gltf.parser && gltf.parser.associations) {
    model.traverse((child) => {
      if (child.isMesh) {
        const assoc = gltf.parser.associations.get(child)
        if (assoc && assoc.meshes !== undefined) {
          const key = `${assoc.meshes}-${assoc.primitives !== undefined ? assoc.primitives : 0}`
          meshPrimitiveObjects.value.set(key, child)
          child.userData.gltfMeshIndex = assoc.meshes
          child.userData.gltfPrimitiveIndex = assoc.primitives !== undefined ? assoc.primitives : 0
        }
      }
    })
  } else {
    let meshIdx = 0
    model.traverse((child) => {
      if (child.isMesh) {
        const meshes = jsonObject.value.meshes || []
        let found = false
        for (let mi = 0; mi < meshes.length && !found; mi++) {
          const prims = meshes[mi].primitives || []
          for (let pi = 0; pi < prims.length && !found; pi++) {
            const key = `${mi}-${pi}`
            if (!meshPrimitiveObjects.value.has(key)) {
              meshPrimitiveObjects.value.set(key, child)
              child.userData.gltfMeshIndex = mi
              child.userData.gltfPrimitiveIndex = pi
              found = true
            }
          }
        }
      }
    })
  }

  updateDoubleSidedRender()
  updateShadingMode()

  model.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)

  const diagonal = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z)

  const fov = camera.fov * (Math.PI / 180)
  const distance = (diagonal / 2) / Math.tan(fov / 2) * 1.2

  camera.position.set(
    center.x + distance * 0.8,
    center.y + distance * 0.6,
    center.z + distance * 0.8
  )

  camera.lookAt(center)

  camera.near = Math.max(0.1, distance * 0.001)
  camera.far = Math.max(distance * 10, distance + diagonal * 10)
  camera.updateProjectionMatrix()

  if (controls) {
    controls.target.copy(center)
    controls.update()
  }

  console.log('Model bounding box:', box)
  console.log('Model center:', center)
  console.log('Model size:', size)
  console.log('Model diagonal:', diagonal)
  console.log('Camera distance:', distance)
  console.log('Camera position:', camera.position)
  console.log('Camera near/far:', camera.near, camera.far)

  updateGridSize(size, center)
}

function updateGridSize(modelSize, modelCenter) {
  if (!gridHelper) return

  // Calculate grid size based on model size
  const maxSize = Math.max(modelSize.x, modelSize.y, modelSize.z)
  // Use model size or minimum of 10 units, maximum of 2000 units (increased from 1000)
  const gridSize = Math.max(10, Math.min(2000, Math.ceil(maxSize / 10) * 10))
  // Keep density constant: 1 division per 5 units
  const divisions = 10

  // Remove old grid helper
  scene.remove(gridHelper)

  // Create new grid helper with updated size
  gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x222222)
  
  // Position grid at model center bottom (y=0)
  if (modelCenter) {
    gridHelper.position.set(modelCenter.x, 0, modelCenter.z)
  }
  
  scene.add(gridHelper)
}

function onJsonSelect(path, offset, length) {
  if (offset !== undefined && length !== undefined) {
    highlightRange.value = { start: offset, end: offset + length }
    selectedOffset.value = `0x${offset.toString(16).padStart(8, '0')}`
  }
}

function onJsonToggle(key, expanded) {
  if (expanded) {
    expandedKeys.value.add(key)
  } else {
    expandedKeys.value.delete(key)
  }
}

function onHexSelect(offset) {
  selectedOffset.value = `0x${offset.toString(16).padStart(8, '0')}`
  // Find corresponding JSON element
  findJsonElementAtOffset(offset)
}

function onParsedDataSelect(type, index, offset, length) {
  // 不更新selectedChunkType，保持'all'，这样所有部分都会显示
  // selectedChunkType.value = type
  selectedDataIndex.value = index
  if (offset !== undefined && length !== undefined) {
    highlightRange.value = { start: offset, end: offset + length }
    selectedOffset.value = `0x${offset.toString(16).padStart(8, '0')}`
  }
}

function findJsonElementAtOffset(offset) {
  // This would map binary offset back to JSON structure
  // Implementation depends on the specific GLB structure
}

function onMeshPrimitiveSelect(meshIndex, primitiveIndex) {
  selectedMeshIndex.value = meshIndex
  selectedPrimitiveIndex.value = primitiveIndex

  // 1. Highlight mesh/primitive in 3D scene
  highlightMeshInScene(meshIndex, primitiveIndex)

  // 2. Calculate byte ranges for the primitive's accessors and highlight in Hex View
  const accessorIndices = getAccessorIndicesForPrimitive(meshIndex, primitiveIndex)
  expandedAccessorIndices.value = accessorIndices

  if (accessorIndices.length > 0) {
    const ranges = getByteRangesForAccessors(accessorIndices)
    if (ranges.length > 0) {
      // Set highlight range for HexViewer (combined range of all accessors)
      const minStart = Math.min(...ranges.map(r => r.start))
      const maxEnd = Math.max(...ranges.map(r => r.end))
      highlightRange.value = { start: minStart, end: maxEnd }
    }
  }

  // 3. Parsed Data highlighting is handled by props (selectedMeshIndex, selectedPrimitiveIndex)
}

function getAccessorIndicesForPrimitive(meshIndex, primitiveIndex) {
  const meshes = jsonObject.value.meshes
  if (!meshes || !meshes[meshIndex]) return []

  const mesh = meshes[meshIndex]
  const indices = []

  if (primitiveIndex === -1) {
    // All primitives of the mesh
    if (mesh.primitives) {
      mesh.primitives.forEach((primitive) => {
        collectPrimitiveAccessors(primitive, indices)
      })
    }
  } else {
    // Specific primitive
    const primitive = mesh.primitives?.[primitiveIndex]
    if (primitive) {
      collectPrimitiveAccessors(primitive, indices)
    }
  }

  return [...new Set(indices)]
}

function collectPrimitiveAccessors(primitive, indices) {
  if (primitive.attributes) {
    Object.values(primitive.attributes).forEach(idx => {
      if (typeof idx === 'number') indices.push(idx)
    })
  }
  if (primitive.indices !== undefined) {
    indices.push(primitive.indices)
  }
}

function getByteRangesForAccessors(accessorIndices) {
  const accessors = jsonObject.value.accessors
  const bufferViews = jsonObject.value.bufferViews
  if (!accessors || !bufferViews) return []

  const ranges = []
  for (const idx of accessorIndices) {
    const accessor = accessors[idx]
    if (!accessor || accessor.bufferView === undefined) continue

    const bufferView = bufferViews[accessor.bufferView]
    if (!bufferView) continue

    const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
    const componentSize = getComponentSizeForApp(accessor.componentType)
    const componentCount = getComponentCountForApp(accessor.type)
    const byteLength = componentSize * componentCount * accessor.count
    ranges.push({ start, end: start + byteLength })
  }

  return ranges
}

function getComponentSizeForApp(componentType) {
  const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
  return sizes[componentType] || 1
}

function getComponentCountForApp(type) {
  const counts = { 'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16 }
  return counts[type] || 1
}

function highlightMeshInScene(meshIndex, primitiveIndex) {
  clearMeshHighlight()
  if (!model) return

  model.traverse((child) => {
    if (child.isMesh && child.userData.gltfMeshIndex !== undefined) {
      const mi = child.userData.gltfMeshIndex
      const pi = child.userData.gltfPrimitiveIndex

      const isSelected = primitiveIndex === -1
        ? mi === meshIndex
        : (mi === meshIndex && pi === primitiveIndex)

      if (isSelected) {
        // Add highlight wireframe overlay
        const edges = new THREE.EdgesGeometry(child.geometry)
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
          color: 0x00ffff,
          linewidth: 2
        }))
        line.userData.isHighlight = true
        child.add(line)
      } else {
        // Make non-selected meshes semi-transparent
        const setTransparent = (material) => {
          if (!material) return
          child.userData.origOpacity = child.userData.origOpacity ?? material.opacity
          child.userData.origTransparent = child.userData.origTransparent ?? material.transparent
          material.transparent = true
          material.opacity = 0.15
        }
        if (Array.isArray(child.material)) {
          child.material.forEach(setTransparent)
        } else {
          setTransparent(child.material)
        }
      }
    }
  })
}

function clearMeshHighlight() {
  if (!model) return

  model.traverse((child) => {
    if (child.isMesh) {
      // Remove highlight edges
      const toRemove = []
      child.children.forEach(c => {
        if (c.userData && c.userData.isHighlight) toRemove.push(c)
      })
      toRemove.forEach(c => {
        child.remove(c)
        if (c.geometry) c.geometry.dispose()
        if (c.material) c.material.dispose()
      })

      // Restore opacity
      if (child.userData.origOpacity !== undefined) {
        const restoreMaterial = (material) => {
          if (!material) return
          material.opacity = child.userData.origOpacity
          material.transparent = child.userData.origTransparent
        }
        if (Array.isArray(child.material)) {
          child.material.forEach(restoreMaterial)
        } else {
          restoreMaterial(child.material)
        }
        delete child.userData.origOpacity
        delete child.userData.origTransparent
      }
    }
  })
}



function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Resize methods
function startResize(event, resizer) {
  console.log('startResize called:', { event, resizer })
  isResizing.value = true
  currentResizer.value = resizer
  startX.value = event.clientX
  startWidths.value = { ...panelWidths.value }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  console.log('Resize started:', {
    startX: startX.value,
    startWidths: startWidths.value
  })
}

function onResize(event) {
  // console.log('onResize called:', {
  //   isResizing: isResizing.value,
  //   mainContainerRef: mainContainerRef.value,
  //   event: event
  // })
  if (!isResizing.value || !mainContainerRef.value) return

  const containerWidth = mainContainerRef.value.offsetWidth
  const deltaX = event.clientX - startX.value
  const deltaPercent = (deltaX / containerWidth) * 100
  console.log('Resize values:', {
    containerWidth,
    deltaX,
    deltaPercent,
    startWidths: startWidths.value
  })

  if (currentResizer.value === 'left') {
    // Adjust left and middle panels
    const newLeftWidth = Math.max(10, Math.min(60, startWidths.value.left + deltaPercent))
    const widthChange = newLeftWidth - startWidths.value.left
    const newMiddleWidth = Math.max(10, startWidths.value.middle - widthChange)
    const newRightWidth = 100 - newLeftWidth - newMiddleWidth

    console.log('Left resizer values:', {
      newLeftWidth,
      newMiddleWidth,
      newRightWidth,
      widthChange
    })

    if (newRightWidth >= 10) {
      console.log('Updating panelWidths for left resizer')
      panelWidths.value = {
        left: newLeftWidth,
        middle: newMiddleWidth,
        right: newRightWidth
      }
      console.log('Updated panelWidths:', panelWidths.value)
    }
  } else if (currentResizer.value === 'right') {
    // Adjust middle and right panels
    const newRightWidth = Math.max(10, Math.min(60, startWidths.value.right - deltaPercent))
    const widthChange = startWidths.value.right - newRightWidth
    const newMiddleWidth = Math.max(10, startWidths.value.middle + widthChange)
    const newLeftWidth = 100 - newMiddleWidth - newRightWidth

    console.log('Right resizer values:', {
      newLeftWidth,
      newMiddleWidth,
      newRightWidth,
      widthChange
    })

    if (newLeftWidth >= 10) {
      console.log('Updating panelWidths for right resizer')
      panelWidths.value = {
        left: newLeftWidth,
        middle: newMiddleWidth,
        right: newRightWidth
      }
      console.log('Updated panelWidths:', panelWidths.value)
    }
  }
}

function stopResize() {
  console.log('stopResize called')
  isResizing.value = false
  currentResizer.value = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  console.log('Resize stopped')
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #d4d4d4;
  overflow: hidden;
  margin: 0;
  padding: 0;
}



/* Preview Panel */
#preview-container {
  width: 100%;
  height: 100%;
}

.scene-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  background: rgba(45, 45, 48, 0.9);
  padding: 8px 12px;
  border-radius: 4px;
  z-index: 10;
}

.scene-controls select {
  padding: 3px 8px;
  background: #3c3c3c;
  border: 1px solid #5a5a5a;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
}

.status-section {
  background: transparent;
  position: absolute;
  bottom: 0;
  right: 0;
  display: flex;
  gap: 15px;
  align-items: center;
  font-size: 12px;
  color: #CCCCCC;
  flex-wrap: wrap;
  padding: 5px 10px;
  border-radius: 4px;
  z-index: 10;
}

.status-section span {
  white-space: nowrap;
}

/* Panel Styles */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  flex-shrink: 0;
  height: 40px;
  box-sizing: border-box;
}

.panel-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #cccccc;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.url-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.url-input {
  width: 280px;
  padding: 4px 8px;
  background: #3c3c3c;
  border: 1px solid #5a5a5a;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
}

.url-input:focus {
  outline: none;
  border-color: #2196F3;
}

.url-input::placeholder {
  color: #888;
}

.load-btn {
  padding: 4px 12px;
  background: #2196F3;
  border: 1px solid #1976D2;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
}

.load-btn:hover:not(:disabled) {
  background: #1976D2;
}

.load-btn:disabled {
  background: #555;
  border-color: #444;
  cursor: not-allowed;
  color: #999;
}

.file-input {
  width: 240px;
  max-width: 240px;
}

.file-input::file-selector-button {
  padding: 4px 12px;
  background: #2196F3;
  border: 1px solid #1976D2;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-input::file-selector-button:hover {
  background: #1976D2;
}

.panel-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-tools button {
  padding: 3px 10px;
  background: #3c3c3c;
  border: 1px solid #5a5a5a;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
  cursor: pointer;
}

.panel-tools button:hover {
  background: #4c4c4c;
}

.panel-tools select {
  padding: 3px 8px;
  background: #3c3c3c;
  border: 1px solid #5a5a5a;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 16px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 16px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(18px);
}

/* Scrollbars */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #1e1e1e;
}

::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

::-webkit-scrollbar-corner {
  background: #1e1e1e;
}

.github-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  z-index: 1000;
}

.github-fab:hover {
  background: #555;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.github-fab svg {
  flex-shrink: 0;
}
</style>
