// Modern libp2p browser stack: WebRTC + WebTransport + WebSockets + Relay v2
// identify/noise/yamux as per libp2p docs.
// Works without webrtc-star and fixes `transport.listenFilter` error.

import { createHelia } from "helia";
import { OPFSBlockstore } from "blockstore-opfs";

import { createLibp2p } from "libp2p";
import { webRTC } from "@libp2p/webrtc";
import { webTransport } from "@libp2p/webtransport";
import { webSockets } from "@libp2p/websockets";
import { all as wsAll } from "@libp2p/websockets/filters";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";

import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { bootstrap } from "@libp2p/bootstrap";

import type { PeerId } from "@libp2p/interface";
import { loadAllowedPeers } from "./identity";
import { loadConfig } from "./config";

export interface HeliaContext {
  helia: Awaited<ReturnType<typeof createHelia>>;
}

export async function initHelia(): Promise<HeliaContext> {
  const cfg = await loadConfig();

  const store = new OPFSBlockstore(cfg.blockstoreName);
  await store.open();

  const allowed = await loadAllowedPeers();

  // Allow bootstrap nodes to help with discovery, but restrict data connections
  const bootstrapPeers = new Set([
    "QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
    "QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
  ]);

  const gate = {
    denyDialPeer: async (peerId: PeerId) => {
      const idStr = peerId.toString();
      // Allow bootstrap nodes for discovery
      if (bootstrapPeers.has(idStr)) return false;
      // Allow explicitly allowed peers
      return !allowed.has(idStr);
    },
    denyInboundConnection: async (conn: any) => {
      const idStr = conn.remotePeer?.toString() || "";
      // Allow bootstrap nodes
      if (bootstrapPeers.has(idStr)) return false;
      return !allowed.has(idStr);
    },
    denyOutboundConnection: async (conn: any) => {
      const idStr = conn.remotePeer?.toString() || "";
      // Allow bootstrap nodes
      if (bootstrapPeers.has(idStr)) return false;
      return !allowed.has(idStr);
    },
  };

  // Use both default bootstrap nodes and configured relay addresses
  const bootstrapList = [
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
    ...cfg.relayAddrs,
  ];

  const libp2p = await createLibp2p({
    // Let other peers dial us via circuit-relay + WebRTC
    addresses: {
      listen: ["/webrtc"], // per docs; uses relay for signalling
    },
    transports: [
      // Allow plain ws during local dev; use WSS in production
      webSockets({ filter: wsAll }),
      webTransport(),
      webRTC(),
      circuitRelayTransport(),
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: gate,
    peerDiscovery: [
      bootstrap({ 
        list: bootstrapList
      })
    ],
    services: {
      identify: identify() as any,
      pubsub: gossipsub({
        // Ensure peers can find each other for the topic
        allowPublishToZeroTopicPeers: true,
        canRelayMessage: true,
        emitSelf: false,
      }),
    },
  });

  libp2p.addEventListener("peer:discovery", (e) => {
    console.log("discovered", e.detail.id.toString());
  });

  libp2p.addEventListener("peer:connect", (e) => {
    console.log("connected to", e.detail.toString());
  });

  // after a few seconds you should see a /p2p-circuit/webrtc addr
  setTimeout(() => {
    console.log("our addrs:", libp2p.getMultiaddrs().map(String));
  }, 15000);

  const helia = await createHelia({
    blockstore: store,
    libp2p: libp2p as any,
  });

  return { helia: helia as any };
}
