const { defineConfig } = require('@meteorjs/rspack');

module.exports = defineConfig(Meteor => {
  return {
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['postcss-loader'],
          type: 'css',
        },
      ],
    },
  };
});
