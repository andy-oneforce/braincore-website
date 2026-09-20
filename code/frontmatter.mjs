// Frontmatter schema validators for the 3 website-build template kinds (docs / marketing / blog).
// Each validator throws an Error naming the bad/missing field AND the file path on failure.

function requireNonEmptyString(data, field, filePath) {
  const value = data[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${filePath}: frontmatter field "${field}" is required`);
  }
}

export function validateDocsFrontmatter(data, filePath) {
  requireNonEmptyString(data, 'title', filePath);
  if (data.description !== undefined && typeof data.description !== 'string') {
    throw new Error(`${filePath}: frontmatter field "description" must be a string`);
  }
}

export function validateMarketingFrontmatter(data, filePath) {
  requireNonEmptyString(data, 'title', filePath);
  if (data.sections !== undefined) {
    if (!Array.isArray(data.sections)) {
      throw new Error(`${filePath}: frontmatter field "sections" must be an array`);
    }
    data.sections.forEach((section, index) => {
      if (!section || typeof section.type !== 'string' || section.type.trim() === '') {
        throw new Error(`${filePath}: frontmatter field "sections[${index}].type" is required`);
      }
    });
  }
}

export function validateBlogFrontmatter(data, filePath) {
  requireNonEmptyString(data, 'title', filePath);
  requireNonEmptyString(data, 'author', filePath);
  if (data.date === undefined || data.date === null || data.date === '') {
    throw new Error(`${filePath}: frontmatter field "date" is required`);
  }
  if (typeof data.date !== 'string' && !(data.date instanceof Date)) {
    throw new Error(`${filePath}: frontmatter field "date" must be a string or Date`);
  }
  if (data.description !== undefined && typeof data.description !== 'string') {
    throw new Error(`${filePath}: frontmatter field "description" must be a string`);
  }
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    throw new Error(`${filePath}: frontmatter field "tags" must be an array`);
  }
}
