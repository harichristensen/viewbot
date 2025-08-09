// ViewBot Dashboard Main JavaScript

// Global variables
let updateInterval;
let currentSimulations = [];
let schedulerStatus = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    
    // Set up auto-refresh
    updateInterval = setInterval(updateDashboard, 5000); // Update every 5 seconds
    
    // Set up form handlers
    document.getElementById('new-simulation-form').addEventListener('submit', handleNewSimulation);
});

// Initialize dashboard with data
async function initializeDashboard() {
    try {
        // Check authentication (mock for now - in production, redirect to login)
        if (!api.token) {
            // For demo purposes, use a mock token
            api.setToken('demo-token');
        }
        
        await updateDashboard();
        showToast('Dashboard loaded successfully', 'success');
    } catch (error) {
        showToast('Failed to initialize dashboard: ' + error.message, 'error');
    }
}

// Update all dashboard sections
async function updateDashboard() {
    try {
        await Promise.all([
            updateOverview(),
            updateScheduler(),
            updateSimulations(),
            updateConfigurations()
        ]);
    } catch (error) {
        console.error('Dashboard update error:', error);
    }
}

// Update overview section
async function updateOverview() {
    try {
        // Get user stats
        const userStats = await api.getUserStats();
        document.getElementById('bot-users-count').textContent = userStats.data.summary.total;
        document.getElementById('active-bots').textContent = userStats.data.summary.active;
        
        // Get activity stats
        const activityStats = await api.getActivityStats();
        const todayPosts = activityStats.data.posts.reduce((sum, item) => sum + parseInt(item.count), 0);
        document.getElementById('posts-today').textContent = todayPosts;
        
        // Get performance stats
        const perfStats = await api.getPerformanceStats();
        document.getElementById('total-posts').textContent = perfStats.data.database.total_posts;
        document.getElementById('success-rate').textContent = perfStats.data.performance.successRate;
        
        // Get realtime stats
        const realtimeStats = await api.getRealtimeStats();
        document.getElementById('realtime-views').textContent = realtimeStats.data.last5Minutes.views;
        document.getElementById('realtime-likes').textContent = realtimeStats.data.last5Minutes.likes;
        document.getElementById('realtime-posts').textContent = realtimeStats.data.last5Minutes.posts;
        
        // Get simulation count
        const simulations = await api.getSimulations();
        document.getElementById('active-simulations').textContent = simulations.data.length;
        
    } catch (error) {
        console.error('Failed to update overview:', error);
    }
}

