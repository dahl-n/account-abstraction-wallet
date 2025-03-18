import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import Components from "unplugin-vue-components/vite";
import { FileSystemIconLoader } from "unplugin-icons/loaders";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Components({
      resolvers: [
        IconsResolver({
          customCollections: ["fab", "fad", "far", "fas", "fal"],
        }),
      ],
    }),
    Icons({
      scale: 1,
      defaultClass: "un-icon",
      // customCollections: {
      //   fab: FileSystemIconLoader(
      //     "./node_modules/@fortawesome/fontawesome-pro/svgs/brands",
      //     (svg) => svg.replace(/^<svg /, '<svg fill="currentColor" ')
      //   ),
      //   fad: FileSystemIconLoader(
      //     "./node_modules/@fortawesome/fontawesome-pro/svgs/duotone",
      //     (svg) => svg.replace(/^<svg /, '<svg fill="currentColor" ')
      //   ),
      //   far: FileSystemIconLoader(
      //     "./node_modules/@fortawesome/fontawesome-pro/svgs/regular",
      //     (svg) => svg.replace(/^<svg /, '<svg fill="currentColor" ')
      //   ),
      //   fas: FileSystemIconLoader(
      //     "./node_modules/@fortawesome/fontawesome-pro/svgs/solid",
      //     (svg) => svg.replace(/^<svg /, '<svg fill="currentColor" ')
      //   ),
      //   fal: FileSystemIconLoader(
      //     "./node_modules/@fortawesome/fontawesome-pro/svgs/light",
      //     (svg) => svg.replace(/^<svg /, '<svg fill="currentColor" ')
      //   ),
      // },
    }),
    nodePolyfills(),
    vue(),
  ],
});
