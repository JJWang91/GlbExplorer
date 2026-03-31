self.onmessage = function (e) {
  const arrayBuffer = e.data;

  try {
    const view = new DataView(arrayBuffer);

    // Check GLB magic number
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546C67) {
      throw new Error('Not a valid GLB file');
    }

    // Get GLB version and length
    const glbVersion = view.getUint32(4, true);
    const length = view.getUint32(8, true);

    // Parse JSON chunk
    const jsonChunkSize = view.getUint32(12, true);
    const jsonChunkType = view.getUint32(16, true);

    if (jsonChunkType !== 0x4E4F534A) {
      throw new Error('JSON chunk not found');
    }

    const jsonStart = 20;
    const jsonString = new TextDecoder().decode(new Uint8Array(arrayBuffer, jsonStart, jsonChunkSize));
    const jsonObject = JSON.parse(jsonString);

    let structuralMetadata = null;
    let binaryChunkSize = 0;
    let binStart = 0;

    const jsonEnd = jsonStart + jsonChunkSize;
    if (jsonEnd < length) {
      binaryChunkSize = view.getUint32(jsonEnd, true);
      const binChunkType = view.getUint32(jsonEnd + 4, true);

      if (binChunkType === 0x004E4942) {
        binStart = jsonEnd + 8;
      }
    }

    if (jsonObject.extensions && jsonObject.extensions.EXT_structural_metadata) {
      structuralMetadata = parseStructuralMetadata(jsonObject.extensions.EXT_structural_metadata);
    }

    self.postMessage({
      success: true,
      data: {
        glbVersion,
        jsonChunkSize,
        jsonObject,
        structuralMetadata,
        binaryChunkSize,
        binStart
      }
    });
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};

function parseStructuralMetadata(metadata) {
  if (!metadata) return null;

  const result = {
    schema: null,
    propertyTables: [],
    propertyAttributes: [],
    propertyTextures: []
  };

  // Parse schema
  if (metadata.schema) {
    result.schema = {
      id: metadata.schema.id,
      classes: {},
      enums: {}
    };

    // Parse classes
    if (metadata.schema.classes) {
      Object.entries(metadata.schema.classes).forEach(([className, classDef]) => {
        result.schema.classes[className] = {
          name: classDef.name || className,
          description: classDef.description || '',
          properties: {}
        };

        // Parse properties
        if (classDef.properties) {
          Object.entries(classDef.properties).forEach(([propName, propDef]) => {
            result.schema.classes[className].properties[propName] = {
              name: propDef.name || propName,
              type: propDef.type,
              componentType: propDef.componentType,
              description: propDef.description || '',
              required: propDef.required || false,
              enumType: propDef.enumType || null,
              default: propDef.default !== undefined ? propDef.default : null,
              min: propDef.min !== undefined ? propDef.min : null,
              max: propDef.max !== undefined ? propDef.max : null
            };
          });
        }
      });
    }

    // Parse enums
    if (metadata.schema.enums) {
      Object.entries(metadata.schema.enums).forEach(([enumName, enumDef]) => {
        result.schema.enums[enumName] = {
          name: enumDef.name || enumName,
          description: enumDef.description || '',
          valueType: enumDef.valueType,
          values: {}
        };

        if (enumDef.values) {
          Object.entries(enumDef.values).forEach(([valueName, valueDef]) => {
            result.schema.enums[enumName].values[valueName] = {
              name: valueDef.name || valueName,
              value: valueDef.value,
              description: valueDef.description || ''
            };
          });
        }
      });
    }
  }

  // Parse property tables
  if (metadata.propertyTables) {
    metadata.propertyTables.forEach((table, index) => {
      result.propertyTables.push({
        name: table.name || `Table ${index}`,
        class: table.class,
        count: table.count,
        properties: table.properties || {}
      });
    });
  }

  // Parse property attributes
  if (metadata.propertyAttributes) {
    metadata.propertyAttributes.forEach((attr, index) => {
      result.propertyAttributes.push({
        name: attr.name || `Attribute ${index}`,
        class: attr.class,
        attribute: attr.attribute,
        properties: attr.properties || {}
      });
    });
  }

  // Parse property textures
  if (metadata.propertyTextures) {
    metadata.propertyTextures.forEach((texture, index) => {
      result.propertyTextures.push({
        name: texture.name || `Texture ${index}`,
        class: texture.class,
        properties: texture.properties || {}
      });
    });
  }

  return result;
}
