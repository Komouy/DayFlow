export const MAX_NOTE_ATTACHMENT_COUNT = 5;
export const MAX_NOTE_ATTACHMENT_SIZE = 12 * 1024 * 1024;
export const MAX_NOTE_ATTACHMENTS_SIZE = 25 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_LENGTH = 200_000;

const MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
};

function getExtension(filename) {
  return String(filename || '').split('.').pop().toLowerCase();
}

function limitText(text) {
  const normalized = String(text || '').replace(/\u0000/g, '').trim();
  if (!normalized) return '';
  return normalized.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

async function extractPdfText(file) {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pages = [];
  try {
    const document = await loadingTask.promise;
    const pageCount = Math.min(document.numPages, 100);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str || '').join(' '));
      if (pages.join('\n').length >= MAX_EXTRACTED_TEXT_LENGTH) break;
    }
  } finally {
    await loadingTask.destroy();
  }
  return limitText(pages.join('\n\n'));
}

export async function renderPdfPages(file, maxPages = 5) {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const images = [];
  try {
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const initialViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, 1400 / Math.max(initialViewport.width, initialViewport.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Browser tidak dapat menyiapkan gambar halaman PDF.');
      await page.render({ canvasContext: context, viewport }).promise;
      const image = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Gagal mengubah halaman PDF menjadi gambar.'));
        }, 'image/jpeg', 0.78);
      });
      const bytes = new Uint8Array(await image.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      images.push({ mimeType: 'image/jpeg', data: btoa(binary) });
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await loadingTask.destroy();
  }
  return images;
}

async function extractPptxText(file) {
  const { default: JSZip } = await import('jszip');
  const archive = await JSZip.loadAsync(file);
  const slideNames = Object.keys(archive.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => Number(left.match(/slide(\d+)/)[1]) - Number(right.match(/slide(\d+)/)[1]));
  const slides = [];
  for (const [index, name] of slideNames.entries()) {
    const xml = await archive.file(name).async('text');
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const text = [...document.getElementsByTagNameNS('*', 't')]
      .map((node) => node.textContent || '')
      .filter(Boolean)
      .join(' ');
    if (text) slides.push(`Slide ${index + 1}: ${text}`);
    if (slides.join('\n').length >= MAX_EXTRACTED_TEXT_LENGTH) break;
  }
  return limitText(slides.join('\n\n'));
}

export async function prepareNoteAttachment(file) {
  if (!(file instanceof File)) throw new Error('Lampiran tidak valid.');
  if (file.size === 0) throw new Error(`"${file.name}" kosong.`);
  if (file.size > MAX_NOTE_ATTACHMENT_SIZE) {
    throw new Error(`Ukuran "${file.name}" melebihi batas 12 MB.`);
  }

  const extension = getExtension(file.name);
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) {
    throw new Error(`Format "${file.name}" belum didukung. Pilih gambar, PDF, DOCX, PPTX, TXT, MD, atau CSV.`);
  }
  if (file.type && file.type !== 'application/octet-stream' &&
    file.type !== mimeType && !(extension === 'jpg' && file.type === 'image/pjpeg')) {
    throw new Error(`Tipe berkas "${file.name}" tidak sesuai dengan ekstensinya.`);
  }

  let extractedText = '';
  if (extension === 'pdf') {
    extractedText = await extractPdfText(file);
  } else if (extension === 'docx') {
    const { default: mammoth } = await import('mammoth/mammoth.browser.js');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    extractedText = limitText(result.value);
  } else if (extension === 'pptx') {
    extractedText = await extractPptxText(file);
  } else if (['txt', 'md', 'csv'].includes(extension)) {
    extractedText = limitText(await file.text());
  }

  return {
    file,
    name: file.name,
    size: file.size,
    mimeType,
    type: mimeType.startsWith('image/') ? 'image' : 'document',
    extractedText
  };
}

export function getNoteAttachmentAccept() {
  return Object.keys(MIME_TYPES).map((extension) => `.${extension}`).join(',');
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
