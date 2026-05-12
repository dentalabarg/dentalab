const DOM = {
  searchInput: document.querySelector('#searchInput'),
  fileInput: document.querySelector('#fileInput'),
  fileButton: document.querySelector('#fileButton'),
  dropZone: document.querySelector('#dropZone'),
  clearButton: document.querySelector('#clearButton'),
  demoButton: document.querySelector('#demoButton'),
  statusMessage: document.querySelector('#statusMessage'),
  totalItems: document.querySelector('#totalItems'),
  visibleItems: document.querySelector('#visibleItems'),
  fileName: document.querySelector('#fileName'),
  tableBody: document.querySelector('#tableBody'),
  renderNotice: document.querySelector('#renderNotice'),
};

const STORAGE_KEY = 'dentalab-yiqi-excel-data-v1';
const MAX_RENDER_ROWS = 500;

let rows = [];
let currentFileName = 'Sin archivo';

const COLUMN_ALIASES = {
  sku: [
    'sku',
    'codigo',
    'código',
    'codigo de articulo',
    'codigo de artículo',
    'código de articulo',
    'código de artículo',
    'sku de articulo',
    'sku de artículo',
    'cod articulo',
    'cod. articulo',
    'articulo codigo',
  ],
  name: [
    'nombre del articulo',
    'nombre del artículo',
    'nombre de articulo',
    'nombre de artículo',
    'nombre de articulos',
    'nombre de artículos',
    'articulo',
    'artículo',
    'descripcion',
    'descripción',
    'concepto',
    'concepto de facturacion',
    'concepto de facturación',
    'producto',
  ],
  cost: [
    'crm',
    'costo',
    'costo crm',
    'crm costo',
    'costo del articulo',
    'costo del artículo',
    'costo articulo',
    'costo artículo',
    'precio costo',
    'precio de costo',
  ],
  price: [
    'lista 1 - contado',
    'lista 1 contado',
    'lista1 contado',
    'lista 1',
    'precio lista 1',
    'precio final',
    'precio final de venta',
    'precio venta',
    'precio de venta',
    'contado',
  ],
};

const demoRows = [
  {
    sku: '10001',
    name: 'Guantes de examinación nitrilo azul talle M',
    cost: 12800,
    price: 19400,
  },
  {
    sku: '21003',
    name: 'Brilliant EverGlow A2/B2 jeringa',
    cost: 32750,
    price: 51400,
  },
  {
    sku: '45018-F',
    name: 'Ácido grabador gel fraccionado',
    cost: 1850,
    price: 3150,
  },
  {
    sku: '78021',
    name: 'Fresa redonda PM Nº 020',
    cost: 960,
    price: 1680,
  },
];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .replace(/[()\[\]{}]/g, '')
    .trim();
}

function findColumn(headers, aliases) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeText(header),
  }));

  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    const exact = normalizedHeaders.find((header) => header.normalized === normalizedAlias);
    if (exact) return exact.original;
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    const partial = normalizedHeaders.find((header) =>
      header.normalized.includes(normalizedAlias) || normalizedAlias.includes(header.normalized)
    );
    if (partial) return partial.original;
  }

  return null;
}

function parseCurrencyLikeNumber(value) {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined || value === '') return null;

  let text = String(value)
    .replace(/\s/g, '')
    .replace(/\$/g, '')
    .replace(/ARS/gi, '')
    .replace(/[^0-9,.-]/g, '');

  if (!text) return null;

  const hasComma = text.includes(',');
  const hasDot = text.includes('.');

  if (hasComma && hasDot) {
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    if (lastComma > lastDot) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (hasComma) {
    text = text.replace(',', '.');
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value) {
  const number = parseCurrencyLikeNumber(value);
  if (number === null) return '—';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(number);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showStatus(message, type = 'info') {
  DOM.statusMessage.textContent = message;
  DOM.statusMessage.dataset.type = type;
}

function setRows(nextRows, fileName = 'Datos cargados') {
  rows = nextRows;
  currentFileName = fileName;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      rows,
      currentFileName,
      savedAt: new Date().toISOString(),
    })
  );
  render();
}

function getFilteredRows() {
  const query = normalizeText(DOM.searchInput.value);
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = normalizeText(`${row.sku} ${row.name} ${row.cost} ${row.price}`);
    return haystack.includes(query);
  });
}

