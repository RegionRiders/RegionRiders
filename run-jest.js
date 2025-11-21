#!/usr/bin/env node

// Wrapper script to run Jest with required Node.js flags for version 25.2.0+
// This ensures --localstorage-file is passed to avoid SecurityError

const os = require('os');
const path = require('path');
const localStoragePath = path.join(os.tmpdir(), 'jest-localstorage.json');
process.env.NODE_OPTIONS =
  (process.env.NODE_OPTIONS || '') + ` --localstorage-file=${localStoragePath}`;

require('jest/bin/jest');
