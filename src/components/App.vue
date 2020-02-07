<template>
  <div
    id="app"
    class="grid-y"
  >
  <!-- :class="openModal" -->
    <PhilaHeader
      :app-title="this.$config.app.title"
      :app-tag-line="this.$config.app.tagLine"
    >
    <!-- :app-logo="appLogo"
    :app-logo-alt="this.$config.app.logoAlt" -->
      <!-- <div slot="mobile-menu">
        <PhilaFooter
          @howToUseLink="toggleModal()"
        />
      </div> -->
    </PhilaHeader>

    <div
      id="root-container"
      class="surrounding-div grid-x"
    >

      <address-input
        v-if='this.$config.addressInput'
        class='address-input'
        :width-from-config="this.$config.addressInput.width"
        :placeholder="this.$config.addressInput.placeholder"
        @handle-search-form-submit="handleSearchFormSubmit"
      />

      <div
        id="map-panel"
        :class="mapPanelClass"
      >
      <!-- :style="{ 'position': 'relative' }" -->

        <!-- <full-screen-toggle-tab
          :event="'toggle-tab-click'"
          :deactivated-direction="'right'"
          @toggle-tab-click="mapToggleClicked"
        /> -->

        <map_
          id="map-tag"
          :center="this.$store.state.map.center"
          :zoom="this.$store.state.map.zoom"
          attribution-position="bottomleft"
          zoom-control-position="bottomleft"
          :min-zoom="this.$config.map.minZoom"
          :max-zoom="this.$config.map.maxZoom"
          @l-moveend="handleMapMove"
        >

          <!-- basemaps -->
          <esri-tiled-map-layer
            v-for="(basemap, key) in this.$config.map.basemaps"
            v-if="activeBasemap === key"
            :key="key"
            :url="basemap.url"
            :max-zoom="basemap.maxZoom"
            :attribution="basemap.attribution"
          />

          <!-- basemap labels and parcels outlines -->
          <esri-tiled-map-layer
            v-for="(tiledLayer, key) in this.$config.map.tiledLayers"
            v-if="tiledLayers.includes(key)"
            :key="key"
            :url="tiledLayer.url"
            :z-index="tiledLayer.zIndex"
            :attribution="tiledLayer.attribution"
          />

          <!-- tiled overlay based on topic -->
          <esri-tiled-map-layer
            v-for="(tiledLayer, key) in this.$config.map.tiledLayers"
            v-if="activeTiledOverlays.includes(key)"
            :key="key"
            :url="tiledLayer.url"
            :z-index="tiledLayer.zIndex"
            :opacity="tiledLayer.opacity"
            :test="key"
          />

          <vector-marker
            v-for="marker in markersForAddress"
            :key="marker.key"
            :latlng="marker.latlng"
            :marker-color="marker.color"
            :icon="marker.icon"
            :interactive="false"
          />

          <!-- <control-corner
            :v-side="'almostbottom'"
            :h-side="'left'"
          /> -->

          <!-- <div v-once>
            <location-control
              v-if="geolocationEnabled"
              v-once
              :position="'bottomleft'"
              :title="'Locate me'"
            />
          </div> -->

          <!-- location marker -->
          <circle-marker
            v-if="this.$store.state.map.location.lat != null"
            :key="Math.random()"
            :latlng="locationMarker.latlng"
            :radius="locationMarker.radius"
            :fill-color="locationMarker.fillColor"
            :color="locationMarker.color"
            :weight="locationMarker.weight"
            :opacity="locationMarker.opacity"
            :fill-opacity="locationMarker.fillOpacity"
          />

          <cyclomedia-recording-circle
            v-for="recording in cyclomediaRecordings"
            v-if="!fullScreenMapEnabled"
            :key="recording.imageId"
            :image-id="recording.imageId"
            :latlng="[recording.lat, recording.lng]"
            :size="1.2"
            :color="'#3388ff'"
            :weight="1"
            @l-click="handleCyclomediaRecordingClick"
          />

          <!-- marker using a png and ablility to rotate it -->
          <!-- v-if="cyclomediaActive" -->
          <png-marker
            v-if="!fullScreenMapEnabled"
            :icon="sitePath + 'images/camera.png'"
            :latlng="cycloLatlng"
            :rotation-angle="cycloRotationAngle"
          />

          <!-- marker using custom code extending icons - https://github.com/iatkin/leaflet-svgicon -->
          <!-- v-if="cyclomediaActive" -->
          <svg-view-cone-marker
            v-if="!fullScreenMapEnabled"
            :latlng="cycloLatlng"
            :rotation-angle="cycloRotationAngle"
            :h-fov="cycloHFov"
          />

          <div v-once>
            <marathon-toggle-control v-if="shouldShowMarathonToggleControl"
                                     v-once
                                     @half-marathon-button-clicked="this.halfMarathonButtonClicked"
                                     @full-marathon-button-clicked="this.fullMarathonButtonClicked"
                                     :position="'topright'"
            />
          </div>

          <div v-once>
            <basemap-toggle-control v-if="shouldShowBasemapToggleControl"
                                    v-once
                                    @basemap-toggle-clicked="handleBasemapToggleClick"
                                    :position="'topright'"
                                    :single-layer="'imagery2019'"
            />
          </div>

        </map_>

        <full-screen-toggle-tab
          :event="'toggle-tab-click'"
          :initial-activation="mapToggleInitialActivation"
          :deactivated-direction="'right'"
          :button-side="'right'"
          :position="'relative'"
          @toggle-tab-click="mapToggleClicked"
          panel="map"
        />

      </div>

      <!-- slot="cycloWidget"
      screen-percent="2" -->
      <!-- :orientation="this.$config.cyclomedia.orientation" -->
      <div
        id="image-panel"
        :class="imagePanelClass"
      >
      <!-- :style="{ 'position': 'relative' }" -->
        <cyclomedia-widget
          v-if="shouldLoadCyclomediaWidget"
          @cyclomedia-widget-mounted="initializeCyclomedia"
        >
          <full-screen-toggle-tab
            :event="'toggle-tab-click'"
            :initial-activation="imageryToggleInitialActivation"
            :deactivated-direction="'left'"
            @toggle-tab-click="imageToggleClicked"
            panel="imagery"
          />

        </cyclomedia-widget>

        <pictometry-widget
          v-if="shouldLoadPictometryWidget"
          v-show="true"
          @pictometry-widget-mounted="initializePictometry"
          :set-location="true"
        >
          <full-screen-toggle-tab
            :event="'toggle-tab-click'"
            :initial-activation="imageryToggleInitialActivation"
            :deactivated-direction="'right'"
            @toggle-tab-click="imageToggleClicked"
            panel="imagery"
          />
        </pictometry-widget>
      </div>

    </div>

    <PhilaButton
      class="button toggle-map hide-for-medium"
      @click.native="toggleScreenShare"
    >
      {{ toggleScreenShareButtonMessage }}
    </PhilaButton>
    <!-- class="toggle-button" -->

    <!-- <PhilaFooter
      v-show="isLarge"
      @howToUseLink="toggleModal()"
    /> -->
  </div>
