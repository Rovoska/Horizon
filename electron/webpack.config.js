const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const vueTransformer = require('@f-list/vue-ts/transform').default;
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const packageJson = require('./package.json');
const { DefinePlugin } = require('webpack');
const APP_VERSION = process.env.APP_VERSION || packageJson.version;

const mainConfig = {
    entry: [
      path.join(__dirname, 'main.ts'),
      path.join(__dirname, 'package.json')
    ],
    output: {
      path: __dirname + '/app',
      filename: 'main.js'
    },
    context: __dirname,
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            configFile: __dirname + '/tsconfig-main.json',
            transpileOnly: true
          }
        },
        {
          test: path.join(__dirname, 'package.json'),
          loader: 'file-loader',
          options: { name: 'package.json' },
          type: 'javascript/auto'
        },
        {
          test: /\.(png|ico|html)$/,
          loader: 'file-loader',
          options: { name: '[name].[ext]' }
        },
        { test: /\.raw\.js$/, loader: 'raw-loader' }
      ]
    },
    node: {
      __dirname: false,
      __filename: false
    },
    plugins: [
      new DefinePlugin({
        'process.env.APP_VERSION': JSON.stringify(APP_VERSION)
      })
    ],
    resolve: {
      extensions: ['.ts', '.js']
    },
    optimization: {
      minimize: false,
      moduleIds: 'named',
      chunkIds: 'named'
    }
  },
  rendererConfig = {
    entry: {
      chat: [
        path.join(__dirname, 'chat.ts'),
        path.join(__dirname, 'index.html')
      ],
      window: [
        path.join(__dirname, 'window.ts'),
        path.join(__dirname, 'window.html'),
        path.join(__dirname, 'build', 'tray@2x.png')
      ],
      settings: [
        path.join(__dirname, 'settings.ts'),
        path.join(__dirname, 'settings.html'),
        path.join(__dirname, 'build', 'tray@2x.png')
      ],
      changelog: [
        path.join(__dirname, 'changelog.ts'),
        path.join(__dirname, 'changelog.html'),
        path.join(__dirname, 'build', 'tray@2x.png')
      ],
      exporter: [
        path.join(__dirname, 'exporter.ts'),
        path.join(__dirname, 'exporter.html'),
        path.join(__dirname, 'build', 'tray@2x.png')
      ],
      about: [
        path.join(__dirname, 'about.ts'),
        path.join(__dirname, 'about.html'),
        path.join(__dirname, 'build', 'tray@2x.png')
      ]
    },
    output: {
      path: __dirname + '/app',
      publicPath: './',
      filename: '[name].js'
    },
    context: __dirname,
    target: 'electron-renderer',
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            compilerOptions: {
              preserveWhitespace: false
            }
          }
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
            configFile: __dirname + '/tsconfig-renderer.json',
            transpileOnly: true,
            getCustomTransformers: () => ({ before: [vueTransformer] })
          }
        },
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
        { test: /\.(woff2?)$/, loader: 'file-loader' },
        { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
        { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
        {
          test: /\.(wav|mp3|ogg)$/,
          exclude: /sound-themes/,
          loader: 'file-loader',
          options: { name: 'sounds/[name].[ext]' }
        },
        {
          test: /\.(png|ico|html)$/,
          loader: 'file-loader',
          options: { name: '[name].[ext]' }
        },
        {
          test: /\.vue\.scss/,
          // loader: ['vue-style-loader', {loader: 'css-loader', options: {esModule: false}},'sass-loader']
          use: [
            'vue-style-loader',
            { loader: 'css-loader', options: { esModule: false } },
            {
              loader: 'sass-loader',
              options: {
                warnRuleAsWarning: false,
                sassOptions: {
                  quietDeps: true,
                  // Add any specific codes here; '*' not supported, so rely on custom logger below.
                  silenceDeprecations: [
                    'mixed-decls',
                    'import',
                    'color-functions',
                    'global-builtin',
                    'slash-div',
                    'function-units'
                  ],
                  verbose: false
                }
              }
            }
          ]
        },
        {
          test: /\.vue\.css/,
          // loader: ['vue-style-loader', {loader: 'css-loader', options: {esModule: false}}]
          use: [
            'vue-style-loader',
            { loader: 'css-loader', options: { esModule: false } }
          ]
        },
        {
          test: /\.scss$/,
          exclude: /\.vue$/,
          use: [
            MiniCssExtractPlugin.loader,
            { loader: 'css-loader', options: { esModule: false } },
            {
              loader: 'sass-loader',
              options: {
                warnRuleAsWarning: false,
                sassOptions: {
                  quietDeps: true,
                  silenceDeprecations: [
                    'mixed-decls',
                    'import',
                    'color-functions',
                    'global-builtin',
                    'slash-div',
                    'function-units'
                  ],
                  verbose: false
                }
              }
            }
          ]
        },
        { test: /\.raw\.js$/, loader: 'raw-loader' }
      ]
    },
    node: {
      __dirname: false,
      __filename: false
    },
    plugins: [
      new DefinePlugin({
        'process.env.APP_VERSION': JSON.stringify(APP_VERSION)
      }),
      new VueLoaderPlugin(),
      new MiniCssExtractPlugin({
        filename: '[name].css'
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path
              .resolve(__dirname, '..', 'chat', 'preview', 'assets', '**', '*')
              .replace(/\\/g, '/'),
            to: path.join('preview', 'assets'),
            context: path.resolve(__dirname, '..', 'chat', 'preview', 'assets')
          },
          {
            from: path
              .resolve(__dirname, '..', 'assets', '**', '*')
              .replace(/\\/g, '/'),
            to: path.join('assets'),
            context: path.resolve(__dirname, '..', 'assets')
          },
          {
            from: path
              .resolve(__dirname, '..', 'chat', 'sound-themes', '**', '*')
              .replace(/\\/g, '/'),
            to: path.join('sound-themes'),
            context: path.resolve(__dirname, '..', 'chat', 'sound-themes')
          },
          {
            from: path.join(__dirname, 'package.json'),
            to: 'package.json',
            transform(content) {
              const json = JSON.parse(content.toString());
              delete json.build; // Remove the "build" field
              return JSON.stringify(json, null, 2);
            }
          }
        ]
      })
    ],
    resolve: {
      extensions: ['.ts', '.js', '.vue', '.css']
      // alias: {qs: 'querystring'}
    },
    optimization: {
      splitChunks: { chunks: 'all', minChunks: 2, name: 'common' },
      minimize: false,
      moduleIds: 'named',
      chunkIds: 'named'
    }
  };

