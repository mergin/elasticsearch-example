'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPluginStream = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _streamStream = require('stream-stream');

var _streamStream2 = _interopRequireDefault(_streamStream);

var _server = require('@kbn/interpreter/server');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getPluginStream = exports.getPluginStream = type => {
  const stream = (0, _streamStream2.default)({
    separator: '\n'
  });

  (0, _server.getPluginPaths)(type).then(files => {
    files.forEach(file => {
      stream.write(_fs2.default.createReadStream(file));
    });
    stream.end();
  });

  return stream;
}; /*
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