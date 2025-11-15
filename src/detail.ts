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

function renderSinger(s: Singer) {
  const namesList = Object.entries(s.names)
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join('');
  const variants = s.variants
    .map(
      (v) => `<li>
        <div><strong>${v.names.en || v.id}</strong></div>
        ${v.tags && v.tags.length ? `<div>Tags: ${v.tags.join(', ')}</div>` : ''}
        <div>
          ${v.download_url ? `Download: ${link(v.download_url)}` : ''}
          ${v.manual_download_url ? `&nbsp;Manual: ${link(v.manual_download_url)}` : ''}
        </div>
      </li>`
    )
    .join('');

  app.innerHTML = `
    <header class="container">
      <h1>${s.names.en || s.id}</h1>
      <p class="subtitle"><a href="/">Home</a></p>
    </header>
    <section class="container">
      <div class="kv">
        <div><strong>ID:</strong> ${s.id}</div>
        <div><strong>Homepage:</strong> ${link(s.homepage_url)}</div>
        <div><strong>Owners:</strong> ${s.owners.join(', ')}</div>
        <div><strong>Authors:</strong> ${s.authors.join(', ')}</div>
      </div>
      <h3>Names</h3>
      <ul>${namesList}</ul>
      <h3>Variants</h3>
      <ul>${variants}</ul>
    </section>
  `;
}

function renderSoftware(s: Software) {
  const namesList = Object.entries(s.names)
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join('');
  app.innerHTML = `
    <header class="container">
      <h1>${s.names.en || s.id}</h1>
      <p class="subtitle"><a href="/">Home</a></p>
    </header>
    <section class="container">
      <div class="kv">
        <div><strong>ID:</strong> ${s.id}</div>
        <div><strong>Homepage:</strong> ${link(s.homepage_url)}</div>
        <div><strong>Category:</strong> ${s.category}</div>
        <div><strong>Developers:</strong> ${s.developers.join(', ')}</div>
        ${s.tags?.length ? `<div><strong>Tags:</strong> ${s.tags.join(', ')}</div>` : ''}
        ${s.download_url ? `<div><strong>Download:</strong> ${link(s.download_url)}</div>` : ''}
        ${s.manual_download_url ? `<div><strong>Manual:</strong> ${link(s.manual_download_url)}</div>` : ''}
      </div>
      <h3>Names</h3>
      <ul>${namesList}</ul>
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
