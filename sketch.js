// sketch.js

let fileData = []; // Pole pro data všech souborů
let mainContainer, rightPane, tableContainer, downloadBtn;

function setup() {
  noCanvas();

  // --- 1. Vytvoření vzhledu (UI) ---

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
  const title = createElement('h1', 'Přejmenování souborů na základě uložených GPS dat');
  title.style('font-size: 48px; margin-top: 0;');
  title.parent(rightPane);

  // Kontejner pro input
  const inputContainer = createDiv().style('margin-bottom: 30px;');
  inputContainer.parent(rightPane);

  // 'true' povoluje výběr více souborů
  let inputEl = createFileInput(handleFiles, true);
  inputEl.parent(inputContainer);
  inputEl.style('font-size: 18px');

  // Místo pro tabulku
  tableContainer = createDiv();
  tableContainer.parent(rightPane);

  // Tlačítko Stáhnout (skryté)
  downloadBtn = createButton('Stáhnout všechny soubory');
  downloadBtn.style(
    'font-size: 24px; padding: 15px 30px; background: black; color: white; ' +
    'border: none; border-radius: 12px; margin-top: 30px; cursor: pointer; ' +
    'display: none; font-weight: bold;'
  );
  downloadBtn.parent(rightPane);
  downloadBtn.mousePressed(downloadAllFiles);
}

// --- 2. Zpracování souborů ---

// Callback pro createFileInput při multiple = true
function handleFiles(files) {
  if (!Array.isArray(files)) {
    files = [files];
  }

  for (const file of files) {
    if (file && file.type === 'image') {
      processFile(file);
    }
  }
}

// Zpracování jednoho souboru
async function processFile(file) {
  let gpsCoords = 'Bez GPS';
  let safeName = null;

  try {
    if (window.exifr) {
      // *** KLÍČOVÁ ZMĚNA: použijeme exifr.gps() ***
      const gps = await window.exifr.gps(file.file);

      console.log('EXIF GPS výstup pro', file.name, gps);

      if (
        gps &&
        typeof gps.latitude === 'number' &&
        typeof gps.longitude === 'number'
      ) {
        const lat = gps.latitude.toFixed(6);
        const lon = gps.longitude.toFixed(6);

        gpsCoords = `${lat}, ${lon}`;
        safeName = `${lat.replace('.', '.')}, ${lon.replace('.', '.')}`;
      }
    } else {
      console.error('Knihovna exifr není k dispozici.');
    }
  } catch (e) {
    console.error('Chyba při čtení EXIF:', e);
  }

  // Uložení dat o souboru do globálního pole
  fileData.push({
    originalName: file.name,
    blob: file.file,
    coords: gpsCoords,
    safeName: safeName
  });

  // Aktualizace tabulky
  renderTable();
}

// --- 3. Vykreslení tabulky ---

function renderTable() {
  tableContainer.html(''); // Smazat starý obsah

  if (fileData.length > 0) {
    downloadBtn.style('display', 'inline-block');

    let html = `
      <table>
        <thead>
          <tr>
            <th>Původní název</th>
            <th>Nalezené souřadnice</th>
            <th>Bude přejmenováno na</th>
          </tr>
        </thead>
        <tbody>
    `;

    fileData.forEach(item => {
      let ext = getExtension(item.originalName) || '.jpg';
      let newName = item.safeName
        ? (item.safeName + ext)
        : '<span style="color:gray">—</span>';
      let coordStyle = item.safeName
        ? 'color: green; font-weight: bold;'
        : 'color: red;';

      html += `
        <tr>
          <td>${item.originalName}</td>
          <td style="${coordStyle}">${item.coords}</td>
          <td>${newName}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    tableContainer.html(html);
  } else {
    downloadBtn.style('display', 'none');
  }
}

// --- 4. Stahování ---

async function downloadAllFiles() {
  const btn = downloadBtn;
  const oldText = btn.html();
  btn.html('⏳ Stahuji... prosím čekejte');
  btn.attribute('disabled', '');

  let count = 0;

  for (let item of fileData) {
    if (item.safeName) {
      let ext = getExtension(item.originalName) || '.jpg';
      let fileName = item.safeName + ext;

      saveBlob(item.blob, fileName);
      count++;

      // Krátká pauza, aby prohlížeč neblokoval stahování
      await new Promise(r => setTimeout(r, 400));
    }
  }

  btn.html(oldText);
  btn.removeAttribute('disabled');

  if (count === 0) {
    alert('Žádný soubor neměl GPS data.');
  }
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getExtension(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '';
}
