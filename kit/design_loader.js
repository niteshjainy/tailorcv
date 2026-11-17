// Loads and provides access to the design specification
const fs = require('fs');
const path = require('path');

const DESIGN_SPEC_PATH = path.join(__dirname, 'DESIGN_SPEC.json');

let cachedSpec = null;

function loadDesignSpec() {
  if (cachedSpec) return cachedSpec;
  const designPath = process.env.RESUME_DESIGN || (fs.existsSync(DESIGN_SPEC_PATH) ? DESIGN_SPEC_PATH : path.join(__dirname, 'design_defaults.json'));
  const spec = JSON.parse(fs.readFileSync(designPath, 'utf8'));
  if (!spec.page?.size?.width || !spec.page?.size?.height || !spec.fonts?.primary || !spec.elements?.name || !spec.margins?.normal) {
    throw new Error('Invalid design specification: page size, font, name style and margins are required.');
  }
  cachedSpec = spec;
  return spec;
}

function getColor(spec, colorName) {
  return spec.colors[colorName] || colorName;
}

function getFontSize(spec, elementName) {
  const el = spec.elements[elementName];
  if (!el) return spec.baseFontSize.halfPoints;
  return el.size?.halfPoints || spec.baseFontSize.halfPoints;
}

function getSpacing(spec, elementName) {
  const el = spec.elements[elementName];
  return el?.spacing || { after: 20 };
}

function getBulletStyle(spec, elementName) {
  const el = spec.elements[elementName];
  return el?.bullet || spec.bulletStyle;
}

module.exports = {
  loadDesignSpec,
  getColor,
  getFontSize,
  getSpacing,
  getBulletStyle,
  DESIGN_SPEC_PATH
};
