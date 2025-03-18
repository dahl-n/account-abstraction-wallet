<script setup lang="ts">
import { computed } from "vue";
import Account from "./components/Account.vue";
import Connect from "./components/Connect.vue";
import { useStore } from "./lib/store";

const store = useStore();
const isWalletInitialized = computed(() => store.isWalletInitialized);
</script>

<template lang="pug">
Connect(v-if="!isWalletInitialized")
Account(v-else)
  
</template>
