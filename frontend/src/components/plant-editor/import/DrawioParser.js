/**
 * DrawioParser - Parsea archivos .drawio (XML mxGraph) y extrae imágenes/geometrías.
 * 
 * Estrategia:
 * 1. Parsear XML usando DOMParser
 * 2. Buscar mxCells con style="shape=image;image=data:image/..." para extraer background
 * 3. Convertir coordenadas mxGeometry a formato Fabric.js
 */
export class DrawioParser {
    constructor() {
        this.parser = new DOMParser();
    }

    /**
     * Parsea un string XML de Draw.io y retorna un objeto estructurado.
     * @param {string} xmlString - Contenido del archivo .drawio
     * @returns {Object} { pages: [{name, background, objects}], metadata }
     */
    parse(xmlString) {
        const doc = this.parser.parseFromString(xmlString, 'text/xml');
        const mxfile = doc.querySelector('mxfile');

        if (!mxfile) {
            throw new Error('Invalid .drawio file: No mxfile element found');
        }

        const diagrams = mxfile.querySelectorAll('diagram');
        const pages = [];

        diagrams.forEach((diagram, index) => {
            const page = this.parseDiagram(diagram, index);
            pages.push(page);
        });

        return {
            pages,
            metadata: {
                host: mxfile.getAttribute('host') || 'unknown',
                version: mxfile.getAttribute('version') || 'unknown',
                pageCount: pages.length
            }
        };
    }

    /**
     * Parsea un diagrama individual
     * @param {Element} diagram - Elemento <diagram>
     * @param {number} index - Índice del diagrama
     * @returns {Object} { name, background, objects }
     */
    parseDiagram(diagram, index) {
        const name = diagram.getAttribute('name') || `Page ${index + 1}`;
        const mxGraphModel = diagram.querySelector('mxGraphModel');

        if (!mxGraphModel) {
            return { name, background: null, objects: [] };
        }

        const root = mxGraphModel.querySelector('root');
        if (!root) {
            return { name, background: null, objects: [] };
        }

        const cells = root.querySelectorAll('mxCell');
        const objects = [];
        let background = null;
        let largestImage = null;
        let largestArea = 0;

        cells.forEach(cell => {
            const parsed = this.parseCell(cell);
            if (!parsed) return;

            if (parsed.type === 'image') {
                // La imagen más grande probablemente es el fondo
                const area = (parsed.width || 0) * (parsed.height || 0);
                if (area > largestArea) {
                    largestArea = area;
                    largestImage = parsed;
                }
            } else if (parsed.type !== 'root' && parsed.type !== 'layer') {
                objects.push(parsed);
            }
        });

        // La imagen más grande se asigna como background
        if (largestImage) {
            background = largestImage;
            // Removerla de objects si estaba ahí
            const idx = objects.indexOf(largestImage);
            if (idx > -1) objects.splice(idx, 1);
        }

        return { name, background, objects };
    }

    /**
     * Parsea un mxCell individual
     * @param {Element} cell - Elemento <mxCell>
     * @returns {Object|null} Objeto parseado o null si es ignorable
     */
    parseCell(cell) {
        const id = cell.getAttribute('id');
        const style = cell.getAttribute('style') || '';
        const value = cell.getAttribute('value') || '';
        const parent = cell.getAttribute('parent');

        // Ignorar celdas raíz (id=0)
        if (id === '0') {
            return { type: 'root', id };
        }

        // Ignorar capas (parent=0)
        if (parent === '0') {
            return { type: 'layer', id, name: value, locked: style.includes('locked=1') };
        }

        const geometry = this.parseGeometry(cell.querySelector('mxGeometry'));

        // Detectar tipo de shape
        if (style.includes('shape=image')) {
            return this.parseImageCell(cell, style, geometry);
        }

        if (style.includes('ellipse') || style.includes('rounded=1')) {
            return {
                type: 'ellipse',
                id,
                ...geometry,
                style: this.parseStyle(style)
            };
        }

        // Por defecto, rectángulo
        return {
            type: 'rect',
            id,
            value,
            ...geometry,
            style: this.parseStyle(style)
        };
    }

