import ApiClient from './api.client.js';

export const platformService = {
    getRuntime(params = '') {
        return ApiClient.get(`/platform/runtime${params ? `?${params}` : ''}`);
    },

    listTenants() {
        return ApiClient.get('/platform/tenants');
    },

    createTenant(payload) {
        return ApiClient.post('/platform/tenants', payload);
    },

    updateTenant(tenantCode, payload) {
        return ApiClient.patch(`/platform/tenants/${encodeURIComponent(tenantCode)}`, payload);
    },

    updateTheme(payload, params = '') {
        return ApiClient.put(`/platform/theme${params ? `?${params}` : ''}`, payload);
    },

    updateUiConfig(payload, params = '') {
        return ApiClient.put(`/platform/ui-config${params ? `?${params}` : ''}`, payload);
    },

    listFeatureFlags(params = '') {
        return ApiClient.get(`/platform/feature-flags${params ? `?${params}` : ''}`);
    },

    updateFeatureFlag(featureKey, payload, params = '') {
        return ApiClient.put(`/platform/feature-flags/${encodeURIComponent(featureKey)}${params ? `?${params}` : ''}`, payload);
    },

    applyFeatureProfile(profile, params = '') {
        return ApiClient.post(`/platform/feature-flags/apply-profile/${encodeURIComponent(profile)}${params ? `?${params}` : ''}`, {});
    },

    getConfigAudit(params = '') {
        return ApiClient.get(`/platform/config-audit${params ? `?${params}` : ''}`);
    },

    getIntegrationEventCatalog() {
        return ApiClient.get('/platform/integration/events/catalog');
    },

    listIntegrationEvents(params = '') {
        return ApiClient.get(`/platform/integration/events${params ? `?${params}` : ''}`);
    },

    createIntegrationEvent(payload, params = '') {
        return ApiClient.post(`/platform/integration/events${params ? `?${params}` : ''}`, payload);
    },

    runIntegrationValidation(params = '') {
        return ApiClient.post(`/platform/integration/health/run-validation${params ? `?${params}` : ''}`, {});
    },

    runNightlyValidation(params = '') {
        return ApiClient.post(`/platform/integration/jobs/nightly-validation${params ? `?${params}` : ''}`, {});
    },

    getIntegrationHealthLatest(params = '') {
        return ApiClient.get(`/platform/integration/health/latest${params ? `?${params}` : ''}`);
    },

    getIntegrationHealthDashboard(params = '') {
        return ApiClient.get(`/platform/integration/health/dashboard${params ? `?${params}` : ''}`);
    },

    getBackupPolicy() {
        return ApiClient.get('/platform/operations/backup-policy');
    },

    triggerBackupSnapshot(params = '') {
        return ApiClient.post(`/platform/operations/backup/snapshot${params ? `?${params}` : ''}`, {});
    },

    runIsolationCheck(params = '') {
        return ApiClient.get(`/platform/operations/security/isolation-check${params ? `?${params}` : ''}`);
    },

    seedDiagramLibraries(params = '') {
        return ApiClient.post(`/platform/diagram/libraries/seed${params ? `?${params}` : ''}`, {});
    },

    listDiagramLibraries(params = '') {
        return ApiClient.get(`/platform/diagram/libraries${params ? `?${params}` : ''}`);
    },

    createDiagramLibrary(payload, params = '') {
        return ApiClient.post(`/platform/diagram/libraries${params ? `?${params}` : ''}`, payload);
    },

    updateDiagramLibrary(itemId, payload) {
        return ApiClient.patch(`/platform/diagram/libraries/${itemId}`, payload);
    },

    deleteDiagramLibrary(itemId) {
        return ApiClient.delete(`/platform/diagram/libraries/${itemId}`);
    },

    listDiagramGuides(params = '') {
        return ApiClient.get(`/platform/diagram/libraries/guides${params ? `?${params}` : ''}`);
    },

    favoriteDiagramLibrary(itemId) {
        return ApiClient.post(`/platform/diagram/libraries/${itemId}/favorite`, {});
    },

    unfavoriteDiagramLibrary(itemId) {
        return ApiClient.delete(`/platform/diagram/libraries/${itemId}/favorite`);
    },

    listDiagramFavorites() {
        return ApiClient.get('/platform/diagram/libraries/favorites');
    },

    saveLayerTree(payload, params = '') {
        return ApiClient.put(`/platform/diagram/layer-tree${params ? `?${params}` : ''}`, payload);
    },

    getLayerTree(params = '') {
        return ApiClient.get(`/platform/diagram/layer-tree${params ? `?${params}` : ''}`);
    },

    seedPropertySchemas(params = '') {
        return ApiClient.post(`/platform/diagram/property-schemas/seed-defaults${params ? `?${params}` : ''}`, {});
    },

    listPropertySchemas(params = '') {
        return ApiClient.get(`/platform/diagram/property-schemas${params ? `?${params}` : ''}`);
    },

    upsertPropertySchema(elementType, payload, params = '') {
        return ApiClient.put(`/platform/diagram/property-schemas/${encodeURIComponent(elementType)}${params ? `?${params}` : ''}`, payload);
    },

    createDiagramChange(payload, params = '') {
        return ApiClient.post(`/platform/diagram/change-log${params ? `?${params}` : ''}`, payload);
    },

    listDiagramChanges(params = '') {
        return ApiClient.get(`/platform/diagram/change-log${params ? `?${params}` : ''}`);
    },

    listSimulationScenarios(params = '') {
        return ApiClient.get(`/platform/simulation/scenarios${params ? `?${params}` : ''}`);
    },

    createSimulationScenario(payload, params = '') {
        return ApiClient.post(`/platform/simulation/scenarios${params ? `?${params}` : ''}`, payload);
    },

    updateSimulationScenario(scenarioId, payload) {
        return ApiClient.patch(`/platform/simulation/scenarios/${scenarioId}`, payload);
    },

    deleteSimulationScenario(scenarioId) {
        return ApiClient.delete(`/platform/simulation/scenarios/${scenarioId}`);
    },

    runSimulationScenario(scenarioId, payload) {
        return ApiClient.post(`/platform/simulation/scenarios/${scenarioId}/run`, payload);
    },

    listSimulationResults(scenarioId, params = '') {
        return ApiClient.get(`/platform/simulation/scenarios/${scenarioId}/results${params ? `?${params}` : ''}`);
    },

    compareSimulationResults(scenarioId, params = '') {
        return ApiClient.get(`/platform/simulation/scenarios/${scenarioId}/compare${params ? `?${params}` : ''}`);
    },

    syncSimulationActions(scenarioId, params = '') {
        return ApiClient.post(`/platform/simulation/scenarios/${scenarioId}/actions/sync${params ? `?${params}` : ''}`, {});
    },

    exportSimulationExecutive(scenarioId, params = '') {
        return ApiClient.get(`/platform/simulation/scenarios/${scenarioId}/export/executive${params ? `?${params}` : ''}`);
    },

    createSimulationDecision(scenarioId, payload) {
        return ApiClient.post(`/platform/simulation/scenarios/${scenarioId}/decisions`, payload);
    },

    listSimulationDecisions(scenarioId) {
        return ApiClient.get(`/platform/simulation/scenarios/${scenarioId}/decisions`);
    },

    updateSimulationDecision(decisionId, payload) {
        return ApiClient.patch(`/platform/simulation/decisions/${decisionId}`, payload);
    },
};

export default platformService;
