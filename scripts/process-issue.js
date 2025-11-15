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
const githubRepo = process.env.GITHUB_REPOSITORY || '';
const githubToken = process.env.GITHUB_TOKEN || '';

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

function cleanOptional(raw) {
  if (raw == null) return undefined;
  const val = String(raw).trim();
  if (!val) return undefined;
  const lower = val.replaceAll('_', '').toLowerCase();
  // Common placeholders from GitHub issue forms
  if (
    lower === 'no response' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'none' ||
    lower === 'null'
  ) {
    return undefined;
  }
  return val;
}

function buildSingerObject(data) {
  function stripCodeFence(raw) {
    if (!raw) return raw;
    const s = String(raw).trim();
    // Match ```json\n...\n``` or ```\n...\n```
    const fenceMatch = s.match(/^```[a-zA-Z0-9]*\r?\n([\s\S]*?)\r?\n```\s*$/);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    return s;
  }

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
    const raw = data.variants_json || data.variants || '[]';
    const cleaned = stripCodeFence(raw);
    variants = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      'Invalid JSON in "Variants" field. Ensure it is valid JSON (usually an array). Example: [\n  { "id": "eng", "names": { "en": "English" } }\n]\nOriginal error: ' +
        (e && e.message ? e.message : String(e))
    );
  }

  const obj = {
    id: data.unique_id || data.id,
    names,
    owners,
    authors,
    variants,
  };

  if (!obj.id) {
    throw new Error('Missing required field: id (Unique ID). Please provide a stable identifier.');
  }
  if (!obj.names || !obj.names.en) {
    throw new Error('Missing required field: names.en (English name).');
  }

  const homepage = cleanOptional(data.homepage_url);
  if (homepage) obj.homepage_url = homepage;
  const profile = cleanOptional(data.profile_image_url);
  if (profile) obj.profile_image_url = profile;

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

  if (!obj.id) {
    throw new Error('Missing required field: id (Unique ID). Please provide a stable identifier.');
  }
  if (!obj.names || !obj.names.en) {
    throw new Error('Missing required field: names.en (English name).');
  }
  if (!obj.category) {
    throw new Error('Missing required field: category.');
  }

  const homepage = cleanOptional(data.homepage_url);
  if (homepage) obj.homepage_url = homepage;
  const dl = cleanOptional(data.download_url);
  if (dl) obj.download_url = dl;
  const mdl = cleanOptional(data.manual_download_url);
  if (mdl) obj.manual_download_url = mdl;
  if (data.tags) {
    obj.tags = data.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return obj;
}

function toDotPath(instancePath, params) {
  // Convert Ajv instancePath "/names/en" to "names.en" and handle required
  const base = (instancePath || '/')
    .replace(/^\//, '')
    .replace(/\//g, '.')
    .trim();
  if (params && params.missingProperty) {
    return (base ? base + '.' : '') + params.missingProperty;
  }
  return base || '<root>';
}

function formatAjvErrors(errors) {
  return (errors || [])
    .map((err) => {
      const path = toDotPath(err.instancePath, err.params);
      const details = err.params ? ` (${JSON.stringify(err.params)})` : '';
      return `- ${path}: ${err.message}${details}`;
    })
    .join('\n');
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
    const formatted = formatAjvErrors(validate.errors);
    // Emit GitHub Actions annotations for each error
    for (const err of validate.errors || []) {
      const p = toDotPath(err.instancePath, err.params);
      const msg = `${err.message}${err.params ? ' ' + JSON.stringify(err.params) : ''}`;
      console.log(`::error title=Schema validation failed,path=${p}::${msg}`);
    }
    throw new Error(
      'Schema validation failed. Please correct the following:\n' +
        formatted +
        '\n\nSee the schema file and README for required fields.'
    );
  }
}

async function postIssueComment(body) {
  if (!githubToken || !githubRepo || !issueNumber) return;
  const url = `https://api.github.com/repos/${githubRepo}/issues/${issueNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('Failed to comment on issue:', res.status, txt);
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

async function run() {
  try {
    await main();
  } catch (error) {
    // Also print a GitHub Actions error annotation for better visibility
    const msg = (error && error.message) ? error.message : String(error);
    console.log(`::error title=Issue processing failed::${msg}`);
    console.error('❌ Error:', msg);
    // Attempt to report back to the originating issue
    const header = '### ❌ Submission failed validation';
    const advice = '\nIf you believe this is a mistake, please update your issue with corrections and re-run the workflow.';
    await postIssueComment(`${header}\n\n${msg}${advice}`);
    process.exit(1);
  }
}

run();
