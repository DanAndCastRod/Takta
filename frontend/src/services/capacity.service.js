export const capacityService = {
    async getAssetCapacity(assetId) {
        try {
            const response = await fetch(`http://localhost:9003/api/engineering/capacity/${assetId}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to fetch capacity');
            }
            return await response.json();
        } catch (error) {
            console.error('Capacity Service Error:', error);
            throw error;
        }
    }
};
