import './style.css';
import type { Category, Singer, Software } from './types';
import { loadAllData } from './data';

type State = {
  category: Category;
  singers: Singer[];
  softwares: Software[];
  query: string;
};

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <header class="container">
    <h1>SVS Index</h1>
    <p class="subtitle">Index of Singing Voice Synthesis singers and softwares</p>
  </header>
  <section class="container controls">
    <label>
      Category
      <select id="category">
        <option value="singer">Singers</option>
        <option value="software">Softwares</option>
      </select>
    </label>
    <label class="grow">
      Search
      <input id="search" type="search" placeholder="Type to filter by id, names, tags" autocomplete="off" />
    </label>
  </section>
  <section class="container">
    <div id="status" class="status">Loading data…</div>
    <table id="results" class="results">
      <thead></thead>
      <tbody></tbody>
    </table>
  </section>
`;

const categoryEl = document.getElementById('category') as HTMLSelectElement;
const searchEl = document.getElementById('search') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const tableEl = document.getElementById('results') as HTMLTableElement;
const thead = tableEl.querySelector('thead')!;
const tbody = tableEl.querySelector('tbody')!;

const state: State = {
  category: 'singer',
  singers: [],
  softwares: [],
  query: '',
};

function normalize(str: string): string {
  return str.toLowerCase();
}

function singerMatches(s: Singer, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  if (s.id.includes(n)) return true;
  for (const val of Object.values(s.names))
    if (normalize(val).includes(n)) return true;
  // tags across variants
  const tags = new Set<string>();
  for (const v of s.variants) (v.tags || []).forEach((t) => tags.add(t));
  for (const t of tags) if (normalize(t).includes(n)) return true;
  return false;
}

function softwareMatches(s: Software, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  if (s.id.includes(n)) return true;
  for (const val of Object.values(s.names))
    if (normalize(val).includes(n)) return true;
  for (const t of s.tags || []) if (normalize(t).includes(n)) return true;
  return false;
}

function renderTableHeader(category: Category) {
  if (category === 'singer') {
    thead.innerHTML = `<tr>
      <th>Name</th>
      <th>Owners</th>
      <th>Authors</th>
      <th>Tags</th>
      <th>Homepage</th>
      <th></th>
    </tr>`;
  } else {
    thead.innerHTML = `<tr>
      <th>Name</th>
      <th>Category</th>
      <th>Developers</th>
      <th>Tags</th>
      <th>Homepage</th>
      <th></th>
    </tr>`;
  }
}

function render() {
  renderTableHeader(state.category);
  const q = normalize(state.query);
  if (state.category === 'singer') {
    const rows = state.singers.filter((s) => singerMatches(s, q));
    tbody.innerHTML = rows
      .map((s) => {
        const name = s.names.en || Object.values(s.names)[0] || s.id;
        const owners = s.owners.join(', ');
        const authors = s.authors.join(', ');
        const tagSet = new Set<string>();
        s.variants.forEach((v) => (v.tags || []).forEach((t) => tagSet.add(t)));
        const tags = Array.from(tagSet).join(', ');
        const homepage = s.homepage_url
          ? `<a href="${s.homepage_url}" target="_blank">link</a>`
          : '';
        const detail = `<a href="/detail.html?category=singer&id=${encodeURIComponent(s.id)}">Details</a>`;
        return `<tr>
        <td>${name}</td>
        <td>${owners}</td>
        <td>${authors}</td>
        <td>${tags}</td>
        <td>${homepage}</td>
        <td>${detail}</td>
      </tr>`;
      })
      .join('');
  } else {
    const rows = state.softwares.filter((s) => softwareMatches(s, q));
    tbody.innerHTML = rows
      .map((s) => {
        const name = s.names.en || Object.values(s.names)[0] || s.id;
        const developers = s.developers.join(', ');
        const tags = (s.tags || []).join(', ');
        const homepage = s.homepage_url
          ? `<a href="${s.homepage_url}" target="_blank">link</a>`
          : '';
        const detail = `<a href="/detail.html?category=software&id=${encodeURIComponent(s.id)}">Details</a>`;
        return `<tr>
        <td>${name}</td>
        <td>${s.category}</td>
        <td>${developers}</td>
        <td>${tags}</td>
        <td>${homepage}</td>
        <td>${detail}</td>
      </tr>`;
      })
      .join('');
  }
}

function wireEvents() {
  categoryEl.addEventListener('change', () => {
    state.category = categoryEl.value as Category;
    render();
  });
  searchEl.addEventListener('keyup', () => {
    state.query = searchEl.value;
    render();
  });
}

async function boot() {
  wireEvents();
  try {
    const { singers, softwares } = await loadAllData();
    state.singers = singers;
    state.softwares = softwares;
    statusEl.textContent = `${singers.length} singers, ${softwares.length} softwares loaded.`;
    render();
  } catch (e) {
    statusEl.textContent = 'Failed to load data.';
    console.error(e);
  }
}

boot();
