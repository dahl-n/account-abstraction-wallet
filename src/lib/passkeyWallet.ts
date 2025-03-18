import {
  Safe4337CreateTransactionProps,
  Safe4337Pack,
} from "@safe-global/relay-kit";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let safePack = null as null | Safe4337Pack;
export function setSafePack(pack: Safe4337Pack) {
  safePack = pack;
}

export async function sendPasskeyTransaction(
  transactionOptions: Safe4337CreateTransactionProps
) {
  if (!safePack) {
    throw new Error("Safe pack not set");
  }

  const safeOperation = await safePack.createTransaction(transactionOptions);

  const signedSafeOperation = await safePack.signSafeOperation(safeOperation);

  const userOperationHash = await safePack.executeTransaction({
    executable: signedSafeOperation,
  });

  while (true) {
    await wait(3000);
    let userOpReceipt = await safePack.getUserOperationReceipt(
      userOperationHash
    );
    if (userOpReceipt) {
      console.log("userOpReceipt", userOpReceipt);
      break;
    }
  }

  return userOperationHash;
}
