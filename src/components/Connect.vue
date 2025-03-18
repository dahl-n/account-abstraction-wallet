<script setup lang="ts">
import { useChainId, useConnect, useReadContract } from "@wagmi/vue";
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import {
  createPasskey,
  getPasskey,
  loadPasskeysFromLocalStorage,
  storePasskeyInLocalStorage,
} from "../lib/passkeys";
import type { IPasskeyAccount } from "../lib/passkeys";
import { useStore } from "../lib/store";
import { PasskeyArgType } from "@safe-global/protocol-kit";
import {
  BUNDLER_URL,
  PAYMASTER_URL,
  PIMLICO_API_KEY,
  RPC_URL,
} from "../lib/constants";
import { Safe4337Pack } from "@safe-global/relay-kit";
import { setSafePack } from "../lib/passkeyWallet";
import { toast } from "vue3-toastify";
import { recoveryModule } from "../lib/recoveryModule";
import { safeModule } from "../lib/safeWallet";
import { CONTRACTS_BASE_SEPOLIA } from "../abi/addresses";
import { safeEmailRecoveryModuleAbi } from "../abi/SafeEmailRecoveryModule";

let passkeys = loadPasskeysFromLocalStorage();
let newOwnerPasskeys = passkeys.map((pk) => ({
  title: pk.displayName,
  value: pk,
}));
const hasPasskey = ref(passkeys.length > 0);

const passkeyName = ref("");

async function createNew() {
  try {
    const passkey = await createPasskey(passkeyName.value);

    let passkeyAccount = { passkey, displayName: passkeyName.value };
    initWithPasskey(passkeyAccount, true);
  } catch (e: any) {
    toast.error("Passkey creation failed: " + e.message);
  }
}

async function useExisting(passkeyAcc: IPasskeyAccount) {
  initWithPasskey(passkeyAcc);
}

const loading = ref(false);
const initError = ref("");
let store = useStore();
async function initWithPasskey(
  { passkey, displayName, walletAddress }: IPasskeyAccount,
  storeKey = false
) {
  loading.value = true;

  try {
    console.log("walletAddress", walletAddress);
    const safe4337Pack = await Safe4337Pack.init({
      provider: RPC_URL,
      signer: passkey,
      bundlerUrl: BUNDLER_URL + PIMLICO_API_KEY,
      paymasterOptions: {
        isSponsored: true,
        sponsorshipPolicyId: "sp_smart_tinkerer",
        paymasterUrl: PAYMASTER_URL + PIMLICO_API_KEY,
      },
      options: {
        owners: [],
        threshold: 1,
        // safeAddress: walletAddress,
      },
    });

    walletAddress = await safe4337Pack.protocolKit.getAddress();
    if (storeKey) {
      storePasskeyInLocalStorage({
        passkey,
        displayName,
        walletAddress,
      });
    }

    store.setSelectedPasskey(passkey);
    store.setWalletDisplayName(displayName);
    store.setWalletAddress(walletAddress);
    store.setIsWalletDeployed(await safe4337Pack.protocolKit.isSafeDeployed());
    store.setSafe4337Pack(safe4337Pack);
    setSafePack(safe4337Pack);
  } catch (e: any) {
    toast.error("Wallet initialization failed: " + e.message);

    console.error(e);
    initError.value = e.message;
  } finally {
    loading.value = false;
  }
}

const showCreateWalletDialog = ref(false);
function startCreateNewWallet() {
  showCreateWalletDialog.value = true;
  passkeyName.value = "";
}

const showRecoveryDialog = ref(false);
const recoveryAddress = ref("");
const guardianEmail = ref("");
const newOwnerAccount = ref<IPasskeyAccount | null>(null);
const recoveryRequestSent = ref(false);
const oldOwner = ref("");

function addressShort(address: string) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

// watch(() => recoveryAddress.value, (value) => {
//   store.setWalletAddress(value);
// });

function startRecoverWallet() {
  showRecoveryDialog.value = true;
}

async function recoverWallet() {
  if (
    !recoveryAddress.value ||
    !guardianEmail.value ||
    !newOwnerAccount.value
  ) {
    toast.error("Please fill in all fields");
    return;
  }

  loading.value = true;

  try {
    store.setWalletAddress(recoveryAddress.value);
    // get current owner
    let currentOnwers = await safeModule.getOwnersForAddress(
      recoveryAddress.value
    );
    let newOnwers = await safeModule.getOwnersForAddress(
      newOwnerAccount.value!.walletAddress!
    );
    let newOnwerSigner = newOnwers[0];
    console.log("current owners", currentOnwers);

    oldOwner.value = currentOnwers[0];

    console.log("requestRecovery", {
      walletAddress: recoveryAddress.value,
      oldOwner: oldOwner.value,
      newOwner: newOnwerSigner,
      guardianEmailAddress: guardianEmail.value,
    });
    await recoveryModule.requestRecovery({
      walletAddress: recoveryAddress.value,
      oldOwner: oldOwner.value,
      newOwner: newOnwerSigner,
      guardianEmailAddress: guardianEmail.value,
    });

    recoveryRequestSent.value = true;

    toast.success("Recovery request sent");
  } catch (e: any) {
    toast.error("Wallet recovery failed: " + e.message);
  } finally {
    loading.value = false;
  }
}

const guardianConfig = useReadContract({
  address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
  abi: safeEmailRecoveryModuleAbi,
  functionName: "getGuardianConfig",
  args: [computed(() => useStore().walletAddress)],
  query: {
    refetchInterval: 1000 * 5,
  },
});

const recoveryRequest = useReadContract({
  address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
  abi: safeEmailRecoveryModuleAbi,
  functionName: "getRecoveryRequest",
  args: [computed(() => useStore().walletAddress)],
  query: {
    refetchInterval: 1000 * 5,
  },
});

