import { PasskeyArgType } from "@safe-global/protocol-kit";
import { Safe4337Pack } from "@safe-global/relay-kit";
import { defineStore } from "pinia";

export const useStore = defineStore({
  id: "store",
  state: () => ({
    walletAddress: "0x" as `0x${string}`,
    walletDisplayName: "",
    selectedPasskey: null as null | PasskeyArgType,
    isWalletDeployed: false,
    safe4337Pack: null as null | Safe4337Pack,
  }),
  getters: {
    isWalletInitialized: (state) => !!state.safe4337Pack,
  },
  actions: {
    resetAll() {
      this.walletAddress = "0x" as `0x${string}`;
      this.walletDisplayName = "";
      this.selectedPasskey = null;
      this.isWalletDeployed = false;
      this.safe4337Pack = null;
    },
    setWalletAddress(address: string) {
      this.walletAddress = address as `0x${string}`;
    },
    setSelectedPasskey(passkey: PasskeyArgType) {
      this.selectedPasskey = passkey;
    },
    setWalletDisplayName(name: string) {
      this.walletDisplayName = name;
    },
    setIsWalletDeployed(isDeployed: boolean) {
      this.isWalletDeployed = isDeployed;
    },
    setSafe4337Pack(pack: Safe4337Pack) {
      this.safe4337Pack = pack;
    },
  },
});
