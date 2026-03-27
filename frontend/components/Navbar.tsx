"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

const NAV_LINKS = [
  { label: "Bridge", href: "/bridge" },
  { label: "Operations", href: "/operations" },
  { label: "Send", href: "/send" },
  { label: "Encrypted Receipts", href: "/encrypted-receipts" },
] as const;

function truncateAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const metaMaskConnector = useMemo(() => connectors[0], [connectors]);
  const isLanding = pathname === "/";
  const hydratedAddress = mounted ? address : undefined;
  const isAppRoute = pathname !== "/";

  return (
    <nav
      className={`fixed top-0 z-50 border-b border-outline-variant/15 bg-background/85 backdrop-blur-xl ${
        isAppRoute ? "left-64 right-0" : "left-0 right-0"
      }`}
    >
      <div
        className={`flex h-20 items-center justify-between ${
          isLanding
            ? "mx-auto max-w-[1440px] px-12 md:px-20 lg:px-24"
            : "px-8 md:px-10"
        }`}
      >
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`pb-1 font-headline text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  isActive
                    ? "border-b-2 border-primary text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-5">
          {hydratedAddress ? (
            <>
              <span className="hidden font-headline text-xs font-bold uppercase tracking-wider text-on-surface-variant md:block">
                {truncateAddress(hydratedAddress)}
              </span>
              <button
                onClick={() => disconnect()}
                className="rounded-full border border-outline/40 px-6 py-2 font-headline text-[11px] font-bold uppercase tracking-widest text-on-surface transition-all hover:border-primary hover:text-primary"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() =>
                metaMaskConnector && connect({ connector: metaMaskConnector })
              }
              disabled={!mounted || isPending || !metaMaskConnector}
              className="rounded-full border border-outline/40 px-6 py-2 font-headline text-[11px] font-bold uppercase tracking-widest text-on-surface transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
