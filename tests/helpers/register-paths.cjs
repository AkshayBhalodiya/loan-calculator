const path = require('node:path');
const Module = require('node:module');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const resolved = path.join(process.cwd(), 'src', request.slice(2));
    return originalResolveFilename(resolved, parent, isMain, options);
  }
  return originalResolveFilename(request, parent, isMain, options);
};
