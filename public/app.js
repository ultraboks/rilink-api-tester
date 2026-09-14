// Rilink Developer API Tester — frontend logic.
// Talks only to the local Node proxy (/api/proxy/send), which forwards to
// the real Rilink Developer API (POST /api/v1/messages/send).

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------------------------------------------------------------------------
// Row templates for repeatable fields (buttons / sections+rows / cards)
// ---------------------------------------------------------------------------

function buttonRowEl() {
  return el(`
    <div class="group-box" data-role="button-row">
      <div class="group-box-header">
        <strong>Button</strong>
        <button type="button" class="btn-danger-outline" data-action="remove-row">Hapus</button>
      </div>
      <div class="field-row">
        <div class="field"><label>text <span class="req">*</span></label><input type="text" data-f="text" placeholder="Beli Sekarang" /></div>
        <div class="field"><label>id <span class="opt">(opsional)</span></label><input type="text" data-f="id" placeholder="btn_1" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>type</label>
          <select data-f="type">
            <option value="reply">reply</option>
            <option value="copy">copy</option>
            <option value="url">url</option>
            <option value="call">call</option>
          </select>
        </div>
        <div class="field"><label>value <span class="opt">(opsional)</span></label><input type="text" data-f="value" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>url <span class="opt">(opsional)</span></label><input type="text" data-f="url" placeholder="https://..." /></div>
        <div class="field"><label>phoneNumber <span class="opt">(opsional)</span></label><input type="text" data-f="phoneNumber" /></div>
      </div>
    </div>
  `);
}

function rowRowEl() {
  return el(`
    <div class="group-box" data-role="list-row">
      <div class="group-box-header">
        <strong>Row</strong>
        <button type="button" class="btn-danger-outline" data-action="remove-row">Hapus</button>
      </div>
      <div class="field-row">
        <div class="field"><label>title <span class="req">*</span></label><input type="text" data-f="title" /></div>
        <div class="field"><label>id <span class="opt">(opsional)</span></label><input type="text" data-f="id" /></div>
      </div>
      <div class="field"><label>description <span class="opt">(opsional)</span></label><input type="text" data-f="description" /></div>
    </div>
  `);
}

function sectionRowEl() {
  const node = el(`
    <div class="group-box" data-role="section-row">
      <div class="group-box-header">
        <strong>Section</strong>
        <button type="button" class="btn-danger-outline" data-action="remove-row">Hapus</button>
      </div>
      <div class="field"><label>title <span class="opt">(opsional)</span></label><input type="text" data-f="title" /></div>
      <div class="subgroup">
        <div class="group-box-header">
          <strong>Rows <span class="req">*</span></strong>
          <button type="button" class="btn-ghost" data-action="add-row" data-kind="list-row">+ Tambah Row</button>
        </div>
        <div data-repeater="rows"></div>
      </div>
    </div>
  `);
  node.querySelector('[data-repeater="rows"]').appendChild(rowRowEl());
  return node;
}

function cardRowEl() {
  const node = el(`
    <div class="group-box" data-role="card-row">
      <div class="group-box-header">
        <strong>Card</strong>
        <button type="button" class="btn-danger-outline" data-action="remove-row">Hapus</button>
      </div>
      <div class="field-row">
        <div class="field"><label>title <span class="opt">(opsional)</span></label><input type="text" data-f="title" /></div>
        <div class="field"><label>subtitle <span class="opt">(opsional)</span></label><input type="text" data-f="subtitle" /></div>
      </div>
      <div class="field"><label>body <span class="opt">(opsional)</span></label><textarea data-f="body"></textarea></div>
      <div class="field-row">
        <div class="field"><label>footer <span class="opt">(opsional)</span></label><input type="text" data-f="footer" /></div>
        <div class="field"><label>media_url <span class="req">*</span></label><input type="text" data-f="media_url" /></div>
      </div>
      <div class="subgroup">
        <div class="group-box-header">
          <strong>Buttons <span class="req">*</span></strong>
          <button type="button" class="btn-ghost" data-action="add-row" data-kind="button-row">+ Tambah Button</button>
        </div>
        <div data-repeater="buttons"></div>
      </div>
    </div>
  `);
  node.querySelector('[data-repeater="buttons"]').appendChild(buttonRowEl());
  return node;
}

