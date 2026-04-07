const STORAGE_KEY = 'dns_media_collection_v1';
let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let editingId = null;

const $ = (id) => document.getElementById(id);

const form = $('media-form');
const listEl = $('collection-list');
const queryEl = $('query');
const sortEl = $('sort');
const filterEl = $('filter');
const totalEl = $('stat-total');
const favEl = $('stat-fav');
const loanedEl = $('stat-loaned');

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function clearForm() {
  form.reset();
  editingId = null;
  $('submit-btn').textContent = 'Ajouter';
}

function normalize(v) { return (v || '').toLowerCase().trim(); }

function render() {
  const q = normalize(queryEl.value);
  const f = filterEl.value;
  const s = sortEl.value;

  let data = [...items].filter(i => {
    const inQuery = [i.title, i.artist, i.type, i.genre].some(v => normalize(v).includes(q));
    if (!inQuery) return false;
    if (f === 'favorites') return i.favorite;
    if (f === 'loaned') return i.loaned;
    return true;
  });

  data.sort((a,b) => {
    if (s === 'title') return a.title.localeCompare(b.title);
    if (s === 'year') return (a.year || 0) - (b.year || 0);
    return b.createdAt - a.createdAt;
  });

  totalEl.textContent = items.length;
  favEl.textContent = items.filter(i => i.favorite).length;
  loanedEl.textContent = items.filter(i => i.loaned).length;

  if (!data.length) {
    listEl.innerHTML = '<div class="item"><p>Aucun média trouvé. Ajoutez votre premier disque/média 🎵</p></div>';
    return;
  }

  listEl.innerHTML = data.map(i => `
    <article class="item">
      <div class="item-top">
        <div>
          <h3>${escapeHtml(i.title)}</h3>
          <p class="meta">${escapeHtml(i.artist || 'Artiste inconnu')} · ${escapeHtml(i.type)} · ${i.year || 'année ?'}</p>
          <p class="meta">Genre: ${escapeHtml(i.genre || '-')} ${i.loaned ? '· Prêté' : ''}</p>
        </div>
        <div class="chip">${i.favorite ? '⭐ Favori' : 'Standard'}</div>
      </div>
      ${i.notes ? `<p>${escapeHtml(i.notes)}</p>` : ''}
      <div class="btn-row">
        <button data-action="edit" data-id="${i.id}">Modifier</button>
        <button data-action="fav" data-id="${i.id}">${i.favorite ? 'Retirer favori' : 'Mettre favori'}</button>
        <button data-action="loan" data-id="${i.id}">${i.loaned ? 'Marquer rendu' : 'Marquer prêté'}</button>
        <button class="danger" data-action="delete" data-id="${i.id}">Supprimer</button>
      </div>
    </article>
  `).join('');
}

function escapeHtml(text='') {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

form?.addEventListener('submit', e => {
  e.preventDefault();
  const payload = {
    title: $('title').value.trim(),
    artist: $('artist').value.trim(),
    type: $('type').value,
    genre: $('genre').value.trim(),
    year: Number($('year').value) || null,
    notes: $('notes').value.trim(),
    favorite: $('favorite').checked,
    loaned: $('loaned').checked
  };

  if (!payload.title) return;

  if (editingId) {
    items = items.map(i => i.id === editingId ? { ...i, ...payload } : i);
  } else {
    items.push({ id: crypto.randomUUID(), createdAt: Date.now(), ...payload });
  }

  persist();
  clearForm();
  render();
});

$('cancel-btn')?.addEventListener('click', clearForm);
queryEl?.addEventListener('input', render);
sortEl?.addEventListener('change', render);
filterEl?.addEventListener('change', render);

listEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  const item = items.find(i => i.id === id);
  if (!item) return;

  if (action === 'delete') {
    items = items.filter(i => i.id !== id);
  } else if (action === 'fav') {
    item.favorite = !item.favorite;
  } else if (action === 'loan') {
    item.loaned = !item.loaned;
  } else if (action === 'edit') {
    editingId = id;
    $('title').value = item.title;
    $('artist').value = item.artist || '';
    $('type').value = item.type;
    $('genre').value = item.genre || '';
    $('year').value = item.year || '';
    $('notes').value = item.notes || '';
    $('favorite').checked = item.favorite;
    $('loaned').checked = item.loaned;
    $('submit-btn').textContent = 'Mettre à jour';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  persist();
  render();
});

$('export-btn')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sauvegarde-collection-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$('import-file')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Format invalide');
    items = parsed;
    persist();
    render();
    alert('Sauvegarde restaurée avec succès.');
  } catch {
    alert('Impossible d\'importer ce fichier.');
  }
});

$('reset-btn')?.addEventListener('click', () => {
  if (!confirm('Supprimer toute la collection ?')) return;
  items = [];
  persist();
  render();
});

render();
