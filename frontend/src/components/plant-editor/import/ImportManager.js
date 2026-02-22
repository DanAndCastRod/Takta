/**
 * ImportManager - Fachada para manejar la importación de diferentes formatos de archivo.
 * 
 * Formatos soportados:
 * - .drawio / .xml (mxGraph)
 * - .json (Fabric.js nativo)
 * - .svg (futuro)
 * - .png/.jpg (imágenes directas)
 */
import { DrawioParser } from './DrawioParser.js';

export class ImportManager {
    constructor() {
        this.drawioParser = new DrawioParser();
        this.supportedExtensions = ['.drawio', '.xml', '.json', '.svg', '.png', '.jpg', '.jpeg'];
    }

    /**
     * Importa un archivo y retorna datos listos para Fabric.js
     * @param {File} file - Archivo a importar
     * @returns {Promise<Object>} { type, data }
     */
    async importFile(file) {
        const extension = this.getExtension(file.name);

        if (!this.isSupported(extension)) {
            throw new Error(`Unsupported file format: ${extension}`);
        }

        switch (extension) {
            case '.drawio':
            case '.xml':
                return await this.importDrawio(file);

            case '.json':
                return await this.importJSON(file);

            case '.svg':
                return await this.importSVG(file);

            case '.png':
            case '.jpg':
            case '.jpeg':
                return await this.importImage(file);

            default:
                throw new Error(`Handler not implemented for: ${extension}`);
        }
    }

    /**
     * Importa un archivo .drawio
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async importDrawio(file) {
        const content = await this.readAsText(file);
        const parsed = this.drawioParser.parse(content);
        const fabricData = this.drawioParser.toFabricObjects(parsed, 0);

        return {
            type: 'drawio',
            fileName: file.name,
            pages: parsed.pages.map((page, index) => ({
                name: page.name,
                ...this.drawioParser.toFabricObjects(parsed, index)
            })),
            metadata: parsed.metadata
        };
    }

    /**
     * Importa un archivo JSON (formato Fabric.js)
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async importJSON(file) {
        const content = await this.readAsText(file);
        const data = JSON.parse(content);

        return {
            type: 'json',
            fileName: file.name,
            data
        };
    }

    /**
     * Importa un archivo SVG
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async importSVG(file) {
        const content = await this.readAsText(file);

        return {
            type: 'svg',
            fileName: file.name,
            svgString: content
        };
    }

    /**
     * Importa una imagen
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async importImage(file) {
        const dataUrl = await this.readAsDataURL(file);

        return {
            type: 'image',
            fileName: file.name,
            src: dataUrl
        };
    }

    /**
     * Lee un archivo como texto
     * @param {File} file 
     * @returns {Promise<string>}
     */
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    /**
     * Lee un archivo como Data URL (base64)
     * @param {File} file 
     * @returns {Promise<string>}
     */
    readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Obtiene la extensión de un archivo
     * @param {string} fileName 
     * @returns {string}
     */
    getExtension(fileName) {
        const match = fileName.match(/\.[^.]+$/);
        return match ? match[0].toLowerCase() : '';
    }

    /**
     * Verifica si una extensión es soportada
     * @param {string} extension 
     * @returns {boolean}
     */
    isSupported(extension) {
        return this.supportedExtensions.includes(extension);
    }
}

// Singleton para uso global
export const importManager = new ImportManager();