// ---------------------------------------------------------------------------
// Dynamic field rendering per message type
// ---------------------------------------------------------------------------

function renderDynamicFields(type) {
  const container = qs('#dynamicFields');
  container.innerHTML = '';

  if (type === 'text') {
    container.appendChild(el(`
      <div class="field">
        <label>text <span class="req">*</span></label>
        <textarea id="f_text" placeholder="Halo dari integrasi API"></textarea>
      </div>
    `));
  } else if (['image', 'video', 'audio', 'document'].includes(type)) {
    container.appendChild(el(`
      <div>
        <div class="field"><label>media_url <span class="req">*</span></label><input type="text" id="f_media_url" placeholder="https://example.com/file.jpg" /></div>
        <div class="field"><label>text <span class="opt">(caption, opsional)</span></label><input type="text" id="f_text_caption" /></div>
        <div class="field-row">
          <div class="field"><label>mime_type <span class="opt">(opsional)</span></label><input type="text" id="f_mime_type" placeholder="application/pdf" /></div>
          <div class="field"><label>file_name <span class="opt">(opsional)</span></label><input type="text" id="f_file_name" placeholder="proposal.pdf" /></div>
        </div>
        ${type === 'audio' ? '<div class="checkbox-field"><input type="checkbox" id="f_ptt" /><label for="f_ptt">ptt (kirim sebagai voice note)</label></div>' : ''}
      </div>
    `));
  } else if (type === 'button') {
    container.appendChild(el(`
      <div>
        <div class="field"><label>media_url <span class="req">*</span></label><input type="text" id="f_media_url" placeholder="https://example.com/banner.jpg" /></div>
        <div class="field"><label>text <span class="opt">(opsional)</span></label><input type="text" id="f_text" /></div>
        <div class="field-row">
          <div class="field"><label>title <span class="opt">(opsional)</span></label><input type="text" id="f_title" /></div>
          <div class="field"><label>subtitle <span class="opt">(opsional)</span></label><input type="text" id="f_subtitle" /></div>
        </div>
        <div class="field"><label>footer <span class="opt">(opsional)</span></label><input type="text" id="f_footer" /></div>
        <div class="repeater-wrap">
          <div class="group-box-header"><strong>Buttons <span class="req">*</span> (maks 10)</strong><button type="button" class="btn-ghost" data-action="add-row" data-kind="button-row">+ Tambah Button</button></div>
          <div data-repeater="buttons"></div>
        </div>
      </div>
    `));
    qs('[data-repeater="buttons"]', container).appendChild(buttonRowEl());
  } else if (type === 'list') {
    container.appendChild(el(`
      <div>
        <div class="field"><label>media_url <span class="opt">(opsional)</span></label><input type="text" id="f_media_url" placeholder="https://example.com/banner.jpg" /></div>
        <div class="field"><label>text <span class="opt">(opsional)</span></label><input type="text" id="f_text" /></div>
        <div class="field-row">
          <div class="field"><label>title <span class="opt">(opsional)</span></label><input type="text" id="f_title" /></div>
          <div class="field"><label>subtitle <span class="opt">(opsional)</span></label><input type="text" id="f_subtitle" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>footer <span class="opt">(opsional)</span></label><input type="text" id="f_footer" /></div>
          <div class="field"><label>button_text <span class="opt">(opsional, default "Menu")</span></label><input type="text" id="f_button_text" placeholder="Menu" /></div>
        </div>
        <div class="repeater-wrap">
          <div class="group-box-header"><strong>Sections <span class="req">*</span> (maks 20)</strong><button type="button" class="btn-ghost" data-action="add-row" data-kind="section-row">+ Tambah Section</button></div>
          <div data-repeater="sections"></div>
        </div>
      </div>
    `));
    qs('[data-repeater="sections"]', container).appendChild(sectionRowEl());
  } else if (type === 'carousel') {
    container.appendChild(el(`
      <div>
        <div class="field"><label>text <span class="opt">(opsional)</span></label><input type="text" id="f_text" /></div>
        <div class="field-row">
          <div class="field"><label>title <span class="opt">(opsional)</span></label><input type="text" id="f_title" /></div>
          <div class="field"><label>subtitle <span class="opt">(opsional)</span></label><input type="text" id="f_subtitle" /></div>
        </div>
        <div class="field"><label>footer <span class="opt">(opsional)</span></label><input type="text" id="f_footer" /></div>
        <div class="repeater-wrap">
          <div class="group-box-header"><strong>Cards <span class="req">*</span> (maks 10)</strong><button type="button" class="btn-ghost" data-action="add-row" data-kind="card-row">+ Tambah Card</button></div>
          <div data-repeater="cards"></div>
        </div>
      </div>
    `));
    qs('[data-repeater="cards"]', container).appendChild(cardRowEl());
  }
}

