/* eslint @typescript-eslint/no-var-requires: off */
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const htmlTemplate = './source/template.html.ejs';

module.exports = {
    entry: {
        main: './source/ts/main.ts',
        secondary: './source/ts/secondary.ts',
    },
    output: {
        filename: '[name].[contenthash].mjs',
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
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
            },
            {
                test: /\.tsx?$/i,
                use: {
                    loader: 'babel-loader',
                },
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: 'source/icon.svg', to: 'icon.svg' },
                { from: 'source/icon-16.png', to: 'icon-16.png' },
                { from: 'source/icon-32.png', to: 'icon-32.png' },
                { from: 'source/icon-180.png', to: 'icon-180.png' },
                { from: 'source/robots.txt', to: 'robots.txt' },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
        }),
        new HtmlWebpackPlugin({
            chunks: ['main'],
            filename: 'index.html',
            isReactApp: true,
            template: htmlTemplate,
            title: 'Hexagony',
        }),
        new HtmlWebpackPlugin({
            chunks: ['secondary'],
            filename: 'about.html',
            hasReactHeader: true,
            isReactApp: true,
            template: htmlTemplate,
            title: 'About',
        }),
        new HtmlWebpackPlugin({
            chunks: ['secondary'],
            filename: '403.html',
            hasReactHeader: true,
            isErrorMessage: true,
            template: htmlTemplate,
            title: '403 Forbidden',
        }),
        new HtmlWebpackPlugin({
            chunks: ['secondary'],
            filename: '404.html',
            hasReactHeader: true,
            isErrorMessage: true,
            template: htmlTemplate,
            title: '404 Not Found',
        }),
    ],
    resolve: {
        // Seems to help to find files for imports when extension is not specified.
        extensions: ['.ts', '.tsx', '.js']
    }
};
