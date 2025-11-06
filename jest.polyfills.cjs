// Set up TextEncoder/TextDecoder first - undici needs these
const { ReadableStream, TransformStream } = require('node:stream/web');
const { TextEncoder, TextDecoder } = require('node:util');
const { MessageChannel: NodeMessageChannel, MessagePort } = require('node:worker_threads');

// Track all MessagePorts globally for cleanup
global.__messagePorts__ = new Set();

// Wrap MessageChannel to track all ports created (including by React scheduler)
class TrackedMessageChannel extends NodeMessageChannel {
  constructor() {
    super();
    global.__messagePorts__.add(this.port1);
    global.__messagePorts__.add(this.port2);
  }
}

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.ReadableStream = ReadableStream;
globalThis.TransformStream = TransformStream;
globalThis.MessageChannel = TrackedMessageChannel;
globalThis.MessagePort = MessagePort;

// Now import fetch polyfills from undici (used internally by Node.js)
const { fetch, Request, Response, Headers, FormData } = require('undici');

// Set up Web APIs immediately on global scope
// This must happen before Next.js modules are loaded
globalThis.fetch = fetch;
globalThis.Request = Request;
globalThis.Response = Response;
globalThis.Headers = Headers;
globalThis.FormData = FormData;

// Also set on global for compatibility
global.fetch = fetch;
global.Request = Request;
global.Response = Response;
global.Headers = Headers;
global.FormData = FormData;
