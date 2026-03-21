import ApiClient from './api.client.js';

export const executionService = {
    getContext() {
        return ApiClient.get('/execution/context/me');
    },

    resolveContext(params = '') {
        return ApiClient.get(`/execution/context/resolve${params ? `?${params}` : ''}`);
    },

    getLogs(params = '') {
        return ApiClient.get(`/execution/logs${params ? `?${params}` : ''}`);
    },

    createLog(payload) {
        return ApiClient.post('/execution/logs', payload);
    },

    deleteLog(logId) {
        return ApiClient.delete(`/execution/logs/${logId}`);
    },

    getDowntimes(params = '') {
        return ApiClient.get(`/execution/downtimes${params ? `?${params}` : ''}`);
    },

    createDowntime(payload) {
        return ApiClient.post('/execution/downtimes', payload);
    },

    closeDowntime(eventId, payload = {}) {
        return ApiClient.patch(`/execution/downtimes/${eventId}/close`, payload);
    },

    deleteDowntime(eventId) {
        return ApiClient.delete(`/execution/downtimes/${eventId}`);
    },

    getOperators(activeOnly = false) {
        return ApiClient.get(`/execution/staff/operators${activeOnly ? '?active_only=true' : ''}`);
    },

    createOperator(payload) {
        return ApiClient.post('/execution/staff/operators', payload);
    },

    updateOperator(operatorId, payload) {
        return ApiClient.patch(`/execution/staff/operators/${operatorId}`, payload);
    },

    deleteOperator(operatorId) {
        return ApiClient.delete(`/execution/staff/operators/${operatorId}`);
    },

    getOperatorSkills(operatorId) {
        return ApiClient.get(`/execution/staff/${operatorId}/skills`);
    },

    createSkill(payload) {
        return ApiClient.post('/execution/staff/skills', payload);
    },

    updateSkill(skillId, payload) {
        return ApiClient.patch(`/execution/staff/skills/${skillId}`, payload);
    },

    deleteSkill(skillId) {
        return ApiClient.delete(`/execution/staff/skills/${skillId}`);
    },

    normalizeVoice(transcript) {
        return ApiClient.post('/execution/voice/normalize', { transcript });
    },

    getFailureCatalog() {
        return ApiClient.get('/execution/failure-catalog');
    },

    createFailureCatalog(payload) {
        return ApiClient.post('/execution/failure-catalog', payload);
    },

    updateFailureCatalog(itemId, payload) {
        return ApiClient.patch(`/execution/failure-catalog/${itemId}`, payload);
    },

    deleteFailureCatalog(itemId) {
        return ApiClient.delete(`/execution/failure-catalog/${itemId}`);
    },

    getContextRules(params = '') {
        return ApiClient.get(`/execution/context/rules${params ? `?${params}` : ''}`);
    },

    createContextRule(payload) {
        return ApiClient.post('/execution/context/rules', payload);
    },

    updateContextRule(ruleId, payload) {
        return ApiClient.patch(`/execution/context/rules/${ruleId}`, payload);
    },

    deleteContextRule(ruleId) {
        return ApiClient.delete(`/execution/context/rules/${ruleId}`);
    },

    getAssignments(params = '') {
        return ApiClient.get(`/execution/staff/assignments${params ? `?${params}` : ''}`);
    },

    createAssignment(payload) {
        return ApiClient.post('/execution/staff/assignments', payload);
    },

    closeAssignment(assignmentId, payload = {}) {
        return ApiClient.patch(`/execution/staff/assignments/${assignmentId}/close`, payload);
    },

    deleteAssignment(assignmentId) {
        return ApiClient.delete(`/execution/staff/assignments/${assignmentId}`);
    },

    getShiftPlans(params = '') {
        return ApiClient.get(`/execution/shifts/plans${params ? `?${params}` : ''}`);
    },

    createShiftPlan(payload) {
        return ApiClient.post('/execution/shifts/plans', payload);
    },

    bulkShiftPlans(payload) {
        return ApiClient.post('/execution/shifts/plans/bulk', payload);
    },

    deleteShiftPlan(planId) {
        return ApiClient.delete(`/execution/shifts/plans/${planId}`);
    },
};
