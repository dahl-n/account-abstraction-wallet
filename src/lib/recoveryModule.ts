import { useReadContract } from "@wagmi/vue";
import { safeAbi } from "../abi/Safe";
import { CONTRACTS_BASE_SEPOLIA } from "../abi/addresses";
import { useStore } from "./store";
import { computed } from "vue";
import { safeEmailRecoveryModuleAbi } from "../abi/SafeEmailRecoveryModule";
import { buildPoseidon } from "circomlibjs";
import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256,
} from "viem";
import { relayer } from "./relayer";
import { readContract, writeContract } from "@wagmi/vue/actions";
import { config } from "../wagmi";
import { sendPasskeyTransaction } from "./passkeyWallet";
import { accountHindingRecoveryCommandHandlerAbi } from "../abi/AccountHidingRecoveryCommandHandler";
import { safeModule } from "./safeWallet";

export function bytesToHex(bytes: Uint8Array) {
  return [...bytes]
    .reverse()
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function genAccountCode(): Promise<string> {
  const poseidon = await buildPoseidon();
  const accountCodeBytes: Uint8Array = poseidon.F.random();
  return bytesToHex(accountCodeBytes);
}

export const recoveryModule = {
  getGuardianConfig: () =>
    useReadContract({
      address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
      abi: safeEmailRecoveryModuleAbi,
      functionName: "getGuardianConfig",
      args: [computed(() => useStore().walletAddress)],
    }),

  canRecoverAccount: () => {
    let guardianConfig = recoveryModule.getGuardianConfig();
    return computed(() => {
      let gc = guardianConfig.data.value;
      if (!gc) return false;
      return gc.acceptedWeight === gc.threshold && gc.threshold !== 0n;
    });
  },

  getRecoveryRequest: () =>
    useReadContract({
      address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
      abi: safeEmailRecoveryModuleAbi,
      functionName: "getRecoveryRequest",
      args: [computed(() => useStore().walletAddress)],
    }),

  addGuardian: async (guardianEmail: string) => {
    let store = useStore();

    const acctCode = await genAccountCode();
    const address = store.walletAddress;

    const guardianSalt = await relayer.getAccountSalt(acctCode, guardianEmail);

    console.log("guardianSalt", guardianSalt);
    const guardianAddr = await readContract(config, {
      abi: safeEmailRecoveryModuleAbi,
      address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
      functionName: "computeEmailAuthAddress",
      args: [address, guardianSalt],
    });
    console.log("guardianAddr", guardianAddr);

    const configureRecoveryUserOpHash = await sendPasskeyTransaction({
      transactions: [
        {
          to: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
          data: encodeFunctionData({
            abi: safeEmailRecoveryModuleAbi,
            functionName: "configureSafeRecovery",
            args: [
              [guardianAddr],
              [1n], // weights
              1n, // thresholds
              BigInt(100), // 100s
              BigInt(7 * 60 * 60 * 24 * 30), // 7 months
            ],
          }),
          value: "0",
        },
        {
          to: "0x11AAEEd0629124A0075A0074Ff4AB54286F72D3d" as `0x${string}`,
          data: encodeFunctionData({
            abi: accountHindingRecoveryCommandHandlerAbi.abi,
            functionName: "storeAccountHash",
            args: [address],
          }),
          value: "0",
        },
      ],
    });
    console.log("configureRecoveryUserOpHash", configureRecoveryUserOpHash);

    const accountHash = keccak256(encodePacked(["address"], [address]));

    const command = await readContract(config, {
      abi: safeEmailRecoveryModuleAbi,
      address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
      functionName: "acceptanceCommandTemplates",
      args: [],
    });

    try {
      //   // Attempt the API call
      await relayer.acceptanceRequest(
        CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
        guardianEmail,
        acctCode,
        0,
        command[0]
          .join()
          ?.replaceAll(",", " ")
          .replaceAll("{string}", accountHash)
      );
    } catch (error) {
      // retry mechanism as this API call fails for the first time
      console.warn("502 error, retrying...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      await relayer.acceptanceRequest(
        CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
        guardianEmail,
        acctCode,
        0,
        command[0]
          .join()
          ?.replaceAll(",", " ")
          .replaceAll("{string}", accountHash)
      );
    }

    console.log("!! Recovery configured");
  },

  requestRecovery: async ({
    oldOwner,
    newOwner,
    walletAddress,
    guardianEmailAddress,
  }: {
    walletAddress: string;
    newOwner: string;
    oldOwner: string;
    guardianEmailAddress: string;
  }) => {
    const command = await readContract(config, {
      abi: safeEmailRecoveryModuleAbi,
      address: CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
      functionName: "recoveryCommandTemplates",
      args: [],
    });
    const accountHash = keccak256(encodePacked(["address"], [walletAddress]));

    const swapOwnerCallData = encodeFunctionData({
      abi: safeAbi,
      functionName: "swapOwner",
      args: [
        "0x0000000000000000000000000000000000000001", // If there is no previous owner of the safe, then the default value will be this
        oldOwner,
        newOwner,
      ],
    });

    const recoveryCalldata = encodeAbiParameters(
      [{ type: "address" }, { type: "bytes" }],
      [walletAddress, swapOwnerCallData]
    );

    const recoveryCallDatahash = keccak256(recoveryCalldata);

    // requestId
    await relayer.recoveryRequest(
      CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
      guardianEmailAddress,
      0, // templateIdx
      command[0]
        .join()
        ?.replaceAll(",", " ")
        .replace("{string}", accountHash)
        .replace("{string}", recoveryCallDatahash)
    );

    console.log("Recovery request sent waiting...");
  },

  completeRecovery: async ({
    oldOwner,
    newOwner,
    walletAddress,
  }: {
    newOwner: string;
    walletAddress: string;
    oldOwner: string;
  }) => {
    const swapOwnerCallData = encodeFunctionData({
      abi: safeAbi,
      functionName: "swapOwner",
      args: [
        "0x0000000000000000000000000000000000000001", // If there is no previous owner of the safe, then the default value will be this
        oldOwner,
        newOwner,
      ],
    });
    const completeCalldata = encodeAbiParameters(
      [{ type: "address" }, { type: "bytes" }],
      [walletAddress, swapOwnerCallData]
    );

    // Make the completeRecovery API call
    const res = await relayer.completeRecovery(
      CONTRACTS_BASE_SEPOLIA.safeEmailRecoveryModule,
      walletAddress,
      completeCalldata
    );

    console.debug("complete recovery data", res);
  },
};
