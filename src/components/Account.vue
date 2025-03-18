<script setup lang="ts">
import { useBalance, useReadContract } from "@wagmi/vue";
import { formatEther } from "viem";
import { computed, onMounted, ref, watchEffect } from "vue";
import { toast } from "vue3-toastify";
import { CONTRACTS_BASE_SEPOLIA } from "../abi/addresses";
import { safeAbi } from "../abi/Safe";
import { safeEmailRecoveryModuleAbi } from "../abi/SafeEmailRecoveryModule";
import { recoveryModule } from "../lib/recoveryModule";
import { safeModule } from "../lib/safeWallet";
import { useStore } from "../lib/store";
import { sendPasskeyTransaction } from "../lib/passkeyWallet";
import { readContract } from "@wagmi/vue/actions";
import { config } from "../wagmi";
import { SafeWebAuthnSharedSignerAbi } from "../abi/SafeWebAuthnSharedSigner";
import SafeWebAuthnSharedSignerContract_v0_2_1 from "@safe-global/protocol-kit/dist/src/contracts/SafeWebAuthnSharedSigner/v0.2.1/SafeWebAuthnSharedSignerContract_v0_2_1";

let store = useStore();
onMounted(() => {
  console.log("store", store);
});

let address = computed(() => store.walletAddress);

let balance = useBalance({
  address,
  query: {
    refetchInterval: 1000 * 5,
  },
});

