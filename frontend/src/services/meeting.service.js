import ApiClient from './api.client.js';

export const meetingService = {
    list(params = '') {
        return ApiClient.get(`/meetings/records${params ? `?${params}` : ''}`);
    },

    get(meetingId) {
        return ApiClient.get(`/meetings/records/${meetingId}`);
    },

    create(payload) {
        return ApiClient.post('/meetings/records', payload);
    },

    update(meetingId, payload) {
        return ApiClient.patch(`/meetings/records/${meetingId}`, payload);
    },

    remove(meetingId) {
        return ApiClient.delete(`/meetings/records/${meetingId}`);
    },

    dashboard() {
        return ApiClient.get('/meetings/dashboard');
    },

    qualityIssues(params = '') {
        return ApiClient.get(`/meetings/quality/issues${params ? `?${params}` : ''}`);
    },

    syncQualityCommitments(meetingId) {
        return ApiClient.post(`/meetings/records/${meetingId}/sync-quality-commitments`, {});
    },

    compare(meetingId, previousMeetingId = null) {
        const params = previousMeetingId ? `?previous_meeting_id=${encodeURIComponent(previousMeetingId)}` : '';
        return ApiClient.get(`/meetings/records/${meetingId}/comparison${params}`);
    },

    materializeActions(meetingId, payload = {}) {
        return ApiClient.post(`/meetings/records/${meetingId}/materialize-actions`, payload);
    },

    heuristicImport(rawText, defaultTitle = 'Acta de Ingenieria de Procesos', assetId = null) {
        return ApiClient.post('/meetings/import/heuristic', {
            raw_text: rawText,
            default_title: defaultTitle,
            asset_id: assetId,
        });
    },
};