const canRecoveryBeCompleted = computed(() => {
  let rr = recoveryRequest;
  let gc = guardianConfig;

  if (rr.data.value && gc.data.value) {
    let canRecover =
      rr.data.value.currentWeight >= gc.data.value.threshold &&
      gc.data.value.threshold > 0;
    return canRecover;
  }
  return false;
});

async function completeRecovery() {
  const walletAddress = store.walletAddress;

  let newOnwers = await safeModule.getOwnersForAddress(
    newOwnerAccount.value!.walletAddress!
  );
  let newOnwerSigner = newOnwers[0];

  try {
    loading.value = true;
    console.log("completeRecovery", {
      oldOwner: oldOwner.value,
      newOwner: newOnwerSigner,
      walletAddress,
    });
    await recoveryModule.completeRecovery({
      oldOwner: oldOwner.value,
      newOwner: newOnwerSigner,
      walletAddress,
    });

    toast.success("Recovery completed");

    recoveryRequestSent.value = false;
    showRecoveryDialog.value = false;

    storePasskeyInLocalStorage({
      passkey: newOwnerAccount.value!.passkey,
      displayName: "Recovered Wallet",
      walletAddress,
    });
  } catch (e: any) {
    toast.error("Recovery failed: " + e.message);
  } finally {
    loading.value = false;
  }
}
</script>

<template lang="pug">
//- div
  button(:disabled="loading", v-if="hasPasskey", @click="useExisting") Use existing Passkey
  br
  br
  input(type="text", v-model="passkeyName")
  button(:disabled="loading", @click="createNew") Create new Wallet
  br
  br
  v-btn(flat, color="secondary", outlined, :disabled="loading", @click="recoveryWallet") Recover Wallet

//- create wallet dialog with wallet name input
v-dialog(v-model="showCreateWalletDialog", style="max-width: 500px")
  v-card
    v-card-title Create new Wallet
    v-card-text
      v-text-field(v-model="passkeyName", label="Wallet Name", :disabled="loading")
    v-card-actions
      v-btn(color="primary", @click="createNew", :disabled="!passkeyName", :loading="loading") Create
      v-btn(color="secondary", @click="showCreateWalletDialog = false", :loading="loading") Cancel

v-container(fluid class="d-flex justify-center align-center" style="height: 100vh;")
  v-card(elevation="2" max-width="400" class="pa-4" min-width="360")
    v-card-title Login to your Wallet

    //- v-card-subtitle Enter your credentials to proceed
    .mt-4
    

    v-card-text
      //- pre {{passkeys}}

      template(v-for="passkey of passkeys")
        v-btn.moreHeight.mt-2(color="primary" @click="useExisting(passkey)" :loading="loading", block, variant="flat")
          .d-flex.flex-column.pa-2
            span Wallet: {{ passkey.displayName }}
            span.shortAddress.mt-1 Address: {{ addressShort(passkey.walletAddress) }}
      
      .mt-6

      v-btn(color="primary" @click="startCreateNewWallet" :loading="loading", outline, :variant="passkeys.length === 0 ? 'flat' : 'tonal'", block)
        i-mdi-fingerprint.mr-1
        | Create new Wallet
      //- v-form(ref="loginForm")
        v-text-field(
          label="Email"
          v-model="email"
          prepend-icon="mdi-email"
          type="email"
          rules="[rules.required, rules.email]"
          outlined
          required
        )
        v-text-field(
          label="Password"
          v-model="password"
          prepend-icon="mdi-lock"
          type="password"
          rules="[rules.required, rules.min(8)]"
          outlined
          required
        )

    v-card-actions(class="d-flex justify-space-between mt-4")
      //- v-btn(color="primary" @click="login" :loading="loading")
        v-icon(left) mdi-login
        | Login

      v-btn(color="primary", @click="startRecoverWallet", :loading="loading", block, variant="outlined")
        | Recover Wallet

//- recovery wallet dialog with wallet address input and guardian email input
v-dialog(v-model="showRecoveryDialog", style="max-width: 500px", persistent)
  v-card
    v-card-text
      h3 Recover Wallet
      .mt-2
      span.hint Enter the wallet address and the guardian email to recover the wallet
      .mt-4
      v-select(v-model="newOwnerAccount", label="New Signer", :items="newOwnerPasskeys", :disabled="loading || recoveryRequestSent")
      v-text-field(hide-details, v-model="recoveryAddress", label="Wallet Address", :disabled="loading || recoveryRequestSent")
      .mt-4
      v-text-field(hide-details, v-model="guardianEmail", label="Guardian Email", :disabled="loading || recoveryRequestSent")
      .mt-6
      v-btn(block, color="primary", @click="recoverWallet", :disabled="!recoveryAddress || !guardianEmail || !newOwnerAccount || recoveryRequestSent", :loading="loading") Send Recovery Request
      .mt-4

      v-alert(variant="outlined", type="info", v-if="recoveryRequestSent && !canRecoveryBeCompleted") Recovery request sent. Waiting for guardian to accept..
      v-alert(variant="outlined", type="success", v-if="canRecoveryBeCompleted") Recovery request accepted. You can now complete the recovery.
      .mt-2
      v-btn(block, color="success", @click="completeRecovery", :disabled="!canRecoveryBeCompleted", :loading="loading") Complete Recovery

    v-card-actions
      v-btn(color="secondary", @click="showRecoveryDialog = false", :loading="loading") Cancel


//- div(v-if="loading") Loading...
//- div(v-if="initError") Init-Fehler: {{ initError }}
</template>

<style lang="css">
.hint {
  font-size: 12px;
  color: grey;
}

.shortAddress {
  font-size: 0.7rem;
}
</style>
