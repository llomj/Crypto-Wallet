import React, { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Copy, Eye, EyeOff, LockKeyhole, Radio, RefreshCw, ShieldCheck, Trash2, WalletCards, Zap } from 'lucide-react';
import './styles.css';

type Network = 'PulseChain' | 'Ethereum';
type TrackedWallet = { id: string; label: string; address: string; network: Network };
type Asset = { id: string; symbol: string; name: string; amount: string; price: number | null; value: number | null; icon: string | null; native?: boolean };
type Portfolio = { assets: Asset[]; loading: boolean; error: string; refreshedAt: number | null };
const STORAGE_KEY = 'pulse-vault-private-wallets-v2';
const FEATURED_SYMBOLS = new Set(['PLS', 'WPLS', 'PLSX', 'HEX', 'INC', 'PRVX', 'ICSA', 'HXY', 'PDI']);
const WRAPPED_NATIVE: Record<Network, string> = {
  PulseChain: '0xA1077a294dDe1B09bB078844Df40758a5D0f9a27',
  Ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};
const CORE_ICONS: Record<string, string> = {
  PLS: `${import.meta.env.BASE_URL}token-icons/pls.png`,
  WPLS: `${import.meta.env.BASE_URL}token-icons/pls.png`,
  PLSX: `${import.meta.env.BASE_URL}token-icons/plsx.png`,
  HEX: `${import.meta.env.BASE_URL}token-icons/hex.png`,
  INC: `${import.meta.env.BASE_URL}token-icons/inc.png`,
};

function readWallets(): TrackedWallet[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function short(address: string) { return `${address.slice(0, 7)}…${address.slice(-5)}`; }
function validAddress(value: string) { return /^0x[a-fA-F0-9]{40}$/.test(value.trim()); }
function formatUnits(value: string, decimals = 18) {
  try {
    const negative = value.startsWith('-');
    const digits = (negative ? value.slice(1) : value).replace(/^0+/, '') || '0';
    const padded = digits.padStart(decimals + 1, '0');
    const whole = padded.slice(0, -decimals) || '0';
    const fraction = padded.slice(-decimals).replace(/0+$/, '').slice(0, 6);
    return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
  } catch { return '0'; }
}
function compactAmount(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(2)}K`;
  return number.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Price unavailable';
  if (value > 0 && value < 0.01) return `$${value.toPrecision(3)}`;
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
async function jsonRequest(url: string, timeout = 16000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Data service returned ${response.status}`);
    return await response.json();
  } finally { window.clearTimeout(timer); }
}

async function enrichMarketAssets(assets: Asset[], network: Network) {
  const chainId = network === 'PulseChain' ? 'pulsechain' : 'ethereum';
  const prioritized = [...assets.filter(asset => FEATURED_SYMBOLS.has(asset.symbol.toUpperCase())), ...assets];
  const unique = prioritized.filter((asset, index, list) => list.findIndex(item => item.id.toLowerCase() === asset.id.toLowerCase()) === index).slice(0, 40);
  const enriched = new Map<string, { price: number; icon: string | null }>();
  for (let start = 0; start < unique.length; start += 5) {
    const group = unique.slice(start, start + 5);
    const results = await Promise.allSettled(group.map(async asset => {
      const contract = asset.native ? WRAPPED_NATIVE[network] : asset.id;
      if (!validAddress(contract)) return null;
      const data = await jsonRequest(`https://api.dexscreener.com/latest/dex/tokens/${contract}`, 10000);
      const pairs = (Array.isArray(data.pairs) ? data.pairs : []).filter((pair: any) => pair.chainId === chainId && pair.baseToken?.address?.toLowerCase() === contract.toLowerCase() && Number(pair.priceUsd) > 0);
      const pair = pairs.sort((left: any, right: any) => Number(right.liquidity?.usd ?? 0) - Number(left.liquidity?.usd ?? 0))[0];
      if (!pair) return null;
      return { id: asset.id, price: Number(pair.priceUsd), icon: typeof pair.info?.imageUrl === 'string' ? pair.info.imageUrl : null };
    }));
    for (const result of results) if (result.status === 'fulfilled' && result.value) enriched.set(result.value.id, { price: result.value.price, icon: result.value.icon });
  }
  return assets.map(asset => {
    const market = enriched.get(asset.id);
    if (!market) return asset;
    return { ...asset, price: market.price, value: Number(asset.amount) * market.price, icon: market.icon || asset.icon };
  }).sort((left, right) => (right.value ?? -1) - (left.value ?? -1));
}

