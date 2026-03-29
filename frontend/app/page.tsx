import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <>
      <main className="relative pt-20 overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[921px] flex flex-col justify-center px-12 md:px-20 lg:px-24 max-w-[1440px] mx-auto asymmetric-glow items-center">
          <div className="space-y-8 z-10 text-center mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/15">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-label font-medium text-primary tracking-widest uppercase">
                Protocol Live on Mainnet
              </span>
            </div>
            <h1 className="font-headline text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.9] text-on-surface">
              The Future of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
                Confidential
              </span>{" "}
              Finance
            </h1>
            <p className="font-body text-lg md:text-xl text-on-surface-variant max-w-xl leading-relaxed">
              Sovereign bridging to cUSDC powered by Fully Homomorphic
              Encryption. Secure your assets in the digital vault where privacy
              isn't an option—it's the bedrock.
            </p>
            <div className="flex flex-wrap gap-4 pt-4 justify-center">
              <Link
                href="/bridge"
                className="bg-primary text-on-primary px-10 py-4 rounded-full font-headline font-bold text-lg hover:shadow-[0_0_30px_rgba(183,159,255,0.4)] transition-all inline-block button"
              >
                Launch App
              </Link>
              <Link
                href="https://docs.circl.com"
                target="_blank"
                className="bg-transparent border border-outline-variant/30 text-on-surface px-10 py-4 rounded-full font-headline font-bold text-lg hover:bg-surface-container-high transition-all"
              >
                View Docs
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-32 px-12 md:px-20 lg:px-24 max-w-[1440px] mx-auto bg-surface-dim">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <h2 className="font-headline text-5xl font-bold tracking-tight">
                Engineered for <br />
                Absolute Sovereignty
              </h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center border border-outline-variant/20">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{
                        fontVariationSettings:
                          "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                      }}
                    >
                      hub
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xl mb-2">
                      1. Inbound Bridge
                    </h4>
                    <p className="text-on-surface-variant leading-relaxed">
                      Connect your wallet and bridge standard ERC-20 assets from
                      any major L1 or L2 into the Sanctum environment.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center border border-outline-variant/20">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{
                        fontVariationSettings:
                          "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                      }}
                    >
                      lock
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xl mb-2">
                      2. FHE Conversion
                    </h4>
                    <p className="text-on-surface-variant leading-relaxed">
                      Assets are encrypted using Fully Homomorphic Encryption,
                      transforming USDC into confidential cUSDC for shielded
                      transactions.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center border border-outline-variant/20">
                    <span className="material-symbols-outlined text-primary">
                      send
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xl mb-2">
                      3. Private Execution
                    </h4>
                    <p className="text-on-surface-variant leading-relaxed">
                      Swap, send, or pool assets without revealing balances or
                      transaction amounts to the public explorer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="glass-panel p-8 rounded-[2rem] border border-outline-variant/10 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                  <span className="font-headline font-bold text-lg">
                    Transaction Receipt
                  </span>
                  <span className="text-xs font-label text-on-surface-variant px-2 py-1 bg-surface-container-low rounded">
                    SECURE_TX_001
                  </span>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between border-b border-outline-variant/5 pb-4">
                    <span className="text-on-surface-variant">
                      Source Chain
                    </span>
                    <span className="font-medium">Ethereum Mainnet</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant/5 pb-4">
                    <span className="text-on-surface-variant">Asset</span>
                    <span className="font-medium">USDC</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant/5 pb-4">
                    <span className="text-on-surface-variant">
                      Confidential Balance
                    </span>
                    <div className="relative">
                      <span className="font-medium confidential-blur">
                        45,290.00 cUSDC
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant/5 pb-4">
                    <span className="text-on-surface-variant">FHE Proof</span>
                    <span className="font-mono text-xs text-primary truncate max-w-[150px]">
                      0x8f2e...4a1c
                    </span>
                  </div>
                </div>
                <div className="mt-12 p-4 bg-surface-container-low rounded-xl border border-primary/10">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-sm">
                      verified
                    </span>
                    <span className="text-xs font-medium text-primary">
                      Audited &amp; Verified via Filecoin VM
                    </span>
                  </div>
                </div>
              </div>
              {/* Decorative back layers */}
              <div className="absolute -top-4 -right-4 w-full h-full bg-primary/5 rounded-[2rem] -z-10 border border-primary/10"></div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 px-12 md:px-20 lg:px-24 max-w-[1440px] mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="font-headline text-4xl md:text-5xl font-bold">
              Privacy Infrastructure
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Built on the bleeding edge of cryptography to ensure your
              financial data remains your own.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Multi-chain Bridging */}
            <div className="group p-8 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all duration-500">
              <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-3xl">
                  account_balance_wallet
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-4">
                Multi-chain Bridging
              </h3>
              <p className="text-on-surface-variant leading-relaxed mb-8">
                Unified liquidity access across Ethereum, Solana, and Cosmos via
                our secure obsidian-bridge gateways.
              </p>
              <div className="flex items-center gap-2 text-primary font-bold text-sm cursor-pointer">
                <span>Read Specs</span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Confidential cUSDC */}
            <div className="group p-8 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="px-2 py-1 bg-primary/10 rounded text-[10px] font-bold text-primary uppercase tracking-widest">
                  Core Tech
                </div>
              </div>
              <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-primary text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield_lock
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-4">
                Confidential cUSDC
              </h3>
              <p className="text-on-surface-variant leading-relaxed mb-8">
                FHE-Powered stablecoin transactions that maintain parity with
                USDC while shielding your footprint.
              </p>
              <div className="flex items-center gap-2 text-primary font-bold text-sm cursor-pointer">
                <span>Learn FHE</span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Verifiable Audit Trails */}
            <div className="group p-8 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all duration-500">
              <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-3xl">
                  history_edu
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-4">
                Verifiable Audits
              </h3>
              <p className="text-on-surface-variant leading-relaxed mb-8">
                Cryptographic proofs stored on Filecoin allow for trustless
                auditing without exposing private keys.
              </p>
              <div className="flex items-center gap-2 text-primary font-bold text-sm cursor-pointer">
                <span>Explorer</span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-12 md:px-20 lg:px-24 max-w-[1440px] mx-auto">
          <div className="relative p-12 md:p-24 rounded-[3rem] overflow-hidden bg-surface-container-high">
            <div className="absolute inset-0 opacity-20">
              <img
                alt="Dark obsidian background with subtle micro-textures"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeofd7Y6_y0xaLQE71IiDQqSrXAQq8bjC1TdC8u-KVfMjEvW5slrMOS9mhC59796zpuxj_7cf17sks8QHrwvTk1a2zvqI9xK06I6yuZy2q4reUek2onAhw9qQLjGfElcFX_vCmMV22KuymA53Zfyh2BDhxH3UZKm9g3b7k0RjX0U_MDQESfV-ZKDpH077loZLFEdYCKI9mjrHMXtApJeRRKJckvgS6sUmqNKdGIuKOftvuJyu7YGdZWNeYJZOo674RYrYfE4gJjzA"
              />
            </div>
            <div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
              <h2 className="font-headline text-5xl font-bold">
                Ready to Enter the Sanctum?
              </h2>
              <p className="text-xl text-on-surface-variant">
                Join the community of sovereign financiers protecting their
                wealth with FHE privacy.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Link
                  href="/bridge"
                  className="bg-primary text-on-primary px-12 py-5 rounded-full font-headline font-bold text-xl hover:scale-105 transition-transform inline-block"
                >
                  Launch Console
                </Link>
                <button className="bg-surface-container-lowest text-on-surface px-12 py-5 rounded-full font-headline font-bold text-xl border border-outline-variant/30 hover:bg-surface-container-high transition-all">
                  Join Discord
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#091328] w-full py-16 border-t border-[#40485d]/15">
        <div className="max-w-[1440px] mx-auto px-12 md:px-20 lg:px-24 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="text-lg font-bold text-[#b79fff] font-headline">
              Obsidian Sanctum
            </div>
            <p className="font-['Inter'] text-sm text-[#a3aac4]">
              © 2024 Obsidian Sanctum. Sovereign Privacy Engineered.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            <a
              className="font-['Inter'] text-sm text-[#a3aac4] hover:text-[#b79fff] transition-colors opacity-80 hover:opacity-100"
              href="#"
            >
              Documentation
            </a>
            <a
              className="font-['Inter'] text-sm text-[#a3aac4] hover:text-[#b79fff] transition-colors opacity-80 hover:opacity-100"
              href="#"
            >
              Security Audits
            </a>
            <a
              className="font-['Inter'] text-sm text-[#a3aac4] hover:text-[#b79fff] transition-colors opacity-80 hover:opacity-100"
              href="#"
            >
              Github
            </a>
            <a
              className="font-['Inter'] text-sm text-[#a3aac4] hover:text-[#b79fff] transition-colors opacity-80 hover:opacity-100"
              href="#"
            >
              Twitter
            </a>
            <a
              className="font-['Inter'] text-sm text-[#a3aac4] hover:text-[#b79fff] transition-colors opacity-80 hover:opacity-100"
              href="#"
            >
              Status
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
