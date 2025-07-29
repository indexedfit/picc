// Modern libp2p browser stack: WebRTC + WebTransport + WebSockets + Relay v2
// identify/noise/yamux as per libp2p docs.
// Works without webrtc-star and fixes `transport.listenFilter` error.

import { createHelia } from "helia";
import { bitswap } from "@helia/block-brokers";
import { OPFSBlockstore } from "blockstore-opfs";
import {
  createDelegatedRoutingV1HttpApiClient,
  DelegatedRoutingV1HttpApiClient,
} from '@helia/delegated-routing-v1-http-api-client';

import { createLibp2p } from "libp2p";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webTransport } from "@libp2p/webtransport";
import { webSockets } from "@libp2p/websockets";
import { all as wsAll } from "@libp2p/websockets/filters";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { ping } from '@libp2p/ping';

import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { bootstrap } from "@libp2p/bootstrap";
import { peerIdFromString } from '@libp2p/peer-id';
import { Multiaddr } from '@multiformats/multiaddr';
import first from 'it-first';

import type { PeerId } from "@libp2p/interface";
import { loadConfig } from "./config";

export interface HeliaContext {
  helia: Awaited<ReturnType<typeof createHelia>>;
}

// Bootstrap peer IDs (similar to the working example)
const BOOTSTRAP_PEER_IDS = [
  "QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
  "QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa", 
  "QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
  "QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
];

// Function which resolves PeerIDs of bootstrap nodes to multiaddrs dialable from the browser
async function getRelayListenAddrs(client: DelegatedRoutingV1HttpApiClient): Promise<string[]> {
  try {
    const peers = await Promise.all(
      BOOTSTRAP_PEER_IDS.map(async (peerId) => {
        try {
          return await first(client.getPeers(peerIdFromString(peerId)));
        } catch (e) {
          console.warn(`Failed to get peer ${peerId}:`, e);
          return null;
        }
      })
    );

    const relayListenAddrs = [];
    for (const p of peers) {
      if (p && p.Addrs.length > 0) {
        for (const maddr of p.Addrs) {
          const protos = maddr.protoNames();
          // Use Secure WebSockets and avoid localhost
          if (protos.includes('tls') && protos.includes('ws')) {
            if (maddr.nodeAddress().address === '127.0.0.1') continue;
            relayListenAddrs.push(getRelayListenAddr(maddr, p.ID));
          }
        }
      }
    }
    console.log('Discovered relay listen addresses:', relayListenAddrs);
    return relayListenAddrs;
  } catch (error) {
    console.warn('Failed to discover relay addresses, using fallback:', error);
    return [];
  }
}

// Constructs relay listen address
const getRelayListenAddr = (maddr: Multiaddr, peer: PeerId): string =>
  `${maddr.toString()}/p2p/${peer.toString()}/p2p-circuit`;

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
  if (typeof navigator.storage === 'undefined') {
    throw new Error("Safari iOS: navigator.storage completely missing - OPFS not supported");
  }
  
  // Check if OPFS is actually available
  if (!navigator.storage?.getDirectory) {
    throw new Error("OPFS not supported: navigator.storage.getDirectory missing");
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
    throw new Error(`OPFS blockstore failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("Setting up delegated routing...");
  const delegatedClient = createDelegatedRoutingV1HttpApiClient('https://delegated-ipfs.dev');
  
  console.log("Discovering relay addresses...");
  let relayListenAddrs: string[] = [];
  try {
    relayListenAddrs = await getRelayListenAddrs(delegatedClient);
  } catch (error) {
    console.warn("Failed to discover relay addresses, continuing without them:", error);
  }

  // Skip peer restrictions for better mobile compatibility

  // Remove restrictive gating for better mobile compatibility

  // Use both default bootstrap nodes, configured relays, and discovered relay addresses
  const bootstrapList = [
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
    ...cfg.relayAddrs,
    // Add discovered relay addresses to bootstrap list for dialing
    ...relayListenAddrs,
  ];
  
  console.log("Bootstrap list:", bootstrapList);

  const libp2p = await createLibp2p({
    addresses: {
      listen: [
        '/webrtc',
        // Don't listen on relay addresses - they're for dialing, not listening
      ],
    },
    transports: [
      webTransport(),
      webSockets({ filter: wsAll }),
      webRTC(),
      // Required for Rust/Go peer compatibility
      webRTCDirect(),
      // Circuit relay for hole punching
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
        list: bootstrapList
      })
    ],
    services: {
      pubsub: gossipsub({
        allowPublishToZeroTopicPeers: true,
        ignoreDuplicatePublishError: true,
      }),
      // Delegated routing for peer discovery
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

  // after a few seconds you should see a /p2p-circuit/webrtc addr
  setTimeout(() => {
    console.log("our addrs:", libp2p.getMultiaddrs().map(String));
  }, 15000);

  const helia = await createHelia({
    blockstore: store,
    libp2p: libp2p as any,
    // Enable block exchange across peers
    blockBrokers: [bitswap()],
  });

  return { helia: helia as any };
}
