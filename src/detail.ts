import './style.css';
import type { Category, Singer, Software } from './types';
import { getSingerById, getSoftwareById } from './db';
import { loadCategory } from './data';

const app = document.querySelector<HTMLDivElement>('#app')!;

function getParams(): { category: Category; id: string } {
  const sp = new URLSearchParams(location.search);
  const category = (sp.get('category') || 'singer') as Category;
  const id = sp.get('id') || '';
  return { category, id };
}

function link(url?: string | null): string {
  return url ? `<a href="${url}" target="_blank">${url}</a>` : '';
}

function formatAllNames(names: Record<string, string>): string {
  const values = Object.values(names);
  return values.length > 1 ? values.join(' / ') : '';
}

function renderSinger(s: Singer) {
  const namesList = Object.entries(s.names)
    .map(([k, v]) => `<div><strong>${k}</strong></div><div>${v}</div>`)
    .join('');
  const variants = s.variants
    .map((v) => {
      const vName = v.names.en || Object.values(v.names)[0] || v.id;
      const vAllNames = formatAllNames(v.names);
      return `<div class="variant-card">
        <div class="variant-card-header">${vName}</div>
        ${vAllNames ? `<div class="variant-card-all-names">${vAllNames}</div>` : ''}
        <div class="variant-meta">
          ${v.tags && v.tags.length ? `<div class="variant-meta-item">Tags: ${v.tags.map((t) => `<span class="tag">${t}</span>`).join(' ')}</div>` : ''}
          ${v.download_url ? `<div class="variant-meta-item">Direct download: ${link(v.download_url)}</div>` : ''}
          ${v.manual_download_url ? `<div class="variant-meta-item">Manual download: ${link(v.manual_download_url)}</div>` : ''}
        </div>
      </div>`;
    })
    .join('');

  app.innerHTML = `
    <header class="container detail-header">
      <h1>${s.names.en || s.id} <span class="card-id">@${s.id}</span></h1>
      <a href="./" class="back-link">← Back to Index</a>
    </header>
    <section class="container">
      ${
        s.profile_image_url
          ? `<div class="profile-image-container">
        <img src="${s.profile_image_url}" alt="${s.names.en || s.id}" class="profile-image" />
      </div>`
          : ''
      }
      <div class="detail-card">
        <h3>Details</h3>
        <div class="kv-list">
          <div><strong>Homepage</strong></div><div>${link(s.homepage_url)}</div>
          <div><strong>Owners</strong></div><div>${s.owners.join(', ')}</div>
          <div><strong>Authors</strong></div><div>${s.authors.join(', ')}</div>
        </div>
      </div>
      <div class="detail-card">
        <h3>Names</h3>
        <div class="kv-list">${namesList}</div>
      </div>
      <h3>Variants</h3>
      ${variants}
    </section>
  `;
}

function renderSoftware(s: Software) {
  const namesList = Object.entries(s.names)
    .map(([k, v]) => `<div><strong>${k}</strong></div><div>${v}</div>`)
    .join('');
  app.innerHTML = `
    <header class="container detail-header">
      <h1>${s.names.en || s.id} <span class="card-id">@${s.id}</span></h1>
      <a href="./" class="back-link">← Back to Index</a>
    </header>
    <section class="container">
      <div class="detail-card">
        <h3>Details</h3>
        <div class="kv-list">
          <div><strong>Homepage</strong></div><div>${link(s.homepage_url)}</div>
          <div><strong>Category</strong></div><div>${s.category}</div>
          <div><strong>Developers</strong></div><div>${s.developers.join(', ')}</div>
          ${s.tags?.length ? `<div><strong>Tags</strong></div><div>${s.tags.map((t) => `<span class="tag">${t}</span>`).join(' ')}</div>` : ''}
          ${s.download_url ? `<div><strong>Direct download: </strong></div><div>${link(s.download_url)}</div>` : ''}
          ${s.manual_download_url ? `<div><strong>Manual download: </strong></div><div>${link(s.manual_download_url)}</div>` : ''}
        </div>
      </div>
      <div class="detail-card">
        <h3>Names</h3>
        <div class="kv-list">${namesList}</div>
      </div>
    </section>
  `;
}

async function boot() {
  const { category, id } = getParams();
  if (!id) {
    app.innerHTML = '<p class="container">Missing id.</p>';
    return;
  }
  try {
    if (category === 'singer') {
      let item = await getSingerById(id);
      if (!item) {
        await loadCategory('singer');
        item = await getSingerById(id);
      }
      if (!item) throw new Error('Singer not found');
      renderSinger(item);
    } else {
      let item = await getSoftwareById(id);
      if (!item) {
        await loadCategory('software');
        item = await getSoftwareById(id);
      }
      if (!item) throw new Error('Software not found');
      renderSoftware(item);
    }
  } catch (e) {
    console.error(e);
    app.innerHTML = '<p class="container">Failed to load detail.</p>';
  }
}

boot();
