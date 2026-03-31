export function formatOffset(offset) {
  return '0x' + offset.toString(16).padStart(8, '0').toUpperCase()
}

export function getPrintableChar(byte) {
  if (byte >= 32 && byte <= 126) {
    return String.fromCharCode(byte)
  }
  return '.'
}

export function getComponentSize(componentType) {
  const sizes = {
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4
  }
  return sizes[componentType] || 1
}

export function getComponentCount(type) {
  const counts = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16
  }
  return counts[type] || 1
}

export function getComponentTypeName(componentType) {
  const names = {
    5120: 'INT8',
    5121: 'UINT8',
    5122: 'INT16',
    5123: 'UINT16',
    5125: 'UINT32',
    5126: 'FLOAT32'
  }
  return names[componentType] || 'UNKNOWN'
}

export function generateHexRow(data, offset, bytesPerRow = 16) {
  const hexBytes = []
  const asciiChars = []

  for (let j = 0; j < bytesPerRow; j++) {
    const byteIndex = offset + j
    if (byteIndex < data.length) {
      const byte = data[byteIndex]
      hexBytes.push(byte.toString(16).padStart(2, '0').toUpperCase())
      asciiChars.push(getPrintableChar(byte))
    } else {
      hexBytes.push('  ')
      asciiChars.push(' ')
    }
  }

  const hexString = hexBytes.join(' ')
  const asciiString = asciiChars.join('')

  return {
    offset,
    hexString,
    asciiString
  }
}

export function generateHexRows(data, start, end, bytesPerRow = 16) {
  if (!data) return []
  
  const rows = []
  const startRow = Math.floor(start / bytesPerRow)
  const endRow = Math.ceil(end / bytesPerRow)
  
  for (let i = startRow; i < endRow; i++) {
    const offset = i * bytesPerRow
    rows.push(generateHexRow(data, offset, bytesPerRow))
  }
  
  return rows
}

export function generateSubGroups(start, end, groupSize = 1600) {
  const subGroups = []
  
  let currentStart = start
  while (currentStart < end) {
    const currentEnd = Math.min(currentStart + groupSize, end)
    subGroups.push({
      start: currentStart,
      end: currentEnd,
      label: `${formatOffset(currentStart)} - ${formatOffset(currentEnd)} (${Math.ceil((currentEnd - currentStart) / 16)} rows)`
    })
    currentStart = currentEnd
  }
  
  return subGroups
}
