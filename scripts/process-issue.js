import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub context from environment
const issueBody = process.env.ISSUE_BODY || '';
const issueTitle = process.env.ISSUE_TITLE || '';
const issueNumber = process.env.ISSUE_NUMBER || '';

function parseIssueForm(body) {
  const data = {};
  const lines = body.split('\n');
  let currentKey = null;
  let currentValue = [];

  for (const line of lines) {
    const headerMatch = line.match(/^### (.+)$/);
    if (headerMatch) {
      if (currentKey) {
        data[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = headerMatch[1]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      currentValue = [];
    } else if (currentKey) {
      currentValue.push(line);
    }
  }
  if (currentKey) {
    data[currentKey] = currentValue.join('\n').trim();
  }
  return data;
}

function buildSingerObject(data) {
  const names = { en: data.name_english || data.name_en };
  if (data.name_japanese || data.name_ja) names.ja = data.name_japanese || data.name_ja;
  if (data.name_chinese || data.name_zh) names.zh = data.name_chinese || data.name_zh;

  const owners = (data.owners || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const authors = (data.authors || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  let variants;
  try {
    variants = JSON.parse(data.variants_json || data.variants || '[]');
  } catch {
    throw new Error('Invalid JSON in variants field');
  }

  const obj = {
    id: data.unique_id || data.id,
    names,
    owners,
    authors,
    variants,
  };

  if (data.homepage_url) obj.homepage_url = data.homepage_url;
  if (data.profile_image_url) obj.profile_image_url = data.profile_image_url;

  return obj;
}

function buildSoftwareObject(data) {
  const names = { en: data.name_english || data.name_en };
  if (data.name_japanese || data.name_ja) names.ja = data.name_japanese || data.name_ja;
  if (data.name_chinese || data.name_zh) names.zh = data.name_chinese || data.name_zh;

  const developers = (data.developers || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const obj = {
    id: data.unique_id || data.id,
    names,
    category: data.category,
    developers,
  };

  if (data.homepage_url) obj.homepage_url = data.homepage_url;
  if (data.download_url && data.download_url !== 'null') obj.download_url = data.download_url;
  if (data.manual_download_url && data.manual_download_url !== 'null')
    obj.manual_download_url = data.manual_download_url;
  if (data.tags) {
    obj.tags = data.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return obj;
}

function validateSchema(obj, schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);

  // Validate single item against the schema's items definition
  const itemSchema = schema.items || schema;
  const validate = ajv.compile(itemSchema);
  const valid = validate(obj);

  if (!valid) {
    throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors, null, 2)}`);
  }
}

function main() {
  const isSinger = issueTitle.toLowerCase().includes('singer');
  const category = isSinger ? 'singer' : 'software';
  const dataDir = path.join(__dirname, '..', 'data', `${category}s`);
  const schemaPath = path.join(__dirname, '..', 'data', `${category}-schema.json`);

  const parsedData = parseIssueForm(issueBody);
  const obj = isSinger ? buildSingerObject(parsedData) : buildSoftwareObject(parsedData);

  // Validate
  validateSchema(obj, schemaPath);

  // Determine target file
  const firstLetter = obj.id[0].toLowerCase();
  const targetFile = path.join(dataDir, `${firstLetter}.json`);

  // Check if id already exists
  let existing = [];
  if (fs.existsSync(targetFile)) {
    existing = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    if (existing.some((item) => item.id === obj.id)) {
      throw new Error(`ID "${obj.id}" already exists in ${firstLetter}.json`);
    }
  }

  // Append and write
  existing.push(obj);
  fs.writeFileSync(targetFile, JSON.stringify(existing, null, 2) + '\n', 'utf8');

  console.log(`✅ Successfully added ${category} "${obj.id}" to ${firstLetter}.json`);
  console.log(JSON.stringify(obj, null, 2));
}

try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