const storeWorkerEndpointConfig = _.assign(_.cloneDeep(mainConfig), {
  entry: [
    path.join(
      __dirname,
      '..',
      'learn',
      'store',
      'worker',
      'store.worker.endpoint.ts'
    )
  ],
  output: {
    path: __dirname + '/app',
    filename: 'storeWorkerEndpoint.js',
    globalObject: 'this'
  },

  target: 'electron-renderer',

  node: {
    global: true
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFile: __dirname + '/tsconfig-renderer.json',
          transpileOnly: true,
          getCustomTransformers: () => ({ before: [vueTransformer] })
        }
      }
    ]
  },

  optimization: {
    minimize: false,
    moduleIds: 'named',
    chunkIds: 'named'
  },

  plugins: [
    new DefinePlugin({
      'process.env.APP_VERSION': JSON.stringify(APP_VERSION)
    })
  ]
});

module.exports = function (mode) {
  const themesDir = path.join(__dirname, '../scss/themes/chat');
  const themes = fs.readdirSync(themesDir);

  // Create entry points for themes
  const themeEntries = {};
  for (const theme of themes) {
    if (!theme.endsWith('.scss')) continue;
    const absPath = path.join(themesDir, theme);
    const themeName = theme.replace('.scss', '');
    themeEntries[`themes/${themeName}`] = absPath;
  }

  // Add fa.scss entry
  const faPath = path.join(themesDir, '../../fa.scss');
  themeEntries['fa'] = faPath;

  // Update rendererConfig entry
  rendererConfig.entry = {
    ...rendererConfig.entry,
    ...themeEntries
  };

  if (mode === 'production') {
    process.env.NODE_ENV = 'production';

    mainConfig.devtool = false;
    rendererConfig.devtool = false;
    storeWorkerEndpointConfig.devtool = false;

    rendererConfig.plugins.push(new OptimizeCssAssetsPlugin());
  } else {
    // mainConfig.devtool = rendererConfig.devtool = 'none';

    mainConfig.devtool = 'inline-source-map';
    rendererConfig.devtool = 'inline-source-map';
    storeWorkerEndpointConfig.devtool = 'inline-source-map';
  }

  return [storeWorkerEndpointConfig, mainConfig, rendererConfig];
};