</template>

<script>
import PhilaHeader from './PhilaHeader.vue';
import PhilaButton from './PhilaButton.vue';
// import PhilaFooter from './PhilaFooter.vue';
import MarathonToggleControl from './MarathonToggleControl.vue';

import Map_ from '@phila/vue-mapping/src/leaflet/Map.vue';
import FullScreenToggleTab from '@phila/vue-mapping/src/components/FullScreenToggleTab.vue';
import FullScreenMapToggleTab from '@phila/vue-mapping/src/components/FullScreenMapToggleTab.vue';
import ControlCorner from '@phila/vue-mapping/src/leaflet/ControlCorner.vue';
import LocationControl from '@phila/vue-mapping/src/components/LocationControl.vue';
import BasemapToggleControl from '@phila/vue-mapping/src/components/BasemapToggleControl.vue';

import CyclomediaRecordingsClient from '@phila/vue-mapping/src/cyclomedia/recordings-client.js';

import cyclomediaMixin from '@phila/vue-mapping/src/cyclomedia/map-panel-mixin.js';

export default {

  components: {
    PhilaHeader,
    PhilaButton,
    // PhilaFooter,
    MarathonToggleControl,
    Map_,
    FullScreenToggleTab,
    FullScreenMapToggleTab,
    ControlCorner,
    LocationControl,
    BasemapToggleControl,
    AddressInput: () => import(/* webpackChunkName: "mbmp_pvc_AddressInput" */'@phila/vue-mapping/src/components/MapAddressInput.vue'),
    CyclomediaWidget: () => import(/* webpackChunkName: "mbmb_pvm_CyclomediaWidget" */'@phila/vue-mapping/src/cyclomedia/Widget.vue'),
    PictometryWidget: () => import(/* webpackChunkName: "mbmb_pvm_PictometryWidget" */'@phila/vue-mapping/src/pictometry/Widget.vue'),
    EsriTiledMapLayer: () => import(/* webpackChunkName: "mbmp_pvm_EsriTiledMapLayer" */'@phila/vue-mapping/src/esri-leaflet/TiledMapLayer.vue'),
    CircleMarker: () => import(/* webpackChunkName: "mbmp_pvm_CircleMarker" */'@phila/vue-mapping/src/leaflet/CircleMarker.vue'),
    CyclomediaRecordingCircle: () => import(/* webpackChunkName: "mbmp_pvm_CyclomediaRecordingCircle" */'@phila/vue-mapping/src/cyclomedia/RecordingCircle.vue'),
    PngMarker: () => import(/* webpackChunkName: "mbmp_pvm_PngMarker" */'@phila/vue-mapping/src/components/PngMarker.vue'),
    SvgViewConeMarker: () => import(/* webpackChunkName: "mbmp_pvm_CyclomediaSvgViewConeMarker" */'@phila/vue-mapping/src/cyclomedia/SvgViewConeMarker.vue'),
  },
  data() {
    const data = {
      // this will only affect the app size if the app is set to "plugin" mode
      mbRootStyle: {
        'height': '100px',
      },
      mapToggleInitialActivation: null,
      imageryToggleInitialActivation: null,
      activeBasemap: 'pwd',
      tiledLayers: ['cityBasemapLabels'],
      activeTiledOverlays: [],
    };
    return data;
  },
  mixins: [
    cyclomediaMixin,
  ],
  created() {
    this.$cyclomediaRecordingsClient = new CyclomediaRecordingsClient(
      this.$config.cyclomedia.recordingsUrl,
      this.$config.cyclomedia.username,
      this.$config.cyclomedia.password,
      4326,
    );
    if (this.$config.map) {
      if (this.$config.map.shouldInitialize === false) {
        this.$store.commit('setShouldInitializeMap', false);
      }
    }
    window.addEventListener('resize', this.handleWindowResize);
  },
  mounted() {
    if (this.$config.initialTiledOverlays) {
      this.activeTiledOverlays = this.$config.initialTiledOverlays;
    }
    if (this.$config.map.center) {
      this.$store.commit('setMapCenter', this.$config.map.center);
    }
    if (this.$config.map.zoom && this.$store.state.map.map) {
      this.$store.commit('setMapZoom', this.$config.map.zoom);
    }
    console.log('viewerboard app mounted, this.$config:', this.$config, 'this.$config.initialView.length:', this.$config.initialView.length);
    this.handleWindowResize();
    if (this.$route.query.address) {
      this.$controller.handleSearchFormSubmit(this.$route.query.address);
    } else if (this.$route.query.lat) {
      // console.log('viewerboard app mounted route has lat');
      this.$store.commit('setCyclomediaLatLngFromMap', [parseFloat(this.$route.query.lat), parseFloat(this.$route.query.lng)]);
    }

    this.$store.commit('setPictometryMapCenter', this.$config.map.center);
    // this.handleMapMove();

    if (this.$config.initialView) {
      if (this.$config.initialView.length > 1) {
        this.$store.commit('setFullScreenImageryEnabled', false);
        this.$store.commit('setFullScreenMapEnabled', false);
      } else if (this.$config.initialView.includes('map')) {
        // this.$store.commit('setFullScreenImageryEnabled', false);
        this.$store.commit('setFullScreenMapEnabled', true);
        this.mapToggleInitialActivation = true;
      } else if (this.$config.initialView.includes('imagery')) {
        this.$store.commit('setFullScreenImageryEnabled', true);
        this.imageryToggleInitialActivation = true;
        // this.$store.commit('setFullScreenMapEnabled', true);
      }
    }
  },
  watch: {
    geocodeCoordinates(nextGeocodeCoordinates) {
      this.$store.commit('setCyclomediaLatLngFromMap', [this.$store.state.geocode.data.geometry.coordinates[1], this.$store.state.geocode.data.geometry.coordinates[0]]);
      this.$store.commit('setMapCenter', nextGeocodeCoordinates);
    },
  },
  computed: {
    basemaps() {
      return Object.values(this.$config.map.basemaps);
    },
    imageryBasemaps() {
      return this.basemaps.filter(basemap => basemap.type === 'imagery');
    },
    hasImageryBasemaps() {
      return this.imageryBasemaps.length > 0;
    },
    shouldShowBasemapToggleControl() {
      let value;
      if (this.$config.map.basemapToggle) {
        value = this.$config.map.basemapToggle;
      } else {
        value = false;
      }
      return value;
      // if (this.$config.map.imagery) {
      //   return this.hasImageryBasemaps && this.$config.map.imagery.enabled;
      // }
      // return this.hasImageryBasemaps;
    },
    shouldShowMarathonToggleControl() {
      let value;
      if (this.$config.map.marathonToggle) {
        value = this.$config.map.marathonToggle;
      } else {
        value = false;
      }
      return value;
    },
    shouldLoadCyclomediaWidget() {
      return this.$config.cyclomedia.enabled;
    },
    shouldLoadPictometryWidget() {
      if (this.$config.cyclomedia.enabled) {
        return false;
      } else {
        return this.$config.pictometry.enabled;
      }
    },
    toggleScreenShareButtonMessage() {
      if (this.fullScreenImageryEnabled) {
        return 'Toggle To Map';
      } else {
        return 'Toggle to StreetView';
      }
    },
    sitePath() {
      if (process.env.VUE_APP_PUBLICPATH) {
        return window.location.origin + process.env.VUE_APP_PUBLICPATH;
      }
      return '';
    },
    fullScreenImageryEnabled() {
      return this.$store.state.fullScreenImageryEnabled;
    },
    fullScreenMapEnabled() {
      return this.$store.state.fullScreenMapEnabled;
    },
    mapPanelClass() {
      let value;
      if (this.$store.state.fullScreenImageryEnabled) {
        value = 'small-0 medium-0 map-panel-class'
      } else if (this.$store.state.fullScreenMapEnabled) {
        value = 'small-24 medium-24 map-panel-class'
      } else {
        value = 'small-24 medium-12 map-panel-class'
      }
      return value;
    },
    imagePanelClass() {
      let value;
      if (this.$store.state.fullScreenImageryEnabled) {
        value = 'small-24 medium-24 image-panel-class'
      } else if (this.$store.state.fullScreenMapEnabled) {
        value = 'small-0 medium-0 image-panel-class'
      } else {
        value = 'small-0 medium-12 image-panel-class'
      }
      return value;
    },
    geocodeCoordinates() {
      let value;
      if (this.$store.state.geocode.data) {
        value = this.$store.state.geocode.data.geometry.coordinates;
      } else {
        value = null;
      }
      return value;
    },
    cycloLatlng() {
      if (this.$store.state.cyclomedia.orientation.xyz !== null) {
        const xyz = this.$store.state.cyclomedia.orientation.xyz;
        return [ xyz[1], xyz[0] ];
      }
      const center = this.$config.map.center;
      return center;

    },
    cycloRotationAngle() {
      return this.$store.state.cyclomedia.orientation.yaw;// * (180/3.14159265359);
    },
    cycloHFov() {
      return this.$store.state.cyclomedia.orientation.hFov;
    },
    geolocationEnabled() {
      if (this.$config.geolocation) {
        return this.$config.geolocation.enabled;
      }
      return false;
    },
    locationMarker() {
      const latlngArray = [ this.$store.state.map.location.lat, this.$store.state.map.location.lng ];
      const marker = {
        latlng: latlngArray,
        radius: 6,
        fillColor: '#ff3f3f',
        color: '#ff0000',
        weight: 1,
        opacity: 1,
        fillOpacity: 1.0,
      };
      return marker;
    },
    markersForAddress() {
      // console.log('markers-mixin.js markersForAddress computed is running');
      const markers = [];
      // geocoded address marker
      const geocodeGeom = this.geocodeGeom;
      if (this.identifyFeature === 'address-marker' && geocodeGeom) {
        const latlng = [ ...geocodeGeom.coordinates ].reverse();
        const key = this.geocodeResult.properties.street_address;
        const color = '#2176d2';
        const markerType = 'geocode';
        const icon = {
          prefix: 'fas',
          icon: 'map-marker-alt',
          shadow: true,
          size: 50,
        };
        const addressMarker = { latlng, key, color, markerType, icon };
        markers.push(addressMarker);
      }
      return markers;
    },
  },
  methods: {
    halfMarathonButtonClicked() {
      // console.log('halfMarathonButtonClicked is running');
      this.activeTiledOverlays = ['halfMarathon'];
    },
    fullMarathonButtonClicked() {
      // console.log('fullMarathonButtonClicked is running');
      this.activeTiledOverlays = ['fullMarathon'];
    },
    handleBasemapToggleClick() {
      console.log('handleBasemapToggleClick is running, this.activeBasemap:', this.activeBasemap);
      if (this.activeBasemap === 'pwd') {
        console.log('if is running');
        this.activeBasemap = this.$store.state.map.imagery;
        this.tiledLayers = ['imageryBasemapLabels']
      } else if (this.activeBasemap === 'imagery2019') {
        console.log('else if is running');
        this.activeBasemap = this.$store.state.map.basemap;
        this.tiledLayers = ['cityBasemapLabels']
      }
    },
    mapToggleClicked() {
      console.log('mapToggleClicked is running, this.$store', this.$store, 'this.$store.state.fullScreenMapEnabled', this.$store.state.fullScreenMapEnabled);
      this.$store.commit('setFullScreenMapEnabled', !this.$store.state.fullScreenMapEnabled);
      if (this.$store.state.cyclomedia.initializationBegun === false) {
        this.initializeCyclomedia();
      }
    },
    imageToggleClicked() {
      console.log('imageToggleClicked is running, this.$store', this.$store, 'this.$store.state.map.map', this.$store.state.map.map);
      this.$store.commit('setFullScreenImageryEnabled', !this.$store.state.fullScreenImageryEnabled);
      if (this.$store.state.fullScreenImageryEnabled === false) {
        this.$store.commit('setShouldInitializeMap', true);
      }
    },
    toggleScreenShare() {
      console.log('toggleScreenShare is running, this.$store', this.$store, 'this.$store.state.map.map', this.$store.state.map.map);
      // this.$store.commit('setFullScreenImageryEnabled', !this.$store.state.fullScreenImageryEnabled);
      if (this.$store.state.fullScreenImageryEnabled === false) {
        this.$store.commit('setFullScreenImageryEnabled', true);
        this.$store.commit('setFullScreenMapEnabled', false);
      } else {
        this.$store.commit('setShouldInitializeMap', true);
        this.$store.commit('setFullScreenImageryEnabled', false);
        this.$store.commit('setFullScreenMapEnabled', true);
      }
      if (this.$store.state.cyclomedia.initializationBegun === false) {
        this.initializeCyclomedia();
      }
    },
    initializeCyclomedia() {
      console.log('app initializeCyclomedia is running');
      if (!this.$store.state.fullScreenMapEnabled) {
        console.log('app initializeCyclomedia IF is running');
        this.$store.commit('setCyclomediaInitializationBegun', true);
        this.$store.commit('setCyclomediaActive', true);
      }
    },
    initializePictometry() {
      console.log('initializePictometry is running');
    },
    handleSearchFormSubmit(value) {
      // console.log('App.vue handleSearchFormSubmit is running');
      this.$controller.handleSearchFormSubmit(value);
    },
    handleMapMove(e) {
      console.log('handleMapMove is starting');
      const map = this.$store.state.map.map;
      if (!map) {
        return;
      }
      const center = map.getCenter();
      const { lat, lng } = center;
      const coords = [ lng, lat ];

      console.log('handleMapMove is running, coords:', coords);

      const pictometryConfig = this.$config.pictometry || {};
      const cyclomediaConfig = this.$config.cyclomedia || {};

      if (pictometryConfig.enabled) {
        // update state for pictometry
        this.$store.commit('setPictometryMapCenter', coords);

        const zoom = map.getZoom();
        this.$store.commit('setPictometryMapZoom', zoom);
      }

      if (cyclomediaConfig.enabled) {
        // update cyclo recordings
        this.updateCyclomediaRecordings();
        this.$store.commit('setCyclomediaLatLngFromMap', [ lat, lng ]);
      }
    },
    handleWindowResize() {
      // console.log('Mapboard.vue handleWindowResize is running');
      // this only actually affects the size if it is set to "plugin mode"
      if (this.$config.plugin) {
        if (this.$config.plugin.enabled) {
          this.mbRootStyle.height = this.$config.plugin.height.toString() + 'px';
          // return;
        }
      }

      // if (window.innerWidth >= 750) {
      //   // this.mbRootStyle.height = '600px'
      // } else {
      //   this.mbRootStyle.height = 'auto';
      // }

      const rootElement = document.getElementById('root-container');
      const rootStyle = window.getComputedStyle(rootElement);
      const rootWidth = rootStyle.getPropertyValue('width');
      const rootHeight = rootStyle.getPropertyValue('height');
      const rootWidthNum = parseInt(rootWidth.replace('px', ''));
      const rootHeightNum = parseInt(rootHeight.replace('px', ''));

      const dim = {
        width: rootWidthNum,
        height: rootHeightNum,
      };
      this.$store.commit('setWindowDimensions', dim);
    },
  }
}
</script>

