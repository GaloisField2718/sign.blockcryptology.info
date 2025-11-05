const { override, addWebpackResolve, addWebpackPlugin } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  addWebpackResolve({
    fallback: {
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
    },
  }),
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  )
);