async function loadPortfolio(wallet: TrackedWallet): Promise<Asset[]> {
  const base = wallet.network === 'PulseChain' ? 'https://api.scan.pulsechain.com' : 'https://eth.blockscout.com';
  const nativeSymbol = wallet.network === 'PulseChain' ? 'PLS' : 'ETH';
  const nativeName = wallet.network === 'PulseChain' ? 'PulseChain' : 'Ethereum';
  try {
    const [addressData, tokenData] = await Promise.all([
      jsonRequest(`${base}/api/v2/addresses/${wallet.address}`),
      jsonRequest(`${base}/api/v2/addresses/${wallet.address}/token-balances`),
    ]);
    const nativeAmount = formatUnits(String(addressData.coin_balance ?? '0'), 18);
    const nativePrice = addressData.exchange_rate === null || addressData.exchange_rate === undefined ? null : Number(addressData.exchange_rate);
    const assets: Asset[] = [{ id: `${wallet.network}-native`, symbol: nativeSymbol, name: nativeName, amount: nativeAmount, price: nativePrice, value: nativePrice === null ? null : Number(nativeAmount) * nativePrice, icon: null, native: true }];
    for (const item of Array.isArray(tokenData) ? tokenData : []) {
      const token = item.token ?? {};
      if (token.type && token.type !== 'ERC-20') continue;
      const decimals = Number(token.decimals ?? 18);
      const amount = formatUnits(String(item.value ?? '0'), Number.isFinite(decimals) ? decimals : 18);
      if (Number(amount) === 0) continue;
      const price = token.exchange_rate === null || token.exchange_rate === undefined ? null : Number(token.exchange_rate);
      assets.push({ id: token.address_hash ?? token.address ?? `${token.symbol}-${assets.length}`, symbol: token.symbol || 'TOKEN', name: token.name || 'Unknown token', amount, price, value: price === null ? null : Number(amount) * price, icon: token.icon_url || null });
    }
    return await enrichMarketAssets(assets, wallet.network);
  } catch {
    const [nativeData, tokensData] = await Promise.all([
      jsonRequest(`${base}/api?module=account&action=balance&address=${wallet.address}`),
      jsonRequest(`${base}/api?module=account&action=tokenlist&address=${wallet.address}`),
    ]);
    const nativeAmount = formatUnits(String(nativeData.result ?? '0'), 18);
    const assets: Asset[] = [{ id: `${wallet.network}-native`, symbol: nativeSymbol, name: nativeName, amount: nativeAmount, price: null, value: null, icon: null, native: true }];
    for (const token of Array.isArray(tokensData.result) ? tokensData.result : []) {
      const amount = formatUnits(String(token.balance ?? '0'), Number(token.decimals ?? 18));
      if (Number(amount) === 0) continue;
      assets.push({ id: token.contractAddress ?? `${token.symbol}-${assets.length}`, symbol: token.symbol || 'TOKEN', name: token.name || 'Unknown token', amount, price: null, value: null, icon: null });
    }
    return await enrichMarketAssets(assets, wallet.network);
  }
}

