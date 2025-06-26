// API Client for SteamSentinel

const api = {
    baseURL: '/api',
    
    // Helper method for making HTTP requests
    async request(method, endpoint, data = null) {
        const url = this.baseURL + endpoint;
        const options = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // Use default error message if JSON parsing fails
                }
                throw new Error(errorMessage);
            }
            
            // Handle empty responses
            if (response.status === 204) {
                return { success: true };
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`API request failed: ${method} ${endpoint}`, error);
            throw error;
        }
    },
    
    // GET request
    async get(endpoint) {
        return this.request('GET', endpoint);
    },
    
    // POST request
    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    },
    
    // PUT request
    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    },
    
    // DELETE request
    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    },
    
    // Game API endpoints
    games: {
        async getAll(enabledOnly = false) {
            return api.get(`/games${enabledOnly ? '?enabled=true' : ''}`);
        },
        
        async getById(id) {
            return api.get(`/games/${id}`);
        },
        
        async getDashboard() {
            return api.get('/games/dashboard');
        },
        
        async add(gameData) {
            return api.post('/games', gameData);
        },
        
        async update(id, updates) {
            return api.put(`/games/${id}`, updates);
        },
        
        async delete(id) {
            return api.delete(`/games/${id}`);
        },
        
        async getPriceHistory(steamAppId, days = 30) {
            return api.get(`/games/${steamAppId}/price-history?days=${days}`);
        }
    },
    
    // Monitoring API endpoints
    monitoring: {
        async getStatus() {
            return api.get('/monitoring/status');
        },
        
        async runManual() {
            return api.post('/monitoring/run');
        },
        
        async runSingleGame(steamAppId) {
            return api.post(`/monitoring/run/${steamAppId}`);
        },
        
        async updateInterval(intervalHours) {
            return api.put('/monitoring/interval', { intervalHours });
        },
        
        async getHealth() {
            return api.get('/monitoring/health');
        },
        
        async getLogs(lines = 100) {
            return api.get(`/monitoring/logs?lines=${lines}`);
        },
        
        async getSystemInfo() {
            return api.get('/monitoring/system');
        }
    }
};