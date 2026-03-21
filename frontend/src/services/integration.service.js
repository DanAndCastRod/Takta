import ApiClient from './api.client.js';

function cleanId(value) {
    if (!value) return null;
    const normalized = String(value).trim();
    return normalized || null;
}

function buildSummaryQuery(context = {}) {
    const params = new URLSearchParams();
    const assetId = cleanId(context.asset_id);
    const referenceId = cleanId(context.product_reference_id);
    const standardId = cleanId(context.process_standard_id);

    if (assetId) params.set('asset_id', assetId);
    if (referenceId) params.set('product_reference_id', referenceId);
    if (standardId) params.set('process_standard_id', standardId);

    const query = params.toString();
    return query ? `?${query}` : '';
}

export const integrationService = {
    getContextOptions(limit = 200) {
        const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 200;
        return ApiClient.get(`/integration/context/options?limit=${safeLimit}`);
    },

    getContextSummary(context = {}) {
        return ApiClient.get(`/integration/context/summary${buildSummaryQuery(context)}`);
    },
};

export default integrationService;
