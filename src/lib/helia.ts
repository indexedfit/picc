//
//
import { createHelia } from "helia";
import { startLibp2p } from "./libp2p";

import { bitswap } from "@helia/block-brokers";
import { OPFSBlockstore } from "blockstore-opfs";

export async function initHelia(): Promise<any> {
  console.log("Opening OPFS blockstore...");

  // Check if OPFS is actually available
  // in the future, default to idb maybe...
  if (!navigator.storage?.getDirectory) {
    throw new Error(
      "OPFS not supported: navigator.storage.getDirectory missing",
    );
  }

  let store;
  try {
    // Test OPFS access first
    const opfsRoot = await navigator.storage.getDirectory();
    console.log("OPFS root accessible:", opfsRoot);

    store = new OPFSBlockstore("piccfit");
    await store.open();
    console.log("OPFS blockstore opened successfully");
  } catch (error) {
    console.error("OPFS blockstore failed:", error);
    throw new Error(
      `OPFS blockstore failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let libp2p;

  try {
    libp2p = await startLibp2p();
  } catch (error) {
    console.error("something libp2p faileD!");
  }

  const helia = await createHelia({
    blockstore: store,
    libp2p: libp2p as any,
    // Enable block exchange across peers
    blockBrokers: [bitswap()],
  });

  return { helia: helia as any };
}
