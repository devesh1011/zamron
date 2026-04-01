"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { toast } from "sonner";

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

  const router = useRouter();
  const metaMaskConnector = useMemo(() => connectors[0], [connectors]);
  const isLanding = pathname === "/";
  const hydratedAddress = mounted ? address : undefined;
  const isAppRoute = pathname !== "/";
  // null = not yet initialized (don't trigger on initial render)
  const prevAddressRef = useRef<string | undefined | null>(null);

  useEffect(() => {
    if (!mounted) return;
    // On first mount, just record current address without triggering toast
    if (prevAddressRef.current === null) {
      prevAddressRef.current = address;
      return;
    }
    const prev = prevAddressRef.current;
    const curr = address;
    if (!prev && curr && isLanding) {
      let countdown = 5;
      const toastId = toast(
        <span>Redirecting you to main page in <strong>{countdown}</strong></span>,
        { duration: 5500 }
      );
      const interval = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) {
          clearInterval(interval);
          toast.dismiss(toastId);
          router.push("/bridge");
        } else {
          toast(
            <span>Redirecting you to main page in <strong>{countdown}</strong></span>,
            { id: toastId, duration: countdown * 1000 + 500 }
          );
        }
      }, 1000);
      return () => clearInterval(interval);
    }
    prevAddressRef.current = curr;
  }, [address, mounted, isLanding, router]);

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
          {hydratedAddress && NAV_LINKS.map(({ label, href }) => {
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
          {isAppRoute && (
            <div className="relative hidden cursor-pointer group md:block">
              <span className="material-symbols-outlined text-2xl text-on-surface-variant transition-colors group-hover:text-on-surface">
                notifications
              </span>
              <div className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-background bg-primary"></div>
            </div>
          )}

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
