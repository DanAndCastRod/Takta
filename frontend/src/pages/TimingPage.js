/**
 * TimingPage — Sprint 6: Cronómetro Digital Preconfigurable
 * Three-phase page: Setup → Capture (Stopwatch) → Results
 */
import ApiClient from '../services/api.client.js';

async function TimingPage() {
    const container = document.createElement('div');
    container.className = 'p-6 max-w-7xl mx-auto';

    // State
    let currentStudy = null;
    let currentPhase = 'list'; // list | setup | capture | results

    await renderList();

    async function renderList() {
        currentPhase = 'list';
        let studies = [];
        try { studies = await ApiClient.get('/engineering/studies/'); } catch (e) { /* empty */ }

        const STATUS_BADGE = {
            draft: 'bg-slate-100 text-slate-600',
            in_progress: 'bg-amber-100 text-amber-700',
            completed: 'bg-green-100 text-green-700',
        };

        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-slate-900">Cronómetro Digital</h1>
                    <p class="text-slate-500 text-sm mt-1">Estudios de Tiempos — Metodología Nievel</p>
                </div>
                <button id="btn-new-study" class="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition-all cursor-pointer">
                    + Nuevo Estudio
                </button>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table class="w-full text-sm">
                    <thead class="bg-slate-50 text-slate-600">
                        <tr>
                            <th class="text-left px-4 py-3 font-medium">Nombre</th>
                            <th class="text-left px-4 py-3 font-medium">Analista</th>
                            <th class="text-left px-4 py-3 font-medium">Tipo</th>
                            <th class="text-center px-4 py-3 font-medium">Estado</th>
                            <th class="text-center px-4 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${studies.length === 0
                ? '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">No hay estudios de tiempo</td></tr>'
                : studies.map(s => `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-4 py-3 text-slate-800 font-medium">${s.name}</td>
                                <td class="px-4 py-3 text-slate-600">${s.analyst_name}</td>
                                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">${s.study_type}</span></td>
                                <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[s.status] || ''}">${s.status}</span></td>
                                <td class="px-4 py-3 text-center">
                                    <button data-study-id="${s.id}" data-action="open" class="study-action text-orange-500 hover:text-orange-700 text-xs font-medium cursor-pointer mr-2">
                                        ${s.status === 'draft' ? '▶ Iniciar' : s.status === 'in_progress' ? '⏱ Continuar' : '📊 Resultados'}
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelector('#btn-new-study')?.addEventListener('click', () => renderSetup());

        container.querySelectorAll('.study-action').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.studyId;
                try {
                    const study = await ApiClient.get(`/engineering/studies/${id}`);
                    currentStudy = study;
                    if (study.status === 'completed') {
                        await renderResults(id);
                    } else {
                        await renderCapture();
                    }
                } catch (e) { alert('Error: ' + e.message); }
            });
        });
    }


    // ── SETUP PHASE ────────────────────────────────
    async function renderSetup() {
        currentPhase = 'setup';
        container.innerHTML = `
            <div class="flex items-center gap-3 mb-6">
                <button id="btn-back-list" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div>
                    <h1 class="text-2xl font-bold text-slate-900">Nuevo Estudio de Tiempos</h1>
                    <p class="text-slate-500 text-sm mt-1">Configure los elementos del ciclo de trabajo</p>
                </div>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <!-- Study Info -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Nombre del Estudio</label>
                        <input id="setup-name" type="text" placeholder="Estudio Línea Sellado" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Analista</label>
                        <input id="setup-analyst" type="text" placeholder="Ing. Pérez" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Estudio</label>
                        <select id="setup-type" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40">
                            <option value="continuous">Continuo (Cronometraje)</option>
                            <option value="snap_back">Vuelta a Cero</option>
                        </select>
                    </div>
                </div>

                <!-- Factors -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Factor de Actuación (Rating)</label>
                        <input id="setup-rating" type="number" step="0.05" value="1.0" min="0.5" max="1.5" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" />
                        <p class="text-xs text-slate-400 mt-1">Normal = 1.0 · Rápido > 1.0 · Lento < 1.0</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Suplementos (%)</label>
                        <input id="setup-supplements" type="number" step="0.01" value="0.15" min="0" max="1" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" />
                        <p class="text-xs text-slate-400 mt-1">Fatiga + Necesidades personales (típico 0.10 – 0.20)</p>
                    </div>
                </div>

                <!-- Elements -->
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-sm font-semibold text-slate-700">Elementos del Ciclo</h3>
                        <button id="btn-add-element" class="text-orange-500 text-sm font-medium hover:text-orange-600 cursor-pointer">
                            + Agregar Elemento
                        </button>
                    </div>
                    <div id="elements-list" class="space-y-2"></div>
                </div>

                <div class="flex justify-end pt-4 border-t border-slate-100">
                    <button id="btn-create-study" class="bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 shadow-sm transition-all cursor-pointer">
                        Crear Estudio y Cronometrar
                    </button>
                </div>
            </div>
        `;

        const ELEMENT_TYPES = ['operation', 'transport', 'inspection', 'delay', 'storage'];
        let elemCount = 0;
        const elementsList = container.querySelector('#elements-list');

        function addElement(name = '', type = 'operation') {
            elemCount++;
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 bg-slate-50 rounded-lg';
            div.dataset.order = elemCount;
            div.innerHTML = `
                <span class="text-xs text-slate-400 font-mono w-6">#${elemCount}</span>
                <input type="text" value="${name}" placeholder="Nombre del elemento" class="elem-name flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40" />
                <select class="elem-type px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none">
                    ${ELEMENT_TYPES.map(t => `<option value="${t}" ${t === type ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
                <label class="flex items-center gap-1 text-xs text-slate-500">
                    <input type="checkbox" class="elem-cyclic rounded" checked /> Cíclico
                </label>
                <button class="elem-remove text-red-400 hover:text-red-600 cursor-pointer text-lg leading-none">×</button>
            `;
            div.querySelector('.elem-remove')?.addEventListener('click', () => { div.remove(); });
            elementsList?.appendChild(div);
        }

        // Add 3 default elements
        addElement('Carga MP', 'operation');
        addElement('Proceso', 'operation');
        addElement('Descarga', 'operation');

        container.querySelector('#btn-add-element')?.addEventListener('click', () => addElement());
        container.querySelector('#btn-back-list')?.addEventListener('click', () => renderList());

        container.querySelector('#btn-create-study')?.addEventListener('click', async () => {
            const name = container.querySelector('#setup-name')?.value?.trim();
            const analyst = container.querySelector('#setup-analyst')?.value?.trim();
            if (!name || !analyst) { alert('Nombre y Analista son requeridos'); return; }

            const elemDivs = elementsList?.querySelectorAll('[data-order]') || [];
            const elements = [];
            let order = 1;
            elemDivs.forEach(div => {
                const eName = div.querySelector('.elem-name')?.value?.trim();
                if (!eName) return;
                elements.push({
                    name: eName,
                    type: div.querySelector('.elem-type')?.value || 'operation',
                    is_cyclic: div.querySelector('.elem-cyclic')?.checked ?? true,
                    order: order++,
                });
            });

            if (elements.length === 0) { alert('Agregue al menos un elemento'); return; }

            try {
                const result = await ApiClient.post('/engineering/studies/', {
                    name,
                    analyst_name: analyst,
                    study_type: container.querySelector('#setup-type')?.value || 'continuous',
                    rating_factor: parseFloat(container.querySelector('#setup-rating')?.value) || 1.0,
                    supplements_pct: parseFloat(container.querySelector('#setup-supplements')?.value) || 0.0,
                    elements,
                });

                // Load full study and go to capture
                currentStudy = await ApiClient.get(`/engineering/studies/${result.id}`);
                await renderCapture();
            } catch (e) { alert('Error: ' + e.message); }
        });
    }


    // ── CAPTURE PHASE (STOPWATCH) ──────────────────
    async function renderCapture() {
        currentPhase = 'capture';

        if (!currentStudy) { renderList(); return; }

        // Start a session if needed
        let sessionId = null;
        const activeSessions = (currentStudy.sessions || []).filter(s => !s.ended_at);
        if (activeSessions.length > 0) {
            sessionId = activeSessions[0].id;
        } else {
            try {
                const sessResp = await ApiClient.post(`/engineering/studies/${currentStudy.id}/sessions`);
                sessionId = sessResp.session_id;
                // Reload study
                currentStudy = await ApiClient.get(`/engineering/studies/${currentStudy.id}`);
            } catch (e) { alert('Error starting session: ' + e.message); return; }
        }

        const elements = currentStudy.elements || [];
        let currentElementIdx = 0;
        let currentCycle = 1;
        let timerRunning = false;
        let startTime = 0;
        let elapsedMs = 0;
        let animFrame = null;
        let lapsRecorded = [];

        // Count existing laps to determine current cycle
        const existingLaps = currentStudy.sessions?.flatMap(s => s.laps || []) || [];
        if (existingLaps.length > 0) {
            currentCycle = Math.max(...existingLaps.map(l => l.cycle_number)) + 1;
            lapsRecorded = existingLaps;
        }

        container.innerHTML = `
            <div class="flex items-center gap-3 mb-6">
                <button id="btn-back-list2" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">${currentStudy.name}</h1>
                    <p class="text-slate-500 text-xs mt-0.5">${currentStudy.analyst_name} · Ciclo <span id="cycle-num">${currentCycle}</span></p>
                </div>
            </div>

            <!-- Stopwatch Display -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-6 shadow-xl text-center">
                <div id="timer-display" class="font-mono text-6xl text-white tracking-wider mb-4">00:00.000</div>
                <div class="flex items-center justify-center gap-2 mb-6">
                    <span class="text-slate-400 text-sm">Elemento actual:</span>
                    <span id="current-element" class="text-orange-500 font-semibold text-sm">${elements[0]?.name || '—'}</span>
                    <span class="text-slate-500 text-xs ml-2">(<span id="elem-progress">1</span>/${elements.length})</span>
                </div>
                <!-- Element indicator pills -->
                <div id="elem-pills" class="flex items-center justify-center gap-1.5 mb-6">
                    ${elements.map((e, i) => `
                        <div class="elem-pill w-8 h-1.5 rounded-full transition-all ${i === 0 ? 'bg-orange-500' : 'bg-slate-600'}" title="${e.name}"></div>
                    `).join('')}
                </div>
                <div class="flex items-center justify-center gap-4">
                    <button id="btn-start" class="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white text-lg font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center">▶</button>
                    <button id="btn-lap" class="w-20 h-20 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-40" disabled>LAP</button>
                    <button id="btn-stop" class="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white text-lg font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-40" disabled>⏹</button>
                </div>
            </div>

            <!-- Laps Table -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div class="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 class="text-sm font-semibold text-slate-700">Registros</h3>
                    <button id="btn-view-results" class="text-orange-500 text-xs font-medium hover:text-orange-600 cursor-pointer">
                        📊 Ver Resultados
                    </button>
                </div>
                <div class="max-h-64 overflow-auto">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50 text-slate-500 sticky top-0">
                            <tr>
                                <th class="text-left px-3 py-2">Ciclo</th>
                                <th class="text-left px-3 py-2">Elemento</th>
                                <th class="text-right px-3 py-2">Tiempo (ms)</th>
                                <th class="text-center px-3 py-2">Und</th>
                            </tr>
                        </thead>
                        <tbody id="laps-tbody" class="divide-y divide-slate-50">
                            ${renderLapRows(lapsRecorded, elements)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Timer logic
        const timerDisplay = container.querySelector('#timer-display');
        const btnStart = container.querySelector('#btn-start');
        const btnLap = container.querySelector('#btn-lap');
        const btnStop = container.querySelector('#btn-stop');

        function formatTime(ms) {
            const mins = Math.floor(ms / 60000);
            const secs = Math.floor((ms % 60000) / 1000);
            const millis = Math.floor(ms % 1000);
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
        }

        function tick() {
            if (!timerRunning) return;
            elapsedMs = performance.now() - startTime;
            if (timerDisplay) timerDisplay.textContent = formatTime(elapsedMs);
            animFrame = requestAnimationFrame(tick);
        }

        btnStart?.addEventListener('click', () => {
            if (timerRunning) return;
            timerRunning = true;
            startTime = performance.now() - elapsedMs;
            btnStart.disabled = true;
            btnStart.classList.add('opacity-40');
            btnLap.disabled = false;
            btnStop.disabled = false;
            tick();
        });

        btnLap?.addEventListener('click', async () => {
            if (!timerRunning) return;
            const splitMs = Math.round(elapsedMs);
            const elemId = elements[currentElementIdx]?.id;

            // Record lap to API
            try {
                await ApiClient.post(`/engineering/studies/${currentStudy.id}/laps`, {
                    element_id: elemId,
                    cycle_number: currentCycle,
                    split_time_ms: splitMs,
                    units_count: 1,
                });

                // Add to local table
                const tbody = container.querySelector('#laps-tbody');
                const tr = document.createElement('tr');
                tr.className = 'bg-green-50/50';
                tr.innerHTML = `
                    <td class="px-3 py-1.5 text-slate-600">${currentCycle}</td>
                    <td class="px-3 py-1.5 text-slate-800 font-medium">${elements[currentElementIdx]?.name}</td>
                    <td class="px-3 py-1.5 text-right font-mono text-slate-700">${splitMs.toLocaleString()}</td>
                    <td class="px-3 py-1.5 text-center text-slate-500">1</td>
                `;
                tbody?.prepend(tr);

                // Advance element
                currentElementIdx++;
                if (currentElementIdx >= elements.length) {
                    // Completed one full cycle
                    currentElementIdx = 0;
                    currentCycle++;
                    container.querySelector('#cycle-num').textContent = currentCycle;
                }

                // Reset timer for next element
                elapsedMs = 0;
                startTime = performance.now();

                // Update UI
                container.querySelector('#current-element').textContent = elements[currentElementIdx]?.name || '—';
                container.querySelector('#elem-progress').textContent = currentElementIdx + 1;
                const pills = container.querySelectorAll('.elem-pill');
                pills.forEach((p, i) => {
                    p.className = `elem-pill w-8 h-1.5 rounded-full transition-all ${i === currentElementIdx ? 'bg-orange-500' : i < currentElementIdx ? 'bg-green-500' : 'bg-slate-600'}`;
                });

            } catch (e) { alert('Error recording lap: ' + e.message); }
        });

        btnStop?.addEventListener('click', () => {
            timerRunning = false;
            if (animFrame) cancelAnimationFrame(animFrame);
            btnStart.disabled = false;
            btnStart.classList.remove('opacity-40');
            btnLap.disabled = true;
            btnStop.disabled = true;
        });

        container.querySelector('#btn-back-list2')?.addEventListener('click', () => {
            timerRunning = false;
            if (animFrame) cancelAnimationFrame(animFrame);
            renderList();
        });

        container.querySelector('#btn-view-results')?.addEventListener('click', () => {
            timerRunning = false;
            if (animFrame) cancelAnimationFrame(animFrame);
            renderResults(currentStudy.id);
        });
    }


    // ── RESULTS PHASE ──────────────────────────────
    async function renderResults(studyId) {
        currentPhase = 'results';
        container.innerHTML = `<div class="flex items-center justify-center py-12"><div class="animate-pulse text-slate-400">Calculando resultados...</div></div>`;

        try {
            const results = await ApiClient.get(`/engineering/studies/${studyId}/results`);

            container.innerHTML = `
                <div class="flex items-center gap-3 mb-6">
                    <button id="btn-back-list3" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900">Resultados: ${results.study_name}</h1>
                        <p class="text-slate-500 text-sm mt-1">Rating: ${results.rating_factor} · Suplementos: ${(results.supplements_pct * 100).toFixed(0)}%</p>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
                        <p class="text-blue-200 text-xs uppercase tracking-wider">Tiempo Normal (TN)</p>
                        <p class="text-3xl font-bold mt-1">${(results.total_normal_time_ms / 1000).toFixed(2)}<span class="text-lg text-blue-200 ml-1">seg</span></p>
                    </div>
                    <div class="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl p-5 text-white shadow-lg">
                        <p class="text-orange-200 text-xs uppercase tracking-wider">Tiempo Estándar (TE)</p>
                        <p class="text-3xl font-bold mt-1">${(results.total_standard_time_ms / 1000).toFixed(2)}<span class="text-lg text-orange-200 ml-1">seg</span></p>
                    </div>
                    <div class="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 text-white shadow-lg">
                        <p class="text-green-200 text-xs uppercase tracking-wider">Capacidad (UPH)</p>
                        <p class="text-3xl font-bold mt-1">${results.uph}<span class="text-lg text-green-200 ml-1">und/h</span></p>
                    </div>
                </div>

                <!-- Element Breakdown Table -->
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 class="text-sm font-semibold text-slate-700">Desglose por Elemento</h3>
                    </div>
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50 text-slate-600">
                            <tr>
                                <th class="text-left px-4 py-2 font-medium">#</th>
                                <th class="text-left px-4 py-2 font-medium">Elemento</th>
                                <th class="text-left px-4 py-2 font-medium">Tipo</th>
                                <th class="text-right px-4 py-2 font-medium">Obs.</th>
                                <th class="text-right px-4 py-2 font-medium">Prom (ms)</th>
                                <th class="text-right px-4 py-2 font-medium">σ (ms)</th>
                                <th class="text-right px-4 py-2 font-medium">TN (ms)</th>
                                <th class="text-right px-4 py-2 font-medium">TE (ms)</th>
                                <th class="text-center px-4 py-2 font-medium">Outliers</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${results.elements.map(e => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-4 py-2 text-slate-400 text-xs">${e.order}</td>
                                    <td class="px-4 py-2 text-slate-800 font-medium">${e.element_name}</td>
                                    <td class="px-4 py-2"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">${e.element_type}</span></td>
                                    <td class="px-4 py-2 text-right text-slate-600">${e.observations}</td>
                                    <td class="px-4 py-2 text-right font-mono text-slate-700">${e.avg_time_ms.toLocaleString()}</td>
                                    <td class="px-4 py-2 text-right font-mono text-slate-500">${e.std_dev_ms.toLocaleString()}</td>
                                    <td class="px-4 py-2 text-right font-mono text-blue-700 font-medium">${e.normal_time_ms.toLocaleString()}</td>
                                    <td class="px-4 py-2 text-right font-mono text-orange-500 font-medium">${e.standard_time_ms.toLocaleString()}</td>
                                    <td class="px-4 py-2 text-center">${e.auto_outliers > 0 ? `<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">${e.auto_outliers}</span>` : '<span class="text-slate-300">—</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="bg-slate-50 font-medium">
                            <tr>
                                <td colspan="6" class="px-4 py-3 text-right text-slate-600">Total Ciclo:</td>
                                <td class="px-4 py-3 text-right font-mono text-blue-700">${results.total_normal_time_ms.toLocaleString()}</td>
                                <td class="px-4 py-3 text-right font-mono text-orange-500">${results.total_standard_time_ms.toLocaleString()}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            container.querySelector('#btn-back-list3')?.addEventListener('click', () => renderList());

        } catch (e) {
            container.innerHTML = `<div class="p-6 text-red-500">Error: ${e.message}. <button id="btn-back-err" class="text-orange-500 underline cursor-pointer">Volver</button></div>`;
            container.querySelector('#btn-back-err')?.addEventListener('click', () => renderList());
        }
    }


    function renderLapRows(laps, elements) {
        if (!laps || laps.length === 0) return '<tr><td colspan="4" class="px-3 py-4 text-center text-slate-300 text-xs">No hay registros aún</td></tr>';
        const elemMap = {};
        elements.forEach(e => { elemMap[e.id] = e.name; });
        return [...laps].reverse().map(l => `
            <tr class="${l.is_abnormal ? 'bg-red-50' : ''}">
                <td class="px-3 py-1.5 text-slate-600">${l.cycle_number}</td>
                <td class="px-3 py-1.5 text-slate-800">${elemMap[l.element_id] || '—'}</td>
                <td class="px-3 py-1.5 text-right font-mono text-slate-700">${l.split_time_ms?.toLocaleString()}</td>
                <td class="px-3 py-1.5 text-center text-slate-500">${l.units_count || 1}</td>
            </tr>
        `).join('');
    }

    return container;
}

export default TimingPage;
