import { CCTP_DOMAIN, SEPOLIA_DOMAIN } from "@/constants/addresses";

export const FAST_FINALITY_THRESHOLD = 1000;
export const STANDARD_FINALITY_THRESHOLD = 2000;

const BPS_DENOMINATOR = 10_000n;
const BPS_SCALE = 1_000_000n;

interface BurnFeeQuote {
  finalityThreshold: number;
  minimumFee: number | string;
}

function parseScaledDecimal(value: number | string) {
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error("Circle fee quote is empty.");
  }

  const negative = normalized.startsWith("-");
  if (negative) {
    throw new Error("Circle fee quote cannot be negative.");
  }

  const [wholePartRaw, fractionalPartRaw = ""] = normalized.split(".");
  const wholePart = wholePartRaw === "" ? "0" : wholePartRaw;
  const paddedFraction = `${fractionalPartRaw}000000`.slice(0, 6);

  return (
    BigInt(wholePart) * BPS_SCALE +
    BigInt(paddedFraction === "" ? "0" : paddedFraction)
  );
}

export async function fetchBurnFeeBps(sourceChainId: number) {
  const sourceDomain = CCTP_DOMAIN[sourceChainId];
  const endpoint = `https://iris-api-sandbox.circle.com/v2/burn/USDC/fees/${sourceDomain}/${SEPOLIA_DOMAIN}`;

  const res = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Circle fee quote (${res.status})`);
  }

  const quotes = (await res.json()) as BurnFeeQuote[];
  const fastQuote = quotes.find(
    (quote) => quote.finalityThreshold === FAST_FINALITY_THRESHOLD,
  );

  if (!fastQuote) {
    throw new Error("Circle fast-transfer fee quote is unavailable for this route.");
  }

  return parseScaledDecimal(fastQuote.minimumFee);
}

export function feeAmountFromBps(amount: bigint, feeBps: bigint) {
  if (amount <= 0n || feeBps <= 0n) {
    return 0n;
  }

  const denominator = BPS_DENOMINATOR * BPS_SCALE;
  return ((amount * feeBps) + (denominator - 1n)) / denominator;
}
