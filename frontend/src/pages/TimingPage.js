import ApiClient from '../services/api.client.js';
import uiFeedback from '../services/ui-feedback.service.js';

import {
  getHashContext,
  getModuleContext,
  setModuleContext,
} from '../services/module-context.service.js';

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseNum(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmtMs(ms = 0) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

async function downloadWithAuth(path, filename) {
  const token = localStorage.getItem('takta_token');
  const response = await fetch(`/api${path}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function wsMarkdown(summary) {
  const lines = [
    `# ${summary.study_name || 'Work Sampling'}`,
    '',
    `Observaciones: ${summary.observations || 0}`,
    `Anormales: ${summary.abnormal_observations || 0}`,
    `Confianza: ${summary.confidence_level || 0.95}`,
    '',
    '| Categoria | Conteo | Proporcion | IC Low | IC High |',
    '|---|---:|---:|---:|---:|',
  ];
  for (const row of summary.categories || []) {
    lines.push(`| ${row.category} | ${row.count} | ${row.proportion} | ${row.ci_low} | ${row.ci_high} |`);
  }
  return lines.join('\n');
}

function wsCsv(summary) {
  const lines = ['category,count,proportion,ci_low,ci_high'];
  for (const row of summary.categories || []) {
    lines.push([row.category, row.count, row.proportion, row.ci_low, row.ci_high].join(','));
  }
  return lines.join('\n');
}

function resolveInitialContext() {
  const hash = getHashContext();
  if (hash.asset_id || hash.product_reference_id || hash.process_standard_id) {
    return hash;
  }
  return getModuleContext();
}

async function TimingPage() {
  const root = document.createElement('div');
  root.className = 'p-4 md:p-6 max-w-7xl mx-auto';
  const state = { study: null, context: resolveInitialContext() };

  async function loadStudy(studyId) {
    state.study = await ApiClient.get(`/engineering/studies/${studyId}`);
    if (state.study) {
      state.context = {
        asset_id: state.study.asset_id || null,
        product_reference_id: state.study.product_reference_id || null,
        process_standard_id: state.study.process_standard_id || null,
      };
      setModuleContext(state.context, 'timing');
    }
    return state.study;
  }

  async function renderList() {
    let studies = [];
    try {
      studies = await ApiClient.get('/engineering/studies');
    } catch {
      studies = [];
    }

    const statusClass = {
      draft: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
    };

    root.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Cronómetro</h1>
          <p class="text-sm text-slate-500">Cronometraje y Work Sampling</p>
        </div>
        <button id="tim-new-study" class="tk-btn-primary px-4 py-2 text-sm">+ Nuevo Estudio</button>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-auto">
        <table class="w-full text-sm min-w-[980px]">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left px-3 py-2">Nombre</th>
              <th class="text-left px-3 py-2">Analista</th>
              <th class="text-left px-3 py-2">Tipo</th>
              <th class="text-left px-3 py-2">Activo</th>
              <th class="text-left px-3 py-2">SKU</th>
              <th class="text-left px-3 py-2">Estándar</th>
              <th class="text-center px-3 py-2">Estado</th>
              <th class="text-right px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${!studies.length
      ? '<tr><td colspan="8" class="px-3 py-8 text-center text-slate-400">Sin estudios</td></tr>'
      : studies.map((study) => `
                <tr>
                  <td class="px-3 py-2 font-medium text-slate-800">${esc(study.name)}</td>
                  <td class="px-3 py-2 text-slate-600">${esc(study.analyst_name)}</td>
                  <td class="px-3 py-2"><span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">${esc(study.study_type)}</span></td>
                  <td class="px-3 py-2 text-slate-600">${esc(study.asset_name || '-')}</td>
                  <td class="px-3 py-2 text-slate-600">${esc(study.reference_code || '-')}</td>
                  <td class="px-3 py-2 text-xs font-mono text-slate-500">${esc(study.process_standard_id || '-')}</td>
                  <td class="px-3 py-2 text-center"><span class="px-2 py-0.5 rounded-full text-xs ${statusClass[study.status] || ''}">${esc(study.status)}</span></td>
                  <td class="px-3 py-2 text-right">
                    <button data-open="${study.id}" class="text-xs text-orange-700 hover:text-orange-800 mr-2">${study.status === 'completed' ? 'Resultados' : 'Abrir'}</button>
                    <button data-del="${study.id}" class="tk-btn-danger px-2 py-1 text-xs">Eliminar</button>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
      ${!studies.length ? `
        <div class="mt-4 tk-empty-state p-4">
          <p class="text-sm font-semibold text-slate-700">No hay estudios creados</p>
          <p class="text-xs mt-1">Crea un estudio para iniciar cronometraje o work sampling.</p>
          <button id="tim-empty-create" class="mt-2 tk-btn-primary px-3 py-1.5 text-xs">Crear estudio</button>
        </div>
      ` : ''}
    `;

    root.querySelector('#tim-new-study')?.addEventListener('click', () => void renderSetup());
    root.querySelector('#tim-empty-create')?.addEventListener('click', () => void renderSetup());
    root.querySelectorAll('[data-open]').forEach((button) => {
      button.addEventListener('click', async () => {
        const study = await loadStudy(button.dataset.open);
        if (study.study_type === 'work_sampling') {
          await renderSamplingCapture();
        } else if (study.status === 'completed') {
          await renderTimingResults(study.id);
        } else {
          await renderTimingCapture();
        }
      });
    });
    root.querySelectorAll('[data-del]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('Deseas eliminar este estudio?')) return;
        try {
          await ApiClient.delete(`/engineering/studies/${button.dataset.del}`);
          uiFeedback.success('Estudio eliminado.');
          await renderList();
        } catch (error) {
          uiFeedback.error(`No se pudo eliminar estudio: ${error.message}`);
        }
      });
    });
  }

  async function renderSetup() {
    const [assets, references, standards] = await Promise.all([
      ApiClient.get('/assets').catch(() => []),
      ApiClient.get('/engineering/references').catch(() => []),
      ApiClient.get('/engineering/standards').catch(() => []),
    ]);

    root.innerHTML = `
      <div class="flex items-center gap-3 mb-4">
        <button id="tim-back-list" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500">←</button>
        <h1 class="text-xl font-bold text-slate-900">Nuevo Estudio</h1>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input id="tim-name" placeholder="Nombre" class="tk-input px-3 py-2 text-sm">
          <input id="tim-analyst" placeholder="Analista" class="tk-input px-3 py-2 text-sm">
          <select id="tim-type" class="tk-select px-3 py-2 text-sm"><option value="continuous">Continuo</option><option value="snap_back">Vuelta a cero</option><option value="work_sampling">Work Sampling</option></select>
          <select id="tim-asset" class="tk-select px-3 py-2 text-sm"><option value="">Activo (opcional)</option>${assets.map((a) => `<option value="${a.id}" ${(state.context.asset_id || '') === a.id ? 'selected' : ''}>${esc(a.name)} (${esc(a.type)})</option>`).join('')}</select>
          <select id="tim-reference" class="tk-select px-3 py-2 text-sm"><option value="">SKU (opcional)</option>${references.map((r) => `<option value="${r.id}" ${(state.context.product_reference_id || '') === r.id ? 'selected' : ''}>${esc(r.code)} - ${esc(r.description)}</option>`).join('')}</select>
          <select id="tim-standard" class="tk-select px-3 py-2 text-sm"><option value="">Proceso estándar (opcional)</option>${standards.map((s) => `<option value="${s.id}" data-asset="${s.asset_id}" data-reference="${s.product_reference_id || ''}" ${(state.context.process_standard_id || '') === s.id ? 'selected' : ''}>${esc(s.asset_name || '')} · ${esc(s.activity_name || '')}</option>`).join('')}</select>
        </div>
        <div id="tim-factors" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input id="tim-rating" type="number" step="0.05" value="1.0" class="tk-input px-3 py-2 text-sm" placeholder="Rating">
          <input id="tim-supp" type="number" step="0.01" value="0.15" class="tk-input px-3 py-2 text-sm" placeholder="Suplementos">
        </div>
        <div id="tim-sampling" class="hidden grid grid-cols-1 md:grid-cols-3 gap-3">
          <select id="tim-confidence" class="tk-select px-3 py-2 text-sm"><option value="0.9">90%</option><option value="0.95" selected>95%</option><option value="0.99">99%</option></select>
          <input id="tim-interval" type="number" min="1" class="tk-input px-3 py-2 text-sm" placeholder="Intervalo seg">
          <input id="tim-population" type="number" min="1" class="tk-input px-3 py-2 text-sm" placeholder="Poblacion esperada">
        </div>
        <div id="tim-elements" class="space-y-2">
          <div class="flex items-center justify-between"><p class="text-sm font-semibold text-slate-700">Elementos</p><button id="tim-add-element" class="text-xs text-orange-700 font-semibold">+ Agregar</button></div>
          <div id="tim-elements-body" class="space-y-2"></div>
        </div>
        <div class="flex justify-end"><button id="tim-create" class="px-4 py-2 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600">Crear</button></div>
      </div>
    `;
    const elementBody = root.querySelector('#tim-elements-body');
    let order = 0;
    const addElement = (name = '', type = 'operation', cyclic = true) => {
      order += 1;
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 bg-slate-50 rounded p-2';
      row.dataset.order = String(order);
      row.innerHTML = `
        <span class="text-xs text-slate-400 w-7">#${order}</span>
        <input class="tim-element-name flex-1 px-2 py-1 rounded border border-slate-200 text-xs" value="${esc(name)}" placeholder="Elemento">
        <select class="tim-element-type px-2 py-1 rounded border border-slate-200 text-xs">
          <option value="operation" ${type === 'operation' ? 'selected' : ''}>operation</option>
          <option value="transport" ${type === 'transport' ? 'selected' : ''}>transport</option>
          <option value="inspection" ${type === 'inspection' ? 'selected' : ''}>inspection</option>
          <option value="delay" ${type === 'delay' ? 'selected' : ''}>delay</option>
          <option value="storage" ${type === 'storage' ? 'selected' : ''}>storage</option>
        </select>
        <label class="text-xs text-slate-500"><input class="tim-element-cyclic" type="checkbox" ${cyclic ? 'checked' : ''}> ciclico</label>
        <button class="tim-element-del text-red-700">×</button>
      `;
      row.querySelector('.tim-element-del')?.addEventListener('click', () => row.remove());
      elementBody?.appendChild(row);
    };
    addElement('Carga MP', 'operation', true);
    addElement('Proceso', 'operation', true);
    addElement('Descarga', 'operation', true);

    const typeSelect = root.querySelector('#tim-type');
    const syncType = () => {
      const isSampling = typeSelect?.value === 'work_sampling';
      root.querySelector('#tim-factors')?.classList.toggle('hidden', isSampling);
      root.querySelector('#tim-elements')?.classList.toggle('hidden', isSampling);
      root.querySelector('#tim-sampling')?.classList.toggle('hidden', !isSampling);
    };
    typeSelect?.addEventListener('change', syncType);
    syncType();

    root.querySelector('#tim-standard')?.addEventListener('change', () => {
      const selected = root.querySelector('#tim-standard')?.selectedOptions?.[0];
      if (!selected?.value) return;
      root.querySelector('#tim-asset').value = selected.dataset.asset || '';
      root.querySelector('#tim-reference').value = selected.dataset.reference || '';
      state.context = {
        asset_id: selected.dataset.asset || null,
        product_reference_id: selected.dataset.reference || null,
        process_standard_id: selected.value || null,
      };
      setModuleContext(state.context, 'timing');
    });
    root.querySelector('#tim-asset')?.addEventListener('change', (event) => {
      state.context = {
        ...state.context,
        asset_id: event.target.value || null,
      };
      setModuleContext(state.context, 'timing');
    });
    root.querySelector('#tim-reference')?.addEventListener('change', (event) => {
      state.context = {
        ...state.context,
        product_reference_id: event.target.value || null,
      };
      setModuleContext(state.context, 'timing');
    });
    root.querySelector('#tim-add-element')?.addEventListener('click', () => addElement());
    root.querySelector('#tim-back-list')?.addEventListener('click', () => void renderList());

    root.querySelector('#tim-create')?.addEventListener('click', async () => {
      const studyType = root.querySelector('#tim-type')?.value || 'continuous';
      const payload = {
        name: root.querySelector('#tim-name')?.value?.trim(),
        analyst_name: root.querySelector('#tim-analyst')?.value?.trim(),
        study_type: studyType,
        process_standard_id: root.querySelector('#tim-standard')?.value || null,
        asset_id: root.querySelector('#tim-asset')?.value || null,
        product_reference_id: root.querySelector('#tim-reference')?.value || null,
        rating_factor: parseNum(root.querySelector('#tim-rating')?.value) ?? 1.0,
        supplements_pct: parseNum(root.querySelector('#tim-supp')?.value) ?? 0.0,
        confidence_level: parseNum(root.querySelector('#tim-confidence')?.value) ?? 0.95,
        sampling_interval_seconds: parseNum(root.querySelector('#tim-interval')?.value),
        sampling_population_size: parseNum(root.querySelector('#tim-population')?.value),
        elements: [],
      };
      if (!payload.name || !payload.analyst_name) {
        uiFeedback.warning('Nombre y analista son obligatorios.');
        return;
      }
      if (studyType === 'work_sampling') {
        payload.elements = [{ name: 'Observacion', type: 'inspection', is_cyclic: true, order: 1 }];
      } else {
        let itemOrder = 1;
        const rows = Array.from(root.querySelectorAll('#tim-elements-body [data-order]'));
        for (const row of rows) {
          const name = row.querySelector('.tim-element-name')?.value?.trim();
          if (!name) continue;
          payload.elements.push({
            name,
            type: row.querySelector('.tim-element-type')?.value || 'operation',
            is_cyclic: row.querySelector('.tim-element-cyclic')?.checked ?? true,
            order: itemOrder++,
          });
        }
        if (!payload.elements.length) {
          uiFeedback.warning('Agrega al menos un elemento.');
          return;
        }
      }
      const created = await ApiClient.post('/engineering/studies', payload);
      state.context = {
        asset_id: payload.asset_id || null,
        product_reference_id: payload.product_reference_id || null,
        process_standard_id: payload.process_standard_id || null,
      };
      setModuleContext(state.context, 'timing');
      const study = await loadStudy(created.id);
      if (study.study_type === 'work_sampling') await renderSamplingCapture();
      else await renderTimingCapture();
    });
  }

  async function ensureSession(study) {
    const open = (study.sessions || []).find((session) => !session.ended_at);
    if (open) return open.id;
    const created = await ApiClient.post(`/engineering/studies/${study.id}/sessions`, {});
    await loadStudy(study.id);
    return created.session_id;
  }

  async function renderTimingCapture() {
    const study = state.study;
    if (!study) return renderList();
    const sessionId = await ensureSession(study);
    const elements = study.elements || [];
    const byId = Object.fromEntries(elements.map((row) => [row.id, row.name]));
    const laps = (study.sessions || []).flatMap((session) => session.laps || []);
    let cycle = laps.length ? Math.max(...laps.map((row) => row.cycle_number || 1)) + 1 : 1;
    let idx = 0;
    let running = false;
    let start = 0;
    let elapsed = 0;
    let raf = null;

    root.innerHTML = `
      <div class="flex items-center gap-3 mb-4"><button id="tim-back-list-capture" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500">←</button><h1 class="text-xl font-bold text-slate-900">${esc(study.name)}</h1></div>
      <div class="bg-slate-900 rounded-xl p-6 text-center text-white mb-4">
        <p id="tim-display" class="text-5xl font-mono">00:00.000</p>
        <p class="text-sm text-slate-300 mt-2">Sesion ${esc(sessionId)} · Ciclo <span id="tim-cycle">${cycle}</span> · Elemento <span id="tim-element" class="text-orange-400">${esc(elements[0]?.name || '-')}</span></p>
        <div class="mt-4 flex justify-center gap-3"><button id="tim-start" class="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600">▶</button><button id="tim-lap" class="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40" disabled>LAP</button><button id="tim-stop" class="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-40" disabled>⏹</button></div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between"><p class="text-sm font-semibold text-slate-700">Laps</p><button id="tim-go-results" class="text-xs text-orange-700 font-semibold">Ver resultados</button></div>
        <div class="max-h-72 overflow-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 text-slate-600 sticky top-0"><tr><th class="text-left px-3 py-2">Ciclo</th><th class="text-left px-3 py-2">Elemento</th><th class="text-right px-3 py-2">Split</th><th class="text-center px-3 py-2">Und</th></tr></thead>
            <tbody id="tim-laps-body" class="divide-y divide-slate-100">${laps.length ? [...laps].reverse().map((row) => `<tr><td class=\"px-3 py-2\">${row.cycle_number}</td><td class=\"px-3 py-2\">${esc(byId[row.element_id] || '-')}</td><td class=\"px-3 py-2 text-right font-mono\">${Math.round(row.split_time_ms).toLocaleString()}</td><td class=\"px-3 py-2 text-center\">${row.units_count || 1}</td></tr>`).join('') : '<tr><td colspan=\"4\" class=\"px-3 py-6 text-center text-slate-400\">Sin laps</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;

    const display = root.querySelector('#tim-display');
    const updateElement = () => { root.querySelector('#tim-element').textContent = elements[idx]?.name || '-'; };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      root.querySelector('#tim-start').disabled = false;
      root.querySelector('#tim-lap').disabled = true;
      root.querySelector('#tim-stop').disabled = true;
    };
    const tick = () => {
      if (!running) return;
      elapsed = performance.now() - start;
      display.textContent = fmtMs(elapsed);
      raf = requestAnimationFrame(tick);
    };
    root.querySelector('#tim-start')?.addEventListener('click', () => {
      if (running) return;
      running = true;
      start = performance.now() - elapsed;
      root.querySelector('#tim-start').disabled = true;
      root.querySelector('#tim-lap').disabled = false;
      root.querySelector('#tim-stop').disabled = false;
      tick();
    });
    root.querySelector('#tim-stop')?.addEventListener('click', stop);
    root.querySelector('#tim-lap')?.addEventListener('click', async () => {
      const element = elements[idx];
      if (!running || !element) return;
      const split = Math.round(elapsed);
      await ApiClient.post(`/engineering/studies/${study.id}/laps`, {
        element_id: element.id,
        cycle_number: cycle,
        split_time_ms: split,
        units_count: 1,
      });
      const row = document.createElement('tr');
      row.innerHTML = `<td class="px-3 py-2">${cycle}</td><td class="px-3 py-2">${esc(element.name)}</td><td class="px-3 py-2 text-right font-mono">${split.toLocaleString()}</td><td class="px-3 py-2 text-center">1</td>`;
      root.querySelector('#tim-laps-body')?.prepend(row);
      idx += 1;
      if (idx >= elements.length) {
        idx = 0;
        cycle += 1;
        root.querySelector('#tim-cycle').textContent = String(cycle);
      }
      elapsed = 0;
      start = performance.now();
      display.textContent = '00:00.000';
      updateElement();
    });
    root.querySelector('#tim-back-list-capture')?.addEventListener('click', async () => {
      stop();
      await renderList();
    });
    root.querySelector('#tim-go-results')?.addEventListener('click', async () => {
      stop();
      await loadStudy(study.id);
      await renderTimingResults(study.id);
    });
  }

  async function renderSamplingCapture() {
    const study = state.study;
    if (!study) return renderList();
    const observations = await ApiClient.get(`/engineering/studies/${study.id}/work-samples`).catch(() => []);
    root.innerHTML = `
      <div class="flex items-center gap-3 mb-4"><button id="ws-back-list" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500">←</button><h1 class="text-xl font-bold text-slate-900">${esc(study.name)} · Work Sampling</h1></div>
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <form id="ws-form" class="space-y-2">
            <select id="ws-category" class="w-full px-3 py-2 rounded border border-slate-200 text-sm"><option value="productive">Productivo</option><option value="non_productive">No productivo</option><option value="waiting">Espera</option><option value="setup">Setup</option><option value="quality">Calidad</option></select>
            <input id="ws-duration" type="number" min="0" step="0.1" class="w-full px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Duracion seg (opcional)">
            <label class="text-xs text-slate-600"><input id="ws-abnormal" type="checkbox"> Observacion anormal</label>
            <textarea id="ws-notes" rows="3" class="w-full px-3 py-2 rounded border border-slate-200 text-sm" placeholder="Notas"></textarea>
            <button class="w-full px-3 py-2 rounded bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600">Guardar observacion</button>
          </form>
          <button id="ws-go-results" class="w-full mt-2 px-3 py-2 rounded border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100">Ver resultados</button>
        </div>
        <div class="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-3 py-2">Fecha</th><th class="text-left px-3 py-2">Categoria</th><th class="text-right px-3 py-2">Duracion</th><th class="text-center px-3 py-2">Anormal</th><th class="text-left px-3 py-2">Notas</th></tr></thead>
            <tbody class="divide-y divide-slate-100">${!observations.length ? '<tr><td colspan="5" class="px-3 py-8 text-center text-slate-400">Sin observaciones</td></tr>' : observations.map((row) => `<tr class=\"${row.is_abnormal ? 'bg-red-50/40' : ''}\"><td class=\"px-3 py-2 text-xs text-slate-500\">${new Date(row.observed_at).toLocaleString('es-CO')}</td><td class=\"px-3 py-2\">${esc(row.category)}</td><td class=\"px-3 py-2 text-right\">${row.duration_seconds ?? '-'}</td><td class=\"px-3 py-2 text-center\">${row.is_abnormal ? 'Si' : 'No'}</td><td class=\"px-3 py-2\">${esc(row.notes || '-')}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
    root.querySelector('#ws-back-list')?.addEventListener('click', () => void renderList());
    root.querySelector('#ws-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await ApiClient.post(`/engineering/studies/${study.id}/work-samples`, {
        category: root.querySelector('#ws-category')?.value || 'productive',
        duration_seconds: parseNum(root.querySelector('#ws-duration')?.value),
        is_abnormal: !!root.querySelector('#ws-abnormal')?.checked,
        notes: root.querySelector('#ws-notes')?.value?.trim() || null,
      });
      await loadStudy(study.id);
      await renderSamplingCapture();
    });
    root.querySelector('#ws-go-results')?.addEventListener('click', async () => {
      await renderSamplingResults(study.id);
    });
  }

  async function renderTimingResults(studyId) {
    const study = state.study?.id === studyId ? state.study : await loadStudy(studyId);
    const [results, laps] = await Promise.all([
      ApiClient.get(`/engineering/studies/${studyId}/results`),
      ApiClient.get(`/engineering/studies/${studyId}/laps`),
    ]);

    root.innerHTML = `
      <div class="flex items-center gap-3 mb-4"><button id="tim-res-back-list" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500">←</button><h1 class="text-xl font-bold text-slate-900">${esc(results.study_name)}</h1></div>
      <div class="flex flex-wrap gap-2 mb-3">
        <button id="tim-export-md" class="px-3 py-1.5 rounded border border-slate-200 text-xs hover:bg-slate-50">Reporte MD</button>
        <button id="tim-export-csv" class="px-3 py-1.5 rounded border border-slate-200 text-xs hover:bg-slate-50">Reporte CSV</button>
        <button id="tim-export-pdf" class="px-3 py-1.5 rounded border border-slate-200 text-xs hover:bg-slate-50">Reporte PDF</button>
        ${study?.process_standard_id ? '<button id="tim-apply-standard" class="px-3 py-1.5 rounded bg-brand-orange text-white text-xs font-semibold hover:bg-orange-600">Aplicar al estándar</button>' : ''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"><div class="rounded-lg bg-blue-600 text-white p-3"><p class="text-xs text-blue-100">TN</p><p class="text-2xl font-bold">${(results.total_normal_time_ms / 1000).toFixed(2)}s</p></div><div class="rounded-lg bg-orange-600 text-white p-3"><p class="text-xs text-orange-100">TE</p><p class="text-2xl font-bold">${(results.total_standard_time_ms / 1000).toFixed(2)}s</p></div><div class="rounded-lg bg-green-600 text-white p-3"><p class="text-xs text-green-100">UPH</p><p class="text-2xl font-bold">${results.uph}</p></div></div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-auto mb-4"><table class="w-full text-xs min-w-[880px]"><thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-3 py-2">#</th><th class="text-left px-3 py-2">Elemento</th><th class="text-right px-3 py-2">Obs</th><th class="text-right px-3 py-2">Prom</th><th class="text-right px-3 py-2">TN</th><th class="text-right px-3 py-2">TE</th><th class="text-center px-3 py-2">Outliers</th></tr></thead><tbody class="divide-y divide-slate-100">${(results.elements || []).map((row) => `<tr><td class=\"px-3 py-2\">${row.order}</td><td class=\"px-3 py-2\">${esc(row.element_name)}</td><td class=\"px-3 py-2 text-right\">${row.observations}</td><td class=\"px-3 py-2 text-right\">${Number(row.avg_time_ms || 0).toLocaleString()}</td><td class=\"px-3 py-2 text-right\">${Number(row.normal_time_ms || 0).toLocaleString()}</td><td class=\"px-3 py-2 text-right\">${Number(row.standard_time_ms || 0).toLocaleString()}</td><td class=\"px-3 py-2 text-center\">${row.auto_outliers || '-'}</td></tr>`).join('')}</tbody></table></div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-auto"><table class="w-full text-xs min-w-[860px]"><thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-3 py-2">Ciclo</th><th class="text-left px-3 py-2">Elemento</th><th class="text-right px-3 py-2">Split</th><th class="text-center px-3 py-2">Und</th><th class="text-center px-3 py-2">Anormal</th><th class="text-left px-3 py-2">Notas</th><th class="text-right px-3 py-2">Guardar</th></tr></thead><tbody class="divide-y divide-slate-100">${!laps.length ? '<tr><td colspan="7" class="px-3 py-8 text-center text-slate-400">Sin laps</td></tr>' : laps.map((lap) => `<tr class=\"${lap.is_abnormal ? 'bg-red-50/40' : ''}\"><td class=\"px-3 py-2\">${lap.cycle_number}</td><td class=\"px-3 py-2\">${esc(lap.element_name || '-')}</td><td class=\"px-3 py-2 text-right\">${Math.round(lap.split_time_ms).toLocaleString()}</td><td class=\"px-3 py-2 text-center\"><input data-lap-units=\"${lap.id}\" type=\"number\" min=\"1\" value=\"${lap.units_count || 1}\" class=\"w-14 px-1 py-0.5 rounded border border-slate-200 text-xs text-center\"></td><td class=\"px-3 py-2 text-center\"><input data-lap-abn=\"${lap.id}\" type=\"checkbox\" ${lap.is_abnormal ? 'checked' : ''}></td><td class=\"px-3 py-2\"><input data-lap-notes=\"${lap.id}\" value=\"${esc(lap.notes || '')}\" class=\"w-full px-2 py-1 rounded border border-slate-200 text-xs\"></td><td class=\"px-3 py-2 text-right\"><button data-lap-save=\"${lap.id}\" class=\"text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50\">Guardar</button></td></tr>`).join('')}</tbody></table></div>
    `;
    root.querySelector('#tim-res-back-list')?.addEventListener('click', () => void renderList());
    root.querySelector('#tim-export-md')?.addEventListener('click', async () => {
      const report = await ApiClient.get(`/engineering/studies/${studyId}/report?output_format=markdown`);
      downloadText(`takta_study_${studyId}.md`, report.content || '', 'text/markdown;charset=utf-8');
    });
    root.querySelector('#tim-export-csv')?.addEventListener('click', async () => {
      await downloadWithAuth(`/engineering/studies/${studyId}/report?output_format=csv`, `takta_study_${studyId}.csv`);
    });
    root.querySelector('#tim-export-pdf')?.addEventListener('click', async () => {
      await downloadWithAuth(`/engineering/studies/${studyId}/report?output_format=pdf`, `takta_study_${studyId}.pdf`);
    });
    root.querySelector('#tim-apply-standard')?.addEventListener('click', async () => {
      const payload = await ApiClient.post(`/engineering/studies/${studyId}/apply-to-standard`, {});
      uiFeedback.success(`Aplicado. Nuevo tiempo (min): ${payload.standard_time_minutes}`);
    });
    root.querySelectorAll('[data-lap-save]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.lapSave;
        await ApiClient.patch(`/engineering/studies/${studyId}/laps/${id}`, {
          is_abnormal: !!root.querySelector(`[data-lap-abn="${id}"]`)?.checked,
          notes: root.querySelector(`[data-lap-notes="${id}"]`)?.value?.trim() || null,
          units_count: parseNum(root.querySelector(`[data-lap-units="${id}"]`)?.value) ?? 1,
        });
        button.classList.add('bg-green-50', 'border-green-200', 'text-green-700');
        setTimeout(() => button.classList.remove('bg-green-50', 'border-green-200', 'text-green-700'), 900);
      });
    });
  }

  async function renderSamplingResults(studyId) {
    const [summary, observations] = await Promise.all([
      ApiClient.get(`/engineering/studies/${studyId}/work-sampling/results`),
      ApiClient.get(`/engineering/studies/${studyId}/work-samples`),
    ]);
    root.innerHTML = `
      <div class="flex items-center gap-3 mb-4"><button id="ws-res-back-capture" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500">←</button><h1 class="text-xl font-bold text-slate-900">Resultados Work Sampling</h1></div>
      <div class="flex gap-2 mb-3"><button id="ws-export-md" class="px-3 py-1.5 rounded border border-slate-200 text-xs hover:bg-slate-50">Exportar MD</button><button id="ws-export-csv" class="px-3 py-1.5 rounded border border-slate-200 text-xs hover:bg-slate-50">Exportar CSV</button><button id="ws-res-back-list" class="px-3 py-1.5 rounded border border-slate-200 text-xs hover:bg-slate-50">Volver al listado</button></div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"><div class="rounded-lg bg-slate-900 text-white p-3"><p class="text-xs text-slate-300">Observaciones</p><p class="text-2xl font-bold">${summary.observations || 0}</p></div><div class="rounded-lg bg-red-600 text-white p-3"><p class="text-xs text-red-100">Anormales</p><p class="text-2xl font-bold">${summary.abnormal_observations || 0}</p></div><div class="rounded-lg bg-blue-600 text-white p-3"><p class="text-xs text-blue-100">Categorias</p><p class="text-2xl font-bold">${(summary.categories || []).length}</p></div></div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-auto mb-4"><table class="w-full text-sm"><thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-3 py-2">Categoria</th><th class="text-right px-3 py-2">Conteo</th><th class="text-right px-3 py-2">Proporcion</th><th class="text-right px-3 py-2">IC Low</th><th class="text-right px-3 py-2">IC High</th></tr></thead><tbody class="divide-y divide-slate-100">${!(summary.categories || []).length ? '<tr><td colspan="5" class="px-3 py-8 text-center text-slate-400">Sin datos</td></tr>' : (summary.categories || []).map((row) => `<tr><td class=\"px-3 py-2\">${esc(row.category)}</td><td class=\"px-3 py-2 text-right\">${row.count}</td><td class=\"px-3 py-2 text-right\">${(Number(row.proportion) * 100).toFixed(2)}%</td><td class=\"px-3 py-2 text-right\">${(Number(row.ci_low) * 100).toFixed(2)}%</td><td class=\"px-3 py-2 text-right\">${(Number(row.ci_high) * 100).toFixed(2)}%</td></tr>`).join('')}</tbody></table></div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-auto"><table class="w-full text-xs"><thead class="bg-slate-50 text-slate-600"><tr><th class="text-left px-3 py-2">Fecha</th><th class="text-left px-3 py-2">Categoria</th><th class="text-right px-3 py-2">Duracion</th><th class="text-center px-3 py-2">Anormal</th><th class="text-left px-3 py-2">Notas</th></tr></thead><tbody class="divide-y divide-slate-100">${!observations.length ? '<tr><td colspan="5" class="px-3 py-8 text-center text-slate-400">Sin observaciones</td></tr>' : observations.map((row) => `<tr class=\"${row.is_abnormal ? 'bg-red-50/40' : ''}\"><td class=\"px-3 py-2 text-slate-500\">${new Date(row.observed_at).toLocaleString('es-CO')}</td><td class=\"px-3 py-2\">${esc(row.category)}</td><td class=\"px-3 py-2 text-right\">${row.duration_seconds ?? '-'}</td><td class=\"px-3 py-2 text-center\">${row.is_abnormal ? 'Si' : 'No'}</td><td class=\"px-3 py-2\">${esc(row.notes || '-')}</td></tr>`).join('')}</tbody></table></div>
    `;
    root.querySelector('#ws-res-back-capture')?.addEventListener('click', async () => { await loadStudy(studyId); await renderSamplingCapture(); });
    root.querySelector('#ws-res-back-list')?.addEventListener('click', () => void renderList());
    root.querySelector('#ws-export-md')?.addEventListener('click', () => downloadText(`takta_work_sampling_${studyId}.md`, wsMarkdown(summary), 'text/markdown;charset=utf-8'));
    root.querySelector('#ws-export-csv')?.addEventListener('click', () => downloadText(`takta_work_sampling_${studyId}.csv`, wsCsv(summary), 'text/csv;charset=utf-8'));
  }

  await renderList();
  return root;
}

export default TimingPage;
