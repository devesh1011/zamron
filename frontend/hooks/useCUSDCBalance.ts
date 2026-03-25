"use client";

import { useState, useCallback, useEffect } from "react";
import { useReadContract } from "wagmi";
import { useSignTypedData } from "wagmi";
import { CUSDC_ADDRESS, SEPOLIA_CHAIN_ID } from "@/constants/addresses";
import { CUSDC_ABI } from "@/lib/contracts";
import { assertCurrentCusdcWrapper } from "@/lib/erc7984";
import { getRelayerInstance } from "@/lib/relayer";

const ZERO_HANDLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const USER_DECRYPT_TIMEOUT_MS = 30_000;


export function useCUSDCBalance(userAddress?: `0x${string}`) {
  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const { signTypedDataAsync } = useSignTypedData();
  const { data: encryptedHandle, isLoading } = useReadContract({
    address: CUSDC_ADDRESS,
    abi: CUSDC_ABI,
    functionName: "confidentialBalanceOf",
    args: userAddress ? [userAddress] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: !!userAddress && CUSDC_ADDRESS !== "0x" },
  });

  useEffect(() => {
    setDecryptedBalance(null);
    setDecryptError(null);
  }, [userAddress, encryptedHandle]);

  const decrypt = useCallback(async () => {
    if (
      !encryptedHandle ||
      encryptedHandle === ZERO_HANDLE ||
      !userAddress ||
      typeof window === "undefined" ||
      !(window as any).ethereum ||
      CUSDC_ADDRESS === "0x"
    ) {
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);
    try {
      await assertCurrentCusdcWrapper();
      const instance = await getRelayerInstance();

      const { publicKey, privateKey } = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 1;
      const contractAddresses = [CUSDC_ADDRESS];

      const eip712 = instance.createEIP712(
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      const signature = await signTypedDataAsync({
        domain: eip712.domain,
        types: {
          UserDecryptRequestVerification:
            eip712.types.UserDecryptRequestVerification,
        },
        primaryType: eip712.primaryType,
        message: eip712.message as any,
      });

      const result = await instance.userDecrypt(
        [{ handle: encryptedHandle, contractAddress: CUSDC_ADDRESS }],
        privateKey,
        publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        userAddress,
        startTimestamp,
        durationDays,
        {
          timeout: USER_DECRYPT_TIMEOUT_MS,
        }
      );

      const decryptedResults = result as Record<string, unknown>;
      const value =
        decryptedResults[encryptedHandle] ??
        decryptedResults[encryptedHandle.toLowerCase()] ??
        decryptedResults[encryptedHandle.toUpperCase()];

      if (value != null) {
        setDecryptedBalance(BigInt(value.toString()));
      } else {
        setDecryptError("Relayer returned no plaintext value for your balance handle.");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Decryption failed";
      console.error("Decryption failed:", err);
      setDecryptError(
        message === "Aborted"
          ? "Decryption timed out while waiting for the Zama relayer. Please try again."
          : message,
      );
    } finally {
      setIsDecrypting(false);
    }
  }, [encryptedHandle, userAddress, signTypedDataAsync]);

  return {
    encryptedHandle,
    decryptedBalance,
    isLoading,
    isDecrypting,
    decryptError,
    decrypt,
  };
}
