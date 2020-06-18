import Vue from 'vue';
import axios from 'axios';
import createStore from './store';
import configMixin from './util/config-mixin';
import mergeDeep from './util/merge-deep';

import * as faAll from './fa.js';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import controllerMixin from '@phila/vue-datafetch/src/controller.js';

// import eventBusMixin from './util/event-bus-mixin';
// import CyclomediaWidget from '@phila/vue-mapping/src/cyclomedia/Widget.vue';
import router from './router';
import App from './components/App.vue';

// import 'phila-standards/dist/css/phila-app.min.css';
import 'leaflet/dist/leaflet.css';


// const baseConfigUrl = null;
let baseConfigUrl;
if (process.env.VUE_APP_BASE_CONFIG_URL) {
  baseConfigUrl = process.env.VUE_APP_BASE_CONFIG_URL;
}

function initVue(config) {
  // const baseConfigUrl = clientConfig.baseConfig;
  // make config accessible from each component via this.$config
  Vue.use(configMixin, config);
  Vue.component('font-awesome-icon', FontAwesomeIcon);

  const customComps = config.customComps || [];
  for (let key of Object.keys(customComps)) {
    Vue.component(key, customComps[key]);
  }

  // create store
  const store = createStore(config);

  Vue.use(controllerMixin, { config, store, router });

  // mount main vue
  const vm = new Vue({
    el: config.el || '#vue-app',
    render: (h) => h(App),
    router,
    store,
  });

}

function initViewerboard(clientConfig) {
  console.log('initViewerboard is running, baseConfigUrl:', baseConfigUrl);

  // if there is a base config, get base config
  if (baseConfigUrl) {
    axios.get(baseConfigUrl).then(response => {
      // console.log('axios getting base config, clientConfig:', clientConfig);
      const data = response.data;
      // parse raw js. yes, it's ok to use eval :)
      // http://stackoverflow.com/a/87260/676001
      const baseConfigFn = eval(data);
      const baseConfig = baseConfigFn({ gatekeeperKey: process.env.VUE_APP_GATEKEEPER_KEY });
      // const baseConfig = process.env.VUE_APP_GATEKEEPER_KEY;

      // deep merge base config and client config
      //const config = mergeDeep(clientConfig, baseConfig);
      const config = mergeDeep(baseConfig, clientConfig);
      // console.log('data:', data, 'baseConfig:', baseConfig, 'clientConfig:', clientConfig, 'config:', config);

      initVue(config);
    }).catch(err => {
      console.error('Error loading base config:', err);
    });
  } else {
    initVue(clientConfig);
  }
}

export default initViewerboard;
