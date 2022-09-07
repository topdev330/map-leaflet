const path = require('path');

const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries");

module.exports = {
  mode: 'development',
  watchOptions: {
    ignored: path.resolve(__dirname, './node_modules'),
  },
  entry: [
    './src/index.js',  // path to our input file
    './src/styles.scss'
  ],
  devServer: {
    contentBase: './dist',
    port: 4444,
    host: '0.0.0.0',
    disableHostCheck: true,
  },
  output: {
    filename: 'map-bundle.js',  // output bundle file name
    path: path.resolve(__dirname, './dist'),  // path to our Django static directory
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
       test: /\.(svg|woff|woff2|ttf|eot|otf)$/,
      //  use: [
      //     {
      //         loader: 'file-loader',
      //         options: {
      //             name: "[path][name].[ext]"
      //         }
      //     }
      // ]
       use: 'file-loader?name=fonts/[name].[ext]!static'
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        loader: 'url-loader'
      }
    ],
  },
};