function App() {
  const [wallets, setWallets] = useState<TrackedWallet[]>(readWallets);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<Network>('PulseChain');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [privateMode, setPrivateMode] = useState(false);
  const [selectedId, setSelectedId] = useState(() => readWallets()[0]?.id ?? '');
  const [portfolios, setPortfolios] = useState<Record<string, Portfolio>>({});
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [hideDust, setHideDust] = useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets)), [wallets]);
  useEffect(() => { if (!wallets.some(wallet => wallet.id === selectedId)) setSelectedId(wallets[0]?.id ?? ''); }, [wallets, selectedId]);
  useEffect(() => setShowAllAssets(false), [selectedId]);

  const refreshWallet = async (wallet: TrackedWallet) => {
    setPortfolios(current => ({ ...current, [wallet.id]: { assets: current[wallet.id]?.assets ?? [], loading: true, error: '', refreshedAt: current[wallet.id]?.refreshedAt ?? null } }));
    try {
      const assets = await loadPortfolio(wallet);
      setPortfolios(current => ({ ...current, [wallet.id]: { assets, loading: false, error: '', refreshedAt: Date.now() } }));
    } catch (requestError) {
      const message = requestError instanceof Error && requestError.name === 'AbortError' ? 'The live indexer timed out. Tap refresh to try again.' : 'Live portfolio data is temporarily unavailable.';
      setPortfolios(current => ({ ...current, [wallet.id]: { assets: current[wallet.id]?.assets ?? [], loading: false, error: message, refreshedAt: current[wallet.id]?.refreshedAt ?? null } }));
    }
  };

  useEffect(() => {
    const wallet = wallets.find(item => item.id === selectedId);
    if (wallet && !portfolios[wallet.id]) void refreshWallet(wallet);
  }, [selectedId, wallets]);

  const addWallet = (event: FormEvent) => {
    event.preventDefault();
    const cleanAddress = address.trim();
    if (!validAddress(cleanAddress)) return setError('Enter a valid Ethereum-compatible public address.');
    if (wallets.some(w => w.address.toLowerCase() === cleanAddress.toLowerCase() && w.network === network)) return setError('You already track this address on that network.');
    const newWallet = { id: crypto.randomUUID(), label: label.trim() || `Wallet ${wallets.length + 1}`, address: cleanAddress, network };
    setWallets([...wallets, newWallet]); setSelectedId(newWallet.id);
    setAddress(''); setLabel(''); setError('');
  };

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value); setCopied(id); setTimeout(() => setCopied(''), 1200);
  };
  const selectedWallet = wallets.find(wallet => wallet.id === selectedId) ?? wallets[0];
  const selectedPortfolio = selectedWallet ? portfolios[selectedWallet.id] : undefined;
  const orderedWallets = [...wallets].sort((left, right) => {
    const leftNumber = /^Wallet\s+(\d+)$/i.exec(left.label)?.[1];
    const rightNumber = /^Wallet\s+(\d+)$/i.exec(right.label)?.[1];
    return leftNumber && rightNumber ? Number(leftNumber) - Number(rightNumber) : 0;
  });
  const knownValue = selectedPortfolio?.assets.reduce((total, asset) => total + (asset.value ?? 0), 0) ?? 0;
  const filteredAssets = selectedPortfolio?.assets.filter(asset => !hideDust || FEATURED_SYMBOLS.has(asset.symbol.toUpperCase()) || (asset.value !== null && asset.value >= 0.01)) ?? [];
  const hiddenDustCount = (selectedPortfolio?.assets.length ?? 0) - filteredAssets.length;
  const visibleAssets = filteredAssets.slice(0, showAllAssets ? undefined : 30);

  return <div className="landing-shell">
    <header className="landing-header">
      <div className="brand"><div className="brand-mark"><Zap size={21} fill="currentColor" /></div><div>PULSE<span>VAULT</span></div></div>
      <div className="header-right"><div className="network-pill"><Radio size={14}/><span>PulseChain ready</span><b>LIVE</b></div><div className="watch-only"><ShieldCheck size={16}/>Watch-only</div></div>
    </header>

    <main className="landing-main">
      <section className="intake-section">
        <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
        <div className="intake-copy">
          <h1>Wallet portfolio.<br/><span>One private view.</span></h1>
          <p>Track your PulseChain and Ethereum wallets from one mobile-first, watch-only dashboard.</p>
          <div className="trust-row"><span><LockKeyhole size={15}/>No wallet connection</span><span><ShieldCheck size={15}/>No seed phrase</span></div>
          <div className="ecosystem-strip"><span>BUILT FOR THE ECOSYSTEM</span><div><b>ETH</b><b>PLS</b><b>HEX</b><b>PLSX</b><b>PRVX</b><b>INC</b></div></div>
        </div>

        <form className="address-panel" onSubmit={addWallet}>
          <div className="panel-glow"/>
          <div className="panel-heading"><div className="wallet-orbit"><WalletCards size={24}/></div><div><p className="eyebrow">ADD A WALLET</p><h2>Enter a public address</h2></div></div>
          <p className="panel-note">Your address stays on this device. It is never added to our code or public GitHub.</p>
          <label>Wallet name <span>optional</span><input value={label} onChange={e => setLabel(e.target.value)} placeholder="Give this wallet a private label" autoComplete="off"/></label>
          <label>Public wallet address<div className={`address-input ${error ? 'invalid' : ''}`}><input aria-label="Public wallet address" value={address} onChange={e => {setAddress(e.target.value.trim()); setError('')}} placeholder="Paste the complete public address" autoCapitalize="off" autoCorrect="off" spellCheck={false}/></div>{error && <small className="error">{error}</small>}</label>
          <fieldset><legend>Choose network</legend><div className="network-choice"><button type="button" className={network === 'PulseChain' ? 'active' : ''} onClick={() => setNetwork('PulseChain')}><i className="pulse-dot"/><span><b>PulseChain</b><small>PLS · Chain 369</small></span></button><button type="button" className={network === 'Ethereum' ? 'active' : ''} onClick={() => setNetwork('Ethereum')}><i className="eth-diamond">◆</i><span><b>Ethereum</b><small>ETH · Chain 1</small></span></button></div></fieldset>
          <button className="scan-button" type="submit">Track this wallet <ArrowRight size={18}/></button>
          <div className="privacy-line"><LockKeyhole size={13}/>Stored locally in your browser only</div>
        </form>
      </section>

      {wallets.length > 0 && <section className="tracked-section">
        <div className="section-head"><div><p className="eyebrow">PRIVATE WATCHLIST</p><h2>Your tracked wallets</h2></div><button className="privacy-toggle" onClick={() => setPrivateMode(v => !v)}>{privateMode ? <EyeOff size={16}/> : <Eye size={16}/>} {privateMode ? 'Reveal' : 'Hide'} addresses</button></div>
        <div className="vault-board">
          <div className="vault-summary">
            <div><span>PORTFOLIO VALUE</span><strong>{privateMode ? '••••••' : knownValue > 0 ? money(knownValue) : 'Live assets'}</strong><small>{wallets.length} {wallets.length === 1 ? 'address' : 'addresses'} · stored on this device</small></div>
            {selectedWallet && <button className={`sync-control ${selectedPortfolio?.loading ? 'spinning' : ''}`} onClick={() => refreshWallet(selectedWallet)} disabled={selectedPortfolio?.loading}><RefreshCw size={16}/>{selectedPortfolio?.loading ? 'Syncing' : 'Sync live'}</button>}
          </div>
          <div className="address-rail" aria-label="Saved wallet addresses">
            {orderedWallets.map((wallet, index) => <button className={`mini-wallet n${index % 4} ${wallet.id === selectedWallet?.id ? 'selected' : ''}`} key={wallet.id} onClick={() => setSelectedId(wallet.id)}>
              <span className="mini-number">{String(index + 1).padStart(2, '0')}</span><div><small>{wallet.network}</small><b>{wallet.label}</b><em>{privateMode ? '••••••••' : short(wallet.address)}</em></div><i/>
            </button>)}
          </div>
          {selectedWallet && <div className="asset-panel">
            <div className="asset-panel-head"><div><p className="eyebrow">SELECTED ADDRESS</p><h3>{selectedWallet.label}</h3><button onClick={() => copy(selectedWallet.address, selectedWallet.id)}>{privateMode ? '••••••••••••••••' : short(selectedWallet.address)} {copied === selectedWallet.id ? <em>COPIED</em> : <Copy size={13}/>}</button></div><div className="selected-actions"><button className={hideDust ? 'dust-active' : ''} onClick={() => setHideDust(value => !value)}>{hideDust ? `Show dust${hiddenDustCount ? ` · ${hiddenDustCount} hidden` : ''}` : 'Hide dust'}</button><a href={`${selectedWallet.network === 'PulseChain' ? 'https://scan.pulsechain.com/address/' : 'https://etherscan.io/address/'}${selectedWallet.address}`} target="_blank" rel="noreferrer">Explorer <ArrowUpRight size={15}/></a><button onClick={() => setWallets(wallets.filter(wallet => wallet.id !== selectedWallet.id))} aria-label={`Remove ${selectedWallet.label}`}><Trash2 size={16}/></button></div></div>
            <div className="asset-list">
              {selectedPortfolio?.loading && selectedPortfolio.assets.length === 0 && <div className="asset-message"><RefreshCw size={20} className="spin-icon"/>Reading live {selectedWallet.network} assets…</div>}
              {selectedPortfolio?.error && <div className="asset-message error-message">{selectedPortfolio.error}<button onClick={() => refreshWallet(selectedWallet)}>Try again</button></div>}
              {!selectedPortfolio?.loading && !selectedPortfolio?.error && selectedPortfolio?.assets.length === 0 && <div className="asset-message">No indexed assets were found for this address.</div>}
              {visibleAssets.map(asset => <article className="asset-row" key={asset.id}>
                <div className={`asset-logo ${asset.native ? 'native' : ''}`}><span>{asset.symbol.slice(0, 3)}</span>{(CORE_ICONS[asset.symbol.toUpperCase()] || asset.icon)?.startsWith('http') || CORE_ICONS[asset.symbol.toUpperCase()] ? <img src={CORE_ICONS[asset.symbol.toUpperCase()] || asset.icon || ''} alt={`${asset.symbol} logo`} onError={event => { event.currentTarget.style.display = 'none'; }}/>: null}</div>
                <div className="asset-name"><b>{asset.symbol} <small>({asset.name})</small></b></div>
                <div className="asset-balance"><b>{privateMode ? '••••' : compactAmount(asset.amount)} <small>{asset.symbol}</small></b></div>
                <div className="asset-price"><b>{privateMode ? '••••' : asset.value === null ? '—' : money(asset.value)}</b><small>{privateMode ? 'Price hidden' : `@ ${money(asset.price)}`}</small></div>
              </article>)}
              {filteredAssets.length > 30 && <button className="show-assets" onClick={() => setShowAllAssets(value => !value)}>{showAllAssets ? 'Show top assets' : `View all ${filteredAssets.length} visible assets`}</button>}
            </div>
            <div className="live-data-note"><Radio size={11}/>Live read-only data from {selectedWallet.network} · {selectedPortfolio?.refreshedAt ? `updated ${new Date(selectedPortfolio.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'waiting to sync'}</div>
          </div>}
        </div>
      </section>}

      {wallets.length === 0 && <section className="next-preview"><p className="eyebrow">WHAT COMES NEXT</p><h2>Your wallet becomes a living dashboard.</h2><div className="preview-panels"><div/><div/><div/></div><p>Token panels inspired by your reference design will appear here after we connect live portfolio data.</p></section>}
    </main>
    <footer><div className="footer-tools"><div className="brand mini"><Zap size={14}/>PULSE<span>VAULT</span></div><button className="refresh-button" onClick={() => window.location.reload()} aria-label="Refresh PulseVault"><RefreshCw size={14}/>Refresh</button></div><span>Watch-only portfolio intelligence</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