// Delegated add/remove handling for every repeater rendered inside #dynamicFields.
qs('#dynamicFields').addEventListener('click', (e) => {
  const addBtn = e.target.closest('[data-action="add-row"]');
  if (addBtn) {
    const kind = addBtn.dataset.kind;
    const repeaterContainer = addBtn.closest('.repeater-wrap, .subgroup').querySelector('[data-repeater]');
    const rowEl = kind === 'button-row' ? buttonRowEl()
      : kind === 'list-row' ? rowRowEl()
      : kind === 'section-row' ? sectionRowEl()
      : cardRowEl();
    repeaterContainer.appendChild(rowEl);
    return;
  }
  const removeBtn = e.target.closest('[data-action="remove-row"]');
  if (removeBtn) {
    removeBtn.closest('.group-box').remove();
  }
});

// ---------------------------------------------------------------------------
// Reading repeater state back out of the DOM into request-ready arrays
// ---------------------------------------------------------------------------

function readButtonsArray(containerEl) {
  if (!containerEl) return [];
  return qsa(':scope > .group-box', containerEl)
    .map((row) => {
      const get = (f) => row.querySelector(`[data-f="${f}"]`)?.value.trim() || '';
      const obj = { text: get('text'), type: get('type') || 'reply' };
      const id = get('id'); if (id) obj.id = id;
      const value = get('value'); if (value) obj.value = value;
      const url = get('url'); if (url) obj.url = url;
      const phoneNumber = get('phoneNumber'); if (phoneNumber) obj.phoneNumber = phoneNumber;
      return obj;
    })
    .filter((b) => b.text);
}

function readRowsArray(containerEl) {
  if (!containerEl) return [];
  return qsa(':scope > .group-box', containerEl)
    .map((row) => {
      const get = (f) => row.querySelector(`[data-f="${f}"]`)?.value.trim() || '';
      const obj = { title: get('title') };
      const id = get('id'); if (id) obj.id = id;
      const description = get('description'); if (description) obj.description = description;
      return obj;
    })
    .filter((r) => r.title);
}

function readSectionsArray(containerEl) {
  if (!containerEl) return [];
  return qsa(':scope > .group-box', containerEl).map((section) => {
    const title = section.querySelector('[data-f="title"]')?.value.trim() || '';
    const rows = readRowsArray(section.querySelector('[data-repeater="rows"]'));
    const obj = { rows };
    if (title) obj.title = title;
    return obj;
  });
}

