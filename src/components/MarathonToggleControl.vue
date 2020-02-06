<template>
  <div>
    <div class="leaflet-bar easy-button-container twin-button">
      <button @click="this.handleHalfButtonClick"
              :class="this.ifHalfActive"
      >
        <span class="button-state state-unnamed-state unnamed-state-active">
          <img class="button-image" :src="'./images/half.png'">
          <!-- <img class="button-image" :src="'../src/assets/half.png'"> -->
        </span>
      </button>
    </div>
    <div class="leaflet-bar easy-button-container twin-button">
      <button @click="this.handleFullButtonClick"
              :class="this.ifFullActive"
      >
        <span class="button-state state-unnamed-state unnamed-state-active">
          <img class="button-image" :src="'./images/full.png'">
        </span>
      </button>
    </div>
  </div>
</template>

<script>
  import Control from '@phila/vue-mapping/src/leaflet/Control.vue';
  // import Control from './Control.vue';
  const {props, methods} = Control;
  export default {
    props: [
      'position',
    ],
    data() {
      const data = {
        // this will only affect the app size if the app is set to "plugin" mode
        // mbRootStyle: {
        //   'height': '100px',
        // },
        // mapToggleInitialActivation: null,
        // imageryToggleInitialActivation: null,
        activeVersion: 'full',
        // activeTiledOverlays: [],
      };
      return data;
    },
    computed: {
      // activeVersion() {
      //   return this.$store.state.marathonVersion;
      // },
      ifHalfActive() {
        let isActive;
        if (this.activeVersion === 'half') {
          isActive = 'active'
        } else {
          isActive = 'inactive'
        }
        return isActive;
      },
      ifFullActive() {
        let isActive;
        if (this.activeVersion === 'full') {
          isActive = 'active'
        } else {
          isActive = 'inactive'
        }
        return isActive;
      },
    },
    methods: Object.assign(methods, {
      handleHalfButtonClick() {
        console.log('handleHalfButtonClick is running, this:', this);
        this.activeVersion = 'half';
        this.$emit('half-marathon-button-clicked');
      },
      handleFullButtonClick() {
        console.log('handleFullButtonClick is running, this:', this);
        this.activeVersion = 'full';
        this.$emit('full-marathon-button-clicked');
      },
    })
  };
</script>

<style scoped>
  .button-image {
  }
  .inactive {
    background-color: #ffffff;
  }
  .inactive:hover {
    background-color: #ffffff;
  }
  .active {
    background-color: rgb(243, 198, 19);
  }
  .active:hover {
    background-color: rgb(243, 198, 19);
  }
  .twin-button {
    display: inline-block;
  }
</style>
