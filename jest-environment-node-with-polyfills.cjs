const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class CustomEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.messagePorts = new Set();
  }

  async setup() {
    await super.setup();

    function createStorageMock() {
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        get length() {
          return 0;
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
