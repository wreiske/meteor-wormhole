Package.describe({
  name: 'wreiske:meteor-wormhole',
  version: '0.3.0',
  summary:
    'A cosmic bridge connecting Meteor methods to AI agents through MCP, REST API, and OpenAPI',
  git: 'https://github.com/wreiske/meteor-wormhole',
  documentation: 'README.md',
});

Npm.depends({
  '@modelcontextprotocol/sdk': '1.27.1',
  zod: '4.3.6',
});

Package.onUse(function (api) {
  api.versionsFrom(['3.4']);
  api.use(
    ['ecmascript', 'webapp', 'ddp-server', 'ddp-client', 'ddp-common', 'check', 'meteor'],
    'server',
  );
  // Optional: only needed for `auth: true` (built-in login-token resolver)
  api.use('accounts-base', 'server', { weak: true });
  api.mainModule('server.js', 'server');
});

Package.onTest(function (api) {
  api.use(['ecmascript', 'tinytest', 'wreiske:meteor-wormhole']);
  api.mainModule('tests/main.js', 'server');
});
