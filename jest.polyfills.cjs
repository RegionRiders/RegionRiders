// Set up TextEncoder/TextDecoder first - undici needs these
const { ReadableStream, TransformStream } = require('node:stream/web');
const { TextEncoder, TextDecoder } = require('node:util');

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.ReadableStream = ReadableStream;
globalThis.TransformStream = TransformStream;

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




