const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class CustomEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    
    // Set up TextEncoder/TextDecoder first
    const { ReadableStream, TransformStream } = require('node:stream/web');
    const { TextEncoder, TextDecoder } = require('node:util');
    
    this.global.TextEncoder = TextEncoder;
    this.global.TextDecoder = TextDecoder;
    this.global.ReadableStream = ReadableStream;
    this.global.TransformStream = TransformStream;
    
    // Now import and set up fetch APIs from undici
    const { fetch, Request, Response, Headers, FormData } = require('undici');
    
    this.global.fetch = fetch;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.Headers = Headers;
    this.global.FormData = FormData;
  }

  async teardown() {
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = CustomEnvironment;

