// sketch.js

let fileData = [];
let mainContainer, rightPane, tableContainer, downloadBtn, zipBtn;

function setup() {
  noCanvas();

  // Hlavní kontejner
  mainContainer = createDiv().style(
    'display: flex; justify-content: center; width: 100%;'
  );

  // Bílý panel
  rightPane = createDiv().style(
    'width: 80%; max-width: 1000px; background: white; padding: 50px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-height: 50vh;'
  );
  rightPane.parent(mainContainer);

  // Nadpis
  const title = createElement('h1', 'Hromadné přejmenování fotek podle GPS');
  title.style('font-size: 48px; margin-top: 0;');
  title.parent(rightPane);

  // Input
  const inputContainer = createDiv().style('margin-bottom: 30px;');
  inputContainer.parent(rightPane);

  let inputEl = createFileInput(handleFiles, true);
  inputEl.parent(inputContainer);
  inputEl.style('font-size: 18px');

  // Kontejner pro tabulku
  tableContainer = createDiv();
  tableContainer.parent(rightPane);

  // Tlačítko – stáhnout všechny jednotlivě
  downloadBtn = createButton('Stáhnout všechny soubory');
  downloadBtn.style(`
    font-size: 20px; padding: 5px 15px; background: #007bff; color: white;
    border: none; border-radius: 10px; margin-top: 30px; cursor: pointer;
    display: none; font-weight: bold;
  `);
  downloadBtn.parent(rightPane);
  downloadBtn.mousePressed(downloadAllFiles);

  // Tlačítko – ZIP
  zipBtn = createButton('Stáhnout jako ZIP');
  zipBtn.style(`
    font-size: 20px; padding: 5px 15px; background: #28a745; color: white;
    border: none; border-radius: 10px; margin-top: 20px; cursor: pointer;
    display: none; font-weight: bold;
  `);
  zipBtn.parent(rightPane);
  zipBtn.mousePressed(downloadAsZip);
}

// --- ZPRACOVÁNÍ SOUBORŮ ---

function handleFiles(files) {
  if (!Array.isArray(files)) files = [files];
  for (const file of files) {
    if (file.type === 'image') processFile(file);
  }
}

async function processFile(file) {
  let gpsCoords = 'Bez GPS';
  let safeName = null;

  try {
    const gps = await window.exifr.gps(file.file);

    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      const lat = gps.latitude.toFixed(6);
      const lon = gps.longitude.toFixed(6);

      gpsCoords = `${lat}, ${lon}`;
      // ZDE JE ZMĚNA: Formátování názvu přesně podle vašeho požadavku
      safeName = `${lat}, ${lon}`;
    }
  } catch (err) {
    console.error('Chyba při čtení EXIF GPS:', err);
  }

  fileData.push({
    originalName: file.name,
    blob: file.file,
    coords: gpsCoords,
    safeName: safeName
  });

  renderTable();
}

// --- TABULKA ---

function renderTable() {
  tableContainer.html('');

  if (fileData.length === 0) {
    downloadBtn.style('display', 'none');
    zipBtn.style('display', 'none');
    return;
  }

  downloadBtn.style('display', 'inline-block');
  zipBtn.style('display', 'inline-block');

  let html = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #ddd; text-align: left;">
          <th style="padding: 10px;">Původní název</th>
          <th style="padding: 10px;">Nalezené souřadnice</th>
          <th style="padding: 10px;">Nový název souboru</th>
        </tr>
      </thead>
      <tbody>
  `;

  fileData.forEach(item => {
    let ext = getExtension(item.originalName);
    let newName = item.safeName ? (item.safeName + ext) : '—';
    let style = item.safeName ? 'color: green; font-weight: bold;' : 'color: red;';

    html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${item.originalName}</td>
        <td style="padding: 10px; ${style}">${item.coords}</td>
        <td style="padding: 10px;">${newName}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tableContainer.html(html);
}

// --- STAHOVÁNÍ JEDNOTLIVĚ ---

async function downloadAllFiles() {
  downloadBtn.attribute('disabled', '');
  downloadBtn.html('Stahuji…');

  for (const item of fileData) {
    if (item.safeName) {
      let ext = getExtension(item.originalName);
      let fileName = item.safeName + ext;
      saveBlob(item.blob, fileName);
      await new Promise(r => setTimeout(r, 400));
    }
  }

  downloadBtn.removeAttribute('disabled');
  downloadBtn.html('Stáhnout všechny soubory');
}

// --- STAHOVÁNÍ ZIPU ---

async function downloadAsZip() {
  zipBtn.attribute('disabled', '');
  zipBtn.html('Tvořím ZIP…');

  let zip = new JSZip();
  let count = 0;

  for (let item of fileData) {
    if (item.safeName) {
      let ext = getExtension(item.originalName);
      zip.file(item.safeName + ext, item.blob);
      count++;
    }
  }

  if (count === 0) {
    alert('Žádný soubor nemá GPS data.');
    zipBtn.removeAttribute('disabled');
    zipBtn.html('Stáhnout jako ZIP');
    return;
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'GPS–Fotky.zip');

  zipBtn.removeAttribute('disabled');
  zipBtn.html('Stáhnout jako ZIP');
}

// --- POMOCNÉ FUNKCE ---

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getExtension(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '.jpg';
}
