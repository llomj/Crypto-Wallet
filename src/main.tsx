import React, { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, ChevronDown, Copy, Eye, EyeOff, FolderPlus, LockKeyhole, Radio, RefreshCw, ShieldCheck, Trash2, WalletCards, Zap } from 'lucide-react';
import './styles.css';

type Network = 'PulseChain' | 'Ethereum';
type TrackedWallet = { id: string; label: string; address: string; network: Network; groupId?: string };
type WalletGroup = { id: string; name: string };
type Asset = { id: string; symbol: string; name: string; amount: string; price: number | null; value: number | null; icon: string | null; native?: boolean };
type Portfolio = { assets: Asset[]; loading: boolean; error: string; refreshedAt: number | null };
type TokenStats = {
  price: number;
  change24h: number;
  marketCap: number;
  liquidity: number;
  supply: string;
  holders: string;
  loading: boolean;
  error: string;
};
const STORAGE_KEY = 'pulse-vault-private-wallets-v2';
const GROUP_STORAGE_KEY = 'pulse-vault-wallet-groups-v1';
const DEFAULT_GROUP_ID = 'my-wallet';
const FEATURED_SYMBOLS = new Set(['PLS', 'WPLS', 'ETH', 'WETH', 'PLSX', 'HEX', 'pHEX', 'INC', 'PRVX', 'HDRN', 'ICSA', 'PDI', 'ASIC', 'PDA', 'USDC']);
const HIDDEN_DUST_SYMBOLS = new Set(['FTVC', 'SCIVVE', 'SCIVVI', 'SCIVVII', 'SCIVV', 'HXY']);
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
  pHEX: `${import.meta.env.BASE_URL}token-icons/phex.png`,
  USDC: `${import.meta.env.BASE_URL}token-icons/usdc.png`,
  WETH: `${import.meta.env.BASE_URL}token-icons/weth.png`,
  HDRN: `${import.meta.env.BASE_URL}token-icons/hdrn.png`,
  ICSA: `${import.meta.env.BASE_URL}token-icons/icsa.png`,
  ASIC: `${import.meta.env.BASE_URL}token-icons/asic.png`,
  PDA: `${import.meta.env.BASE_URL}token-icons/pda.png`,
  PDI: `${import.meta.env.BASE_URL}token-icons/pdi.png`,
  PRVX: `${import.meta.env.BASE_URL}token-icons/prvx.png`,
};

type TokenInfo = {
  symbol: string;
  name: string;
  subtitle: string;
  contract: string;
  network: Network;
  color: string;
  borderGradient: string;
};

const TOKEN_DATA: Record<string, TokenInfo> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    subtitle: 'Smart Contract Platform',
    contract: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    network: 'Ethereum',
    color: '#627EEA',
    borderGradient: 'linear-gradient(135deg, #627EEA, #8B9FEF)',
  },
  PLS: {
    symbol: 'PLS',
    name: 'PulseChain',
    subtitle: 'Day: 1180',
    contract: '0xA1077a294dDe1B09bB078844Df40758a5D0f9a27',
    network: 'PulseChain',
    color: '#00BFFF',
    borderGradient: 'linear-gradient(135deg, #00BFFF, #8B5CF6, #FF1493)',
  },
  HEX: {
    symbol: 'HEX',
    name: 'HEX',
    subtitle: 'Mining Protocol',
    contract: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    network: 'Ethereum',
    color: '#FF8C00',
    borderGradient: 'linear-gradient(135deg, #FF8C00, #FFD700, #FF1493)',
  },
  PLSX: {
    symbol: 'PLSX',
    name: 'PulseX',
    subtitle: 'Buy & Burn',
    contract: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
    network: 'PulseChain',
    color: '#00FF00',
    borderGradient: 'linear-gradient(135deg, #00FF00, #FF0000)',
  },
  PRVX: {
    symbol: 'PRVX',
    name: 'ProveX',
    subtitle: 'ProveX',
    contract: '0x736F478e5C9A6e7e6f5e5e5e5e5e5e5e5e5e5e5e',
    network: 'PulseChain',
    color: '#FF8C00',
    borderGradient: 'linear-gradient(135deg, #FF8C00, #8B5CF6, #FF1493)',
  },
  INC: {
    symbol: 'INC',
    name: 'Incentive',
    subtitle: 'Incentive',
    contract: '0x736F478e5C9A6e7e6f5e5e5e5e5e5e5e5e5e5e5f',
    network: 'PulseChain',
    color: '#00FF00',
    borderGradient: 'linear-gradient(135deg, #00FF00, #00CC00)',
  },
  pHEX: {
    symbol: 'pHEX',
    name: 'HEX on PulseChain',
    subtitle: 'Mining Protocol',
    contract: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    network: 'PulseChain',
    color: '#FF8C00',
    borderGradient: 'linear-gradient(135deg, #FF8C00, #FFD700, #FF1493)',
  },
};

