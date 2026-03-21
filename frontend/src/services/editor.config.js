/**
 * editor.config.js
 * 
 * Centralized Editor.js tool configuration.
 * Editor.js and its plugins are loaded via CDN in index.html,
 * so we rely on global window references.
 */

/**
 * Returns the Editor.js tools configuration object.
 * Must be called AFTER the CDN scripts have loaded.
 */
async function uploadImageFile(file) {
    const token = localStorage.getItem('takta_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/documents/images', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.detail || `Error subiendo imagen (${response.status})`);
    }
    return payload;
}

export function getEditorTools() {
    const tools = {};

    if (window.Header) {
        tools.header = {
            class: window.Header,
            config: {
                placeholder: 'Escribe un encabezado...',
                levels: [1, 2, 3, 4],
                defaultLevel: 2
            }
        };
    }

    if (window.List || window.EditorjsList) {
        tools.list = {
            class: window.List || window.EditorjsList,
            inlineToolbar: true,
            config: {
                defaultStyle: 'unordered'
            }
        };
    }

    if (window.Table) {
        tools.table = {
            class: window.Table,
            inlineToolbar: true,
            config: {
                rows: 3,
                cols: 3
            }
        };
    }

    if (window.Warning) {
        tools.warning = {
            class: window.Warning,
            config: {
                titlePlaceholder: 'Título de advertencia',
                messagePlaceholder: 'Detalle...'
            }
        };
    }

    if (window.Delimiter) {
        tools.delimiter = window.Delimiter;
    }

    if (window.ImageTool) {
        tools.image = {
            class: window.ImageTool,
            config: {
                uploader: {
                    uploadByFile: async (file) => uploadImageFile(file),
                    uploadByUrl: async (url) => ({
                        success: 1,
                        file: { url }
                    })
                }
            }
        };
    } else if (window.SimpleImage) {
        tools.image = window.SimpleImage;
    }

    if (window.Quote) {
        tools.quote = {
            class: window.Quote,
            inlineToolbar: true,
        };
    }

    if (window.Marker) {
        tools.marker = {
            class: window.Marker,
        };
    }

    return tools;
}

/**
 * Spanish i18n configuration for Editor.js
 */
export const EDITOR_I18N_ES = {
    messages: {
        ui: {
            "blockTunes": {
                "toggler": { "Click to tune": "Configurar bloque" },
            },
            "inlineToolbar": {
                "converter": { "Convert to": "Convertir a" }
            },
            "toolbar": {
                "toolbox": { "Add": "Agregar" }
            }
        },
        toolNames: {
            "Text": "Texto",
            "Heading": "Encabezado",
            "List": "Lista",
            "Warning": "Advertencia",
            "Quote": "Cita",
            "Table": "Tabla",
            "Delimiter": "Separador",
            "Bold": "Negrita",
            "Italic": "Cursiva",
            "Marker": "Resaltador",
            "Image": "Imagen"
        },
        blockTunes: {
            "delete": { "Delete": "Eliminar" },
            "moveUp": { "Move up": "Subir" },
            "moveDown": { "Move down": "Bajar" }
        }
    }
};

export default { getEditorTools, EDITOR_I18N_ES };

