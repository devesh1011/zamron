"use client";

import { Synapse } from "@filoz/synapse-sdk";
import { calibration } from "@filoz/synapse-core/chains";
import { custom, formatUnits, parseAbi } from "viem";
import { FILECOIN_CALIBRATION_CHAIN_ID } from "@/constants/addresses";
import { getSourcePublicClient } from "@/lib/source-chains";

const SYNAPSE_SOURCE = "keone-cusdc-bridge";

// USDFC ERC20 on Filecoin Calibration (used by Synapse SDK for storage payments)
const USDFC_ADDRESS = "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0" as const;
const USDFC_ABI = parseAbi(["function balanceOf(address) view returns (uint256)"]);

function getEthereumTransport() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is required for Filecoin archive actions.");
  }

  return custom(window.ethereum);
}

function createSynapse(address: `0x${string}`) {
  return Synapse.create({
    account: address,
    chain: calibration,
    transport: getEthereumTransport(),
    source: SYNAPSE_SOURCE,
  });
}

async function checkFilecoinFunds(address: `0x${string}`, depositNeeded: bigint) {
  const publicClient = getSourcePublicClient(FILECOIN_CALIBRATION_CHAIN_ID);

  const [nativeBalance, usdfcBalance] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: USDFC_ADDRESS,
      abi: USDFC_ABI,
      functionName: "balanceOf",
      args: [address],
    }) as Promise<bigint>,
  ]);

  // Need at least 0.05 tFIL for gas
  const MIN_FIL = 50_000_000_000_000_000n;
  if (nativeBalance < MIN_FIL) {
    throw new Error(
      `Insufficient tFIL on Filecoin Calibration for gas fees. ` +
        `You have ${formatUnits(nativeBalance, 18)} tFIL. ` +
        `Get free tFIL from the faucet: https://faucet.calibration.fildev.network/`,
    );
  }

  if (depositNeeded > 0n && usdfcBalance < depositNeeded) {
    throw new Error(
      `Insufficient USDFC on Filecoin Calibration for storage payments. ` +
        `Need ${formatUnits(depositNeeded, 18)} USDFC, you have ${formatUnits(usdfcBalance, 18)} USDFC. ` +
        `Mint USDFC on Calibration at https://app.usdfc.net/ (switch to Calibration testnet).`,
    );
  }
}

const RETRIEVAL_URL_CACHE_KEY = "keone:filecoin:retrievalUrls";

