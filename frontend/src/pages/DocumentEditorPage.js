/**
 * DocumentEditorPage.js
 *
 * Page-level controller for the Document Editor flow.
 * Manages two states:
 *   1. Template Selection (no template_id in URL)
 *   2. Editor Canvas (template_id present in URL)
 */
import ApiClient from '../services/api.client.js';
import { markdownToBlocks } from '../services/markdownToBlocks.js';
import TemplateSelector from '../components/editor/TemplateSelector.js';
import EditorCanvas from '../components/editor/EditorCanvas.js';
import { setModuleContext } from '../services/module-context.service.js';

/**
 * Parse query params from the hash URL.
 * e.g. #/editor?asset_id=xxx&template_id=yyy
 */
function getHashParams() {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return {};

    const params = {};
    const searchStr = hash.substring(qIndex + 1);
    new URLSearchParams(searchStr).forEach((v, k) => {
        params[k] = v;
    });
    return params;
}

function firstNonEmpty(...values) {
    for (const value of values) {
        if (value === undefined || value === null) continue;
        const normalized = String(value).trim();
        if (normalized) return normalized;
    }
    return '';
}

function normalizeEditorParams(raw = {}) {
    const normalized = {
        template_id: firstNonEmpty(raw.template_id, raw.templateId),
        document_id: firstNonEmpty(raw.document_id, raw.documentId),
        asset_id: firstNonEmpty(raw.asset_id, raw.assetId),
        product_reference_id: firstNonEmpty(raw.product_reference_id, raw.reference_id, raw.referenceId),
        process_standard_id: firstNonEmpty(raw.process_standard_id, raw.standard_id, raw.standardId),
        activity_id: firstNonEmpty(raw.activity_id, raw.activityId),
        study_id: firstNonEmpty(raw.study_id, raw.studyId),
        action_id: firstNonEmpty(raw.action_id, raw.actionId),
        audit_id: firstNonEmpty(raw.audit_id, raw.auditId),
        kanban_id: firstNonEmpty(raw.kanban_id, raw.kanbanId),
        layout_id: firstNonEmpty(raw.layout_id, raw.layoutId),
        meeting_id: firstNonEmpty(raw.meeting_id, raw.meetingId),
        source_module: firstNonEmpty(raw.source_module, raw.sourceModule, raw.source),
        source_route: firstNonEmpty(raw.source_route, raw.sourceRoute),
    };

    return normalized;
}

function buildEditorHash(params) {
    const query = new URLSearchParams();
    const orderedKeys = [
        'template_id',
        'document_id',
        'asset_id',
        'product_reference_id',
        'process_standard_id',
        'activity_id',
        'study_id',
        'action_id',
        'audit_id',
        'kanban_id',
        'layout_id',
        'meeting_id',
        'source_module',
        'source_route',
    ];

    orderedKeys.forEach((key) => {
        if (params[key]) query.set(key, params[key]);
    });

    const search = query.toString();
    return search ? `#/editor?${search}` : '#/editor';
}

function syncCanonicalEditorHash(params) {
    const canonical = buildEditorHash(params);
    if (canonical !== (window.location.hash || '#/editor')) {
        window.history.replaceState(null, '', canonical);
    }
}

