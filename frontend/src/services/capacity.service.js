import ApiClient from './api.client.js';

export const capacityService = {
    async getAssetCapacity(assetId) {
        return ApiClient.get(`/engineering/capacity/${assetId}`);
    },

    async getStaffing(assetId, demand, hoursPerShift = 8, shiftsPerDay = 1) {
        const query = `demand=${encodeURIComponent(demand)}&hours_per_shift=${encodeURIComponent(hoursPerShift)}&shifts_per_day=${encodeURIComponent(shiftsPerDay)}`;
        return ApiClient.get(`/engineering/capacity/${assetId}/staffing?${query}`);
    }
};
