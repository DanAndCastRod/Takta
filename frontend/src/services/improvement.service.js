import ApiClient from './api.client.js';

export const improvementService = {
    getActions(params = '') {
        return ApiClient.get(`/ci/actions${params ? `?${params}` : ''}`);
    },

    createAction(payload) {
        return ApiClient.post('/ci/actions', payload);
    },

    updateAction(actionId, payload) {
        return ApiClient.patch(`/ci/actions/${actionId}`, payload);
    },

    getActionWorkflow(actionId) {
        return ApiClient.get(`/ci/actions/${actionId}/workflow`);
    },

    requestCloseAction(actionId, payload = {}) {
        return ApiClient.post(`/ci/actions/${actionId}/request-close`, payload);
    },

    approveCloseAction(actionId, payload = {}) {
        return ApiClient.post(`/ci/actions/${actionId}/approve-close`, payload);
    },

    verifyCloseAction(actionId, payload = {}) {
        return ApiClient.post(`/ci/actions/${actionId}/verify-close`, payload);
    },

    exportActionBoardPdf(params = '') {
        return ApiClient.get(`/ci/actions/export/pdf${params ? `?${params}` : ''}`);
    },

    deleteAction(actionId) {
        return ApiClient.delete(`/ci/actions/${actionId}`);
    },

    getMcKpiCatalog(params = '') {
        return ApiClient.get(`/ci/kpis/mc/catalog${params ? `?${params}` : ''}`);
    },

    seedMcKpiCatalog() {
        return ApiClient.post('/ci/kpis/mc/catalog/seed', {});
    },

    closePendingMcKpiWeights() {
        return ApiClient.post('/ci/kpis/mc/catalog/close-pending-weights', {});
    },

    updateMcKpiDefinition(kpiId, payload) {
        return ApiClient.patch(`/ci/kpis/mc/catalog/${kpiId}`, payload);
    },

    upsertMcKpiMeasurement(payload) {
        return ApiClient.put('/ci/kpis/mc/measurements', payload);
    },

    getMcKpiMeasurements(params = '') {
        return ApiClient.get(`/ci/kpis/mc/measurements${params ? `?${params}` : ''}`);
    },

    deleteMcKpiMeasurement(measurementId) {
        return ApiClient.delete(`/ci/kpis/mc/measurements/${measurementId}`);
    },

    getMcKpiScorecard(params = '') {
        return ApiClient.get(`/ci/kpis/mc/scorecard${params ? `?${params}` : ''}`);
    },

    getMcKpiTrend(params = '') {
        return ApiClient.get(`/ci/kpis/mc/trend${params ? `?${params}` : ''}`);
    },

    getAudits(params = '') {
        return ApiClient.get(`/audits${params ? `?${params}` : ''}`);
    },

    createAudit(payload) {
        return ApiClient.post('/audits', payload);
    },

    deleteAudit(auditId) {
        return ApiClient.delete(`/audits/${auditId}`);
    },

    getAuditRadarComparison(params = '') {
        return ApiClient.get(`/audits/radar/comparison${params ? `?${params}` : ''}`);
    },

    getAuditChecklists(params = '') {
        return ApiClient.get(`/audits/checklists${params ? `?${params}` : ''}`);
    },

    createAuditChecklist(payload) {
        return ApiClient.post('/audits/checklists', payload);
    },

    updateAuditChecklist(templateId, payload) {
        return ApiClient.patch(`/audits/checklists/${templateId}`, payload);
    },

    deleteAuditChecklist(templateId) {
        return ApiClient.delete(`/audits/checklists/${templateId}`);
    },

    createAdvancedAudit(payload) {
        return ApiClient.post('/audits/advanced', payload);
    },

    calculateKanban(payload) {
        return ApiClient.post('/logistics/kanban/calculate', payload);
    },

    getKanbanLoops(params = '') {
        return ApiClient.get(`/logistics/kanban/loops${params ? `?${params}` : ''}`);
    },

    deleteKanbanLoop(loopId) {
        return ApiClient.delete(`/logistics/kanban/loops/${loopId}`);
    },

    getVsmCanvases(params = '') {
        return ApiClient.get(`/logistics/vsm/canvases${params ? `?${params}` : ''}`);
    },

    getVsmCanvas(canvasId) {
        return ApiClient.get(`/logistics/vsm/canvases/${canvasId}`);
    },

    createVsmCanvas(payload) {
        return ApiClient.post('/logistics/vsm/canvases', payload);
    },

    updateVsmCanvas(canvasId, payload) {
        return ApiClient.patch(`/logistics/vsm/canvases/${canvasId}`, payload);
    },

    deleteVsmCanvas(canvasId) {
        return ApiClient.delete(`/logistics/vsm/canvases/${canvasId}`);
    },

    analyzeVsmRoutes(canvasId) {
        return ApiClient.get(`/logistics/vsm/canvases/${canvasId}/analyze-routes`);
    },
};
