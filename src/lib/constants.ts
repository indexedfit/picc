// path on filesystem
export const OPFS_DIR_NAME = "piccfit";

// "constants" & "protocols"
export const CHAT_TOPIC = "piccfit-chat";
export const FILE_TOPIC = "piccfit-file";
export const PUBSUB_PEER_DISCOVERY = "piccfit-browser-peer-discovery";
export const FILE_EXCHANGE_PROTOCOL = "/piccfit-file/1";
export const DIRECT_MESSAGE_PROTOCOL = "/piccfit/dm/1.0.0";

export const CIRCUIT_RELAY_CODE = 290;

export const MIME_TEXT_PLAIN = "text/plain";

// App specific dedicated bootstrap PeerIDs
// Their multiaddrs are ephemeral so peer routing is used to resolve multiaddr
export const WEBTRANSPORT_BOOTSTRAP_PEER_ID =
  "12D3KooWFhXabKDwALpzqMbto94sB7rvmZ6M28hs9Y9xSopDKwQr";

export const BOOTSTRAP_PEER_IDS = [
  WEBTRANSPORT_BOOTSTRAP_PEER_ID,
  "QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
  "QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
  "QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
  "QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
];
