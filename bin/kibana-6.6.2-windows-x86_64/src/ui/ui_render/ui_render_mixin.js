'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uiRenderMixin = uiRenderMixin;

var _bluebird = require('bluebird');

var _boom = require('boom');

var _boom2 = _interopRequireDefault(_boom);

var _path = require('path');

var _i18n = require('@kbn/i18n');

var _bootstrap = require('./bootstrap');

var _lib = require('./lib');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

function uiRenderMixin(kbnServer, server, config) {
  function replaceInjectedVars(request, injectedVars) {
    const { injectedVarsReplacers = [] } = kbnServer.uiExports;

    return (0, _bluebird.reduce)(injectedVarsReplacers, async (acc, replacer) => await replacer(acc, request, kbnServer.server), injectedVars);
  }

  let defaultInjectedVars = {};
  kbnServer.afterPluginsInit(() => {
    const { defaultInjectedVarProviders = [] } = kbnServer.uiExports;
    defaultInjectedVars = defaultInjectedVarProviders.reduce((allDefaults, { fn, pluginSpec }) => (0, _lib.mergeVariables)(allDefaults, fn(kbnServer.server, pluginSpec.readConfigValue(kbnServer.config, []))), {});
  });

  // render all views from ./views
  server.setupViews((0, _path.resolve)(__dirname, 'views'));

  server.route({
    path: '/bundles/app/{id}/bootstrap.js',
    method: 'GET',
    config: { auth: false },
    async handler(request, h) {
      const { id } = request.params;
      const app = server.getUiAppById(id) || server.getHiddenUiAppById(id);
      if (!app) {
        throw _boom2.default.notFound(`Unknown app: ${id}`);
      }

      const basePath = config.get('server.basePath');
      const regularBundlePath = `${basePath}/bundles`;
      const dllBundlePath = `${basePath}/dlls`;
      const styleSheetPaths = [`${dllBundlePath}/vendors.style.dll.css`, `${regularBundlePath}/commons.style.css`, `${regularBundlePath}/${app.getId()}.style.css`].concat(kbnServer.uiExports.styleSheetPaths.map(path => `${basePath}/${path.publicPath}`).reverse());

      const bootstrap = new _bootstrap.AppBootstrap({
        templateData: {
          appId: app.getId(),
          regularBundlePath,
          dllBundlePath,
          styleSheetPaths
        }
      });

      const body = await bootstrap.getJsFile();
      const etag = await bootstrap.getJsFileHash();

      return h.response(body).header('cache-control', 'must-revalidate').header('content-type', 'application/javascript').etag(etag);
    }
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    async handler(req, h) {
      const id = req.params.id;
      const app = server.getUiAppById(id);
      if (!app) throw _boom2.default.notFound('Unknown app ' + id);

      try {
        if (kbnServer.status.isGreen()) {
          return await h.renderApp(app);
        } else {
          return await h.renderStatusPage();
        }
      } catch (err) {
        throw _boom2.default.boomify(err);
      }
    }
  });

  async function getLegacyKibanaPayload({ app, translations, request, includeUserProvidedConfig }) {
    const uiSettings = request.getUiSettingsService();

    return {
      app,
      translations,
      bundleId: `app:${app.getId()}`,
      nav: server.getUiNavLinks(),
      version: kbnServer.version,
      branch: config.get('pkg.branch'),
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      basePath: request.getBasePath(),
      serverName: config.get('server.name'),
      devMode: config.get('env.dev'),
      uiSettings: await (0, _bluebird.props)({
        defaults: uiSettings.getDefaults(),
        user: includeUserProvidedConfig && uiSettings.getUserProvided()
      })
    };
  }

  async function renderApp({ app, h, includeUserProvidedConfig = true, injectedVarsOverrides = {} }) {
    const request = h.request;
    const translations = await server.getUiTranslations();
    const basePath = request.getBasePath();

    return h.view('ui_app', {
      uiPublicUrl: `${basePath}/ui`,
      bootstrapScriptUrl: `${basePath}/bundles/app/${app.getId()}/bootstrap.js`,
      i18n: (id, options) => _i18n.i18n.translate(id, options),

      injectedMetadata: {
        version: kbnServer.version,
        buildNumber: config.get('pkg.buildNum'),
        basePath,
        vars: await replaceInjectedVars(request, (0, _lib.mergeVariables)(injectedVarsOverrides, (await server.getInjectedUiAppVars(app.getId())), defaultInjectedVars)),

        legacyMetadata: await getLegacyKibanaPayload({
          app,
          translations,
          request,
          includeUserProvidedConfig,
          injectedVarsOverrides
        })
      }
    });
  }

  server.decorate('toolkit', 'renderApp', function (app, injectedVarsOverrides) {
    return renderApp({
      app,
      h: this,
      includeUserProvidedConfig: true,
      injectedVarsOverrides
    });
  });

  server.decorate('toolkit', 'renderAppWithDefaultConfig', function (app) {
    return renderApp({
      app,
      h: this,
      includeUserProvidedConfig: false
    });
  });
}