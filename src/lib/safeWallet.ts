import { useReadContract } from "@wagmi/vue";
import { readContract } from "@wagmi/vue/actions";
import { safeAbi } from "../abi/Safe";
import { CONTRACTS_BASE_SEPOLIA } from "../abi/addresses";
import { useStore } from "./store";
import { computed } from "vue";
import { sendPasskeyTransaction } from "./passkeyWallet";
import { encodeFunctionData } from "viem";
import { config } from "../wagmi";
import { SafeWebAuthnSignerFactoryAbi } from "../abi/SafeWebAuthnSignerFactory";

export const safeModule = {
  recoveryModuleEnabled: () => {
    let store = useStore();

    return useReadContract({
      address: store.walletAddress,
      abi: safeAbi,
      functionName: "isModuleEnabled",
      args: [CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule],
      query: {
        enabled: !!store.walletAddress,
        // refetchInterval: 3000,
      },
    });
  },

  getOwnersForAddress: (address: string) =>
    readContract(config, {
      address,
      abi: safeAbi,
      functionName: "getOwners",
    }),

  getOwners: () =>
    useReadContract({
      address: computed(() => useStore().walletAddress),
      abi: safeAbi,
      functionName: "getOwners",
    }),

  enableRecoveryModule: () =>
    safeModule.enableModule(CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule),

  sendTransaction: (to: string, amount: bigint | string) => {
    return sendPasskeyTransaction({
      transactions: [
        {
          to,
          data: "0x",
          value: amount.toString(),
        },
      ],
    });
  },

  enableModule: async (moduleAddress: `0x${string}`) => {
    let store = useStore();
    let walletAddress = store.walletAddress;

    if (!walletAddress) {
      return;
    }

    console.log("Enabling module", moduleAddress, "for wallet", walletAddress);

    await sendPasskeyTransaction({
      transactions: [
        {
          to: walletAddress,
          data: encodeFunctionData({
            abi: safeAbi,
            functionName: "enableModule",
            args: [moduleAddress],
          }),
          value: "0",
        },
      ],
    });
  },

  createPasskeySigner: async ({
    x,
    y,
    verifiers,
  }: {
    x: bigint;
    y: bigint;
    verifiers: bigint;
  }) => {
    return sendPasskeyTransaction({
      transactions: [
        {
          to: CONTRACTS_BASE_SEPOLIA.safeWebAuthnSignerFactory,
          data: encodeFunctionData({
            abi: SafeWebAuthnSignerFactoryAbi,
            functionName: "createSigner",
            args: [x, y, verifiers],
          }),
          value: "0",
        },
      ],
    });
  },
};