const erc20Tokens = [
  { name: "USDC", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
  { name: "USDT", address: null }, // placeholder
  { name: "WBTC", address: null }, // placeholder
  { name: "LINK", address: null }, // placeholder
];

let balanceUsdt = useBalance({
  token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // faucet: https://faucet.circle.com/
  address,
  query: {
    refetchInterval: 1000 * 5,
  },
});
let balanceUsdtFormatted = computed(() => {
  return formatEther(balanceUsdt.data.value?.value || 0n);
});

let balanceFormatted = computed(() => {
  return (
    formatEther(balance.data.value?.value || 0n) +
    " " +
    balance.data.value?.symbol
  );
});

// wagmi query to check if contract is deployed
const safeModuleOwners = useReadContract({
  address,
  abi: safeAbi,
  functionName: "getOwners",
  query: {
    refetchInterval: 1000 * 5,
  },
});

const isSafeDeployed = computed(() => {
  return (
    safeModuleOwners?.data?.value?.length &&
    safeModuleOwners.data.value.length > 0
  );
});

const getModulesPaginated = useReadContract({
  address,
  abi: safeAbi,
  functionName: "getModulesPaginated",
  args: [`0x1`, 10n],
});

const safeOwners = safeModule.getOwners();
const recoveryModuleEnabled = useReadContract({
  address: store.walletAddress,
  abi: safeAbi,
  functionName: "isModuleEnabled",
  args: [CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule],
  query: {
    enabled: !!store.walletAddress,
    // refetchInterval: 3000,
  },
});

function invalidateQuery() {
  recoveryModuleEnabled.refetch();
}

const canRecoverAccount = computed(() => {
  let gc = guardianConfig.data.value;
  if (!gc) return false;
  return gc.acceptedWeight === gc.threshold && gc.threshold !== 0n;
});

const enableRecoveryModuleLoading = ref(false);
const enableRecoveryModule = async () => {
  enableRecoveryModuleLoading.value = true;

  try {
    await safeModule.enableRecoveryModule();
    recoveryModuleEnabled.refetch();
    toast.success("Recovery module enabled");
  } catch (e: any) {
    console.error(e);
    toast.error("Failed to enable recovery module: " + e.message);
  } finally {
    enableRecoveryModuleLoading.value = false;
  }
};

const guardianConfig = useReadContract({
  address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
  abi: safeEmailRecoveryModuleAbi,
  functionName: "getGuardianConfig",
  args: [computed(() => useStore().walletAddress)],
  query: {
    refetchInterval: 1000 * 5,
  },
});

// send eth
let receiveAmount = ref("");
let receiveAddress = ref("");
let sendEthLoading = ref(false);
const sendEth = async () => {
  try {
    sendEthLoading.value = true;
    await safeModule.sendTransaction(receiveAddress.value, receiveAmount.value);
    receiveAmount.value = "";
    receiveAddress.value = "";
    toast.success("Transaction sent");
  } catch (e: any) {
    console.error(e);
    toast.error("Failed to send transaction: " + e.message);
  } finally {
    sendEthLoading.value = false;
  }
};

// guardian setup
let isLocalhost = window.location.hostname === "localhost";
let guardianMail = ref("");
const addGuardianLoading = ref(false);
const addGuardian = async () => {
  try {
    addGuardianLoading.value = true;
    await recoveryModule.addGuardian(guardianMail.value);
    guardianConfig.refetch();
    guardianMail.value = "";
    toast.success("Guardian added");
  } catch (e: any) {
    console.error(e);
    toast.error("Failed to add guardian: " + e.message);
  } finally {
    addGuardianLoading.value = false;
  }
};

const addressFormatted = computed(() => {
  return (
    store.walletAddress.slice(0, 6) + "..." + store.walletAddress.slice(-4)
  );
});

watchEffect(() => {
  console.log("getModulesPaginated", getModulesPaginated.data);
  console.log("recoveryModuleEnabled", recoveryModuleEnabled);
  console.log("recoveryModuleEnabled", recoveryModuleEnabled.data);
  console.log("sendEth receiveAmount", receiveAmount.value);
});
</script>

<template lang="pug">
v-container(fluid class="d-flex flex-column ga-4 align-center")
  v-card(elevation="2" max-width="500" class="pa-4" min-width="420")
    v-card-title Wallet: {{ store.walletDisplayName }}
    //- v-card-subtitle Address: {{addressFormatted}}


    v-card-text
      .addressFull Address:
      .addressFull {{address}}
      //- .addressFull.d-flex.ga-4.mt-2
        a(:href="'https://sepolia.basescan.org/address/' + address", target="_blank")
          span Etherscan
          //- i-mdi-open-in-new
      .mt-4
      //- balance
      .d-flex.justify-space-between
        .d-flex.flex-column
          h5 Balance
          span.bold {{ balanceFormatted }}
        .d-flex.flex-column
          h5 Status
          .d-flex.align-center(v-if="isSafeDeployed")
            i-mdi-check(color="green")
            span Deployed
          span(v-else)
            span Not Deployed
      
      h5.mt-8.mb-1 ERC-20 Tokens
      .d-flex.justify-space-between
        .d-flex.align-end
          span.mr-1.bold {{ balanceUsdt.data.value?.value || 0 }}
          span USDC
        .d-flex.align-end(v-for="token in ['USDT', 'WBTC', 'LINK']")
          span.mr-1.bold {{ 0 }}
          span {{token}}
        
        

  v-card(elevation="2" max-width="500" class="pa-4" min-width="420")
    v-card-title.d-flex.align-center
      span Send Eth
      //- i-mdi-arrow-top-right.ml-1
    v-card-text
      v-text-field(hide-details, v-model="receiveAddress", label="Address", variant="underlined", :disabled="sendEthLoading")
      .mt-1
      v-text-field(hide-details, v-model="receiveAmount", label="Amount", variant="underlined", type="number", suffix="wei", :disabled="sendEthLoading")
      .d-flex.mt-3
        .flex-grow-1
        v-btn(color="primary", @click="sendEth", variant="flat", :disabled="!receiveAmount || !receiveAddress", :loading="sendEthLoading")
          .px-4 Send
        //- v-btn(@click="invalidateQuery") invalidate query
  
  v-card(elevation="2" max-width="500" class="pa-4" min-width="420")
    v-card-title Recovery Module
    v-card-text(v-if="recoveryModuleEnabled.data")
      .d-flex.align-center(v-if="recoveryModuleEnabled.data.value")
        h4 Status
        .flex-grow-1
        i-mdi-check(color="green")
        span Module Enabled
      span(v-if="!recoveryModuleEnabled.data.value") Not Enabled
      
      template(v-if="!recoveryModuleEnabled.data.value")
        //- enable module btn
        br
        .mt-4
        v-btn(color="primary", variant="flat", @click="enableRecoveryModule", :loading="enableRecoveryModuleLoading") Enable Recovery Module

      template(v-if="recoveryModuleEnabled.data.value && guardianConfig.data.value")
        .d-flex.align-center.mt-3(v-if="guardianConfig.data.value.guardianCount == 1")
          h4 Guardian
          .flex-grow-1

          .d-flex.flex-column.mt-1
            span(v-if="guardianConfig.data.value.acceptedWeight == 0") Waiting for guardian to accept..
            .d-flex.align-center(v-else)
              i-mdi-check(color="green")
              span Guardian has accepted
            //- span Guardian Count: {{ guardianConfig.data.value.guardianCount }}
            //- span Threshold: {{ guardianConfig.data.value.threshold }}
            //- span Total Weight: {{ guardianConfig.data.value.totalWeight }}
            //- span Accepted Weight: {{ guardianConfig.data.value.acceptedWeight }}
        v-alert.mt-4(v-if="guardianConfig.data.value.acceptedWeight != 0", type="success", text="Wallet can be recovered", dense, variant="tonal")
          template(#prepend)
            i-mdi-check 

        template(v-if="guardianConfig.data.value.guardianCount == 0")
          h4.mt-3 Configure Guardian
          v-text-field(v-model="guardianMail", label="Guardian Email", variant="underlined", :disabled="addGuardianLoading")
          .d-flex
            .flex-grow-1
            v-btn(color="primary", @click="addGuardian", variant="flat", :disabled="!guardianMail", :loading="addGuardianLoading") Configure Guardian

  v-btn.mt-6(color="gray", variant="outlined", @click="store.resetAll()")
    i-mdi-logout.mr-1.ml-2
    span.mr-2 Logout

div
  br
  //- span owners: {{ safeOwners.data }}
  br
</template>

<style lang="css">
.addressFull {
  font-size: 0.8rem;
  color: #666;
}

.bold {
  font-weight: bold;
}
</style>