function renderLoading(container, message = 'Preparando editor...') {
    container.innerHTML = `
        <div class="flex items-center justify-center py-20 text-slate-400">
            <svg class="animate-spin mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;
}

function renderError(container, title, message) {
    container.innerHTML = `
        <div class="max-w-2xl mx-auto p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
                <h3 class="font-medium">${title}</h3>
                <p class="text-sm mt-1">${message}</p>
            </div>
        </div>
    `;
}

function toStringValue(value) {
    if (value == null) return '';
    return String(value).trim();
}

function buildTraceabilityMarkdown(context) {
    const hasContext = [
        context.asset_id,
        context.reference_id,
        context.activity_id,
        context.standard_id,
        context.study_id,
        context.action_id,
        context.audit_id,
        context.kanban_id,
        context.layout_id,
        context.meeting_id,
    ].some(Boolean);

    if (!hasContext) return '';

    return `
## Contexto de Trazabilidad

| Campo | Valor |
|---|---|
| Módulo origen | ${context.source_module || 'editor'} |
| Activo ID | ${context.asset_id || ''} |
| Activo | ${context.asset_name || ''} |
| SKU ID | ${context.reference_id || ''} |
| SKU | ${context.reference_code || ''} |
| Actividad ID | ${context.activity_id || ''} |
| Actividad | ${context.activity_name || ''} |
| Estándar ID | ${context.standard_id || ''} |
| Estudio ID | ${context.study_id || ''} |
| Acción CI ID | ${context.action_id || ''} |
| Auditoría ID | ${context.audit_id || ''} |
| Kanban Loop ID | ${context.kanban_id || ''} |
| Layout/Diagrama ID | ${context.layout_id || ''} |
| Acta ID | ${context.meeting_id || ''} |
| Acta | ${context.meeting_title || ''} |
| Ruta de origen | ${context.source_route || window.location.hash || ''} |
`.trim();
}

function applyTemplatePlaceholders(markdown, context) {
    if (!markdown) return '';
    return markdown.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
        const value = context[key];
        return value == null ? '' : String(value);
    });
}

function contentJsonToBlocks(rawJson) {
    if (!rawJson) return null;
    try {
        const payload = JSON.parse(rawJson);
        if (Array.isArray(payload?.blocks)) {
            return payload.blocks;
        }
    } catch {
        return null;
    }
    return null;
}

async function resolveDocumentContext(params) {
    const context = {
        source_module: params.source_module || 'editor',
        source_route: params.source_route || '',
        asset_id: params.asset_id || '',
        asset_name: '',
        reference_id: params.product_reference_id || '',
        reference_code: '',
        activity_id: params.activity_id || '',
        activity_name: '',
        standard_id: params.process_standard_id || '',
        study_id: params.study_id || '',
        action_id: params.action_id || '',
        audit_id: params.audit_id || '',
        kanban_id: params.kanban_id || '',
        layout_id: params.layout_id || '',
        meeting_id: params.meeting_id || '',
        meeting_title: '',
    };

    const tasks = [];

    if (context.asset_id) {
        tasks.push(
            ApiClient.get(`/assets/${context.asset_id}`)
                .then((asset) => {
                    context.asset_name = toStringValue(asset?.name);
                })
                .catch((error) => console.warn('No se pudo resolver asset para documento', error)),
        );
    }

    if (context.reference_id) {
        tasks.push(
            ApiClient.get('/engineering/references')
                .then((rows) => {
                    const match = (rows || []).find((item) => String(item.id) === String(context.reference_id));
                    context.reference_code = toStringValue(match?.code);
                })
                .catch((error) => console.warn('No se pudo resolver referencia para documento', error)),
        );
    }

    if (context.activity_id) {
        tasks.push(
            ApiClient.get('/engineering/activities')
                .then((rows) => {
                    const match = (rows || []).find((item) => String(item.id) === String(context.activity_id));
                    context.activity_name = toStringValue(match?.name);
                })
                .catch((error) => console.warn('No se pudo resolver actividad para documento', error)),
        );
    }

    if (context.standard_id) {
        tasks.push(
            ApiClient.get(`/engineering/standards/${context.standard_id}`)
                .then((standard) => {
                    if (!context.asset_id) context.asset_id = toStringValue(standard?.asset_id);
                    if (!context.asset_name) context.asset_name = toStringValue(standard?.asset_name);
                    if (!context.activity_id) context.activity_id = toStringValue(standard?.activity_id);
                    if (!context.activity_name) context.activity_name = toStringValue(standard?.activity_name);
                    if (!context.reference_id) context.reference_id = toStringValue(standard?.product_reference_id);
                    if (!context.reference_code) context.reference_code = toStringValue(standard?.reference_code);
                })
                .catch((error) => console.warn('No se pudo resolver estándar para documento', error)),
        );
    }

    if (context.study_id) {
        tasks.push(
            ApiClient.get(`/engineering/studies/${context.study_id}`)
                .then((study) => {
                    if (!context.standard_id) context.standard_id = toStringValue(study?.process_standard_id);
                    if (!context.asset_id) context.asset_id = toStringValue(study?.asset_id);
                    if (!context.asset_name) context.asset_name = toStringValue(study?.asset_name);
                    if (!context.reference_id) context.reference_id = toStringValue(study?.product_reference_id);
                    if (!context.reference_code) context.reference_code = toStringValue(study?.reference_code);
                })
                .catch((error) => console.warn('No se pudo resolver estudio para documento', error)),
        );
    }

    if (context.action_id) {
        tasks.push(
            ApiClient.get('/ci/actions')
                .then((actions) => {
                    const match = (actions || []).find((item) => String(item.id) === String(context.action_id));
                    if (!match) return;
                    if (!context.asset_id) context.asset_id = toStringValue(match.asset_id);
                    if (!context.asset_name) context.asset_name = toStringValue(match.asset_name);
                })
                .catch((error) => console.warn('No se pudo resolver acción CI para documento', error)),
        );
    }

    if (context.audit_id) {
        tasks.push(
            ApiClient.get(`/audits/${context.audit_id}`)
                .then((audit) => {
                    if (!context.asset_id) context.asset_id = toStringValue(audit?.asset_id);
                    if (!context.asset_name) context.asset_name = toStringValue(audit?.asset_name);
                })
                .catch((error) => console.warn('No se pudo resolver auditoría para documento', error)),
        );
    }

    if (context.kanban_id) {
        tasks.push(
            ApiClient.get('/logistics/kanban/loops')
                .then((loops) => {
                    const match = (loops || []).find((item) => String(item.id) === String(context.kanban_id));
                    if (!match) return;
                    if (!context.asset_id) context.asset_id = toStringValue(match.asset_dest_id || match.asset_origin_id);
                    if (!context.asset_name) context.asset_name = toStringValue(match.asset_dest_name || match.asset_origin_name);
                    if (!context.reference_code) context.reference_code = toStringValue(match.sku_code);
                })
                .catch((error) => console.warn('No se pudo resolver kanban loop para documento', error)),
        );
    }

    if (context.layout_id) {
        tasks.push(
            ApiClient.get(`/plant-layouts/${context.layout_id}`)
                .catch((error) => console.warn('No se pudo resolver layout para documento', error)),
        );
    }

    if (context.meeting_id) {
        tasks.push(
            ApiClient.get(`/meetings/records/${context.meeting_id}`)
                .then((meeting) => {
                    context.meeting_title = toStringValue(meeting?.title);
                    if (!context.asset_id) context.asset_id = toStringValue(meeting?.asset_id);
                    if (!context.asset_name) context.asset_name = toStringValue(meeting?.asset_name);
                })
                .catch((error) => console.warn('No se pudo resolver acta para documento', error)),
        );
    }

    await Promise.all(tasks);
    return context;
}

async function mountTemplateSelector(container, assetId) {
    let assetName = '';
    if (assetId) {
        try {
            const asset = await ApiClient.get(`/assets/${assetId}`);
            assetName = asset?.name || '';
        } catch (error) {
            console.warn('No se pudo cargar el activo para contexto de documento', error);
        }
    }

    if (!container.isConnected) return;

    const selector = new TemplateSelector(container, (template) => {
        let hash = `#/editor?template_id=${template.id}`;
        if (assetId) hash += `&asset_id=${assetId}`;
        window.location.hash = hash;
    }, { assetId, assetName });
    await selector.load();
}