function readCardsArray(containerEl) {
  if (!containerEl) return [];
  return qsa(':scope > .group-box', containerEl).map((card) => {
    const get = (f) => card.querySelector(`[data-f="${f}"]`)?.value.trim() || '';
    const obj = {};
    ['title', 'subtitle', 'body', 'footer', 'media_url'].forEach((f) => {
      const v = get(f);
      if (v) obj[f] = v;
    });
    obj.buttons = readButtonsArray(card.querySelector('[data-repeater="buttons"]'));
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Building the outgoing payload from the composer form
// ---------------------------------------------------------------------------

function senderMode() {
  return qs('input[name="senderMode"]:checked')?.value || 'device_id';
}

function buildPayload() {
  const type = qs('#type').value;
  const to = qs('#to').value.trim();
  const contactName = qs('#contact_name').value.trim();
  const val = (id) => qs('#' + id)?.value.trim() || '';

  const payload = { type };

  if (senderMode() === 'sender_phone') {
    const senderPhone = qs('#sender_phone').value.trim();
    if (senderPhone) payload.sender_phone = senderPhone;
  } else {
    const deviceIdRaw = qs('#device_id').value.trim();
    if (deviceIdRaw !== '') payload.device_id = Number(deviceIdRaw);
  }

  if (to) payload.to = to;
  if (contactName) payload.contact_name = contactName;
  if (qs('#save_contact')?.checked) payload.save_contact = true;

  if (type === 'text') {
    payload.text = val('f_text');
  } else if (['image', 'video', 'audio', 'document'].includes(type)) {
    payload.media_url = val('f_media_url');
    const caption = val('f_text_caption'); if (caption) payload.text = caption;
    const mime = val('f_mime_type'); if (mime) payload.mime_type = mime;
    const fileName = val('f_file_name'); if (fileName) payload.file_name = fileName;
    const pttEl = qs('#f_ptt');
    if (pttEl && pttEl.checked) payload.ptt = true;
  } else if (type === 'button') {
    ['text', 'title', 'subtitle', 'footer', 'media_url'].forEach((f) => {
      const v = val('f_' + f); if (v) payload[f] = v;
    });
    payload.buttons = readButtonsArray(qs('#dynamicFields [data-repeater="buttons"]'));
  } else if (type === 'list') {
    ['text', 'title', 'subtitle', 'footer', 'button_text', 'media_url'].forEach((f) => {
      const v = val('f_' + f); if (v) payload[f] = v;
    });
    payload.sections = readSectionsArray(qs('#dynamicFields [data-repeater="sections"]'));
  } else if (type === 'carousel') {
    ['text', 'title', 'subtitle', 'footer'].forEach((f) => {
      const v = val('f_' + f); if (v) payload[f] = v;
    });
    payload.cards = readCardsArray(qs('#dynamicFields [data-repeater="cards"]'));
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Example payloads (mirrors the Rilink Docs page examples)
// ---------------------------------------------------------------------------

const EXAMPLES = {
  text: { device_id: 12, to: '6281234567890', type: 'text', text: 'Halo dari integrasi API' },
  image: { device_id: 12, to: '6281234567890', type: 'image', text: 'Promo terbaru', media_url: 'https://example.com/banner.jpg' },
  video: { device_id: 12, to: '6281234567890', type: 'video', text: 'Lihat video produk terbaru', media_url: 'https://example.com/product-demo.mp4' },
  audio: { device_id: 12, to: '6281234567890', type: 'audio', media_url: 'https://example.com/voice-note.mp3' },
  document: {
    device_id: 12, to: '6281234567890', type: 'document', text: 'Berikut proposal PDF',
    media_url: 'https://example.com/proposal.pdf', mime_type: 'application/pdf', file_name: 'proposal.pdf',
  },
  button: {
    device_id: 12, to: '6281234567890', type: 'button', text: 'Pilih salah satu opsi', footer: 'Rilink API',
    media_url: 'https://example.com/banner.jpg',
    buttons: [{ id: 'buy_now', text: 'Beli' }, { id: 'talk_admin', text: 'Admin' }],
  },
  list: {
    device_id: 12, to: '6281234567890', type: 'list', text: 'Silakan pilih menu', button_text: 'Buka Menu',
    media_url: 'https://example.com/banner.jpg',
    sections: [{
      title: 'Layanan',
      rows: [
        { id: 'svc_1', title: 'Demo', description: 'Jadwalkan demo' },
        { id: 'svc_2', title: 'Harga', description: 'Minta price list' },
      ],
    }],
  },
  carousel: {
    device_id: 12, to: '6281234567890', type: 'carousel',
    cards: [
      {
        title: 'Paket Starter', body: 'Cocok untuk bisnis baru', media_url: 'https://example.com/starter.jpg',
        buttons: [{ id: 'starter_buy', text: 'Pilih Paket' }, { id: 'starter_info', text: 'Info Detail' }],
      },
      {
        title: 'Paket Pro', body: 'Untuk tim yang lebih aktif', media_url: 'https://example.com/pro.jpg',
        buttons: [{ id: 'pro_buy', text: 'Pilih Paket' }, { id: 'pro_info', text: 'Info Detail' }],
      },
    ],
  },
};

function populateFromExample(type) {
  const example = EXAMPLES[type];
  if (!example) return;

  renderDynamicFields(type);
  qs('#device_id').value = example.device_id ?? '';
  qs('#to').value = example.to ?? '';

  const setVal = (id, v) => { const node = qs('#' + id); if (node) node.value = v ?? ''; };

  if (type === 'text') {
    setVal('f_text', example.text);
  } else if (['image', 'video', 'audio', 'document'].includes(type)) {
    setVal('f_media_url', example.media_url);
    setVal('f_text_caption', example.text);
    setVal('f_mime_type', example.mime_type);
    setVal('f_file_name', example.file_name);
  } else if (type === 'button') {
    setVal('f_text', example.text);
    setVal('f_footer', example.footer);
    setVal('f_media_url', example.media_url);
    const container = qs('#dynamicFields [data-repeater="buttons"]');
    container.innerHTML = '';
    example.buttons.forEach((b) => {
      const row = buttonRowEl();
      row.querySelector('[data-f="text"]').value = b.text || '';
      row.querySelector('[data-f="id"]').value = b.id || '';
      container.appendChild(row);
    });
  } else if (type === 'list') {
    setVal('f_text', example.text);
    setVal('f_button_text', example.button_text);
    setVal('f_media_url', example.media_url);
    const container = qs('#dynamicFields [data-repeater="sections"]');
    container.innerHTML = '';
    example.sections.forEach((s) => {
      const sectionEl = sectionRowEl();
      sectionEl.querySelector('[data-f="title"]').value = s.title || '';
      const rowsContainer = sectionEl.querySelector('[data-repeater="rows"]');
      rowsContainer.innerHTML = '';
      s.rows.forEach((r) => {
        const rowEl = rowRowEl();
        rowEl.querySelector('[data-f="title"]').value = r.title || '';
        rowEl.querySelector('[data-f="id"]').value = r.id || '';
        rowEl.querySelector('[data-f="description"]').value = r.description || '';
        rowsContainer.appendChild(rowEl);
      });
      container.appendChild(sectionEl);
    });
  } else if (type === 'carousel') {
    const container = qs('#dynamicFields [data-repeater="cards"]');
    container.innerHTML = '';
    example.cards.forEach((c) => {
      const cardEl = cardRowEl();
      cardEl.querySelector('[data-f="title"]').value = c.title || '';
      cardEl.querySelector('[data-f="body"]').value = c.body || '';
      cardEl.querySelector('[data-f="media_url"]').value = c.media_url || '';
      const buttonsContainer = cardEl.querySelector('[data-repeater="buttons"]');
      buttonsContainer.innerHTML = '';
      c.buttons.forEach((b) => {
        const row = buttonRowEl();
        row.querySelector('[data-f="text"]').value = b.text || '';
        row.querySelector('[data-f="id"]').value = b.id || '';
        buttonsContainer.appendChild(row);
      });
      container.appendChild(cardEl);
    });
  }
}

// ---------------------------------------------------------------------------
// Sending requests through the local proxy + rendering the response
// ---------------------------------------------------------------------------

function statusClass(status) {
  if (typeof status !== 'number') return 'status-err';
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 400) return 'status-4xx';
  return 'status-other';
}

function maskToken(token) {
  if (!token) return '(tidak dikirim)';
  if (token.length <= 8) return 'Bearer ****';
  return `Bearer ${token.slice(0, 4)}...${token.slice(-4)}`;
}

function setResponseLoading() {
  const meta = qs('#responseMeta');
  meta.classList.remove('empty');
  meta.innerHTML = '<span class="status-badge status-other">Mengirim...</span>';
  qs('#responseBody').textContent = '';
}

function renderResponse(result, payload, token) {
  const meta = qs('#responseMeta');
  const body = qs('#responseBody');
  meta.classList.remove('empty');

  if (!result.proxyOk) {
    meta.innerHTML = '<span class="status-badge status-err">PROXY ERROR</span>';
    body.textContent = JSON.stringify({
      request: { url: result.requestUrl, payload },
      error: result.proxyError,
    }, null, 2);
    return;
  }

  const cls = statusClass(result.httpStatus);
  meta.innerHTML = `
    <span class="status-badge ${cls}">${result.httpStatus} ${result.httpStatusText || ''}</span>
    <span>${result.durationMs} ms</span>
    <span class="hint">${result.requestUrl}</span>
  `;

  body.textContent = JSON.stringify({
    request: {
      method: 'POST',
      url: result.requestUrl,
      headers: {
        Authorization: maskToken(token),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: payload,
    },
    response: result.body,
  }, null, 2);
}

let historyItems = [];

function pushHistory(result, payload) {
  historyItems.unshift({
    time: new Date().toLocaleTimeString('id-ID'),
    status: result.proxyOk ? result.httpStatus : 'ERR',
    type: payload.type,
    result,
    payload,
  });
  historyItems = historyItems.slice(0, 20);
  renderHistory();
}

function renderHistory() {
  const container = qs('#history');
  if (!historyItems.length) {
    container.classList.add('empty');
    container.textContent = 'Belum ada riwayat.';
    return;
  }
  container.classList.remove('empty');
  container.innerHTML = historyItems.map((h, i) => `
    <div class="history-item" data-idx="${i}">
      <span class="h-status ${statusClass(h.status)}">${h.status}</span>
      <span>${h.type}</span>
      <span class="h-meta">${h.time}</span>
    </div>
  `).join('');
}

qs('#history').addEventListener('click', (e) => {
  const item = e.target.closest('.history-item');
  if (!item) return;
  const h = historyItems[Number(item.dataset.idx)];
  renderResponse(h.result, h.payload, qs('#token').value.trim());
});

async function performSend(payload, opts = {}) {
  const baseUrl = qs('#baseUrl').value.trim() || 'https://rilink.id';
  const token = opts.forceNoToken ? '' : qs('#token').value.trim();

  setResponseLoading();

  let result;
  try {
    const res = await fetch('/api/proxy/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, token, payload }),
    });
    result = await res.json();
  } catch (err) {
    result = { proxyOk: false, proxyError: `Tidak bisa menghubungi proxy lokal: ${err.message}` };
  }

  renderResponse(result, payload, token);
  pushHistory(result, payload);
}

// ---------------------------------------------------------------------------
// GET /api/v1/devices — lets the tester resolve a WhatsApp number to a
// device_id (or just send sender_phone directly) instead of requiring the
// numeric device_id to already be known.
// ---------------------------------------------------------------------------

let fetchedDevices = [];

function toggleSenderModeFields() {
  const mode = senderMode();
  qs('#deviceIdField').style.display = mode === 'device_id' ? '' : 'none';
  qs('#senderPhoneField').style.display = mode === 'sender_phone' ? '' : 'none';
}

qsa('input[name="senderMode"]').forEach((r) => r.addEventListener('change', toggleSenderModeFields));

function renderDeviceSelect() {
  const select = qs('#deviceSelect');
  if (!fetchedDevices.length) {
    select.style.display = 'none';
    select.innerHTML = '';
    return;
  }
  select.style.display = '';
  select.innerHTML = `<option value="">— pilih device terhubung —</option>` + fetchedDevices.map((d, i) => `
    <option value="${i}">${d.name || '(tanpa nama)'} — ${d.sender_phone || '?'} (id: ${d.id}, ${d.status})</option>
  `).join('');
}

qs('#deviceSelect').addEventListener('change', (e) => {
  const idx = e.target.value;
  if (idx === '') return;
  const device = fetchedDevices[Number(idx)];
  if (!device) return;
  if (senderMode() === 'sender_phone') {
    qs('#sender_phone').value = device.sender_phone || '';
  } else {
    qs('#device_id').value = device.id;
  }
});

qs('#loadDevices').addEventListener('click', async () => {
  const baseUrl = qs('#baseUrl').value.trim() || 'https://rilink.id';
  const token = qs('#token').value.trim();
  const statusEl = qs('#deviceListStatus');

  statusEl.textContent = 'Mengambil daftar device...';
  fetchedDevices = [];
  renderDeviceSelect();

  let result;
  try {
    const res = await fetch('/api/proxy/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, token }),
    });
    result = await res.json();
  } catch (err) {
    statusEl.textContent = `Tidak bisa menghubungi proxy lokal: ${err.message}`;
    return;
  }

  if (!result.proxyOk) {
    statusEl.textContent = `Gagal: ${result.proxyError}`;
    return;
  }
  if (result.httpStatus < 200 || result.httpStatus >= 300) {
    statusEl.textContent = `${result.httpStatus} ${result.httpStatusText || ''} — ${JSON.stringify(result.body)}`;
    return;
  }

  fetchedDevices = Array.isArray(result.body?.data) ? result.body.data : [];
  renderDeviceSelect();
  statusEl.textContent = fetchedDevices.length
    ? `${fetchedDevices.length} device terhubung ditemukan. Pilih dari dropdown di atas.`
    : 'Tidak ada device dengan status "connected" untuk token ini.';
});

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

qs('#type').addEventListener('change', (e) => renderDynamicFields(e.target.value));

qs('#loadExample').addEventListener('click', () => populateFromExample(qs('#type').value));

qs('#sendBtn').addEventListener('click', () => performSend(buildPayload()));

qs('#curlBtn').addEventListener('click', () => {
  const payload = buildPayload();
  const baseUrl = qs('#baseUrl').value.trim() || 'https://rilink.id';
  const token = qs('#token').value.trim() || 'YOUR_TOKEN';
  const curl = `curl -X POST ${baseUrl.replace(/\/+$/, '')}/api/v1/messages/send \\
  -H "Authorization: Bearer ${token}" \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;

  const meta = qs('#responseMeta');
  meta.classList.remove('empty');
  meta.innerHTML = '<span class="status-badge status-other">cURL Preview (belum dikirim)</span>';
  qs('#responseBody').textContent = curl;
});

qs('#toggleTokenVisibility').addEventListener('click', () => {
  const input = qs('#token');
  const btn = qs('#toggleTokenVisibility');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? 'Lihat' : 'Sembunyikan';
});

qsa('[data-scenario]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const deviceId = Number(qs('#device_id').value) || 1;
    const to = qs('#to').value.trim() || '6281234567890';
    const name = btn.dataset.scenario;

    if (name === 'no-token') {
      performSend({ device_id: deviceId, to, type: 'text', text: 'Uji tanpa token' }, { forceNoToken: true });
    } else if (name === 'missing-device') {
      performSend({ to, type: 'text', text: 'Uji tanpa device_id/sender_phone' });
    } else if (name === 'invalid-type') {
      performSend({ device_id: deviceId, to, type: 'sticker' });
    } else if (name === 'missing-text') {
      performSend({ device_id: deviceId, to, type: 'text' });
    } else if (name === 'invalid-sender-phone') {
      performSend({ sender_phone: '0000000000', to, type: 'text', text: 'Uji sender_phone tidak terdaftar' });
    } else if (name === 'mismatch') {
      performSend({ device_id: deviceId, sender_phone: '0000000000', to, type: 'text', text: 'Uji device_id vs sender_phone tidak cocok' });
    } else if (name === 'button-no-media') {
      performSend({ device_id: deviceId, to, type: 'button', text: 'Uji button tanpa media_url', buttons: [{ id: 'a', text: 'Opsi A' }] });
    } else if (name === 'list-no-media') {
      performSend({ device_id: deviceId, to, type: 'list', text: 'Uji list tanpa media_url', sections: [{ title: 'Menu', rows: [{ id: 'r1', title: 'Item 1' }] }] });
    }
  });
});

// Initial state
toggleSenderModeFields();
renderDynamicFields('text');
renderHistory();
