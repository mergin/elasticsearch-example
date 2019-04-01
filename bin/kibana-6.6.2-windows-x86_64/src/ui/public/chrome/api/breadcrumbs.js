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
import { fatalError } from 'ui/notify/fatal_error';
var newPlatformChrome;
export function __newPlatformInit__(instance) {
    if (newPlatformChrome) {
        throw new Error('ui/chrome/api/breadcrumbs is already initialized');
    }
    newPlatformChrome = instance;
}
export function initBreadcrumbsApi(chrome, internals) {
    // A flag used to determine if we should automatically
    // clear the breadcrumbs between angular route changes.
    var breadcrumbSetSinceRouteChange = false;
    // reset breadcrumbSetSinceRouteChange any time the breadcrumbs change, even
    // if it was done directly through the new platform
    newPlatformChrome.getBreadcrumbs$().subscribe({
        next: function () {
            breadcrumbSetSinceRouteChange = true;
        },
    });
    chrome.breadcrumbs = {
        get$: function () {
            return newPlatformChrome.getBreadcrumbs$();
        },
        set: function (newBreadcrumbs) {
            newPlatformChrome.setBreadcrumbs(newBreadcrumbs);
        },
    };
    // define internal angular run function that will be called when angular
    // bootstraps and lets us integrate with the angular router so that we can
    // automatically clear the breadcrumbs if we switch to a Kibana app that
    // does not use breadcrumbs correctly
    internals.$setupBreadcrumbsAutoClear = function ($rootScope, $injector) {
        var uiSettings = chrome.getUiSettingsClient();
        var $route = $injector.has('$route') ? $injector.get('$route') : {};
        $rootScope.$on('$routeChangeStart', function () {
            breadcrumbSetSinceRouteChange = false;
        });
        $rootScope.$on('$routeChangeSuccess', function () {
            var current = $route.current || {};
            if (breadcrumbSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
                return;
            }
            var k7BreadcrumbsProvider = current.k7Breadcrumbs;
            if (!k7BreadcrumbsProvider || !uiSettings.get('k7design')) {
                newPlatformChrome.setBreadcrumbs([]);
                return;
            }
            try {
                chrome.breadcrumbs.set($injector.invoke(k7BreadcrumbsProvider));
            }
            catch (error) {
                fatalError(error);
            }
        });
    };
}