</script>

<style lang="scss">
@import "@/scss/global.scss";

#app {
  height: 100%;
}

.map-panel-class {
  position: relative;
}

.image-panel-class {
  position: relative;
}

.toggle-map {
  margin:0 !important;
  position: fixed;
  bottom:0;
  width: 100%;
  z-index: 900;
}

//TODO, move to standards
@each $value in $colors {
  .#{nth($value, 1)} {
    color: nth($value, 2) !important;
  }
  .bg-#{nth($value, 1)} {
    background-color: nth($value, 2) !important;
  }
  .bdr-#{nth($value, 1)} {
    border-color: nth($value, 2) !important;
  }
}

.no-scroll {
  overflow: hidden;
  height: 100vh;
}

#clear-results {
  display: inline-block !important;
  margin-right: 10px;
}

.logo {
  line-height: 4em;
  padding-left: 10px;
  width: auto;
}

.fa-times-circle{
  margin-bottom: 2px;
}

.leaflet-top, .leaflet-bottom {
  z-index: 999 !important;
}

.pointer {
  cursor: pointer;
}

// @media #{$small-only} {
  .small-0 {
    width: 0px;
  }
// }

@media (min-width: 750px) {

  .surrounding-div {
    height: 100%;
  }

  .address-input {
    position: absolute;
    z-index: 1000;
    right: 10px;
    top: 120px;
  }

  .toggle-button {
    display: none;
    height: 36px;
    margin: 0;
  }
}

