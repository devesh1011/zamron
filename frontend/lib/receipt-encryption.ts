"use client";

import { keccak256, toHex } from "viem";
import type { OperationReceipt } from "@/lib/archive-types";

const ARCHIVE_KEY_MESSAGE = "Keone Filecoin Receipt Vault v1";

function encoder() {
  return new TextEncoder();
}

function decoder() {
  return new TextDecoder();
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveArchiveKey(signature: `0x${string}`) {
  const digest = await crypto.subtle.digest("SHA-256", encoder().encode(signature));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function requestArchiveSignature(
  signer: (message: string) => Promise<`0x${string}`>,
) {
  return signer(ARCHIVE_KEY_MESSAGE);
}

export async function encryptReceipt(
  receipt: OperationReceipt,
  signature: `0x${string}`,
) {
  const plaintext = JSON.stringify(receipt);
  const key = await deriveArchiveKey(signature);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder().encode(plaintext),
  );

  return {
    payload: JSON.stringify({
      version: 1,
      algorithm: "AES-GCM",
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    }),
    receiptHash: keccak256(toHex(encoder().encode(plaintext))),
  };
}

export async function decryptReceipt(
  payload: string,
  signature: `0x${string}`,
) {
  const parsed = JSON.parse(payload) as {
    version: number;
    algorithm: string;
    iv: string;
    ciphertext: string;
  };

  const key = await deriveArchiveKey(signature);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(parsed.iv) },
    key,
    base64ToBytes(parsed.ciphertext),
  );

  return JSON.parse(decoder().decode(new Uint8Array(plaintext))) as OperationReceipt;
}
