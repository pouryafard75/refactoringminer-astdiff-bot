const path = require('path');
const nodeExternals = require('webpack-node-externals');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
    
module.exports = {
  externals: [nodeExternals()],
  entry: './src/index.js',  // Your entry point
  
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      'node-fetch': 'fetch-h2', // or 'node-fetch/browser'
    },
    fallback: {
      "path": require.resolve("path-browserify"),
      "fs": false,
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer/"),
      "crypto": require.resolve("crypto-browserify"),
    },
  },
  target: "node", // Or "async-node"
  mode: 'production',
  plugins: [
    new NodePolyfillPlugin(),  // Ensure the plugin is applied
  ],
};
