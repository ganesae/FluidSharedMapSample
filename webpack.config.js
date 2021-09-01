/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = (env) => {
  const htmlTemplate = './app/index.html';
  return {
    devtool: 'inline-source-map',
    entry: './app/src/app.tsx',
    mode: 'development',
    devServer: {
      port: 9000,
    },
    // resolve: {
    //     fallback: { "stream": require.resolve("stream-browserify") }
    // },
    module: {
      rules: [
        {
          test: /\.s?css$/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
        },
        {
          test: /\.js$/,
          use: ['source-map-loader'],
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist/app'),
      filename: '[name].[contenthash].js',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: htmlTemplate,
      }),
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
  };
};