// Update scheduler section
async function updateScheduler() {
    try {
        const status = await api.getSchedulerStatus();
        schedulerStatus = status.data;
        
        // Update scheduler status
        const statusElement = document.getElementById('scheduler-status');
        statusElement.textContent = schedulerStatus.isRunning ? 'Running' : 'Stopped';
        statusElement.className = schedulerStatus.isRunning ? 'text-success' : 'text-danger';
        
        document.getElementById('scheduled-jobs').textContent = schedulerStatus.jobCount;
        
        // Update jobs table
        const jobsBody = document.getElementById('scheduler-jobs-body');
        jobsBody.innerHTML = '';
        
        schedulerStatus.jobs.forEach(job => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${job.configId}</td>
                <td>${job.name}</td>
                <td>${job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}</td>
                <td>${job.runCount}</td>
                <td>
                    <span class="badge ${job.isActive ? 'bg-success' : 'bg-secondary'}">
                        ${job.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="triggerJob(${job.configId})">
                        <i class="bi bi-play"></i> Trigger
                    </button>
                </td>
            `;
            jobsBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to update scheduler:', error);
    }
}

// Update simulations section
async function updateSimulations() {
    try {
        const simulations = await api.getSimulations();
        currentSimulations = simulations.data;
        
        const container = document.getElementById('active-simulations-list');
        container.innerHTML = '';
        
        if (currentSimulations.length === 0) {
            container.innerHTML = '<p class="text-muted">No active simulations</p>';
            return;
        }
        
        currentSimulations.forEach(sim => {
            const card = document.createElement('div');
            card.className = 'card simulation-card mb-3';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6>Media ID: ${sim.targetMediaId}</h6>
                            <p class="mb-1">
                                Target: ${sim.maxViews.toLocaleString()} views, 
                                ${sim.maxLikes.toLocaleString()} likes
                            </p>
                            <small class="text-muted">
                                Started: ${new Date(sim.startTime).toLocaleString()}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="stopSimulation(${sim.targetMediaId})">
                            <i class="bi bi-stop"></i> Stop
                        </button>
                    </div>
                    <div class="mt-3">
                        <div class="d-flex justify-content-between mb-1">
                            <small>Progress</small>
                            <small>${sim.progress}</small>
                        </div>
                        <div class="progress">
                            <div class="progress-bar" style="width: ${sim.progress}"></div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to update simulations:', error);
    }
}

// Update configurations section
async function updateConfigurations() {
    try {
        const configs = await api.getConfigs();
        const tbody = document.getElementById('config-table-body');
        tbody.innerHTML = '';
        
        configs.data.forEach(config => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${config.id}</td>
                <td>${config.name}</td>
                <td>
                    <span class="badge bg-info">${config.configType}</span>
                </td>
                <td>
                    <span class="badge ${config.isActive ? 'bg-success' : 'bg-secondary'}">
                        ${config.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${config.lastRunAt ? new Date(config.lastRunAt).toLocaleString() : 'Never'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editConfig(${config.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteConfig(${config.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to update configurations:', error);
    }
}

// Scheduler control functions
async function startScheduler() {
    try {
        await api.startScheduler();
        showToast('Scheduler started successfully', 'success');
        await updateScheduler();
    } catch (error) {
        showToast('Failed to start scheduler: ' + error.message, 'error');
    }
}

async function stopScheduler() {
    try {
        await api.stopScheduler();
        showToast('Scheduler stopped successfully', 'success');
        await updateScheduler();
    } catch (error) {
        showToast('Failed to stop scheduler: ' + error.message, 'error');
    }
}

async function reloadScheduler() {
    try {
        await api.reloadScheduler();
        showToast('Scheduler reloaded successfully', 'success');
        await updateScheduler();
    } catch (error) {
        showToast('Failed to reload scheduler: ' + error.message, 'error');
    }
}

async function triggerJob(configId) {
    try {
        await api.triggerPosting(configId);
        showToast('Job triggered successfully', 'success');
    } catch (error) {
        showToast('Failed to trigger job: ' + error.message, 'error');
    }
}

// Simulation functions
async function handleNewSimulation(event) {
    event.preventDefault();
    
    const params = {
        targetMediaId: parseInt(document.getElementById('sim-media-id').value),
        maxViews: parseInt(document.getElementById('sim-max-views').value),
        maxLikes: parseInt(document.getElementById('sim-max-likes').value),
        growthDurationHours: parseInt(document.getElementById('sim-duration').value)
    };
    
    try {
        await api.startSimulation(params);
        showToast('Simulation started successfully', 'success');
        document.getElementById('new-simulation-form').reset();
        await updateSimulations();
    } catch (error) {
        showToast('Failed to start simulation: ' + error.message, 'error');
    }
}

async function stopSimulation(mediaId) {
    if (!confirm('Are you sure you want to stop this simulation?')) {
        return;
    }
    
    try {
        await api.stopSimulation(mediaId);
        showToast('Simulation stopped successfully', 'success');
        await updateSimulations();
    } catch (error) {
        showToast('Failed to stop simulation: ' + error.message, 'error');
    }
}

// Configuration functions
function showNewConfigModal() {
    // In a real implementation, this would show a modal dialog
    alert('Configuration creation UI would appear here');
}

async function editConfig(id) {
    // In a real implementation, this would show an edit modal
    alert(`Edit configuration ${id} UI would appear here`);
}

async function deleteConfig(id) {
    if (!confirm('Are you sure you want to delete this configuration?')) {
        return;
    }
    
    try {
        await api.deleteConfig(id);
        showToast('Configuration deleted successfully', 'success');
        await updateConfigurations();
    } catch (error) {
        showToast('Failed to delete configuration: ' + error.message, 'error');
    }
}

// Utility functions
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('notification-toast');
    const toast = new bootstrap.Toast(toastElement);
    
    // Update toast content and styling
    toastElement.querySelector('.toast-body').textContent = message;
    toastElement.className = `toast toast-${type}`;
    
    toast.show();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});