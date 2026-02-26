/**
 * DocumentEditorPage.js
 * 
 * Page-level controller for the Document Editor flow.
 * Manages two states:
 *   1. Template Selection (no templateId in URL)
 *   2. Editor Canvas (templateId present in URL)
 */
import ApiClient from '../services/api.client.js';
import { markdownToBlocks } from '../services/markdownToBlocks.js';
import TemplateSelector from '../components/editor/TemplateSelector.js';
import EditorCanvas from '../components/editor/EditorCanvas.js';

/**
 * Parse query params from the hash URL.
 * e.g. #/editor?assetId=xxx&templateId=yyy
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

async function DocumentEditorPage() {
    const container = document.createElement('div');
    container.className = 'h-full';

    const params = getHashParams();
    const assetId = params.assetId || null;
    const templateId = params.templateId || null;

    if (!templateId) {
        // --- Phase 1: Show Template Selector ---
        const selector = new TemplateSelector(container, (template) => {
            // Navigate to the editor with the selected template
            let hash = `#/editor?templateId=${template.id}`;
            if (assetId) hash += `&assetId=${assetId}`;
            window.location.hash = hash;
        });
        selector.load();
    } else {
        // --- Phase 2: Show Editor Canvas ---
        container.innerHTML = `
            <div class="flex items-center justify-center py-20 text-slate-400">
                <svg class="animate-spin mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Preparando editor...</span>
            </div>
        `;

        try {
            // Fetch template details to get the markdown_structure
            const templates = await ApiClient.get('/templates/');
            const template = templates.find(t => t.id === templateId);

            if (!template) {
                container.innerHTML = `
                    <div class="max-w-2xl mx-auto p-8">
                        <div class="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
                            <h3 class="font-medium">Plantilla no encontrada</h3>
                            <p class="text-sm mt-1">La plantilla seleccionada no existe o fue eliminada.</p>
                        </div>
                    </div>
                `;
                return container;
            }

            // Convert markdown to Editor.js blocks
            const initialBlocks = markdownToBlocks(template.markdown_structure || '');

            // Fetch asset name if assetId provided
            let assetName = '';
            if (assetId) {
                try {
                    const asset = await ApiClient.get(`/assets/${assetId}`);
                    assetName = asset.name || '';
                } catch (e) {
                    console.warn('Could not load asset name', e);
                }
            }

            // Initialize the editor canvas
            const editorCanvas = new EditorCanvas(container, {
                templateId: template.id,
                templateName: template.name,
                assetId: assetId,
                assetName: assetName,
                initialBlocks: initialBlocks,
                onSaved: (doc) => {
                    console.log('Document saved:', doc);
                }
            });
            editorCanvas.render();

        } catch (error) {
            console.error('DocumentEditorPage: failed to initialize', error);
            container.innerHTML = `
                <div class="max-w-2xl mx-auto p-8">
                    <div class="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
                        <h3 class="font-medium">Error al inicializar el editor</h3>
                        <p class="text-sm mt-1">${error.message}</p>
                    </div>
                </div>
            `;
        }
    }

    return container;
}

export default DocumentEditorPage;
