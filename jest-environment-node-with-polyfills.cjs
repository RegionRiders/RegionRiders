const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class CustomEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.messagePorts = new Set();
  }

  async setup() {
    await super.setup();

    function createStorageMock() {
      const store = new Map();
      return {
        getItem: (key) => {
          key = String(key);
          return store.has(key) ? store.get(key) : null;
        },
        setItem: (key, value) => {
          store.set(String(key), String(value));
        },
        removeItem: (key) => {
          store.delete(String(key));
        },
        clear: () => {
          store.clear();
        },
        key: (index) => {
          if (typeof index !== 'number' || index < 0 || index >= store.size) return null;
          return Array.from(store.keys())[index] ?? null;
        },
        get length() {
          return store.size;
        },
      };
    }
    this.global.localStorage = createStorageMock();
    this.global.sessionStorage = createStorageMock();

    // Set up Node.js polyfills
    const { ReadableStream, TransformStream } = require('node:stream/web');
    const { TextEncoder, TextDecoder } = require('node:util');
    const { MessageChannel: NodeMessageChannel, MessagePort } = require('node:worker_threads');

    this.global.TextEncoder = TextEncoder;
    this.global.TextDecoder = TextDecoder;
    this.global.ReadableStream = ReadableStream;
    this.global.TransformStream = TransformStream;
    this.global.MessagePort = MessagePort;

    // Wrap MessageChannel to track ports for cleanup
    const messagePorts = this.messagePorts;
    this.global.MessageChannel = class MessageChannel extends NodeMessageChannel {
      constructor() {
        super();
        messagePorts.add(this.port1);
        messagePorts.add(this.port2);
      }
    };

    // Set up fetch APIs from undici
    const { fetch, Request, Response, Headers, FormData } = require('undici');

    this.global.fetch = fetch;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.Headers = Headers;
    this.global.FormData = FormData;
  }

  async teardown() {
    // Close all MessagePorts to prevent open handles
    for (const port of this.messagePorts) {
      try {
        if (port && typeof port.close === 'function') {
          port.close();
        }
      } catch (error) {
        // Port may already be closed, ignore errors
      }
    }
    this.messagePorts.clear();

    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = CustomEnvironment;
