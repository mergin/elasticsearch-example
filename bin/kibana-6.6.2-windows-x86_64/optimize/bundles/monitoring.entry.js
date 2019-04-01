
/**
 * Kibana entry file
 *
 * This is programmatically created and updated, do not modify
 *
 * context: {
  "env": "production",
  "kbnVersion": "6.6.2",
  "buildNum": 19548,
  "plugins": [
    "apm",
    "apm_oss",
    "beats_management",
    "canvas",
    "cloud",
    "console",
    "console_extensions",
    "cross_cluster_replication",
    "dashboard_mode",
    "elasticsearch",
    "graph",
    "grokdebugger",
    "index_lifecycle_management",
    "index_management",
    "infra",
    "input_control_vis",
    "inspector_views",
    "interpreter",
    "kbn_doc_views",
    "kbn_vislib_vis_types",
    "kibana",
    "kuery_autocomplete",
    "license_management",
    "logstash",
    "markdown_vis",
    "metric_vis",
    "metrics",
    "ml",
    "monitoring",
    "notifications",
    "region_map",
    "remote_clusters",
    "reporting",
    "rollup",
    "searchprofiler",
    "security",
    "spaces",
    "state_session_storage_redirect",
    "status_page",
    "table_vis",
    "tagcloud",
    "tile_map",
    "tilemap",
    "timelion",
    "upgrade_assistant",
    "vega",
    "watcher",
    "xpack_main"
  ]
}
 */

// import global polyfills before everything else
import 'babel-polyfill';
import 'custom-event-polyfill';
import 'whatwg-fetch';
import 'abortcontroller-polyfill';
import 'childnode-remove-polyfill';

import { i18n } from '@kbn/i18n';
import { CoreSystem } from '__kibanaCore__'

const injectedMetadata = JSON.parse(document.querySelector('kbn-injected-metadata').getAttribute('data'));
i18n.init(injectedMetadata.legacyMetadata.translations);

new CoreSystem({
  injectedMetadata,
  rootDomElement: document.body,
  requireLegacyFiles: () => {
    require('plugins/monitoring/monitoring');
  }
}).start()
