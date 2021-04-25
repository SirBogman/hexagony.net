const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    main: './source/js/main.mjs',
    secondary: './source/js/secondary.mjs',
  },
  output: {
    filename: '[name].mjs',
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, 'build'),
  },
  devServer: {
    contentBase: './build',
    port: 8082,
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/i,
        use: [ MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader' ]
      },
      {
        test: /\.jsx$/i,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
            plugins: ['@babel/plugin-proposal-class-properties'],
          },
        },
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
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
};
