// API Client for ViewBot Dashboard

class ViewBotAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('viewbot_token');
    }

    // Helper method for API requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    setToken(token) {
        this.token = token;
        localStorage.setItem('viewbot_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('viewbot_token');
    }

    // Scheduler endpoints
    async getSchedulerStatus() {
        return this.request('/scheduler/status');
    }

    async startScheduler() {
        return this.request('/scheduler/start', { method: 'POST' });
    }

    async stopScheduler() {
        return this.request('/scheduler/stop', { method: 'POST' });
    }

    async reloadScheduler() {
        return this.request('/scheduler/reload', { method: 'POST' });
    }

    async triggerPosting(configId) {
        return this.request('/scheduler/trigger', {
            method: 'POST',
            body: JSON.stringify({ configId })
        });
    }

    // Simulation endpoints
    async getSimulations() {
        return this.request('/simulation');
    }

    async getSimulationStatus(mediaId) {
        return this.request(`/simulation/${mediaId}`);
    }

    async startSimulation(params) {
        return this.request('/simulation/start', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    async stopSimulation(mediaId) {
        return this.request(`/simulation/${mediaId}/stop`, { method: 'POST' });
    }

    async updateSimulations() {
        return this.request('/simulation/update', { method: 'POST' });
    }

    async getSimulationHistory(mediaId, limit = 100) {
        return this.request(`/simulation/history/${mediaId}?limit=${limit}`);
    }

    // Configuration endpoints
    async getConfigs(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/config${query ? '?' + query : ''}`);
    }

    async getConfig(id) {
        return this.request(`/config/${id}`);
    }

    async createConfig(config) {
        return this.request('/config', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    async updateConfig(id, updates) {
        return this.request(`/config/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteConfig(id) {
        return this.request(`/config/${id}`, { method: 'DELETE' });
    }

    async getConfigTemplate(type) {
        return this.request(`/config/templates/${type}`);
    }

    // Statistics endpoints
    async getActivityStats(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/stats/activity${query ? '?' + query : ''}`);
    }

    async getUserStats() {
        return this.request('/stats/users');
    }

    async getSimulationStats() {
        return this.request('/stats/simulations');
    }

    async getPerformanceStats() {
        return this.request('/stats/performance');
    }

    async getRealtimeStats() {
        return this.request('/stats/realtime');
    }
}

// Export as global variable for use in dashboard.js
window.api = new ViewBotAPI();