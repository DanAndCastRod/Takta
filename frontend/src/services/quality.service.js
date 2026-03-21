import ApiClient from './api.client.js';

export const qualityService = {
    getWeightSpecs(params = '') {
        return ApiClient.get(`/quality/weight-specs${params ? `?${params}` : ''}`);
    },

    getWeightSpec(specId) {
        return ApiClient.get(`/quality/weight-specs/${specId}`);
    },

    createWeightSpec(payload) {
        return ApiClient.post('/quality/weight-specs', payload);
    },

    updateWeightSpec(specId, payload) {
        return ApiClient.patch(`/quality/weight-specs/${specId}`, payload);
    },

    deleteWeightSpec(specId) {
        return ApiClient.delete(`/quality/weight-specs/${specId}`);
    },

    getWeightSamples(specId, params = '') {
        return ApiClient.get(`/quality/weight-specs/${specId}/samples${params ? `?${params}` : ''}`);
    },

    getWeightSummary(specId) {
        return ApiClient.get(`/quality/weight-specs/${specId}/summary`);
    },

    getWeightSpcChart(specId, params = '') {
        return ApiClient.get(`/quality/weight-specs/${specId}/spc/chart${params ? `?${params}` : ''}`);
    },

    getWeightSpcCapability(specId, params = '') {
        return ApiClient.get(`/quality/weight-specs/${specId}/spc/capability${params ? `?${params}` : ''}`);
    },

    runWeightSpcCapability(specId, payload = {}) {
        return ApiClient.post(`/quality/weight-specs/${specId}/spc/capability/runs`, payload);
    },

    runWeightSpcCapabilityBatch(payload = {}) {
        return ApiClient.post('/quality/spc/capability/runs/batch', payload);
    },

    getWeightSpcCapabilityRuns(specId, params = '') {
        return ApiClient.get(`/quality/weight-specs/${specId}/spc/capability/runs${params ? `?${params}` : ''}`);
    },

    getWeightSpcCapabilityTrend(specId, params = '') {
        return ApiClient.get(`/quality/weight-specs/${specId}/spc/capability/trend${params ? `?${params}` : ''}`);
    },

    createWeightSample(specId, payload) {
        return ApiClient.post(`/quality/weight-specs/${specId}/samples`, payload);
    },

    updateWeightSample(sampleId, payload) {
        return ApiClient.patch(`/quality/weight-samples/${sampleId}`, payload);
    },

    deleteWeightSample(sampleId) {
        return ApiClient.delete(`/quality/weight-samples/${sampleId}`);
    },

    createNonConformityFromSpc(specId, payload = {}) {
        return ApiClient.post(`/quality/non-conformities/from-spc/${specId}`, payload);
    },

    autoGenerateNonConformities(payload = {}) {
        return ApiClient.post('/quality/non-conformities/auto-generate', payload);
    },

    getNonConformities(params = '') {
        return ApiClient.get(`/quality/non-conformities${params ? `?${params}` : ''}`);
    },

    createNonConformity(payload) {
        return ApiClient.post('/quality/non-conformities', payload);
    },

    updateNonConformity(nonConformityId, payload) {
        return ApiClient.patch(`/quality/non-conformities/${nonConformityId}`, payload);
    },

    deleteNonConformity(nonConformityId) {
        return ApiClient.delete(`/quality/non-conformities/${nonConformityId}`);
    },

    getCapaActions(nonConformityId) {
        return ApiClient.get(`/quality/non-conformities/${nonConformityId}/capa-actions`);
    },

    createCapaAction(nonConformityId, payload) {
        return ApiClient.post(`/quality/non-conformities/${nonConformityId}/capa-actions`, payload);
    },

    updateCapaAction(capaActionId, payload) {
        return ApiClient.patch(`/quality/capa-actions/${capaActionId}`, payload);
    },

    deleteCapaAction(capaActionId) {
        return ApiClient.delete(`/quality/capa-actions/${capaActionId}`);
    },

    getCapaDashboard() {
        return ApiClient.get('/quality/capa/dashboard');
    },
};
