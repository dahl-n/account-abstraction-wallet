import { Buffer } from "buffer";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { WagmiPlugin } from "@wagmi/vue";
import { createApp } from "vue";
import { aliases, fa } from "vuetify/iconsets/fa";

// `@coinbase-wallet/sdk` uses `Buffer`
globalThis.Buffer = Buffer;

import App from "./App.vue";
import "./style.css";
import { config } from "./wagmi";
import { createPinia } from "pinia";

// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

import Vue3Toastify, { type ToastContainerOptions } from "vue3-toastify";
import "vue3-toastify/dist/index.css";

const app = createApp(App);

app.use(WagmiPlugin, { config }).use(VueQueryPlugin, {});

const pinia = createPinia();
app.use(pinia);

app.use(Vue3Toastify, {
  autoClose: 3000,
  // ...
} as ToastContainerOptions);

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: "fa",
    aliases,
    sets: {
      fa,
    },
  },
});
app.use(vuetify);

app.mount("#app");
