const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './source/js/main.mjs',
  output: {
    filename: 'main.mjs',
    path: path.resolve(__dirname, 'build'),
  },
  devServer: {
    contentBase: './build',
    port: 8082,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        // SCSS
        test: /\.scss$/i,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'source/index.html', to: 'index.html' },
        { from: 'source/403.html', to: '403.html' },
        { from: 'source/404.html', to: '404.html' },
        { from: 'source/about.html', to: 'about.html' },
        { from: 'source/icon.svg', to: 'icon.svg' },
        { from: 'source/icon-16.png', to: 'icon-16.png' },
        { from: 'source/icon-32.png', to: 'icon-32.png' },
        { from: 'source/icon-180.png', to: 'icon-180.png' },
        { from: 'source/robots.txt', to: 'robots.txt' },
        // CSS files are for the non-JavaScript pages 403, 404, and about.
        { from: 'source/css/error.css', to: 'css/error.css' },
        { from: 'source/css/header.css', to: 'css/header.css' },
        { from: 'source/css/limitedwidth.css', to: 'css/limitedwidth.css' },
        { from: 'source/css/main.css', to: 'css/main.css' },
      ],
    }),
  ],
};
