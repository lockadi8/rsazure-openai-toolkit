const QueueManager = require('./QueueManager');
const QueueDashboard = require('./QueueDashboard');

/**
 * Queue Service Integration
 * Export semua queue-related services
 */

// Singleton instance
let queueManagerInstance = null;
let dashboardInstance = null;

/**
 * Get or create queue manager instance
 */
async function getQueueManager(options = {}) {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager(options);
    await queueManagerInstance.initialize();
  }
  return queueManagerInstance;
}

/**
 * Get or create dashboard instance
 */
async function getDashboard(queueManager, options = {}) {
  if (!dashboardInstance) {
    dashboardInstance = new QueueDashboard(options);
    await dashboardInstance.start(queueManager);
  }
  return dashboardInstance;
}

/**
 * Initialize queue system for main application
 */
async function initializeQueueSystem(options = {}) {
  const {
    enableDashboard = true,
    dashboardOptions = {},
    queueOptions = {},
  } = options;
  
  // Initialize queue manager
  const queueManager = await getQueueManager(queueOptions);
  
  // Initialize dashboard if enabled
  let dashboard = null;
  if (enableDashboard) {
    dashboard = await getDashboard(queueManager, dashboardOptions);
  }
  
  return {
    queueManager,
    dashboard,
  };
}

/**
 * Shutdown queue system
 */
async function shutdownQueueSystem() {
  if (dashboardInstance) {
    await dashboardInstance.stop();
    dashboardInstance = null;
  }
  
  if (queueManagerInstance) {
    await queueManagerInstance.shutdown();
    queueManagerInstance = null;
  }
}

module.exports = {
  QueueManager,
  QueueDashboard,
  getQueueManager,
  getDashboard,
  initializeQueueSystem,
  shutdownQueueSystem,
};
