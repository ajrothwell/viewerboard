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

        <MglMap
          v-if="shouldShowMglMap && mapType === 'mapbox'"
          :accessToken="accessToken"
          :mapStyle.sync="computedMapStyle"
          :zoom="$config.map.zoom"
          :center="$config.map.center"
          @moveend="handleMapMove"
          @load="onMapLoaded"
          @preload="onMapPreloaded"
          @click="handleMapClick"
        >

          <MglRasterLayer
            v-for="(basemapSource, key) in basemapSources"
            v-if="shouldShowRasterLayer && activeBasemap === key"
            :key="key"
            :source-id="activeBasemap"
            :layer-id="activeBasemap"
            :layer="basemapSource.layer"
            :source="basemapSource.source"
            :before="basemapsBefore"
          />

          <MglRasterLayer
            v-for="(basemapLabelSource, key) in basemapLabelSources"
            v-if="shouldShowRasterLayer && tiledLayers.includes(key)"
            :key="key"
            :source-id="key"
            :layer-id="key"
            :layer="basemapLabelSource.layer"
            :source="basemapLabelSource.source"
            :before="basemapsBefore"
          />

          <MglRasterLayer
            v-for="(overlaySource, key) in overlaySources"
            v-if="activeTiledOverlays.includes(key)"
            :key="key"
            :source-id="key"
            :layer-id="key"
            :layer="overlaySource.layer"
            :source="overlaySource.source"
            :before="cameraOverlay"
          />

          <component
            v-for="comp in Object.keys(customMapComponent)"
            :is="customMapComponent[comp]"
            @active-overlay-change="handleActiveOverlayChange"
          />
          <!-- :position="'topleft'" -->

          <MglCircleMarker
            v-for="recording in cyclomediaRecordings"
            v-if="!fullScreenMapEnabled"
            :coordinates="[recording.lng, recording.lat]"
            :key="recording.imageId"
            :image-id="recording.imageId"
            :size="14"
            :fill-color="'#3388ff'"
            :color="'black'"
            :weight="1"
            :opacity="0.5"
            @click="handleCyclomediaRecordingClick"
          />

          <MglGeojsonLayer
            v-if="!fullScreenMapEnabled"
            :sourceId="'cameraPoint'"
            :source="geojsonCameraSource"
            :layerId="'cameraPoints'"
            :layer="geojsonCameraLayer"
            :icon="sitePath + 'images/camera.png'"
          />

          <MglGeojsonLayer
            v-if="!fullScreenMapEnabled"
            :sourceId="'viewcone'"
            :source="geojsonViewconeSource"
            :layerId="'viewcones'"
            :layer="geojsonViewconeLayer"
          />

          <MglVectorLayer
            v-for="layer in $config.vectorTilesLayers"
            v-if="$config.vectorTilesLayers"
            :sourceId="'PVL_Original'"
            :source="layer.source"
            :layer="layer"
            :layerId="layer.id"
            @mouseover="handleVectorLayerMouseover"
            @mouseout="handleVectorLayerMouseout"
          />

          <MglButtonControl
            v-if="shouldShowBasemapToggleControl"
            :buttonId="'buttonId-01'"
            :buttonClass="'right'"
            :imageLink="basemapImageLink"
            @click="handleBasemapToggleClick"
          />

          <MglNavigationControl position="bottom-left"/>
          <MglGeolocateControl position="bottom-left"/>

        </MglMap>

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

      <div
        id="image-panel"
        :class="imagePanelClass"
      >
        <cyclomedia-widget
          v-if="shouldLoadCyclomediaWidget"
          @cyclomedia-widget-mounted="initializeCyclomedia"
          orientation="full-screen"
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
          orientation="full-screen"
        >
          <full-screen-toggle-tab
            :event="'toggle-tab-click'"
            :initial-activation="imageryToggleInitialActivation"
            :deactivated-direction="'left'"
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

  </div>
</template>

<script>

import 'mapbox-gl/dist/mapbox-gl.css';
import destination from '@turf/destination';

