// Modern libp2p browser stack: WebRTC + WebTransport + WebSockets + Relay v2
// identify/noise/yamux as per libp2p docs.
// Works without webrtc-star and fixes `transport.listenFilter` error.

import { createHelia } from "helia";
import { bitswap } from "@helia/block-brokers";
import { OPFSBlockstore } from "blockstore-opfs";
import {
  createDelegatedRoutingV1HttpApiClient,
  DelegatedRoutingV1HttpApiClient,
} from "@helia/delegated-routing-v1-http-api-client";

import { createLibp2p } from "libp2p";
import { webRTC } from "@libp2p/webrtc";
import { webTransport } from "@libp2p/webtransport";
import { webSockets } from "@libp2p/websockets";
import { all as wsAll } from "@libp2p/websockets/filters";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { ping } from "@libp2p/ping";

import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { bootstrap } from "@libp2p/bootstrap";
import { peerIdFromString } from "@libp2p/peer-id";
import { Multiaddr } from "@multiformats/multiaddr";
import first from "it-first";

import type { PeerId } from "@libp2p/interface";
import { loadConfig } from "./config";

export interface HeliaContext {
  helia: Awaited<ReturnType<typeof createHelia>>;
  // dm?: DirectMessageService  // keep if you plan to use it in UI later
}

// Bootstrap peer IDs (similar to the working example)
const BOOTSTRAP_PEER_IDS = [
  "QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
  "QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
  "QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
  "QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
];

// Build dial vs listen addrs from bootstrap peers
const relayDialAddr = (m: Multiaddr, p: PeerId) =>
  `${m.toString()}/p2p/${p.toString()}`;
const relayListenAddr = (m: Multiaddr, p: PeerId) =>
  `${m.toString()}/p2p/${p.toString()}/p2p-circuit`;
async function discoverRelays(
  client: DelegatedRoutingV1HttpApiClient,
): Promise<{ dial: string[]; listen: string[] }> {
  try {
    const peers = await Promise.all(
      BOOTSTRAP_PEER_IDS.map(async (peerId) => {
        try {
          return await first(client.getPeers(peerIdFromString(peerId)));
        } catch (e) {
          console.warn(`Failed to get peer ${peerId}:`, e);
          return null;
        }
      }),
    );

    const dial: string[] = [];
    const listen: string[] = [];
    for (const p of peers) {
      if (p && p.Addrs.length > 0) {
        for (const maddr of p.Addrs) {
          const protos = maddr.protoNames();
          // browser-friendly: WSS only; skip loopback
          if (protos.includes("tls") && protos.includes("ws")) {
            if (maddr.nodeAddress().address === "127.0.0.1") continue;
            dial.push(relayDialAddr(maddr, p.ID));
            listen.push(relayListenAddr(maddr, p.ID));
          }
        }
      }
    }
    console.log("Discovered relay dial addresses:", dial);
    console.log("Discovered relay listen addresses:", listen);
    return { dial, listen };
  } catch (error) {
    console.warn("Failed to discover relay addresses, using fallback:", error);
    return { dial: [], listen: [] };
  }
}