function cacheRetrievalUrls(pieceCid: string, urls: string[]) {
  try {
    const raw = localStorage.getItem(RETRIEVAL_URL_CACHE_KEY);
    const cache: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    cache[pieceCid] = urls;
    localStorage.setItem(RETRIEVAL_URL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage unavailable (SSR / private browsing) — silently skip
  }
}

function getCachedRetrievalUrls(pieceCid: string): string[] {
  try {
    const raw = localStorage.getItem(RETRIEVAL_URL_CACHE_KEY);
    if (!raw) return [];
    const cache: Record<string, string[]> = JSON.parse(raw);
    return cache[pieceCid] ?? [];
  } catch {
    return [];
  }
}

export async function uploadReceiptToFilecoin(
  address: `0x${string}`,
  payload: string,
  options?: { onFundingTx?: (hash: `0x${string}`) => void },
) {
  const synapse = createSynapse(address);
  const data = new TextEncoder().encode(payload);

  const preparation = await synapse.storage.prepare({
    dataSize: BigInt(data.byteLength),
  });

  if (preparation.transaction) {
    await checkFilecoinFunds(address, preparation.transaction.depositAmount);
    await preparation.transaction.execute({
      onHash: (hash) => options?.onFundingTx?.(hash as `0x${string}`),
    });
  }

  const upload = await synapse.storage.upload(data, {
    copies: 1,
    metadata: {
      app: "keone-cusdc-bridge",
      category: "operation-receipt",
    },
  });

  console.log("[Filecoin] upload result:", {
    pieceCid: String(upload.pieceCid),
    complete: upload.complete,
    copies: upload.copies.length,
    dataSetId: upload.copies[0]?.dataSetId?.toString() ?? "none",
    failedAttempts: upload.failedAttempts.length,
  });

  if (!upload.complete || upload.copies.length === 0) {
    throw new Error(
      `Filecoin upload incomplete: ${upload.copies.length} copies stored. ` +
        (upload.failedAttempts.length > 0
          ? `Failed: ${upload.failedAttempts.map((a) => a.error).join(", ")}`
          : "No copies confirmed on-chain. You may need to approve a MetaMask transaction."),
    );
  }

  const cidStr = String(upload.pieceCid);
  const retrievalUrls = upload.copies.map((c) => c.retrievalUrl).filter(Boolean);
  console.log("[Filecoin] retrieval URLs:", retrievalUrls);
  cacheRetrievalUrls(cidStr, retrievalUrls);

  return {
    pieceCid: cidStr,
    dataSetId: upload.copies[0].dataSetId,
    copies: upload.copies.length,
  };
}

/** Fetch a retrieval URL through our server-side proxy to avoid CORS issues. */
async function fetchViaProxy(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(`/api/filecoin/retrieve?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      console.log("[Filecoin] proxy OK", res.status, `(${buf.byteLength} bytes)`, "for", url);
      return new Uint8Array(buf);
    }
    console.warn("[Filecoin] proxy returned HTTP", res.status, "for", url);
  } catch (err: any) {
    console.warn("[Filecoin] proxy network error for", url, ":", err?.message);
  }
  return null;
}

/**
 * Query the IPNI network indexer (cid.contact) for HTTP provider addresses
 * that serve the given piece CID.  Returns an array of direct /piece/{cid} URLs
 * extracted from the libp2p Routing V1 multiaddresses — fully independent of the
 * Synapse SDK registry contracts.
 */
async function findProviderUrlsViaIpni(pieceCid: string): Promise<string[]> {
  const ipniUrl = `https://cid.contact/routing/v1/providers/${pieceCid}`;
  const res = await fetch(`/api/filecoin/retrieve?url=${encodeURIComponent(ipniUrl)}`);
  if (!res.ok) return [];
  try {
    const data = JSON.parse(new TextDecoder().decode(await res.arrayBuffer()));
    const providers: any[] = data?.Providers ?? [];
    const urls: string[] = [];
    for (const provider of providers) {
      for (const addr of (provider.Addrs ?? []) as string[]) {
        // Match /dns4/{host}/tcp/{port}/https  or  /ip4/{ip}/tcp/{port}/http(s)
        const m = addr.match(/^\/(?:dns4|ip4|dns6|ip6)\/([^/]+)\/tcp\/(\d+)\/(https?)$/);
        if (m) {
          const [, host, port, proto] = m;
          const defaultPort = proto === "https" ? 443 : 80;
          const portPart = parseInt(port) === defaultPort ? "" : `:${port}`;
          urls.push(`${proto}://${host}${portPart}/piece/${pieceCid}`);
        }
      }
    }
    return [...new Set(urls)];
  } catch {
    return [];
  }
}

/** Log an error with all details immediately visible (no object-expand needed). */
function logErr(label: string, err: any) {
  const msg: string = err?.message ?? String(err);
  const cause: string | undefined =
    err?.cause?.message ?? (typeof err?.cause === "string" ? err.cause : undefined);
  const stack0: string | undefined = err?.stack?.split("\n")[1]?.trim();
  console.warn(
    `[Filecoin] ${label}\n  message: ${msg}${
      cause ? `\n  cause:   ${cause}` : ""
    }${stack0 ? `\n  at:      ${stack0}` : ""}`,
  );
}

/** Returns true when a viem contract-call error indicates the contract returned
 *  empty data — i.e. the function/dataset simply doesn't exist in this registry.
 *  This is the fingerprint of a stale SDK registry (contracts were redeployed). */
function isStaleRegistryError(err: any): boolean {
  const msg: string = err?.message ?? err?.cause?.message ?? "";
  return msg.includes("returned no data") && msg.includes('"0x"');
}

export async function downloadReceiptFromFilecoin(
  address: `0x${string}`,
  pieceCid: string,
  dataSetId?: bigint,
) {
  console.group(
    `[Filecoin] downloadReceiptFromFilecoin — pieceCid: ${pieceCid} | dataSetId: ${dataSetId?.toString() ?? "none"} | address: ${address}`,
  );

  try {
    // 1. Try cached direct retrieval URLs from upload (proxied to avoid CORS)
    const cachedUrls = getCachedRetrievalUrls(pieceCid);
    console.log("[Filecoin] step 1 — cached retrieval URLs:", cachedUrls.length > 0 ? cachedUrls : "(none)");
    for (const url of cachedUrls) {
      console.log("[Filecoin] trying cached URL via proxy:", url);
      const bytes = await fetchViaProxy(url);
      if (bytes) {
        console.log("[Filecoin] ✓ success via cached URL");
        return new TextDecoder().decode(bytes);
      }
    }

    const synapse = createSynapse(address);

    // Track staleness per-contract-family: the dataset/PDP-verifier registry and
    // the SP registry live at different addresses.  A stale dataset contract does
    // NOT imply the SP registry is also stale.
    let datasetRegistryStale = false;
    let spRegistryStale = false;

    // 2. If we have the dataSetId, attempt createContext — the registry may have been
    //    re-deployed (SDK upgrade), making the stored ID stale.
    if (dataSetId !== undefined && dataSetId > 0n) {
      try {
        console.log("[Filecoin] step 2 — createContext for stored dataSetId:", dataSetId.toString());
        const context = await synapse.storage.createContext({ dataSetId });
        const bytes = await synapse.storage.download({ pieceCid, context });
        console.log("[Filecoin] ✓ success via stored dataSetId createContext");
        return new TextDecoder().decode(bytes);
      } catch (err: any) {
        if (isStaleRegistryError(err)) {
          datasetRegistryStale = true;
          console.warn("[Filecoin] step 2 — stale dataset registry detected (contract returned 0x), skipping dataset-level steps");
        } else {
          logErr("step 2 failed", err);
        }
      }
    }

    // 2.5. Enumerate all live datasets via findDataSets() and search each one.
    //      Skip entirely if we already confirmed the dataset registry is stale —
    //      the same contract will return 0x for clientDataSets() too.
    if (!datasetRegistryStale) {
      try {
        console.log("[Filecoin] step 2.5 — findDataSets() to discover current registry...");
        const allDataSets = await synapse.storage.findDataSets();
        console.log(
          "[Filecoin] findDataSets() returned",
          allDataSets.length,
          "dataset(s):",
          JSON.stringify(
            allDataSets.map((ds) => ({
              id: ds.pdpVerifierDataSetId.toString(),
              live: ds.isLive,
              managed: ds.isManaged,
              cdn: ds.withCDN,
              pieces: ds.activePieceCount.toString(),
              metadata: ds.metadata,
            })),
            null,
            2,
        ),
      );

      const liveSets = allDataSets.filter((ds) => ds.isLive && ds.activePieceCount > 0n);
      console.log("[Filecoin]", liveSets.length, "live dataset(s) with pieces to check");

      for (const ds of liveSets) {
        const dsId = ds.pdpVerifierDataSetId;
        console.log("[Filecoin] checking dataset", dsId.toString(), "...");
        try {
          const ctx = await synapse.storage.createContext({ dataSetId: dsId });

          // Check whether the piece is registered in this dataset before downloading.
          const status = await ctx.pieceStatus({ pieceCid });
          console.log("[Filecoin] pieceStatus in dataset", dsId.toString(), ":", JSON.stringify(status) ?? "(null — not found)");

          if (status !== null) {
            console.log("[Filecoin] piece confirmed in dataset", dsId.toString(), "— downloading");
            const bytes = await synapse.storage.download({ pieceCid, context: ctx });
            console.log("[Filecoin] ✓ success via findDataSets, dataset:", dsId.toString());
            return new TextDecoder().decode(bytes);
          }

          // Piece not in contract yet (might be committed but not indexed) — try the
          // provider's retrieval URL directly through our server-side proxy.
          const pieceUrl = ctx.getPieceUrl(pieceCid as any);
          if (pieceUrl) {
            console.log("[Filecoin] piece not in contract index; trying getPieceUrl via proxy for dataset", dsId.toString(), ":", pieceUrl);
            const bytes = await fetchViaProxy(pieceUrl);
            if (bytes) {
              console.log("[Filecoin] ✓ success via getPieceUrl proxy, dataset:", dsId.toString());
              return new TextDecoder().decode(bytes);
            }
          }
        } catch (dsErr: any) {
          logErr(`dataset ${dsId.toString()} check`, dsErr);
        }
      }
      console.warn("[Filecoin] piece not found in any live dataset from findDataSets");
    } catch (err: any) {
      if (isStaleRegistryError(err)) {
        datasetRegistryStale = true;
        console.warn("[Filecoin] step 2.5 — stale dataset registry confirmed");
      } else {
        logErr("step 2.5 findDataSets() failed", err);
      }
    }
    } // end if (!datasetRegistryStale)

    // 2.75. Brute-force: try every active registered SP directly.
    //       The SP registry is a separate contract from the dataset/PDP verifier —
    //       always attempt this even when dataset registry is stale.
    if (!spRegistryStale) {
      try {
        console.log("[Filecoin] step 2.75 — querying all active providers via SP registry...");
        const allProviders = await synapse.providers.getAllActiveProviders();
        console.log(
          "[Filecoin] active providers:",
          allProviders.map((p) => ({ id: p.id.toString(), url: p.pdp.serviceURL })),
        );

        for (const provider of allProviders) {
          const pieceUrl = `${provider.pdp.serviceURL.replace(/\/$/, "")}/piece/${pieceCid}`;
          console.log(`[Filecoin] trying provider ${provider.id} (${provider.pdp.serviceURL}) via proxy: ${pieceUrl}`);
          try {
            const bytes = await fetchViaProxy(pieceUrl);
            if (bytes) {
              console.log("[Filecoin] ✓ success via direct SP retrieval, provider:", provider.id.toString());
              return new TextDecoder().decode(bytes);
            }
          } catch (provErr: any) {
            logErr(`provider ${provider.id} direct retrieval`, provErr);
          }
        }
        console.warn("[Filecoin] piece not found on any active provider via direct SP retrieval");
      } catch (err: any) {
        if (isStaleRegistryError(err)) {
          spRegistryStale = true;
          console.warn("[Filecoin] step 2.75 — SP registry also stale (0x), all registry paths exhausted");
        } else {
          logErr("step 2.75 getAllActiveProviders() failed", err);
        }
      }
    }

    // 3. SDK download without CDN (provider P2P retrieval).
    //    The SDK resolves providers via the SP registry — only skip if the SP
    //    registry itself is confirmed stale. Use a timeout to prevent hanging.
    if (!spRegistryStale) {
      try {
        console.log("[Filecoin] step 3 — SDK download (no CDN), pieceCid:", pieceCid);
        const bytes = await Promise.race([
          synapse.storage.download({ pieceCid }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("SDK download timed out (30s)")), 30_000),
          ),
        ]);
        console.log("[Filecoin] ✓ success via SDK no-CDN");
        return new TextDecoder().decode(bytes);
      } catch (err: any) {
        logErr("step 3 failed (SDK no-CDN)", err);
      }

      // 4. SDK with CDN (attempts filbeam resolver — browsers may hit CORS / 402).
      try {
        console.log("[Filecoin] step 4 — SDK download with CDN, pieceCid:", pieceCid);
        const bytes = await Promise.race([
          synapse.storage.download({ pieceCid, withCDN: true }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("SDK CDN download timed out (30s)")), 30_000),
          ),
        ]);
        console.log("[Filecoin] ✓ success via SDK CDN");
        return new TextDecoder().decode(bytes);
      } catch (err: any) {
        logErr("step 4 failed (SDK CDN)", err);
      }
    } else {
      console.warn("[Filecoin] steps 3 & 4 skipped — SP registry is stale, SDK P2P would timeout");
    }

    // 4.5. IPNI provider discovery — completely independent of the registry.
    //      Query cid.contact to find which SPs physically have this piece, then
    //      try downloading from each HTTP address via our server-side proxy.
    try {
      console.log("[Filecoin] step 4.5 — IPNI provider lookup for pieceCid:", pieceCid);
      const ipniUrls = await findProviderUrlsViaIpni(pieceCid);
      if (ipniUrls.length > 0) {
        console.log("[Filecoin] step 4.5 — IPNI found", ipniUrls.length, "HTTP provider addr(s):", ipniUrls);
        for (const url of ipniUrls) {
          console.log("[Filecoin] step 4.5 — trying IPNI provider via proxy:", url);
          const bytes = await fetchViaProxy(url);
          if (bytes) {
            console.log("[Filecoin] ✓ success via IPNI provider:", url);
            return new TextDecoder().decode(bytes);
          }
        }
        console.warn("[Filecoin] step 4.5 — IPNI providers found but none served the piece");
      } else {
        console.warn("[Filecoin] step 4.5 — IPNI: no HTTP providers indexed for this piece CID");
      }
    } catch (err: any) {
      logErr("step 4.5 IPNI lookup failed", err);
    }

    // 5. Last resort: construct the filbeam URL manually and route it through the
    //    server-side proxy (no CORS restriction, unlike direct browser fetch).
    const filbeamUrl = `https://${address.toLowerCase()}.calibration.filbeam.io/${pieceCid}`;
    console.log("[Filecoin] step 5 — filbeam CDN via server proxy:", filbeamUrl);
    const bytes = await fetchViaProxy(filbeamUrl);
    if (bytes) {
      console.log("[Filecoin] ✓ success via filbeam proxy");
      return new TextDecoder().decode(bytes);
    }
    console.warn("[Filecoin] step 5 returned no data");

    console.warn("[Filecoin] ✗ all retrieval methods exhausted for pieceCid:", pieceCid, "| datasetStale:", datasetRegistryStale, "| spStale:", spRegistryStale);

    if (datasetRegistryStale && spRegistryStale) {
      throw new Error(
        `This receipt (piece ${pieceCid.slice(0, 20)}…) was stored under an older version of the Synapse SDK ` +
          `whose storage contracts have since been upgraded on Filecoin Calibration. ` +
          `The data is no longer retrievable from the previous registry. ` +
          `To continue using this receipt, please re-archive it: complete the operation again and archive the new receipt draft.`,
      );
    }

    throw new Error(
      `Unable to retrieve data from Filecoin for piece ${pieceCid}. ` +
        `The storage deal may have expired or the provider is offline. ` +
        `If you recently uploaded this receipt, try refreshing — cached retrieval URLs expire after the browser session.`,
    );
  } finally {
    console.groupEnd();
  }
}
