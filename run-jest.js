#!/usr/bin/env node

// Wrapper script to run Jest with required Node.js flags for version 25.2.0+
// This ensures --localstorage-file is passed to avoid SecurityError

process.env.NODE_OPTIONS =
  (process.env.NODE_OPTIONS || '') + ' --localstorage-file=/tmp/jest-localstorage.json';

// Run Jest
require('jest/bin/jest');