export async function initHelia(): Promise<HeliaContext> {
  const cfg = await loadConfig();

  console.log("Opening OPFS blockstore...");

  // Debug what's actually available in Safari iOS
  console.log("Navigator storage:", typeof navigator.storage);
  console.log("IndexedDB:", typeof indexedDB);
  console.log("localStorage:", typeof localStorage);
  console.log("sessionStorage:", typeof sessionStorage);
  console.log("WebSQL (deprecated):", typeof (window as any).openDatabase);
  console.log("Cache API:", typeof caches);

  // Safari iOS doesn't have navigator.storage at all
  if (typeof navigator.storage === "undefined") {
    throw new Error(
      "Safari iOS: navigator.storage completely missing - OPFS not supported",
    );
  }

  // Check if OPFS is actually available
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

    store = new OPFSBlockstore(cfg.blockstoreName);
    await store.open();
    console.log("OPFS blockstore opened successfully");
  } catch (error) {
    console.error("OPFS blockstore failed:", error);
    throw new Error(
      `OPFS blockstore failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log("Setting up delegated routing...");
  const delegatedClient = createDelegatedRoutingV1HttpApiClient(
    "https://delegated-ipfs.dev",
  );

  console.log("Discovering relay addresses...");
  let relayDialAddrs: string[] = [];
  let relayListenAddrs: string[] = [];
  try {
    const discovered = await discoverRelays(delegatedClient);
    relayDialAddrs = discovered.dial;
    relayListenAddrs = discovered.listen;
  } catch (error) {
    console.error("Failed to discover relays:", error);
  }

  // Skip peer restrictions for better mobile compatibility

  // Remove restrictive gating for better mobile compatibility

  // Bootstrap with defaults + your configured relays + discovered *dial* addrs
  const bootstrapList = [
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
    "/dns4/relay.localhost/tcp/443/wss/p2p/12D3KooWJ5izG8rXB95W6xFp1tFtAAoQ1Df3vVyQ7XmA3Bg1gHCN",
    ...cfg.relayAddrs,
    ...relayDialAddrs,
  ];

  console.log("Bootstrap list:", bootstrapList);

  const libp2p = await createLibp2p({
    addresses: {
      listen: [
        // allow browser-to-browser dials
        "/webrtc",
        // **listen** on relay circuit addresses to reserve a slot
        ...relayListenAddrs,
      ],
    },
    transports: [
      webTransport(),
      webSockets({ filter: wsAll }),
      webRTC({
        rtcConfiguration: {
          iceServers: [
            { urls: ["stun:stun.l.google.com:19302"] },
            { urls: ["stun:stun1.l.google.com:19302"] },
            { urls: ["stun:stun2.l.google.com:19302"] },
            { urls: ["stun:stun.cloudflare.com:3478"] },
          ],
        },
      }),
      // relay transport with auto-discovery
      circuitRelayTransport(),
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: async () => false,
    },
    peerDiscovery: [
      pubsubPeerDiscovery({
        interval: 10_000,
        topics: [`${cfg.pubsubNamespace}-discovery`],
        listenOnly: false,
      }),
      bootstrap({
        list: bootstrapList,
      }),
    ],
    services: {
      pubsub: gossipsub({
        allowPublishToZeroTopicPeers: true,
        ignoreDuplicatePublishError: true,
      }),
      // Delegated routing as a factory (avoids 2.9 wiring issues)
      delegatedRouting: () => delegatedClient,
      identify: identify() as any,
      ping: ping(),
    },
  });

  libp2p.addEventListener("peer:discovery", (e) => {
    console.log("discovered", e.detail.id.toString());
  });

  libp2p.addEventListener("peer:connect", (e) => {
    console.log("connected to", e.detail.toString());
  });

  console.log("Libp2p started, peer ID:", libp2p.peerId.toString());

  // proactively connect to bootstrap nodes to discover relays
  const bootstrapPeers = bootstrapList.slice(0, 2);
  console.log("Dialing bootstrap peers...");
  for (const addr of bootstrapPeers) {
    try {
      await libp2p.dial(addr as any);
      console.log("Connected to bootstrap:", addr);
    } catch (err: any) {
      console.warn("Failed to dial bootstrap:", addr, err.message);
    }
  }

  // Give time for relay discovery and reservation
  await new Promise((r) => setTimeout(r, 2000));

  // Log addresses periodically to debug
  const logAddrs = () => {
    const addrs = libp2p.getMultiaddrs().map(String);
    console.log("Current addresses:", addrs);
    const dialable = addrs.filter(
      (a) => a.includes("/p2p-circuit") || a.includes("/wss/"),
    );
    console.log("Dialable addresses:", dialable);
  };

  setTimeout(logAddrs, 5000);
  setTimeout(logAddrs, 10000);
  setTimeout(logAddrs, 15000);

  const helia = await createHelia({
    blockstore: store,
    libp2p: libp2p as any,
    // Enable block exchange across peers
    blockBrokers: [bitswap()],
  });

  return { helia: helia as any };
}