    /**
     * Parsea una celda de imagen
     * @param {Element} cell - Elemento <mxCell>
     * @param {string} style - String de estilo
     * @param {Object} geometry - Geometría parseada
     * @returns {Object} Objeto de imagen
     */
    parseImageCell(cell, style, geometry) {
        const imageMatch = style.match(/image=([^;]+)/);
        let imageData = null;

        if (imageMatch) {
            imageData = imageMatch[1];

            // Decodificar si está URL encoded (ej: %2B -> +)
            try {
                imageData = decodeURIComponent(imageData);
            } catch (e) {
                // Si falla, usar como está
            }

            // Normalizar Data URI si viene de Draw.io (a veces falta ;base64)
            // Draw.io a veces guarda: data:image/png,iVBORw0KGgo... (sin ;base64)
            if (imageData.startsWith('data:image/') && !imageData.includes(';base64,')) {
                // Verificar si parece base64 (iVBORw... es png header en b64)
                if (imageData.includes(',iVBORw0KGgo')) {
                    imageData = imageData.replace(',', ';base64,');
                }
            }
        }

        return {
            type: 'image',
            id: cell.getAttribute('id'),
            src: imageData,
            ...geometry
        };
    }

    /**
     * Parsea mxGeometry a coordenadas simples
     * @param {Element|null} geomElement - Elemento <mxGeometry>
     * @returns {Object} { x, y, width, height }
     */
    parseGeometry(geomElement) {
        if (!geomElement) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        return {
            x: parseFloat(geomElement.getAttribute('x')) || 0,
            y: parseFloat(geomElement.getAttribute('y')) || 0,
            width: parseFloat(geomElement.getAttribute('width')) || 0,
            height: parseFloat(geomElement.getAttribute('height')) || 0
        };
    }

    /**
     * Parsea string de estilo a objeto
     * @param {string} styleString - String tipo "key=value;key2=value2"
     * @returns {Object} Objeto con propiedades de estilo
     */
    parseStyle(styleString) {
        const result = {};
        if (!styleString) return result;

        styleString.split(';').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                result[key.trim()] = value !== undefined ? value.trim() : true;
            }
        });

        return result;
    }

    /**
     * Convierte objetos parseados a formato Fabric.js
     * @param {Object} parsedData - Resultado de parse()
     * @param {number} pageIndex - Índice de la página a convertir
     * @returns {Object} { backgroundImage, fabricObjects }
     */
    toFabricObjects(parsedData, pageIndex = 0) {
        const page = parsedData.pages[pageIndex];
        if (!page) {
            throw new Error(`Page ${pageIndex} not found`);
        }

        const result = {
            backgroundImage: null,
            fabricObjects: []
        };

        // Background
        if (page.background && page.background.src) {
            result.backgroundImage = {
                src: page.background.src,
                left: page.background.x,
                top: page.background.y,
                width: page.background.width,
                height: page.background.height,
                selectable: false,
                evented: false
            };
        }

        // Objects
        page.objects.forEach(obj => {
            const fabricObj = this.convertToFabricObject(obj);
            if (fabricObj) {
                result.fabricObjects.push(fabricObj);
            }
        });

        return result;
    }

    /**
     * Convierte un objeto individual a formato Fabric.js
     * @param {Object} obj - Objeto parseado
     * @returns {Object|null} Objeto Fabric.js compatible
     */
    convertToFabricObject(obj) {
        switch (obj.type) {
            case 'rect':
                return {
                    type: 'rect',
                    left: obj.x,
                    top: obj.y,
                    width: obj.width,
                    height: obj.height,
                    fill: obj.style?.fillColor || 'transparent',
                    stroke: obj.style?.strokeColor || '#000000',
                    strokeWidth: parseInt(obj.style?.strokeWidth) || 1
                };

            case 'ellipse':
                return {
                    type: 'ellipse',
                    left: obj.x,
                    top: obj.y,
                    rx: obj.width / 2,
                    ry: obj.height / 2,
                    fill: obj.style?.fillColor || 'transparent',
                    stroke: obj.style?.strokeColor || '#000000',
                    strokeWidth: parseInt(obj.style?.strokeWidth) || 1
                };

            case 'image':
                return {
                    type: 'image',
                    src: obj.src,
                    left: obj.x,
                    top: obj.y,
                    width: obj.width,
                    height: obj.height
                };

            default:
                console.warn(`Unsupported object type: ${obj.type}`);
                return null;
        }
    }
}
