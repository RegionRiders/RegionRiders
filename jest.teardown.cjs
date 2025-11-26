// Global teardown to close MessagePorts created by React scheduler
module.exports = async () => {
  // Clean up any MessagePorts that were tracked
  if (global.__messagePorts__) {
    for (const port of global.__messagePorts__) {
      try {
        if (port && typeof port.close === 'function') {
          port.close();
        }
      } catch (error) {
        // Port may already be closed, ignore errors
      }
    }
    global.__messagePorts__.clear();
  }
};
