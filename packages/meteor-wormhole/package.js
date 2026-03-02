Package.describe({
  name: 'meteor-wormhole',
  version: '0.1.0',
  summary: 'A cosmic bridge connecting Meteor methods to AI agents through MCP',
  git: 'https://github.com/wreiske/meteor-wormhole',
  documentation: 'README.md',
});

Npm.depends({
  '@modelcontextprotocol/sdk': '1.27.1',
  'zod': '4.3.6',
});

Package.onUse(function (api) {
  api.versionsFrom(['3.0']);
  api.use(['ecmascript', 'webapp', 'ddp-server', 'meteor'], 'server');
  api.mainModule('server.js', 'server');
});

Package.onTest(function (api) {
  api.use(['ecmascript', 'tinytest', 'meteor-wormhole']);
  api.mainModule('tests/main.js', 'server');
});