import PhilaHeader from './PhilaHeader.vue';
import PhilaButton from './PhilaButton.vue';
import AddressInput from './MapAddressInput.vue';
// import PhilaFooter from './PhilaFooter.vue';

// import MarathonToggleControl from './MarathonToggleControl.vue';
// import LocationControl from '@phila/vue-mapping/src/components/LocationControl.vue';
// import BasemapToggleControl from '@phila/vue-mapping/src/components/BasemapToggleControl.vue';

import CyclomediaRecordingsClient from '@phila/vue-mapping/src/cyclomedia/recordings-client.js';
import cyclomediaMixin from '@phila/vue-mapping/src/cyclomedia/map-panel-mixin-update.js';

export default {
  name: 'Viewerboard',
  components: {
    PhilaHeader,
    PhilaButton,
    AddressInput,
    // PhilaFooter,
    // MarathonToggleControl,
    // Map_: () => import(/* webpackChunkName: "pvm_Map" */'@phila/vue-mapping/src/leaflet/Map.vue'),
    FullScreenToggleTab: () => import(/* webpackChunkName: "pvm_FullScreenToggleTab" */'@phila/vue-mapping/src/components/FullScreenToggleTab.vue'),
    // FullScreenMapToggleTab: () => import(/* webpackChunkName: "pvm_FullScreenMapToggleTab" */'@phila/vue-mapping/src/components/FullScreenMapToggleTab.vue'),
    // ControlCorner: () => import(/* webpackChunkName: "pvm_ControlCorner" */'@phila/vue-mapping/src/leaflet/ControlCorner.vue'),
    // LocationControl,
    // LocationControl: () => import(/* webpackChunkName: "pvm_LocationControl" */'@phila/vue-mapping/src/components/LocationControl.vue'),
    // BasemapToggleControl,
    // BasemapToggleControl: () => import(/* webpackChunkName: "pvm_BasemapToggleControl" */'@phila/vue-mapping/src/components/BasemapToggleControl.vue'),
    // AddressInput: () => import(/* webpackChunkName: "mbmp_pvc_AddressInput" */'@phila/vue-mapping/src/components/MapAddressInput.vue'),
    CyclomediaWidget: () => import(/* webpackChunkName: "mbmb_pvm_CyclomediaWidget" */'@phila/vue-mapping/src/cyclomedia/Widget.vue'),
    // PictometryWidget: () => import(/* webpackChunkName: "mbmb_pvm_PictometryWidget" */'@phila/vue-mapping/src/pictometry/Widget.vue'),
    // EsriTiledMapLayer: () => import(/* webpackChunkName: "mbmp_pvm_EsriTiledMapLayer" */'@phila/vue-mapping/src/esri-leaflet/TiledMapLayer.vue'),
    // CircleMarker: () => import(/* webpackChunkName: "mbmp_pvm_CircleMarker" */'@phila/vue-mapping/src/leaflet/CircleMarker.vue'),
    // CyclomediaRecordingCircle: () => import(/* webpackChunkName: "mbmp_pvm_CyclomediaRecordingCircle" */'@phila/vue-mapping/src/cyclomedia/RecordingCircle.vue'),
    // PngMarker: () => import(/* webpackChunkName: "mbmp_pvm_PngMarker" */'@phila/vue-mapping/src/components/PngMarker.vue'),
    // SvgViewConeMarker: () => import(/* webpackChunkName: "mbmp_pvm_CyclomediaSvgViewConeMarker" */'@phila/vue-mapping/src/cyclomedia/SvgViewConeMarker.vue'),
    MglMap: () => import(/* webpackChunkName: "pvm_MglMap" */'@phila/vue-mapping/src/mapbox/map/GlMap.vue'),
    MglMarker: () => import(/* webpackChunkName: "pvm_MglMarker" */'@phila/vue-mapping/src/mapbox/UI/Marker.vue'),
    MglIcon: () => import(/* webpackChunkName: "mbmp_pvm_MglIcon" */'@phila/vue-mapping/src/mapbox/UI/Icon.vue'),
    MglCircleMarker: () => import(/* webpackChunkName: "pvm_MglCircleMarker" */'@phila/vue-mapping/src/mapbox/UI/CircleMarker.vue'),
    MglNavigationControl: () => import(/* webpackChunkName: "pvm_MglNavigationControl" */'@phila/vue-mapping/src/mapbox/UI/controls/NavigationControl'),
    MglGeolocateControl: () => import(/* webpackChunkName: "pvm_MglGeolocateControl" */'@phila/vue-mapping/src/mapbox/UI/controls/GeolocateControl'),
    MglRasterLayer: () => import(/* webpackChunkName: "pvm_MglRasterLayer" */'@phila/vue-mapping/src/mapbox/layer/RasterLayer'),
    MglButtonControl: () => import(/* webpackChunkName: "pvm_MglButtonControl" */'@phila/vue-mapping/src/mapbox/UI/controls/ButtonControl.vue'),
    MglControlContainer: () => import(/* webpackChunkName: "pvm_MglControlContainer" */'@phila/vue-mapping/src/mapbox/UI/controls/ControlContainer.vue'),
    MglImageLayer: () => import(/* webpackChunkName: "pvm_MglImageLayer" */'@phila/vue-mapping/src/mapbox/layer/ImageLayer'),
    MglVectorLayer: () => import(/* webpackChunkName: "pvm_MglVectorLayer" */'@phila/vue-mapping/src/mapbox/layer/VectorLayer'),
    MbIcon: () => import(/* webpackChunkName: "pvm_MbIcon" */'@phila/vue-mapping/src/mapbox/UI/MbIcon'),
    MglGeojsonLayer: () => import(/* webpackChunkName: "pvm_MglGeojsonLayer" */'@phila/vue-mapping/src/mapbox/layer/GeojsonLayer'),
  },
  data() {
    const data = {
      // this will only affect the app size if the app is set to "plugin" mode
      mbRootStyle: {
        'height': '100px',
      },
      accessToken: process.env.VUE_APP_MAPBOX_ACCESSTOKEN,
      hoveredStateId: null,
      mapToggleInitialActivation: null,
      imageryToggleInitialActivation: null,
      activeBasemap: 'pwd',
      tiledLayers: ['cityBasemapLabels'],
      activeTiledOverlays: [],
      // shouldShowMglMap: false,
      watchedZoom: null,
      geojsonCameraSource: {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': []
          }
        }
      },
      geojsonCameraLayer: {
        'id': 'cameraPoints',
        'type': 'symbol',
        'source': 'cameraPoint',
        'layout': {
          'icon-image': 'cameraMarker',
          'icon-size': 0.13,
          'icon-rotate': 0,
          'icon-rotation-alignment': 'map',
        }
      },

      geojsonViewconeSource: {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'geometry': {
            'type': 'Polygon',
            'coordinates': [[]],
          }
        }
      },
      geojsonViewconeLayer: {
        'id': 'viewcones',
        'type': 'fill',
        'source': 'viewcone',
        'layout': {},
        'paint': {
          'fill-color': 'rgb(0,102,255)',
          'fill-opacity': 0.2,
        }
      },

      geojsonCircleSource: {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
          }
        }
      },
      geojsonCircleLayer: {
        'id': 'circle500',
        'type': 'circle',
        'source': 'source_circle_500',
        'layout': {},
        //   "visibility": "none"
        // },
        'paint': {
          'circle-radius': 10,
          'circle-color': '#5b94c6',
          'circle-opacity': 0.6
        }
      },
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
      if (this.$config.map.type) {
        this.$store.commit('setMapType', this.$config.map.type);
      }
    }
    window.addEventListener('resize', this.handleWindowResize);
  },
  mounted() {
    if (this.$config.dataSources) {
      this.$controller.dataManager.fetchData();
    }
    if (this.$config.initialTiledOverlays) {
      this.activeTiledOverlays = this.$config.initialTiledOverlays;
    }
    if (this.$config.map.center) {
      this.$store.commit('setMapCenter', this.$config.map.center);
    }
    // if (this.$config.map.zoom && this.$store.map) {
    if (this.$config.map.zoom && this.$store.map) {
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

    // if (this.mapType === 'mapbox') {
    //   let map = this.$store.map;
    //   console.log('App mounted, map:', map);
    //   for (let source of Object.keys(this.$config.sources)) {
    //     map.addSource(source, this.$config.sources.source);
    //   }
    // }
  },
  watch: {
    // sources(nextSources) {
    //   this.$nextTick(() => {
    //     console.log('watch sources is firing');
    //   });
    // },
    // computedMapStyle() {
    //   this.$nextTick(() => {
    //     // if (this.mapType === 'leaflet') {
    //     //   this.$store.state.map.map.invalidateSize();
    //     // } else if (this.mapType === 'mapbox') {
    //     //   this.$store.state.map.map.resize();
    //     // }
    //     console.log('watchComputedMapStyle is firing');
    //   });
    // },
    watchedZoom(nextWatchedZoom) {
      if (this.cyclomediaActive) {
        this.handleCycloChanges();
      }
      let map = this.$store.map;
      if (map) {
        this.$store.map.setZoom(nextWatchedZoom);
      }
    },
    mapPanelClass() {
      let themap = this.$store.map;
      if (themap && this.$config.map.type && this.$config.map.type === 'mapbox') {
        // console.log('App.vue watch fullScreenMapEnabled is firing, inside if, map:', themap);
        setTimeout(function(){
          // alert("Hello");
          themap.resize();
        }, 250);
        // console.log('App.vue watch fullScreenMapEnabled still running');
      }
    },
    geocodeCoordinates(nextGeocodeCoordinates) {
      this.$store.commit('setCyclomediaLatLngFromMap', [this.$store.state.geocode.data.geometry.coordinates[1], this.$store.state.geocode.data.geometry.coordinates[0]]);
      this.$store.commit('setMapCenter', nextGeocodeCoordinates);
      this.$store.map.setCenter(nextGeocodeCoordinates);
    },
    cycloLatlng(nextCycloLatlng) {
      // console.log('watch cycloLatlng, nextCycloLatlng:', nextCycloLatlng, 'this.$data.geojsonCameraSource:', this.$data.geojsonCameraSource);
      this.$data.geojsonCameraSource.data.geometry.coordinates = [nextCycloLatlng[1], nextCycloLatlng[0]];
      this.handleCycloChanges();
      // console.log('watch cycloLatlng end');
    },
    cycloRotationAngle(nextCycloRotationAngle) {
      // console.log('watch cycloRotationAngle is firing, nextCycloRotationAngle:', nextCycloRotationAngle);
      this.$data.geojsonCameraLayer.layout['icon-rotate'] = nextCycloRotationAngle;
      this.handleCycloChanges();
    },
    cycloHFov(nextCycloHFov) {
      // console.log('watch cycloHFov is running, nextCycloHFov:', nextCycloHFov);
      this.handleCycloChanges();
    },
  },
  computed: {
    sources() {
      return this.$store.state.sources;
    },
    customMapComponent() {
      if (this.$config.customComps) {
        return this.$config.customComps;
      } else {
        return {}
      }
    },
    shouldShowMglMap() {
      console.log('computed shouldShowMglMap is running, this.$store.state.sources.length:', this.$store.state.sources.length);
      if (this.$config.mbStyle !== 'test') {
        return true;
      } else if (this.$store.state.sources.length) {
      // if (this.$store.state.sources.length && this.$store.state.sources.testStyle.status) {
        if (this.$store.state.sources.testStyle.status === 'success') {
          console.log('computed shouldShowMglMap is returning success');
          return true;
        } else {
          console.log('computed shouldShowMglMap is returning false');
          return false;
        }
      } else {
        console.log('computed shouldShowMglMap has no sources, returning false');
        return true;
      }
    },
    computedMapStyle() {
      let value;
      console.log('computedMapStyle, this.$config:', this.$config);
      // if (this.$config) {
      //   return value;
      // }
      if (this.$config.mbStyle === 'test' && this.$store.state.sources.testStyle.data) {
        console.log('computedMapStyle if is running');
        value = {
          version: 8,
          sources: {
            esri: {
              type: "vector",
                tiles: [
                  'https://basemaps.arcgis.com/arcgis/rest/services/OpenStreetMap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf',
                ],
                maxzoom: 22,
            },
          },
          layers: this.$store.state.sources.testStyle.data.layers,
          glyphs: this.$store.state.sources.testStyle.data.glyphs,
        }
      // } else if (this.$config.mbStyle === 'test') {
        // value = {
        //   version: 8,
        //   sources: {
        //     esri: {
        //       type: "vector",
        //         tiles: [
        //           'https://basemaps.arcgis.com/arcgis/rest/services/OpenStreetMap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf',
        //         ],
        //         maxzoom: 22,
        //     },
        //   },
        // }
      } else {
        value = this.$config.mbStyle;
      }
      // console.log('computedMapStyle, value:', value, 'value.version:', value.version);
      return value;
    },
    shouldShowRasterLayer() {
      let value = true;
      if (this.$config.map.tiles === 'hosted') {
        value = false
      }
      return value;
    },
    basemapImageLink() {
      if (this.activeBasemap === 'pwd') {
        return 'images/imagery_small.png';
      } else {
        return 'images/basemap_small.png';
      }
    },
    basemapSources() {
      return this.$config.basemapSources;
    },
    basemapLabelSources() {
      return this.$config.basemapLabelSources;
    },
    overlaySources() {
      return this.$config.overlaySources;
    },
    mapType() {
      return this.$store.state.map.type;
    },
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
    // shouldShowMarathonToggleControl() {
    //   let value;
    //   if (this.$config.map.marathonToggle) {
    //     value = this.$config.map.marathonToggle;
    //   } else {
    //     value = false;
    //   }
    //   return value;
    // },
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
      return null;
      // const center = this.$config.map.center;
      // return center;

    },
    cycloRotationAngle() {
      let angle = this.$store.state.cyclomedia.orientation.yaw || 0;// * (180/3.14159265359);
      return angle;
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
    cameraOverlay() {
      if (!this.fullScreenMapEnabled) {
        return 'cameraPoints';
      } else {
        return null;
      }
    },
    basemapsBefore() {
      let value = this.cameraOverlay;
      if (this.activeTiledOverlays && this.activeTiledOverlays.length) {
        value = this.activeTiledOverlays[this.activeTiledOverlays.length-1];
      }
      return value;
      // let map = this.$store.map;
      // let overlaySources = Object.keys(this.$config.overlaySources);
      // let overlay;
      // console.log('App.vue basemapsBefore computed is running, map:', map);
      // if (map) {
      //   // console.log('map.getStyle().layers:', map.getStyle().layers);
      //   let overlays = map.getStyle().layers.filter(function(layer) {
      //     console.log('App.vue basemapsBefore computed, layer.id:', layer.id, 'overlaySources:', overlaySources);
      //     return overlaySources.includes(layer.id);//[0].id;
      //   });
      //   if (overlays.length) {
      //     overlay = overlays[0].id;
      //   } else if (this.cyclomediaActive) {
      //     overlay = 'cameraPoints';
      //   }
      // }
      // return overlay;
    },
  },
  methods: {
    handleMapClick(e) {
      let map = this.$store.map;
      let features = map.queryRenderedFeatures(e.mapboxEvent.point);
      // console.log('handleMapClick is running e:', e, 'map:', map, 'features:', features);
    },
    handleActiveOverlayChange(overlay) {
      // console.log('handleActiveOverlayChange, overlay:', overlay);
      this.activeTiledOverlays = [ overlay ];
    },
    handleVectorLayerMouseover(event) {
      let e = event.mapboxEvent;
      let hoveredStateId = this.$data.hoveredStateId;
      let hoveredFeatureData;
      this.$store.map.getCanvas().style.cursor = 'pointer';
      console.log('handleVectorLayerMouseover is running, e:', e);
      if (e.features.length > 0) {
        if (hoveredStateId) {
          this.$store.commit('setVectorLayerMouseover', null);
          this.$data.hoveredStateId = null;
          this.$store.map.setFeatureState({
            source: 'streetsVectorSource',
            sourceLayer: 'Street_Centerline_PVL',
            id: hoveredStateId,
          },{
            hover: false
          });
        }
        hoveredStateId = e.features[0].id;
        hoveredFeatureData = e.features[0].properties
        console.log('still going, hoveredStateId:', hoveredStateId);
        this.$store.commit('setVectorLayerMouseover', hoveredFeatureData);
        this.$data.hoveredStateId = hoveredStateId;
        this.$store.map.setFeatureState({
          source: 'streetsVectorSource',
          sourceLayer: 'Street_Centerline_PVL',
          id: hoveredStateId,
        },{
          hover: true
        });
      }
    },
    handleVectorLayerMouseout(event) {
      let e = event.mapboxEvent;
      let hoveredStateId = this.$data.hoveredStateId;
      let hoveredFeatureData;
      this.$store.map.getCanvas().style.cursor = '';
      console.log('handleVectorLayerMouseout is running, e:', e);
      if (hoveredStateId) {
        this.$store.commit('setVectorLayerMouseover', null);
        this.$data.hoveredStateId = null;
        this.$store.map.setFeatureState({
          source: 'streetsVectorSource',
          sourceLayer: 'Street_Centerline_PVL',
          id: hoveredStateId,
        },{
          hover: false
        });
      }
      // hoveredStateId = null;
    },
    handleCycloChanges() {
      const halfAngle = this.cycloHFov / 2.0;
      let angle1 = this.cycloRotationAngle - halfAngle;
      let angle2 = this.cycloRotationAngle + halfAngle;
      // console.log('handleCycloChanges, halfAngle:', halfAngle, 'angle1:', angle1, 'this.cycloRotationAngle:', this.cycloRotationAngle, 'angle2:', angle2);

      let distance;
      if (this.$data.watchedZoom < 9) {
        distance = 2000 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 10) {
        distance = 1000 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 11) {
        distance = 670 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 12) {
        distance = 420 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 13) {
        distance = 270 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 14) {
        distance = 150 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 15) {
        distance = 100 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 16) {
        distance = 55 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 17) {
        distance = 30 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 18) {
        distance = 25 * (21 - this.$data.watchedZoom);
      } else if (this.$data.watchedZoom < 20.4) {
        distance = 15 * (21 - this.$data.watchedZoom);
      } else {
        distance = 10;
      }

      console.log('handleCycloChanges is running, this.$data.watchedZoom:', this.$data.watchedZoom, 'distance:', distance);
      let options = {units: 'feet'};

      if (!this.cycloLatlng) {
        return;
      }

      var destination1 = destination([this.cycloLatlng[1], this.cycloLatlng[0]], distance, angle1, options);
      var destination2 = destination([this.cycloLatlng[1], this.cycloLatlng[0]], distance, angle2, options);
      // console.log('cyclocenter:', [this.cycloLatlng[1], this.cycloLatlng[0]], 'destination1:', destination1.geometry.coordinates, 'destination2:', destination2.geometry.coordinates);
      // console.log('destination1:', destination1.geometry.coordinates, 'destination2:', destination2.geometry.coordinates);

      this.$data.geojsonViewconeSource.data.geometry.coordinates = [
        [
          [this.cycloLatlng[1], this.cycloLatlng[0]],
          [destination1.geometry.coordinates[0], destination1.geometry.coordinates[1]],
          [destination2.geometry.coordinates[0], destination2.geometry.coordinates[1]],
          [this.cycloLatlng[1], this.cycloLatlng[0]]
        ]
      ]
    },
    onMapLoaded(event) {
      // this.$store.commit('setMap', map);
      this.$store.map = event.map;
    },
    onMapPreloaded(event) {
      let logo = document.getElementsByClassName('mapboxgl-ctrl-logo');
      // console.log('MapPanel onMapPreloaded, logo:', logo, 'logo.length:', logo.length, 'logo.item(0):', logo.item(0));
      logo[0].remove();
      let attrib = document.getElementsByClassName('mapboxgl-ctrl-attrib');
      attrib[0].remove();
    },
    vectorClicked(e) {
      console.log('vectorClicked is running, e:', e, 'e.mapboxEvent.point:', e.mapboxEvent.point);
      let map = this.$store.map;
      var bbox = [
        [e.mapboxEvent.point.x - 5, e.mapboxEvent.point.y - 5],
        [e.mapboxEvent.point.x + 5, e.mapboxEvent.point.y + 5]
        // [e.point.x - 5, e.point.y - 5],
        // [e.point.x + 5, e.point.y + 5]
      ];
      var features = map.queryRenderedFeatures(bbox, {
        layers: ['PVL_Original']
      });
      console.log('vectorClicked, features:', features);
    },
    halfMarathonButtonClicked() {
      // console.log('halfMarathonButtonClicked is running');
      this.activeTiledOverlays = ['halfMarathon'];
    },
    fullMarathonButtonClicked() {
      // console.log('fullMarathonButtonClicked is running');
      this.activeTiledOverlays = ['fullMarathon'];
    },
    handleBasemapToggleClick() {
      // console.log('handleBasemapToggleClick is running, this.activeBasemap:', this.activeBasemap);
      if (this.activeBasemap === 'pwd') {
        // console.log('if is running');
        this.activeBasemap = this.$store.state.map.imagery;
        this.tiledLayers = ['imageryBasemapLabels']
      } else if (this.activeBasemap === 'imagery2019') {
        // console.log('else if is running');
        this.activeBasemap = this.$store.state.map.basemap;
        this.tiledLayers = ['cityBasemapLabels']
      }
    },
    mapToggleClicked() {
      // console.log('mapToggleClicked is running, this.$store', this.$store, 'this.$store.state.fullScreenMapEnabled', this.$store.state.fullScreenMapEnabled);
      this.$store.commit('setFullScreenMapEnabled', !this.$store.state.fullScreenMapEnabled);
      if (this.$store.state.cyclomedia.initializationBegun === false) {
        this.initializeCyclomedia();
      }
    },
    imageToggleClicked() {
      // console.log('imageToggleClicked is running, this.$store', this.$store, 'this.$store.map', this.$store.map);
      this.$store.commit('setFullScreenImageryEnabled', !this.$store.state.fullScreenImageryEnabled);
      if (this.$store.state.fullScreenImageryEnabled === false) {
        this.$store.commit('setShouldInitializeMap', true);
      }
    },
    toggleScreenShare() {
      // console.log('toggleScreenShare is running, this.$store', this.$store, 'this.$store.map', this.$store.map);
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
      // console.log('app initializeCyclomedia is running');
      if (!this.$store.state.fullScreenMapEnabled) {
        // console.log('app initializeCyclomedia IF is running');
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
      const map = this.$store.map;
      // console.log('handleMapMove is starting, map:', map, 'map.getBounds():', map.getBounds());
      if (!map) {
        return;
      }
      const center = map.getCenter();
      const { lat, lng } = center;
      const coords = [ lng, lat ];

      // console.log('handleMapMove is running, coords:', coords);

      const pictometryConfig = this.$config.pictometry || {};
      const cyclomediaConfig = this.$config.cyclomedia || {};

      const zoom = map.getZoom();
      this.$data.watchedZoom = zoom;

      if (pictometryConfig.enabled) {
        // update state for pictometry
        this.$store.commit('setPictometryMapCenter', coords);
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

.map-overlay {
  font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif;
  position: absolute;
  width: 200px;
  top: 0;
  left: 0;
  padding: 10px;
}

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
