require('@testing-library/jest-dom');

// Store reference to scheduler MessageChannel for cleanup
let schedulerChannel = null;
const originalMessageChannel = globalThis.MessageChannel;

if (originalMessageChannel) {
  globalThis.MessageChannel = class MessageChannel extends originalMessageChannel {
    constructor() {
      super();
      // Track the first MessageChannel created (likely from React scheduler)
      if (!schedulerChannel) {
        schedulerChannel = this;
      }
      if (global.__messagePorts__) {
        global.__messagePorts__.add(this.port1);
        global.__messagePorts__.add(this.port2);
      }
    }
  };
}

// Clean up all MessagePorts after each test to prevent open handles
afterEach(() => {
  if (global.__messagePorts__) {
    for (const port of global.__messagePorts__) {
      try {
        if (port && typeof port.close === 'function' && port.onmessage !== null) {
          // Don't close ports that have active listeners (like scheduler)
          continue;
        }
        if (port && typeof port.close === 'function') {
          port.close();
        }
      } catch (error) {
        // Port may already be closed, ignore errors
      }
    }
  }
});

// Clean up scheduler MessageChannel after all tests
afterAll(() => {
  if (schedulerChannel) {
    try {
      if (schedulerChannel.port1 && typeof schedulerChannel.port1.close === 'function') {
        schedulerChannel.port1.close();
      }
      if (schedulerChannel.port2 && typeof schedulerChannel.port2.close === 'function') {
        schedulerChannel.port2.close();
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

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
});

if (typeof window !== 'undefined') {
  const { getComputedStyle } = window;
  window.getComputedStyle = (elt) => getComputedStyle(elt);
  window.HTMLElement.prototype.scrollIntoView = () => {};
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserver;
}
