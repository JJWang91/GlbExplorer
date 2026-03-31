export async function loadGltfWithResources(gltfJson, baseUrl, fetchFn = fetch) {
  const buffers = []
  const images = []
  const resources = {
    buffers: [],
    images: []
  }

  if (gltfJson.buffers) {
    for (let i = 0; i < gltfJson.buffers.length; i++) {
      const buffer = gltfJson.buffers[i]
      if (buffer.uri) {
        try {
          const bufferUrl = resolveUrl(buffer.uri, baseUrl)
          const response = await fetchFn(bufferUrl)
          if (!response.ok) {
            throw new Error(`Failed to load buffer ${i}: ${response.status}`)
          }
          const arrayBuffer = await response.arrayBuffer()
          buffers.push(new Uint8Array(arrayBuffer))
          resources.buffers.push({
            index: i,
            uri: buffer.uri,
            size: arrayBuffer.byteLength,
            data: buffers[i]
          })
        } catch (error) {
          console.error(`Error loading buffer ${i}:`, error)
          buffers.push(null)
        }
      } else {
        buffers.push(null)
      }
    }
  }

  if (gltfJson.images) {
    for (let i = 0; i < gltfJson.images.length; i++) {
      const image = gltfJson.images[i]
      if (image.uri) {
        try {
          const imageUrl = resolveUrl(image.uri, baseUrl)
          resources.images.push({
            index: i,
            uri: image.uri,
            url: imageUrl
          })
        } catch (error) {
          console.error(`Error processing image ${i}:`, error)
        }
      }
    }
  }

  return {
    buffers,
    resources
  }
}

export function resolveUrl(uri, baseUrl) {
  if (uri.startsWith('data:')) {
    return uri
  }
  try {
    return new URL(uri, baseUrl).href
  } catch {
    return uri
  }
}

export function combineGltfBuffers(gltfJson, buffers) {
  const bufferViews = gltfJson.bufferViews || []
  let totalSize = 0
  const bufferOffsets = []

  buffers.forEach((buffer, index) => {
    bufferOffsets.push(totalSize)
    if (buffer) {
      totalSize += buffer.length
    }
  })

  const combinedBuffer = new Uint8Array(totalSize)
  buffers.forEach((buffer, index) => {
    if (buffer) {
      combinedBuffer.set(buffer, bufferOffsets[index])
    }
  })

  const updatedBufferViews = bufferViews.map(bv => {
    const bufferIndex = bv.buffer !== undefined ? bv.buffer : 0
    const newByteOffset = (bv.byteOffset || 0) + (bufferOffsets[bufferIndex] || 0)
    return {
      ...bv,
      byteOffset: newByteOffset,
      buffer: 0
    }
  })

  return {
    combinedBuffer,
    updatedBufferViews,
    totalSize
  }
}

export async function processGltfFile(file) {
  const text = await file.text()
  const gltfJson = JSON.parse(text)
  
  const buffers = []
  const bufferPromises = []
  
  if (gltfJson.buffers) {
    for (let i = 0; i < gltfJson.buffers.length; i++) {
      const buffer = gltfJson.buffers[i]
      if (buffer.uri) {
        if (buffer.uri.startsWith('data:')) {
          const base64Data = buffer.uri.split(',')[1]
          const binaryString = atob(base64Data)
          const bytes = new Uint8Array(binaryString.length)
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j)
          }
          buffers[i] = bytes
        } else {
          bufferPromises.push(
            (async () => {
              try {
                const response = await fetch(buffer.uri)
                if (!response.ok) {
                  throw new Error(`Failed to load buffer: ${response.status}`)
                }
                const arrayBuffer = await response.arrayBuffer()
                buffers[i] = new Uint8Array(arrayBuffer)
              } catch (error) {
                console.error(`Error loading buffer ${i}:`, error)
                buffers[i] = null
              }
            })()
          )
        }
      }
    }
  }

  await Promise.all(bufferPromises)

  return {
    gltfJson,
    buffers
  }
}

export async function loadGltfFromUrl(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const text = await response.text()
  const gltfJson = JSON.parse(text)
  
  const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
  const { buffers, resources } = await loadGltfWithResources(gltfJson, baseUrl)
  
  return {
    gltfJson,
    buffers,
    resources,
    baseUrl
  }
}
