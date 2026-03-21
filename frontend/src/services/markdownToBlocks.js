/**
 * markdownToBlocks.js
 * 
 * Lightweight Markdown → Editor.js blocks converter.
 * Handles: Headers (h1-h6), unordered/ordered lists, tables, and paragraphs.
 * Used to pre-populate the editor when creating a document from a Markdown template.
 */

/**
 * Convert a Markdown string into an array of Editor.js block objects.
 * @param {string} markdown - Raw markdown content
 * @returns {Array<Object>} Editor.js blocks array
 */
export function markdownToBlocks(markdown) {
    if (!markdown) return [];

    const lines = markdown.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // --- Skip empty lines ---
        if (line.trim() === '') {
            i++;
            continue;
        }

        // --- Headers (# … ######) ---
        const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headerMatch) {
            blocks.push({
                type: 'header',
                data: {
                    text: headerMatch[2].trim(),
                    level: headerMatch[1].length
                }
            });
            i++;
            continue;
        }

        // --- Unordered list (- or *) ---
        if (/^\s*[-*]\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim());
                i++;
            }
            blocks.push({
                type: 'list',
                data: {
                    style: 'unordered',
                    items: items
                }
            });
            continue; // i already advanced
        }

        // --- Ordered list (1. 2. etc) ---
        if (/^\s*\d+\.\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
                i++;
            }
            blocks.push({
                type: 'list',
                data: {
                    style: 'ordered',
                    items: items
                }
            });
            continue;
        }

        // --- Table (| col | col |) ---
        if (line.trim().startsWith('|')) {
            const tableRows = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                const row = lines[i].trim();
                // Skip separator rows (|---|---|)
                if (/^\|[\s\-:|]+\|$/.test(row)) {
                    i++;
                    continue;
                }
                const cells = row
                    .split('|')
                    .filter(c => c.trim() !== '')
                    .map(c => c.trim());
                tableRows.push(cells);
                i++;
            }
            if (tableRows.length > 0) {
                blocks.push({
                    type: 'table',
                    data: {
                        withHeadings: true,
                        content: tableRows
                    }
                });
            }
            continue;
        }

        // --- Horizontal rule (---) ---
        if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
            blocks.push({ type: 'delimiter', data: {} });
            i++;
            continue;
        }

        // --- Default: Paragraph ---
        blocks.push({
            type: 'paragraph',
            data: { text: line.trim() }
        });
        i++;
    }

    return blocks;
}

export default markdownToBlocks;

