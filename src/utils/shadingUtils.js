import * as THREE from 'three'

const normalVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const normalFragmentShader = `
  varying vec3 vNormal;
  void main() {
    vec3 normalColor = normalize(vNormal) * 0.5 + 0.5;
    gl_FragColor = vec4(normalColor, 1.0);
  }
`

const uvVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const uvFragmentShader = `
  varying vec2 vUv;
  void main() {
    float r = vUv.x;
    float g = vUv.y;
    float b = 0.0;
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`

export function createShaderMaterial(vertexShader, fragmentShader) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide
  })
}

export function applyShadingMode(scene, mode) {
  if (!scene) return

  scene.traverse((child) => {
    if (child.isMesh) {
      if (mode === 'normal') {
        child.material = createShaderMaterial(normalVertexShader, normalFragmentShader)
      } else if (mode === 'uv') {
        child.material = createShaderMaterial(uvVertexShader, uvFragmentShader)
      }
    }
  })
}

export function restoreOriginalMaterials(scene, originalMaterials) {
  if (!scene || !originalMaterials) return

  scene.traverse((child) => {
    if (child.isMesh && originalMaterials.has(child)) {
      child.material = originalMaterials.get(child)
    }
  })
}
