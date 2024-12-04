// Import the TextEncoder and TextDecoder from Node.js utilities
const { TextEncoder, TextDecoder } = require('util');

// Assign them to the global scope to make them available in all test files
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