@media (max-width: 749px) {

  .surrounding-div {
    // height: 100%;
    height: calc(100% - 36px);
  }

  .toggle-button {
    height: 36px;
    margin: 0;
  }

  .address-input {
    position: absolute;
    z-index: 1000;
    right: 10px;
    top: 90px;
  }

  #demo-badge {
    top: 25%;
    position: absolute;
    width: max-content;
  }

  #demo-container {
    padding-left: 15px;
    position: relative;
  }

  .logo {
    margin-top: auto;
    margin-bottom: auto;
  }

  .app-header .cell .shrink {
    width: 100%;
  }

  .app-divide {
    margin-bottom: 0;
    border: none;
  }

  .app-title {
    max-width: 200px;
  }

  .mobile-menu-content {
    position: fixed;
    bottom: 0;
    width: 100%;
  }

  thead {
    display: none;
  }

  td {
    clear: both;
    border: none !important;
  }

  th {
    border: 1px solid white !important;
    font-size: unset !important;
  }

  tbody th, tbody td {
    padding: 0.28571rem 0.35714rem 0.35714rem;
  }

  td div svg {
    float: right
  }
}

// .step-group {
//   margin-left:$spacing-medium;
//
//   .step-label {
//     @include secondary-font(400);
//     display: inline-block;
//     margin-left: -$spacing-medium;
//     background: black;
//     border-radius: $spacing-extra-large;
//     color:white;
//     padding: 0 $spacing-small;
//     width:$spacing-large;
//     height:$spacing-large;
//     line-height: $spacing-large;
//     text-align: center;
//   }
//   .step {
//     margin-top: -$spacing-large;
//     padding-left: $spacing-large;
//     padding-bottom: $spacing-large;
//     border-left:1px solid black;
//
//     &:last-of-type {
//       border:none;
//     }
//
//     .step-title {
//       @include secondary-font(400);
//       font-size:1.2rem;
//       margin-bottom: $spacing-small;
//     }
//   }
// }
//
// .step-group{
//   margin-left:$spacing-medium;
//
//   .step-label {
//     @include secondary-font(400);
//     display: inline-block;
//     margin-left: -$spacing-medium;
//     background: black;
//     border-radius: $spacing-extra-large;
//     color:white;
//     padding: 0 $spacing-small;
//     width:$spacing-large;
//     height:$spacing-large;
//     line-height: $spacing-large;
//     text-align: center;
//   }
//   .step{
//     margin-top: -$spacing-large;
//     padding-left: $spacing-large;
//     padding-bottom: $spacing-large;
//     border-left:1px solid black;
//
//     &:last-of-type {
//       border:none;
//     }
//
//     .step-title{
//       @include secondary-font(400);
//       font-size:1.2rem;
//       margin-bottom: $spacing-small;
//     }
//   }
// }

</style>
