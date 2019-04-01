'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.socketApi = socketApi;

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _common = require('@kbn/interpreter/common');

var _index = require('../lib/route_expression/index');

var _browser = require('../lib/route_expression/browser');

var _index2 = require('../lib/route_expression/thread/index');

var _server = require('../lib/route_expression/server');

var _get_request = require('../lib/get_request');

var _constants = require('../../common/constants');

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

async function getModifiedRequest(server, socket) {
  try {
    return await (0, _get_request.getRequest)(server, socket.handshake);
  } catch (err) {
    // on errors, notify the client and close the connection
    socket.emit('connectionFailed', { reason: err.message || 'Socket connection failed' });
    socket.disconnect(true);
    return false;
  }
}

function socketApi(server) {
  // add a POST ping route for `getRequest` to use
  // TODO: remove this once we have upstream socket support
  server.route({
    method: 'POST',
    path: `${_constants.API_ROUTE}/ping`,
    handler: () => 'pong'
  });

  const io = (0, _socket2.default)(server.listener, { path: '/socket.io' });

  io.on('connection', async socket => {
    // 'request' is the modified hapi request object
    const request = await getModifiedRequest(server, socket);
    if (!request) return; // do nothing without the request object

    const types = server.plugins.interpreter.types.toJS();
    const { serialize, deserialize } = (0, _common.serializeProvider)(types);

    // I'd love to find a way to generalize all of these, but they each need a different set of things
    // Note that ORDER MATTERS here. The environments will be tried in this order. Do not reorder this array.
    const routeExpression = (0, _index.routeExpressionProvider)([(0, _index2.thread)({ onFunctionNotFound, serialize, deserialize }), (0, _server.server)({ onFunctionNotFound, request, server }), (0, _browser.browser)({ onFunctionNotFound, socket, serialize, deserialize })]);

    function onFunctionNotFound(ast, context) {
      return routeExpression(ast, context);
    }

    socket.on('getFunctionList', () => {
      socket.emit('functionList', server.plugins.interpreter.serverFunctions.toJS());
    });

    socket.on('run', async ({ ast, context, id }) => {
      try {
        const value = await routeExpression(ast, deserialize(context));
        socket.emit(`resp:${id}`, { type: 'msgSuccess', value: serialize(value) });
      } catch (err) {
        // TODO: I don't think it is possible to hit this right now? Maybe ever?
        socket.emit(`resp:${id}`, { type: 'msgError', value: err });
      }
    });

    socket.on('disconnect', () => {
      // remove all listeners on disconnect
      socket.removeAllListeners();
    });
  });
}