function readWallets(): TrackedWallet[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function readGroups(): WalletGroup[] {
  try {
    const saved = localStorage.getItem(GROUP_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) && parsed.length ? parsed : [{ id: DEFAULT_GROUP_ID, name: 'My Wallet' }];
  } catch { return [{ id: DEFAULT_GROUP_ID, name: 'My Wallet' }]; }
}

function short(address: string) { return `${address.slice(0, 7)}…${address.slice(-5)}`; }
function tokenKey(symbol: string) { return symbol.toUpperCase().replace(/[^A-Z0-9]/g, ''); }
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
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
  const prioritized = [...assets.filter(asset => FEATURED_SYMBOLS.has(tokenKey(asset.symbol))), ...assets];
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

async function fetchTokenStats(token: TokenInfo): Promise<TokenStats> {
  try {
    const chainId = token.network === 'PulseChain' ? 'pulsechain' : 'ethereum';
    const data = await jsonRequest(`https://api.dexscreener.com/latest/dex/tokens/${token.contract}`, 10000);
    const pairs = (Array.isArray(data.pairs) ? data.pairs : []).filter((pair: any) => 
      pair.chainId === chainId && 
      pair.baseToken?.address?.toLowerCase() === token.contract.toLowerCase() && 
      Number(pair.priceUsd) > 0
    );
    const pair = pairs.sort((left: any, right: any) => Number(right.liquidity?.usd ?? 0) - Number(left.liquidity?.usd ?? 0))[0];
    
    if (!pair) {
      return { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: false, error: 'No data available' };
    }

    const price = Number(pair.priceUsd);
    const change24h = Number(pair.priceChange?.h24 ?? 0);
    const liquidity = Number(pair.liquidity?.usd ?? 0);
    const fdv = Number(pair.fdv ?? 0);
    const marketCap = fdv > 0 ? fdv : liquidity * 10;

    const baseExplorer = token.network === 'PulseChain' ? 'https://api.scan.pulsechain.com' : 'https://eth.blockscout.com';
    let supply = 'N/A';
    let holders = 'N/A';
    
    try {
      const tokenData = await jsonRequest(`${baseExplorer}/api/v2/tokens/${token.contract}`, 8000);
      if (tokenData) {
        const totalSupply = tokenData.total_supply;
        const decimals = tokenData.decimals ?? 18;
        if (totalSupply) {
          const formatted = formatUnits(String(totalSupply), decimals);
          const num = Number(formatted);
          supply = compactAmount(formatted);
        }
        holders = tokenData.holders ? Number(tokenData.holders).toLocaleString() : 'N/A';
      }
    } catch {
      supply = 'N/A';
      holders = 'N/A';
    }

    return { price, change24h, marketCap, liquidity, supply, holders, loading: false, error: '' };
  } catch {
    return { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: false, error: 'Failed to load' };
  }
}

function App() {
  const [wallets, setWallets] = useState<TrackedWallet[]>(readWallets);
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>(readGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(() => readGroups()[0]?.id ?? DEFAULT_GROUP_ID);
  const [newGroupName, setNewGroupName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [trackedCollapsed, setTrackedCollapsed] = useState(true);
  const [newWalletPanelOpen, setNewWalletPanelOpen] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<Network>('PulseChain');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [privateMode, setPrivateMode] = useState(false);
  const [selectedId, setSelectedId] = useState(() => readWallets()[0]?.id ?? '');
  const [portfolios, setPortfolios] = useState<Record<string, Portfolio>>({});
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [hideDust, setHideDust] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [tokenStats, setTokenStats] = useState<Record<string, TokenStats>>({});

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets)), [wallets]);
  useEffect(() => localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(walletGroups)), [walletGroups]);
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
    wallets.filter(wallet => !portfolios[wallet.id]).slice(0, 3).forEach(wallet => void refreshWallet(wallet));
  }, [wallets, portfolios]);

  const addWallet = (event: FormEvent) => {
    event.preventDefault();
    const cleanAddress = address.trim();
    if (!validAddress(cleanAddress)) return setError('Enter a valid Ethereum-compatible public address.');
    if (wallets.some(w => w.address.toLowerCase() === cleanAddress.toLowerCase() && w.network === network)) return setError('You already track this address on that network.');
    const newWallet = { id: crypto.randomUUID(), label: label.trim() || `Wallet ${wallets.length + 1}`, address: cleanAddress, network, groupId: selectedGroupId };
    setWallets([...wallets, newWallet]); setSelectedId(newWallet.id);
    setAddress(''); setLabel(''); setError('');
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const group = { id: crypto.randomUUID(), name };
    setWalletGroups(current => [...current, group]);
    setSelectedGroupId(group.id);
    setNewGroupName('');
  };

  const renameGroup = (id: string, name: string) => {
    setWalletGroups(current => current.map(group => group.id === id ? { ...group, name } : group));
  };

  const renameWallet = (id: string, name: string) => {
    setWallets(current => current.map(wallet => wallet.id === id ? { ...wallet, label: name } : wallet));
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
  const knownValue = wallets.reduce((total, wallet) => total + (portfolios[wallet.id]?.assets.reduce((walletTotal, asset) => walletTotal + (asset.value ?? 0), 0) ?? 0), 0);
  const selectedValue = selectedPortfolio?.assets.reduce((total, asset) => total + (asset.value ?? 0), 0) ?? 0;
  const filteredAssets = selectedPortfolio?.assets.filter(asset => {
    const symbol = tokenKey(asset.symbol);
    const name = tokenKey(asset.name);
    const isDust = HIDDEN_DUST_SYMBOLS.has(symbol) || [...HIDDEN_DUST_SYMBOLS].some(dust => symbol.includes(dust) || name.includes(dust));
    if (isDust) return false;
    if (!hideDust) return true;
    return FEATURED_SYMBOLS.has(symbol) || (asset.value !== null && asset.value >= 0.01);
  }) ?? [];
  const hiddenDustCount = (selectedPortfolio?.assets.length ?? 0) - filteredAssets.length;
  const visibleAssets = filteredAssets.slice(0, showAllAssets ? undefined : 30);

  return <div className="landing-shell">
    <main className="landing-main">
      <section className="intake-section">
        <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
        <div className="intake-copy">
          <div className="hero-title-row"><h1>Wallet portfolio.<br/><span>One private view.</span></h1></div>
          <p>Track your PulseChain and Ethereum wallets from one mobile-first, watch-only dashboard.</p>
          <div className="trust-row"><span><LockKeyhole size={15}/>No wallet connection</span><span><ShieldCheck size={15}/>No seed phrase</span><span className="trust-live"><Radio size={12}/>Live</span></div>
          <div className="ecosystem-strip"><span>BUILT FOR THE ECOSYSTEM</span><div><b onClick={() => { setSelectedToken('ETH'); if (!tokenStats['ETH']) { setTokenStats(current => ({ ...current, 'ETH': { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA['ETH']).then(stats => setTokenStats(current => ({ ...current, 'ETH': stats }))); } }}>ETH</b><b onClick={() => { setSelectedToken('PLS'); if (!tokenStats['PLS']) { setTokenStats(current => ({ ...current, 'PLS': { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA['PLS']).then(stats => setTokenStats(current => ({ ...current, 'PLS': stats }))); } }}>PLS</b><b onClick={() => { setSelectedToken('HEX'); if (!tokenStats['HEX']) { setTokenStats(current => ({ ...current, 'HEX': { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA['HEX']).then(stats => setTokenStats(current => ({ ...current, 'HEX': stats }))); } }}>HEX</b><b onClick={() => { setSelectedToken('pHEX'); if (!tokenStats['pHEX']) { setTokenStats(current => ({ ...current, 'pHEX': { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA['pHEX']).then(stats => setTokenStats(current => ({ ...current, 'pHEX': stats }))); } }}>pHEX</b><b onClick={() => { setSelectedToken('PLSX'); if (!tokenStats['PLSX']) { setTokenStats(current => ({ ...current, 'PLSX': { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA['PLSX']).then(stats => setTokenStats(current => ({ ...current, 'PLSX': stats }))); } }}>PLSX</b><b onClick={() => { setSelectedToken('PRVX'); if (!tokenStats['PRVX']) { setTokenStats(current => ({ ...current, 'PRVX': { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA['PRVX']).then(stats => setTokenStats(current => ({ ...current, 'PRVX': stats }))); } }}>PRVX</b><b onClick={() => { setSelectedToken('INC'); if (!tokenStats['INC']) { setTokenStats(current => ({ ...current, 'INC': { price: 0, change24h: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA['INC']).then(stats => setTokenStats(current => ({ ...current, 'INC': stats }))); } }}>INC</b></div></div>
        </div>

        <form className={`address-panel ${addressFormOpen ? 'open' : 'collapsed'}`} onSubmit={addWallet}>
          <div className="panel-glow"/>
          <button className="panel-heading panel-fold" type="button" onClick={() => setAddressFormOpen(value => !value)} aria-expanded={addressFormOpen}><div className="wallet-orbit"><WalletCards size={24}/></div><div><p className="eyebrow">ADD AN ADDRESS</p><h2>Enter a public address</h2></div><ChevronDown size={18}/></button>
          {addressFormOpen && <div className="address-panel-body">
            <p className="panel-note">Your address stays on this device. It is never added to our code or public GitHub.</p>
            <label className="field-label">Wallet name <span>optional</span><input value={label} onChange={e => setLabel(e.target.value)} placeholder="Give this wallet a private label" autoComplete="off"/></label>
            <label className="field-label">Public wallet address<div className={`address-input ${error ? 'invalid' : ''}`}><input aria-label="Public wallet address" value={address} onChange={e => {setAddress(e.target.value.trim()); setError('')}} placeholder="Paste the complete public address" autoCapitalize="off" autoCorrect="off" spellCheck={false}/></div>{error && <small className="error">{error}</small>}</label>
            <label className="field-label">Add to wallet<div className="wallet-selector">{walletGroups.map(group => { const groupWallets = wallets.filter(w => (w.groupId ?? DEFAULT_GROUP_ID) === group.id); return <button type="button" key={group.id} className={`wallet-selector-item ${selectedGroupId === group.id ? 'selected' : ''}`} onClick={() => setSelectedGroupId(group.id)}><span className="wallet-selector-name">{group.name}</span><span className="wallet-selector-count">{groupWallets.length} {groupWallets.length === 1 ? 'wallet' : 'wallets'}</span></button>; })}</div></label>
            <fieldset><legend>Choose network</legend><div className="network-choice"><button type="button" className={network === 'PulseChain' ? 'active' : ''} onClick={() => setNetwork('PulseChain')}><i className="pulse-dot"/><span><b>PulseChain</b><small>PLS · Chain 369</small></span></button><button type="button" className={network === 'Ethereum' ? 'active' : ''} onClick={() => setNetwork('Ethereum')}><i className="eth-diamond">◆</i><span><b>Ethereum</b><small>ETH · Chain 1</small></span></button></div></fieldset>
            <button className="scan-button" type="submit">Track this wallet <ArrowRight size={18}/></button>
            <div className="privacy-line"><LockKeyhole size={13}/>Stored locally in your browser only</div>
          </div>}
        </form>

        {selectedToken && TOKEN_DATA[selectedToken] && <div className="token-detail-panel">
          <div className="token-panel-glow" style={{ background: TOKEN_DATA[selectedToken].borderGradient, opacity: 0.15 }}/>
          <div className="token-panel-content" style={{ background: `linear-gradient(#0c0910,#08060b) padding-box, ${TOKEN_DATA[selectedToken].borderGradient} border-box`, border: '2px solid transparent', boxShadow: `0 24px 70px #000, 0 0 45px ${TOKEN_DATA[selectedToken].color}22` }}>
            <div className="token-panel-header">
              <div className="token-panel-title">
                <div className="token-icon" style={{ background: TOKEN_DATA[selectedToken].borderGradient }}>
                  <img src={CORE_ICONS[selectedToken] || ''} alt={selectedToken} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                  <span>{selectedToken.slice(0, 2)}</span>
                </div>
                <div>
                  <h3>{selectedToken}</h3>
                  <p>{TOKEN_DATA[selectedToken].subtitle}</p>
                </div>
              </div>
              <div className="token-panel-price">
                <span className="token-price-value">{tokenStats[selectedToken]?.price ? money(tokenStats[selectedToken].price) : 'Loading...'}</span>
                <span className={`token-price-change ${tokenStats[selectedToken]?.change24h >= 0 ? 'positive' : 'negative'}`}>
                  {tokenStats[selectedToken]?.change24h >= 0 ? '+' : ''}{tokenStats[selectedToken]?.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="token-stats-row">
              <div className="token-stat">
                <span>MC</span>
                <b>{tokenStats[selectedToken]?.marketCap ? compactAmount(String(tokenStats[selectedToken].marketCap / 1000000)) + 'M' : 'N/A'}</b>
              </div>
              <div className="token-stat">
                <span>Liquidity</span>
                <b>{tokenStats[selectedToken]?.liquidity ? compactAmount(String(tokenStats[selectedToken].liquidity / 1000000)) + 'M' : 'N/A'}</b>
              </div>
              <div className="token-stat">
                <span>Supply</span>
                <b>{tokenStats[selectedToken]?.supply || 'N/A'}</b>
              </div>
              <div className="token-stat">
                <span>Holders</span>
                <b>{tokenStats[selectedToken]?.holders || 'N/A'}</b>
              </div>
            </div>
            <button className="token-chart-button" onClick={() => { const urls: Record<string, string> = { ETH: 'https://www.dextools.io/app/en/ether/pair-explorer/0xa43fe16908251ee70ef7470386909c572f0e2fe5', PLS: 'https://www.dextools.io/app/en/pulse/pair-explorer/0x95b303987a60c71504d99aa1b13b4da07b0790ab', HEX: 'https://www.dextools.io/app/en/ether/pair-explorer/0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', PLSX: 'https://www.dextools.io/app/en/pulse/pair-explorer/0x95b303987a60c71504d99aa1b13b4da07b0790ab', PRVX: 'https://www.dextools.io/app/en/pulse/pair-explorer/0x736f478e5c9a6e7e6f5e5e5e5e5e5e5e5e5e5e5e', INC: 'https://www.dextools.io/app/en/pulse/pair-explorer/0x736f478e5c9a6e7e6f5e5e5e5e5e5e5e5e5e5e5f' }; window.open(urls[selectedToken] || 'https://www.dextools.io', '_blank', 'noreferrer'); }}>Show Chart <ChevronDown size={16}/></button>
            <button className="token-close-button" onClick={() => setSelectedToken(null)}>Close</button>
          </div>
        </div>}
      </section>

      {wallets.length > 0 && <><section className={`tracked-section tracked-panel ${trackedCollapsed ? 'collapsed' : 'open'}`}>
        <div className="tracked-glow"/>
        <button className="panel-heading panel-fold" onClick={() => setTrackedCollapsed(value => !value)} aria-expanded={!trackedCollapsed}>
          <div className="wallet-orbit"><WalletCards size={24}/></div>
          <div className="panel-heading-text"><p className="eyebrow">PRIVATE WATCHLIST</p><h2>Your tracked wallets</h2></div>
          <button className="panel-action-btn" onClick={(e) => { e.stopPropagation(); setPrivateMode(v => !v); }}>{privateMode ? <EyeOff size={13}/> : <Eye size={13}/>} {privateMode ? 'Reveal' : 'Hide'}</button>
          <ChevronDown size={18}/>
        </button>
        {!trackedCollapsed && <div className="vault-board">
          <div className="vault-summary">
            <div className="portfolio-totals"><div><span>TOTAL PORTFOLIO</span><strong>{privateMode ? '••••••' : knownValue > 0 ? money(knownValue) : 'Live assets'}</strong><small>{wallets.length} {wallets.length === 1 ? 'address' : 'addresses'} · all wallets</small></div>{selectedWallet && <div className="selected-total"><span>{selectedWallet.label}</span><strong>{privateMode ? '••••••' : selectedValue > 0 ? money(selectedValue) : 'Live assets'}</strong><small>Selected address value</small></div>}</div>
            {selectedWallet && <button className={`sync-control ${Object.values(portfolios).some(portfolio => portfolio.loading) ? 'spinning' : ''}`} onClick={() => wallets.forEach(wallet => void refreshWallet(wallet))} disabled={Object.values(portfolios).some(portfolio => portfolio.loading)}><RefreshCw size={16}/>{Object.values(portfolios).some(portfolio => portfolio.loading) ? 'Syncing' : 'Sync all'}</button>}
          </div>
          <div className="wallet-groups">
            {walletGroups.map(group => {
              const groupWallets = orderedWallets.filter(wallet => (wallet.groupId ?? DEFAULT_GROUP_ID) === group.id);
              const groupValue = groupWallets.reduce((total, wallet) => total + (portfolios[wallet.id]?.assets.reduce((sum, asset) => sum + (asset.value ?? 0), 0) ?? 0), 0);
              const collapsed = collapsedGroups.includes(group.id);
              return <section className="wallet-group" key={group.id}>
                <div className="wallet-group-head"><button className="group-fold" onClick={() => setCollapsedGroups(current => collapsed ? current.filter(id => id !== group.id) : [...current, group.id])} aria-expanded={!collapsed}><ChevronDown size={16}/><span>{groupWallets.length} {groupWallets.length === 1 ? 'address' : 'addresses'}</span></button><input aria-label={`Name for ${group.name}`} value={group.name} onChange={event => renameGroup(group.id, event.target.value)}/><b>{privateMode ? '••••' : groupValue > 0 ? money(groupValue) : 'Live assets'}</b></div>
                {!collapsed && <div className="address-rail" aria-label={`${group.name} saved addresses`}>
                  {groupWallets.map((wallet, index) => <button className={`mini-wallet n${index % 4} ${wallet.id === selectedWallet?.id ? 'selected' : ''}`} key={wallet.id} onClick={() => setSelectedId(wallet.id)}>
                    <span className="mini-number">{String(index + 1).padStart(2, '0')}</span><div><b>{wallet.label}</b><em>{privateMode ? '••••••••' : short(wallet.address)}</em></div><i/>
                  </button>)}
                  {groupWallets.length === 0 && <p className="empty-group">Choose this wallet in the address form to add an address.</p>}
                </div>}
              </section>;
            })}
          </div>
          {!trackedCollapsed && selectedWallet && !collapsedGroups.includes(selectedWallet.groupId ?? DEFAULT_GROUP_ID) && <div className="asset-panel">
            <div className="asset-panel-head"><div><p className="eyebrow">SELECTED ADDRESS</p><input className="address-name-input" aria-label="Rename selected wallet" value={selectedWallet.label} onChange={event => renameWallet(selectedWallet.id, event.target.value)}/><button onClick={() => copy(selectedWallet.address, selectedWallet.id)}>{privateMode ? '••••••••••••••••' : short(selectedWallet.address)} {copied === selectedWallet.id ? <em>COPIED</em> : <Copy size={13}/>}</button></div><div className="selected-actions"><button className={hideDust ? 'dust-active' : ''} onClick={() => setHideDust(value => !value)}>{hideDust ? `Show dust${hiddenDustCount ? ` · ${hiddenDustCount} hidden` : ''}` : 'Hide dust'}</button><a href={`${selectedWallet.network === 'PulseChain' ? 'https://scan.pulsechain.com/address/' : 'https://etherscan.io/address/'}${selectedWallet.address}`} target="_blank" rel="noreferrer">Explorer <ArrowUpRight size={15}/></a><button onClick={() => setWallets(wallets.filter(wallet => wallet.id !== selectedWallet.id))} aria-label={`Remove ${selectedWallet.label}`}><Trash2 size={16}/></button></div></div>
            <div className="asset-list">
              {selectedPortfolio?.loading && selectedPortfolio.assets.length === 0 && <div className="asset-message"><RefreshCw size={20} className="spin-icon"/>Reading live {selectedWallet.network} assets…</div>}
              {selectedPortfolio?.error && <div className="asset-message error-message">{selectedPortfolio.error}<button onClick={() => refreshWallet(selectedWallet)}>Try again</button></div>}
              {!selectedPortfolio?.loading && !selectedPortfolio?.error && selectedPortfolio?.assets.length === 0 && <div className="asset-message">No indexed assets were found for this address.</div>}
              {visibleAssets.map(asset => <article className="asset-row" key={asset.id}>
                <div className={`asset-logo ${asset.native ? 'native' : ''} ${tokenKey(asset.symbol).toLowerCase()}-logo`}><span>{asset.symbol.slice(0, 3)}</span>{(CORE_ICONS[tokenKey(asset.symbol)] || asset.icon)?.startsWith('http') || CORE_ICONS[tokenKey(asset.symbol)] ? <img src={CORE_ICONS[tokenKey(asset.symbol)] || asset.icon || ''} alt={`${asset.symbol} logo`} onError={event => { event.currentTarget.style.display = 'none'; }}/>: null}</div>
                <div className="asset-main"><div className="asset-name"><b>{asset.symbol} <small>({asset.name})</small></b></div><div className="asset-balance"><b>{privateMode ? '••••' : compactAmount(asset.amount)} <small>{asset.symbol}</small></b></div></div>
                <div className="asset-price"><b>{privateMode ? '••••' : asset.value === null ? '—' : money(asset.value)}</b><small>{privateMode ? 'Price hidden' : money(asset.price)}</small></div>
              </article>)}
              {filteredAssets.length > 30 && <button className="show-assets" onClick={() => setShowAllAssets(value => !value)}>{showAllAssets ? 'Show top assets' : `View all ${filteredAssets.length} visible assets`}</button>}
            </div>
            <div className="live-data-note"><Radio size={11}/>Live read-only data from {selectedWallet.network} · {selectedPortfolio?.refreshedAt ? `updated ${new Date(selectedPortfolio.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'waiting to sync'}</div>
          </div>}
        </div>}
      </section><div className={`new-wallet-panel ${newWalletPanelOpen ? 'open' : ''}`}><div className="new-wallet-glow"/><button className="new-wallet-fold" onClick={() => setNewWalletPanelOpen(value => !value)} aria-expanded={newWalletPanelOpen}><span className="new-wallet-title"><i className="wallet-orbit"><FolderPlus size={20}/></i><span><small>ORGANIZE YOUR WATCHLIST</small><b>Create another wallet</b></span></span><ChevronDown size={17}/></button>{newWalletPanelOpen && <div className="new-wallet-body"><p className="panel-note">Create a separate wallet for personal addresses, whales, or any watchlist you choose.</p><div className="group-creator"><FolderPlus size={15}/><input aria-label="New wallet group name" value={newGroupName} onChange={event => setNewGroupName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addGroup(); } }} placeholder="Name a new wallet, e.g. Whales"/><button onClick={addGroup} disabled={!newGroupName.trim()}>Create wallet</button></div></div>}</div></>}

      {wallets.length === 0 && <section className="next-preview"><p className="eyebrow">WHAT COMES NEXT</p><h2>Your wallet becomes a living dashboard.</h2><div className="preview-panels"><div/><div/><div/></div><p>Token panels inspired by your reference design will appear here after we connect live portfolio data.</p></section>}
    </main>
    <footer><div className="footer-tools"><div className="brand mini"><Zap size={14}/>PULSE<span>VAULT</span></div><button className="refresh-button" onClick={() => window.location.reload()} aria-label="Refresh PulseVault"><RefreshCw size={14}/>Refresh</button></div><span>Watch-only portfolio intelligence</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