async function mountEditor(container, templateId, params) {
    try {
        let existingDocument = null;
        if (params.document_id) {
            existingDocument = await ApiClient.get(`/documents/${params.document_id}`);
            if (!templateId && existingDocument?.template_id) {
                templateId = existingDocument.template_id;
            }
            if (!params.asset_id && existingDocument?.asset_id) {
                params.asset_id = existingDocument.asset_id;
            }
            params.document_id = params.document_id || toStringValue(existingDocument?.id);
            params.template_id = params.template_id || toStringValue(templateId);
            syncCanonicalEditorHash(params);
        }

        const templates = await ApiClient.get('/templates');
        const template = templates.find((t) => t.id === templateId);

        if (!template) {
            if (container.isConnected) {
                renderError(container, 'Plantilla no encontrada', 'La plantilla seleccionada no existe o fue eliminada.');
            }
            return;
        }

        const context = await resolveDocumentContext(params);
        setModuleContext(
            {
                asset_id: context.asset_id || null,
                product_reference_id: context.reference_id || null,
                process_standard_id: context.standard_id || null,
            },
            'editor',
        );
        const savedBlocks = contentJsonToBlocks(existingDocument?.content_json);
        let initialBlocks = savedBlocks;
        if (!initialBlocks) {
            const traceabilityMarkdown = buildTraceabilityMarkdown(context);
            const rawTemplate = template.markdown_structure || '';
            const mappedTemplate = applyTemplatePlaceholders(rawTemplate, context);
            const finalMarkdown = traceabilityMarkdown
                ? `${traceabilityMarkdown}\n\n---\n\n${mappedTemplate}`
                : mappedTemplate;
            initialBlocks = markdownToBlocks(finalMarkdown);
        }

        if (!container.isConnected) return;

        const editorCanvas = new EditorCanvas(container, {
            documentId: existingDocument?.id || null,
            templateId: template.id,
            templateName: template.name,
            assetId: context.asset_id || null,
            assetName: context.asset_name || '',
            sourceContext: context,
            initialBlocks,
            onSaved: (doc) => {
                console.log('Documento guardado:', doc);
            }
        });
        editorCanvas.render();
    } catch (error) {
        console.error('DocumentEditorPage: failed to initialize', error);
        if (container.isConnected) {
            renderError(container, 'Error al inicializar el editor', error.message);
        }
    }
}

function DocumentEditorPage() {
    const container = document.createElement('div');
    container.className = 'h-full';

    const params = normalizeEditorParams(getHashParams());
    syncCanonicalEditorHash(params);

    const assetId = params.asset_id || null;
    const templateId = params.template_id || null;
    const documentId = params.document_id || null;

    renderLoading(container, (templateId || documentId) ? 'Preparando editor...' : 'Cargando plantillas...');

    requestAnimationFrame(() => {
        if (templateId || documentId) {
            mountEditor(container, templateId, params);
        } else {
            mountTemplateSelector(container, assetId);
        }
    });

    return container;
}

export default DocumentEditorPage;