function render() {
  const filtered = getFilteredRows();
  const visible = filtered.slice(0, MAX_RENDER_ROWS);

  DOM.totalItems.textContent = rows.length.toLocaleString('es-AR');
  DOM.visibleItems.textContent = filtered.length.toLocaleString('es-AR');
  DOM.fileName.textContent = currentFileName;

  if (!rows.length) {
    DOM.tableBody.innerHTML = '<tr class="empty-row"><td colspan="4">Importá un Excel para completar el cuadro.</td></tr>';
    DOM.renderNotice.textContent = '';
    return;
  }

  if (!filtered.length) {
    DOM.tableBody.innerHTML = '<tr class="empty-row"><td colspan="4">No hay resultados para esa búsqueda.</td></tr>';
    DOM.renderNotice.textContent = '';
    return;
  }

  DOM.tableBody.innerHTML = visible
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.sku || '—')}</td>
          <td>${escapeHtml(row.name || '—')}</td>
          <td class="number-col">${formatCurrency(row.cost)}</td>
          <td class="number-col">${formatCurrency(row.price)}</td>
        </tr>
      `
    )
    .join('');

  DOM.renderNotice.textContent =
    filtered.length > MAX_RENDER_ROWS
      ? `Se muestran los primeros ${MAX_RENDER_ROWS.toLocaleString('es-AR')} de ${filtered.length.toLocaleString('es-AR')} resultados.`
      : '';
}

async function handleFile(file) {
  if (!file) return;

  if (!window.XLSX) {
    showStatus('No se pudo cargar la librería para leer Excel. Revisá la conexión a internet y recargá la página.', 'error');
    return;
  }

  try {
    showStatus(`Leyendo archivo: ${file.name}...`);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

    if (!jsonRows.length) {
      showStatus('El archivo no tiene filas para importar.', 'error');
      return;
    }

    const headers = Object.keys(jsonRows[0]);
    const skuColumn = findColumn(headers, COLUMN_ALIASES.sku);
    const nameColumn = findColumn(headers, COLUMN_ALIASES.name);
    const costColumn = findColumn(headers, COLUMN_ALIASES.cost);
    const priceColumn = findColumn(headers, COLUMN_ALIASES.price);

    const missing = [];
    if (!skuColumn) missing.push('SKU');
    if (!nameColumn) missing.push('Nombre del artículo');
    if (!costColumn) missing.push('CRM / Costo');
    if (!priceColumn) missing.push('Lista 1 - Contado');

    if (missing.length) {
      showStatus(
        `No pude reconocer estas columnas: ${missing.join(', ')}. Renombrá los encabezados del Excel y volvé a importarlo.`,
        'error'
      );
      return;
    }

    const importedRows = jsonRows
      .map((row) => ({
        sku: String(row[skuColumn] ?? '').trim(),
        name: String(row[nameColumn] ?? '').trim(),
        cost: parseCurrencyLikeNumber(row[costColumn]),
        price: parseCurrencyLikeNumber(row[priceColumn]),
      }))
      .filter((row) => row.sku || row.name);

    if (!importedRows.length) {
      showStatus('Reconocí las columnas, pero no encontré artículos con SKU o nombre.', 'error');
      return;
    }

    setRows(importedRows, file.name);
    showStatus(`Importación correcta: ${importedRows.length.toLocaleString('es-AR')} artículos cargados desde “${file.name}”.`, 'success');
  } catch (error) {
    console.error(error);
    showStatus('No pude leer el archivo. Revisá que sea un Excel válido y que la primera hoja tenga encabezados.', 'error');
  }
}

function clearData() {
  rows = [];
  currentFileName = 'Sin archivo';
  DOM.searchInput.value = '';
  localStorage.removeItem(STORAGE_KEY);
  showStatus('Datos limpiados. Importá un nuevo Excel para completar la tabla.');
  render();
}

function loadSavedData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.rows?.length) {
      rows = saved.rows;
      currentFileName = saved.currentFileName || 'Datos guardados';
      showStatus(`Se restauraron ${rows.length.toLocaleString('es-AR')} artículos guardados en este navegador.`);
      render();
    } else {
      render();
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    render();
  }
}

DOM.fileButton.addEventListener('click', () => DOM.fileInput.click());
DOM.fileInput.addEventListener('change', (event) => handleFile(event.target.files[0]));
DOM.searchInput.addEventListener('input', render);
DOM.clearButton.addEventListener('click', clearData);
DOM.demoButton.addEventListener('click', () => {
  setRows(demoRows, 'Datos de ejemplo');
  showStatus('Datos de ejemplo cargados. Importá tu Excel real cuando quieras reemplazarlos.', 'success');
});

DOM.dropZone.addEventListener('click', (event) => {
  if (event.target !== DOM.fileButton) DOM.fileInput.click();
});

DOM.dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    DOM.fileInput.click();
  }
});

['dragenter', 'dragover'].forEach((eventName) => {
  DOM.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    DOM.dropZone.classList.add('is-dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  DOM.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    DOM.dropZone.classList.remove('is-dragover');
  });
});

DOM.dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer.files[0];
  handleFile(file);
});

loadSavedData();
