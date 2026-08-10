import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, ArrowUpRight, Calculator, ChartPie, ChevronDown, Copy, Eye, EyeOff, FolderPlus, Languages, LockKeyhole, Network as NetworkIcon, Radio, RefreshCw, ScanSearch, Settings, ShieldCheck, SlidersHorizontal, Trash2, Volume2, VolumeX, WalletCards, X } from 'lucide-react';
import { createChart, IChartApi, ISeriesApi, LineStyle, LineSeries } from 'lightweight-charts';
import './styles.css';

type ChainNetwork = 'PulseChain' | 'Ethereum';
type Network = ChainNetwork | 'Both';
type Language = 'en' | 'fr' | 'es' | 'nl';
type SettingsSection = 'language' | 'network' | 'customize' | 'sound' | null;
type TrackedWallet = { id: string; label: string; address: string; network: Network; groupId?: string };
type WalletGroup = { id: string; name: string };
type Asset = { id: string; symbol: string; name: string; amount: string; price: number | null; value: number | null; icon: string | null; network: ChainNetwork; native?: boolean; decimals?: number };
type Portfolio = { assets: Asset[]; loading: boolean; error: string; refreshedAt: number | null; network: Network };
type HexStake = { id: string; walletId: string; walletLabel: string; walletAddress: string; network: ChainNetwork; stakeId: string; stakedHex: number; lockedDay: number; stakedDays: number; endDay: number; unlockedDay: number; currentDay: number; price: number | null };
type HexEndedStake = { id: string; walletId: string; walletLabel: string; walletAddress: string; network: ChainNetwork; stakeId: string; endedAt: number; stakedHex: number; returnedHex: number; price: number | null };
type HexStakeState = { stakes: HexStake[]; endedStakes: HexEndedStake[]; loading: boolean; error: string; refreshedAt: number | null; network: Network };
type HexCalculatorMetrics = { network: ChainNetwork; shareRate: number; oneTShareHex: number; dailyHexPerTShare: number; price: number | null; sampleDays: number; loading: boolean; error: string };
type TokenStats = {
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  liquidity: number;
  supply: string;
  holders: string;
  loading: boolean;
  error: string;
};
const STORAGE_KEY = 'pulse-vault-private-wallets-v2';
const GROUP_STORAGE_KEY = 'pulse-vault-wallet-groups-v1';
const NETWORK_STORAGE_KEY = 'pulse-vault-active-network-v1';
const LANGUAGE_STORAGE_KEY = 'pulse-vault-language-v1';
const SETTINGS_TRANSPARENCY_STORAGE_KEY = 'pulse-vault-settings-transparency-v1';
const SOUND_STORAGE_KEY = 'pulse-vault-panel-sound-v1';
const DEFAULT_GROUP_ID = 'my-wallet';
const ALLOCATION_COLORS: Record<string, string> = { ETH: '#7868f2', WETH: '#627eea', PLS: '#35d8f2', WPLS: '#35d8f2', HEX: '#ff2ca8', PHEX: '#ff9d00', PLSX: '#00ed94', PRVX: '#a84cff', INC: '#00e6a8', HDRN: '#18c8ff', ICSA: '#f5b942', PDI: '#df48ff', PDA: '#ff8c42', ASIC: '#ffcf40', USDC: '#2775ca' };
const ALLOCATION_FALLBACK_COLORS = ['#ff2ca8', '#8c38ff', '#14d9ff', '#00e6a8', '#ff9d00', '#f85f73'];
const LANGUAGE_OPTIONS: { id: Language; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'es', label: 'Spanish', native: 'Español' },
  { id: 'fr', label: 'French', native: 'Français' },
  { id: 'nl', label: 'Dutch', native: 'Nederlands' },
];
const UI_COPY = {
  en: { hero: 'Wallet portfolio.', privateView: 'One private view.', subtitle: 'Track your PulseChain and Ethereum wallets from one mobile-first, watch-only dashboard.', noConnection: 'No wallet connection', noSeed: 'No seed phrase', builtFor: 'BUILT FOR THE ECOSYSTEM', addAddress: 'ADD AN ADDRESS', enterAddress: 'Enter a public address', privateWatchlist: 'PRIVATE WATCHLIST', trackedWallets: 'Your tracked wallets', reveal: 'Reveal', hide: 'Hide', totalPortfolio: 'TOTAL PORTFOLIO', syncing: 'Syncing…', syncAll: 'Sync all', address: 'address', addresses: 'addresses', showCards: 'Show cards', hideCards: 'Hide cards', liveAssets: 'Live assets', selectedAddress: 'SELECTED ADDRESS', showDust: 'Show dust', hideDust: 'Hide dust', organize: 'ORGANIZE YOUR WATCHLIST', createAnother: 'Create another wallet', createdWallets: 'Created wallets', allocation: 'Portfolio allocation', allocationEyebrow: 'CRYPTOCURRENCY MIX', noAllocation: 'No priced assets are available for this wallet yet.', settings: 'Settings', language: 'Language', refresh: 'Refresh', footer: 'Watch-only portfolio intelligence' },
  fr: { hero: 'Portefeuille crypto.', privateView: 'Une vue privée.', subtitle: 'Suivez vos portefeuilles PulseChain et Ethereum depuis un tableau de bord mobile en lecture seule.', noConnection: 'Aucune connexion wallet', noSeed: 'Aucune phrase secrète', builtFor: 'CONÇU POUR L’ÉCOSYSTÈME', addAddress: 'AJOUTER UNE ADRESSE', enterAddress: 'Saisir une adresse publique', privateWatchlist: 'LISTE PRIVÉE', trackedWallets: 'Vos portefeuilles suivis', reveal: 'Afficher', hide: 'Masquer', totalPortfolio: 'PORTEFEUILLE TOTAL', syncing: 'Synchronisation…', syncAll: 'Tout synchroniser', address: 'adresse', addresses: 'adresses', showCards: 'Afficher les cartes', hideCards: 'Masquer les cartes', liveAssets: 'Actifs en direct', selectedAddress: 'ADRESSE SÉLECTIONNÉE', showDust: 'Afficher la poussière', hideDust: 'Masquer la poussière', organize: 'ORGANISER VOTRE LISTE', createAnother: 'Créer un autre portefeuille', createdWallets: 'Portefeuilles créés', allocation: 'Répartition du portefeuille', allocationEyebrow: 'MIX DE CRYPTOMONNAIES', noAllocation: 'Aucun actif valorisé disponible pour ce portefeuille.', settings: 'Réglages', language: 'Langue', refresh: 'Actualiser', footer: 'Suivi de portefeuille en lecture seule' },
  es: { hero: 'Cartera de criptomonedas.', privateView: 'Una vista privada.', subtitle: 'Sigue tus carteras de PulseChain y Ethereum desde un panel móvil de solo lectura.', noConnection: 'Sin conexión de cartera', noSeed: 'Sin frase semilla', builtFor: 'CREADO PARA EL ECOSISTEMA', addAddress: 'AÑADIR UNA DIRECCIÓN', enterAddress: 'Introduce una dirección pública', privateWatchlist: 'LISTA PRIVADA', trackedWallets: 'Tus carteras seguidas', reveal: 'Mostrar', hide: 'Ocultar', totalPortfolio: 'CARTERA TOTAL', syncing: 'Sincronizando…', syncAll: 'Sincronizar todo', address: 'dirección', addresses: 'direcciones', showCards: 'Mostrar tarjetas', hideCards: 'Ocultar tarjetas', liveAssets: 'Activos en directo', selectedAddress: 'DIRECCIÓN SELECCIONADA', showDust: 'Mostrar polvo', hideDust: 'Ocultar polvo', organize: 'ORGANIZA TU LISTA', createAnother: 'Crear otra cartera', createdWallets: 'Carteras creadas', allocation: 'Distribución de la cartera', allocationEyebrow: 'MEZCLA DE CRIPTOMONEDAS', noAllocation: 'Todavía no hay activos con precio para esta cartera.', settings: 'Ajustes', language: 'Idioma', refresh: 'Actualizar', footer: 'Seguimiento de cartera de solo lectura' },
  nl: { hero: 'Walletportfolio.', privateView: 'Eén privéoverzicht.', subtitle: 'Volg je PulseChain- en Ethereum-wallets in één mobiel, alleen-lezen dashboard.', noConnection: 'Geen walletverbinding', noSeed: 'Geen herstelzin', builtFor: 'GEBOUWD VOOR HET ECOSYSTEEM', addAddress: 'ADRES TOEVOEGEN', enterAddress: 'Voer een openbaar adres in', privateWatchlist: 'PRIVÉVOLGLIJST', trackedWallets: 'Je gevolgde wallets', reveal: 'Tonen', hide: 'Verbergen', totalPortfolio: 'TOTALE PORTFOLIO', syncing: 'Synchroniseren…', syncAll: 'Alles vernieuwen', address: 'adres', addresses: 'adressen', showCards: 'Kaarten tonen', hideCards: 'Kaarten verbergen', liveAssets: 'Live activa', selectedAddress: 'GESELECTEERD ADRES', showDust: 'Dust tonen', hideDust: 'Dust verbergen', organize: 'ORGANISEER JE VOLGLIJST', createAnother: 'Nog een wallet maken', createdWallets: 'Aangemaakte wallets', allocation: 'Portfolioverdeling', allocationEyebrow: 'CRYPTO-MIX', noAllocation: 'Er zijn nog geen activa met prijs beschikbaar voor deze wallet.', settings: 'Instellingen', language: 'Taal', refresh: 'Vernieuwen', footer: 'Alleen-lezen portfolio-inzicht' },
} as const;
const FEATURED_SYMBOLS = new Set(['PLS', 'WPLS', 'ETH', 'WETH', 'PLSX', 'HEX', 'pHEX', 'INC', 'PRVX', 'HDRN', 'ICSA', 'PDI', 'ASIC', 'PDA', 'USDC']);
const HIDDEN_DUST_SYMBOLS = new Set(['FTVC', 'SCIVVE', 'SCIVVI', 'SCIVVII', 'SCIVV', 'HXY']);
const WRAPPED_NATIVE: Record<ChainNetwork, string> = {
  PulseChain: '0xA1077a294dDe1B09bB078844Df40758a5D0f9a27',
  Ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};
const VERIFIED_TOKEN_CONTRACTS: Partial<Record<ChainNetwork, Record<string, string>>> = {
  Ethereum: {
    HEX: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    WETH: WRAPPED_NATIVE.Ethereum,
    HDRN: '0x3819f64f282bf135d62168C1e513280dAF905e06',
    ICSA: '0xfc4913214444af5c715cc9f7b52655e788a569ed',
  },
  PulseChain: {
    HEX: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    WPLS: WRAPPED_NATIVE.PulseChain,
    PLSX: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
    PRVX: '0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11',
    INC: '0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',
    HDRN: '0x3819f64f282bf135d62168C1e513280dAF905e06',
    ICSA: '0xfc4913214444af5c715cc9f7b52655e788a569ed',
  },
};
const RPC_URLS: Record<ChainNetwork, string[]> = {
  PulseChain: [import.meta.env.VITE_PULSECHAIN_RPC_URL || 'https://rpc.pulsechain.com'],
  Ethereum: [import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com'],
};
const GECKO_NETWORK: Record<ChainNetwork, string> = { PulseChain: 'pulsechain', Ethereum: 'eth' };
const ETH_USD_FEED = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';
const HEX_LAUNCH_MS = Date.UTC(2019, 11, 3);
const HEX_STAKE_SELECTORS = { currentDay: '0x5c9302c9', stakeCount: '0x33060d90', stakeLists: '0x2607443b' } as const;
const HEX_CALCULATOR_SELECTORS = { globals: '0xc3124525', dailyDataRange: '0x6a210a0e' } as const;
const HEX_STAKE_END_TOPIC = '0x72d9c5a7ab13846e08d9c838f9e866a1bb4a66a2fd3ba3c9e7da3cf9e394dfd7';
const chartRequestCache = new Map<string, Promise<{ time: number; value: number }[]>>();
let geckoRequestQueue: Promise<unknown> = Promise.resolve();
let lastGeckoRequestAt = 0;
const CORE_ICONS: Record<string, string> = {
  ETH: `${import.meta.env.BASE_URL}token-icons/eth.png`,
  PLS: `${import.meta.env.BASE_URL}token-icons/pls.png`,
  WPLS: `${import.meta.env.BASE_URL}token-icons/pls.png`,
  PLSX: `${import.meta.env.BASE_URL}token-icons/plsx.png`,
  HEX: `${import.meta.env.BASE_URL}token-icons/hex.png`,
  INC: `${import.meta.env.BASE_URL}token-icons/inc.png`,
  PHEX: `${import.meta.env.BASE_URL}token-icons/phex.png`,
  USDC: `${import.meta.env.BASE_URL}token-icons/usdc.png`,
  WETH: `${import.meta.env.BASE_URL}token-icons/eth.png`,
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
    borderGradient: 'linear-gradient(90deg, #627EEA, #8B9FEF)',
  },
  PLS: {
    symbol: 'PLS',
    name: 'PulseChain',
    subtitle: 'Day: 1181',
    contract: '0xA1077a294dDe1B09bB078844Df40758a5D0f9a27',
    network: 'PulseChain',
    color: '#00BFFF',
    borderGradient: 'linear-gradient(90deg, #00BFFF, #8B5CF6, #FF1493, #FF4500)',
  },
  HEX: {
    symbol: 'HEX',
    name: 'HEX',
    subtitle: 'Mining Protocol',
    contract: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    network: 'Ethereum',
    color: '#FF1493',
    borderGradient: 'linear-gradient(90deg, #FF1493, #FF6B35, #FFD700)',
  },
  PLSX: {
    symbol: 'PLSX',
    name: 'PulseX',
    subtitle: 'Buy & Burn',
    contract: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
    network: 'PulseChain',
    color: '#00FF00',
    borderGradient: 'linear-gradient(90deg, #00FF00, #FF0000)',
  },
  PRVX: {
    symbol: 'PRVX',
    name: 'PRVX',
    subtitle: 'ProveX',
    contract: '0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11',
    network: 'PulseChain',
    color: '#FF8C00',
    borderGradient: 'linear-gradient(90deg, #FF8C00, #8B5CF6, #00BFFF)',
  },
  INC: {
    symbol: 'INC',
    name: 'INC',
    subtitle: 'Incentive',
    contract: '0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',
    network: 'PulseChain',
    color: '#00FF00',
    borderGradient: 'linear-gradient(90deg, #00FF00, #00CC00)',
  },
  pHEX: {
    symbol: 'pHEX',
    name: 'HEX on PulseChain',
    subtitle: 'Mining Protocol',
    contract: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    network: 'PulseChain',
    color: '#FF1493',
    borderGradient: 'linear-gradient(90deg, #FF1493, #FF6B35, #FFD700)',
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

function readNetwork(): Network {
  try {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    return saved === 'Ethereum' || saved === 'Both' ? saved : 'PulseChain';
  } catch { return 'PulseChain'; }
}

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'fr' || saved === 'es' || saved === 'nl' ? saved : 'en';
  } catch { return 'en'; }
}

function readSettingsTransparency() {
  try {
    const saved = Number(localStorage.getItem(SETTINGS_TRANSPARENCY_STORAGE_KEY));
    if (saved === 78) return 77;
    return Number.isFinite(saved) && saved >= 35 && saved <= 98 ? saved : 77;
  } catch { return 77; }
}

function readSoundEnabled() {
  try { return localStorage.getItem(SOUND_STORAGE_KEY) === 'true'; }
  catch { return false; }
}

function playPanelChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    const first = context.createOscillator();
    const second = context.createOscillator();
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    first.type = 'sine';
    first.frequency.setValueAtTime(620, now);
    first.frequency.exponentialRampToValueAtTime(760, now + 0.09);
    second.type = 'sine';
    second.frequency.setValueAtTime(930, now + 0.055);
    first.connect(gain); second.connect(gain); gain.connect(context.destination);
    first.start(now); second.start(now + 0.055);
    first.stop(now + 0.18); second.stop(now + 0.2);
    second.addEventListener('ended', () => void context.close(), { once: true });
  } catch { /* Sound feedback is optional when a browser blocks audio. */ }
}

function defaultSelectedWalletId() {
  const savedWallets = readWallets();
  return savedWallets.find(wallet => /^Wallet\s+0*1$/i.test(wallet.label.trim()))?.id ?? savedWallets[0]?.id ?? '';
}

function short(address: string) { return `${address.slice(0, 7)}…${address.slice(-5)}`; }
function tokenKey(symbol: string) { return symbol.toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function validAddress(value: string) { return /^0x[a-fA-F0-9]{40}$/.test(value.trim()); }
function networkLabel(network: Network) { return network === 'Both' ? 'PulseChain + Ethereum' : network; }
function assetContract(asset: Asset) { return asset.id.replace(/^(PulseChain|Ethereum):/, '').toLowerCase(); }
function displayAssetSymbol(asset: Asset) {
  const symbol = tokenKey(asset.symbol);
  const canonicalHex = VERIFIED_TOKEN_CONTRACTS[asset.network]?.HEX.toLowerCase();
  return symbol === 'HEX' && asset.network === 'PulseChain' && assetContract(asset) === canonicalHex ? 'pHEX' : asset.symbol;
}
function isVerifiedCoreAsset(asset: Asset) {
  if (asset.native) return true;
  const expectedContract = VERIFIED_TOKEN_CONTRACTS[asset.network]?.[tokenKey(asset.symbol)];
  return expectedContract ? assetContract(asset) === expectedContract.toLowerCase() : false;
}
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
function compactAmount(value: string, decimals = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(decimals)}B`;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(decimals)}K`;
  return number.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function compactSupply(value: string) {
  return compactAmount(value, 2);
}
function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Price unavailable';
  if (value > 0 && value < 0.01) return `$${value.toPrecision(3)}`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
async function jsonRequest(url: string, timeout = 16000, attempts = 2): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (response.status === 429 && attempt + 1 < attempts) {
        const retrySeconds = Number(response.headers.get('retry-after') ?? 2);
        await new Promise(resolve => window.setTimeout(resolve, Math.max(1500, retrySeconds * 1000)));
        continue;
      }
      if (!response.ok) throw new Error(`Data service returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise(resolve => window.setTimeout(resolve, 700 * (attempt + 1)));
    } finally { window.clearTimeout(timer); }
  }
  throw lastError instanceof Error ? lastError : new Error('Data request failed');
}

function geckoRequest(url: string, timeout = 16000) {
  const request = geckoRequestQueue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastGeckoRequestAt));
    if (wait) await new Promise(resolve => window.setTimeout(resolve, wait));
    lastGeckoRequestAt = Date.now();
    return jsonRequest(url, timeout, 4);
  });
  geckoRequestQueue = request.catch(() => undefined);
  return request;
}

async function rpcRequest<T>(network: ChainNetwork, method: string, params: unknown[], timeout = 12000): Promise<T> {
  let lastError: unknown;
  for (const url of RPC_URLS[network]) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (!response.ok) throw new Error(`RPC returned ${response.status}`);
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message || 'RPC request failed');
      return payload.result as T;
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('RPC request failed');
}

function abiWord(value: string | number) {
  const raw = typeof value === 'number' ? BigInt(value).toString(16) : value.toLowerCase().replace(/^0x/, '');
  return raw.padStart(64, '0');
}

function decodeAbiWords(value: string) {
  return value.replace(/^0x/, '').match(/.{64}/g) ?? [];
}

async function readHexStakes(wallets: TrackedWallet[], selectedNetwork: Network): Promise<{ stakes: HexStake[]; endedStakes: HexEndedStake[]; failed: ChainNetwork[]; historyFailed: ChainNetwork[] }> {
  const chains: ChainNetwork[] = selectedNetwork === 'Both' ? ['Ethereum', 'PulseChain'] : [selectedNetwork];
  const results = await Promise.allSettled(chains.map(async chain => {
    const contract = VERIFIED_TOKEN_CONTRACTS[chain]?.HEX;
    if (!contract) throw new Error(`${chain} HEX contract is unavailable`);
    const priceToken = TOKEN_DATA[chain === 'Ethereum' ? 'HEX' : 'pHEX'];
    const [dayResult, priceResult] = await Promise.allSettled([
      rpcRequest<string>(chain, 'eth_call', [{ to: contract, data: HEX_STAKE_SELECTORS.currentDay }, 'latest']),
      fetchTokenStats(priceToken),
    ]);
    if (dayResult.status !== 'fulfilled') throw dayResult.reason;
    const currentDay = Number(BigInt(dayResult.value));
    const price = priceResult.status === 'fulfilled' && priceResult.value.price > 0 ? priceResult.value.price : null;
    const [walletResults, endedResults] = await Promise.all([
      Promise.allSettled(wallets.map(async wallet => {
      const addressWord = abiWord(wallet.address);
      const countHex = await rpcRequest<string>(chain, 'eth_call', [{ to: contract, data: `${HEX_STAKE_SELECTORS.stakeCount}${addressWord}` }, 'latest']);
      const count = Math.min(Number(BigInt(countHex)), 100);
      const stakeResults = await Promise.allSettled(Array.from({ length: count }, (_, index) =>
        rpcRequest<string>(chain, 'eth_call', [{ to: contract, data: `${HEX_STAKE_SELECTORS.stakeLists}${addressWord}${abiWord(index)}` }, 'latest'])
      ));
      return stakeResults.flatMap((stakeResult, index) => {
        if (stakeResult.status !== 'fulfilled') return [];
        const words = decodeAbiWords(stakeResult.value);
        if (words.length < 7) return [];
        const stakeId = BigInt(`0x${words[0]}`).toString();
        const stakedHex = Number(BigInt(`0x${words[1]}`)) / 1e8;
        const lockedDay = Number(BigInt(`0x${words[3]}`));
        const stakedDays = Number(BigInt(`0x${words[4]}`));
        const unlockedDay = Number(BigInt(`0x${words[5]}`));
        return [{ id: `${chain}-${wallet.id}-${stakeId || index}`, walletId: wallet.id, walletLabel: wallet.label, walletAddress: wallet.address, network: chain, stakeId, stakedHex, lockedDay, stakedDays, endDay: lockedDay + stakedDays, unlockedDay, currentDay, price } satisfies HexStake];
      });
      })),
      (async () => {
        const settled: PromiseSettledResult<HexEndedStake[]>[] = [];
        for (const wallet of wallets) {
          try {
            const explorer = chain === 'Ethereum' ? 'https://eth.blockscout.com' : 'https://api.scan.pulsechain.com';
            const fromBlock = chain === 'Ethereum' ? 0 : 17_233_000;
            const addressTopic = `0x${abiWord(wallet.address)}`;
            const query = new URLSearchParams({ module: 'logs', action: 'getLogs', fromBlock: String(fromBlock), toBlock: 'latest', address: contract, topic0: HEX_STAKE_END_TOPIC, topic1: addressTopic, topic0_1_opr: 'and', page: '1', offset: '1000' });
            const payload = await jsonRequest(`${explorer}/api?${query.toString()}`, chain === 'PulseChain' ? 30000 : 18000, 2);
            const logs = Array.isArray(payload?.result) ? payload.result : [];
            const ended = logs.flatMap((log: any, index: number) => {
              const words = decodeAbiWords(String(log.data ?? ''));
              if (words.length < 2) return [];
              const data0 = BigInt(`0x${words[0]}`);
              const data1 = BigInt(`0x${words[1]}`);
              const mask40 = (1n << 40n) - 1n;
              const mask72 = (1n << 72n) - 1n;
              const endedAt = Number(data0 & mask40);
              const stakedHex = Number((data0 >> 40n) & mask72) / 1e8;
              const payoutHex = Number((data0 >> 184n) & mask72) / 1e8;
              const penaltyHex = Number(data1 & mask72) / 1e8;
              const returnedHex = Math.max(0, stakedHex + payoutHex - penaltyHex);
              const stakeId = log.topics?.[2] ? BigInt(log.topics[2]).toString() : String(index + 1);
              return [{ id: `${chain}-${wallet.id}-ended-${stakeId}-${endedAt}`, walletId: wallet.id, walletLabel: wallet.label, walletAddress: wallet.address, network: chain, stakeId, endedAt, stakedHex, returnedHex, price } satisfies HexEndedStake];
            });
            settled.push({ status: 'fulfilled', value: ended });
          } catch (reason) {
            settled.push({ status: 'rejected', reason });
          }
          if (wallets.length > 1) await new Promise(resolve => window.setTimeout(resolve, 250));
        }
        return settled;
      })(),
    ]);
    return {
      stakes: walletResults.flatMap(result => result.status === 'fulfilled' ? result.value : []),
      endedStakes: endedResults.flatMap(result => result.status === 'fulfilled' ? result.value : []),
      historyFailed: endedResults.some(result => result.status === 'rejected'),
    };
  }));
  return {
    stakes: results.flatMap(result => result.status === 'fulfilled' ? result.value.stakes : []).sort((left, right) => left.endDay - right.endDay),
    endedStakes: results.flatMap(result => result.status === 'fulfilled' ? result.value.endedStakes : []).sort((left, right) => right.endedAt - left.endedAt),
    failed: results.flatMap((result, index) => result.status === 'rejected' ? [chains[index]] : []),
    historyFailed: results.flatMap((result, index) => result.status === 'fulfilled' && result.value.historyFailed ? [chains[index]] : []),
  };
}

function hexQuantityToUnits(value: string, decimals = 18) {
  try { return formatUnits(BigInt(value).toString(), decimals); } catch { return '0'; }
}

async function readRpcBalances(address: string, network: ChainNetwork, assets: Asset[]) {
  const nativeBalance = rpcRequest<string>(network, 'eth_getBalance', [address, 'latest']);
  const addressWord = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const tokenAssets = assets.filter(asset => !asset.native && validAddress(asset.id)).slice(0, 40);
  const tokenBalances = Promise.allSettled(tokenAssets.map(asset =>
    rpcRequest<string>(network, 'eth_call', [{ to: asset.id, data: `0x70a08231${addressWord}` }, 'latest'])
  ));
  const [nativeResult, tokenResults] = await Promise.allSettled([nativeBalance, tokenBalances]);
  const rpcAmounts = new Map<string, string>();
  if (nativeResult.status === 'fulfilled') rpcAmounts.set('native', hexQuantityToUnits(nativeResult.value));
  if (tokenResults.status === 'fulfilled') tokenResults.value.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const rpcAmount = hexQuantityToUnits(result.value, tokenAssets[index].decimals ?? 18);
    if (Number.isFinite(Number(rpcAmount))) rpcAmounts.set(tokenAssets[index].id.toLowerCase(), rpcAmount);
  });
  return assets.map(asset => {
    const amount = rpcAmounts.get(asset.native ? 'native' : asset.id.toLowerCase()) ?? asset.amount;
    return { ...asset, amount, value: asset.price === null ? null : Number(amount) * asset.price };
  });
}

async function ethereumOraclePrice() {
  try {
    const result = await rpcRequest<string>('Ethereum', 'eth_call', [{ to: ETH_USD_FEED, data: '0xfeaf968c' }, 'latest']);
    const words = result.replace(/^0x/, '').match(/.{64}/g) ?? [];
    if (words.length < 2) return null;
    const answer = Number(BigInt(`0x${words[1]}`)) / 1e8;
    return answer > 0 && Number.isFinite(answer) ? answer : null;
  } catch { return null; }
}

async function enrichMarketAssets(assets: Asset[], network: ChainNetwork) {
  const chainId = network === 'PulseChain' ? 'pulsechain' : 'ethereum';
  const prioritized = [...assets.filter(asset => FEATURED_SYMBOLS.has(tokenKey(asset.symbol))), ...assets];
  const unique = prioritized.filter((asset, index, list) => list.findIndex(item => item.id.toLowerCase() === asset.id.toLowerCase()) === index).slice(0, 30);
  const enriched = new Map<string, { price: number; icon: string | null }>();
  const contracts = unique.map(asset => ({ asset, contract: asset.native ? WRAPPED_NATIVE[network] : asset.id })).filter(item => validAddress(item.contract));
  try {
    const data = await jsonRequest(`https://api.dexscreener.com/latest/dex/tokens/${contracts.map(item => item.contract).join(',')}`, 10000);
    const pairs = (Array.isArray(data.pairs) ? data.pairs : []).filter((pair: any) => pair.chainId === chainId && Number(pair.priceUsd) > 0);
    for (const item of contracts) {
      const pair = pairs.filter((candidate: any) => candidate.baseToken?.address?.toLowerCase() === item.contract.toLowerCase())
        .sort((left: any, right: any) => Number(right.liquidity?.usd ?? 0) - Number(left.liquidity?.usd ?? 0))[0];
      if (pair) enriched.set(item.asset.id, { price: Number(pair.priceUsd), icon: typeof pair.info?.imageUrl === 'string' ? pair.info.imageUrl : null });
    }
  } catch { /* GeckoTerminal is the next DEX-data source. */ }
  const missing = contracts.filter(item => !enriched.has(item.asset.id));
  if (missing.length) {
    try {
      const data = await geckoRequest(`https://api.geckoterminal.com/api/v2/simple/networks/${GECKO_NETWORK[network]}/token_price/${missing.map(item => item.contract).join(',')}`, 10000);
      const prices = data?.data?.attributes?.token_prices ?? {};
      for (const item of missing) {
        const price = Number(prices[item.contract.toLowerCase()] ?? prices[item.contract]);
        if (price > 0) enriched.set(item.asset.id, { price, icon: null });
      }
    } catch { /* Keep explorer price, or show unavailable, if both DEX sources fail. */ }
  }
  if (network === 'Ethereum') {
    const oraclePrice = await ethereumOraclePrice();
    if (oraclePrice) {
      unique.filter(asset => asset.native || assetContract(asset) === WRAPPED_NATIVE.Ethereum.toLowerCase()).forEach(asset => {
        enriched.set(asset.id, { price: oraclePrice, icon: enriched.get(asset.id)?.icon ?? null });
      });
    }
  }
  const wrappedContract = WRAPPED_NATIVE[network].toLowerCase();
  const nativeAndWrapped = unique.filter(asset => asset.native || assetContract(asset) === wrappedContract);
  const sharedNativePrice = nativeAndWrapped.map(asset => enriched.get(asset.id)?.price).find(price => typeof price === 'number' && price > 0);
  if (sharedNativePrice) {
    nativeAndWrapped.forEach(asset => enriched.set(asset.id, { price: sharedNativePrice, icon: enriched.get(asset.id)?.icon ?? null }));
  }
  return assets.map(asset => {
    const market = enriched.get(asset.id);
    if (!market) return asset;
    return { ...asset, price: market.price, value: Number(asset.amount) * market.price, icon: market.icon || asset.icon };
  }).sort((left, right) => (right.value ?? -1) - (left.value ?? -1));
}

async function loadChainPortfolio(address: string, network: ChainNetwork): Promise<Asset[]> {
  const base = network === 'PulseChain' ? 'https://api.scan.pulsechain.com' : 'https://eth.blockscout.com';
  const nativeSymbol = network === 'PulseChain' ? 'PLS' : 'ETH';
  const nativeName = network === 'PulseChain' ? 'PulseChain' : 'Ethereum';
  const nativeRpc = rpcRequest<string>(network, 'eth_getBalance', [address, 'latest']).catch(() => null);
  const [addressResult, tokenResult, nativeResult] = await Promise.allSettled([
    jsonRequest(`${base}/api/v2/addresses/${address}`),
    jsonRequest(`${base}/api/v2/addresses/${address}/token-balances`),
    nativeRpc,
  ]);
  const addressData = addressResult.status === 'fulfilled' ? addressResult.value : null;
  const rpcHex = nativeResult.status === 'fulfilled' ? nativeResult.value : null;
  const nativeAmount = rpcHex ? hexQuantityToUnits(rpcHex, 18) : formatUnits(String(addressData?.coin_balance ?? '0'), 18);
  const indexedNativePrice = addressData?.exchange_rate;
  const nativePrice = indexedNativePrice === null || indexedNativePrice === undefined ? null : Number(indexedNativePrice);
  const assets: Asset[] = [{ id: `${network}-native`, symbol: nativeSymbol, name: nativeName, amount: nativeAmount, price: nativePrice, value: nativePrice === null ? null : Number(nativeAmount) * nativePrice, icon: null, network, native: true, decimals: 18 }];

  if (tokenResult.status === 'fulfilled') {
    for (const item of Array.isArray(tokenResult.value) ? tokenResult.value : []) {
      const token = item.token ?? {};
      if (token.type && token.type !== 'ERC-20') continue;
      const decimals = Number(token.decimals ?? 18);
      const amount = formatUnits(String(item.value ?? '0'), Number.isFinite(decimals) ? decimals : 18);
      if (Number(amount) === 0) continue;
      const price = token.exchange_rate === null || token.exchange_rate === undefined ? null : Number(token.exchange_rate);
      assets.push({ id: token.address_hash ?? token.address ?? `${token.symbol}-${assets.length}`, symbol: token.symbol || 'TOKEN', name: token.name || 'Unknown token', amount, price, value: price === null ? null : Number(amount) * price, icon: token.icon_url || null, network, decimals: Number.isFinite(decimals) ? decimals : 18 });
    }
  } else {
    try {
      const tokensData = await jsonRequest(`${base}/api?module=account&action=tokenlist&address=${address}`);
      for (const token of Array.isArray(tokensData.result) ? tokensData.result : []) {
        const decimals = Number(token.decimals ?? 18);
        const amount = formatUnits(String(token.balance ?? '0'), Number.isFinite(decimals) ? decimals : 18);
        if (Number(amount) === 0) continue;
        assets.push({ id: token.contractAddress ?? `${token.symbol}-${assets.length}`, symbol: token.symbol || 'TOKEN', name: token.name || 'Unknown token', amount, price: null, value: null, icon: null, network, decimals: Number.isFinite(decimals) ? decimals : 18 });
      }
    } catch { /* Native RPC value still renders when token discovery is unavailable. */ }
  }
  return enrichMarketAssets(await readRpcBalances(address, network, assets), network);
}

async function loadPortfolio(wallet: TrackedWallet): Promise<Asset[]> {
  if (wallet.network !== 'Both') return loadChainPortfolio(wallet.address, wallet.network);
  const chainResults = await Promise.allSettled([
    loadChainPortfolio(wallet.address, 'PulseChain'),
    loadChainPortfolio(wallet.address, 'Ethereum'),
  ]);
  const networks: ChainNetwork[] = ['PulseChain', 'Ethereum'];
  const combined = chainResults.flatMap((result, index) => result.status === 'fulfilled'
    ? result.value.map(asset => ({ ...asset, id: `${networks[index]}:${asset.id}` }))
    : []);
  if (!combined.length) throw new Error('Both network portfolio requests failed.');
  return combined.sort((left, right) => (right.value ?? -1) - (left.value ?? -1));
}

async function fetchTokenStats(token: TokenInfo): Promise<TokenStats> {
  try {
    const baseExplorer = token.network === 'PulseChain' ? 'https://api.scan.pulsechain.com' : 'https://eth.blockscout.com';
    
    // Fetch token data from blockchain for supply and holders
    const tokenData = await jsonRequest(`${baseExplorer}/api/v2/tokens/${token.contract}`, 10000);
    
    if (!tokenData) {
      return { price: 0, change24h: 0, change7d: 0, change30d: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: false, error: 'Token not found' };
    }

    // Get supply and holders from blockchain
    let supply = 'N/A';
    let holders = 'N/A';
    
    if (tokenData.total_supply) {
      const decimals = tokenData.decimals ?? 18;
      const formatted = formatUnits(String(tokenData.total_supply), decimals);
      supply = compactSupply(formatted);
    }
    
    if (tokenData.holders) {
      const holderCount = Number(tokenData.holders);
      holders = holderCount >= 1000 ? compactAmount(String(holderCount), 1) : holderCount.toLocaleString();
    }
    
    // USD price order: on-chain oracle, DEX-derived data, then CoinGecko last.
    let price = 0;
    let liquidity = 0;
    let marketCap = 0;
    let change24h = 0;
    let change7d = 0;
    let change30d = 0;
    
    const oraclePrice = token.symbol === 'ETH' ? await ethereumOraclePrice() : null;
    try {
      const chainId = token.network === 'PulseChain' ? 'pulsechain' : 'ethereum';
      const dexData = await jsonRequest(`https://api.dexscreener.com/latest/dex/tokens/${token.contract}`, 10000);
      const pairs = (Array.isArray(dexData.pairs) ? dexData.pairs : []).filter((pair: any) => 
        pair.chainId === chainId && 
        pair.baseToken?.address?.toLowerCase() === token.contract.toLowerCase() && 
        Number(pair.priceUsd) > 0
      );
      const pair = pairs.sort((left: any, right: any) => Number(right.liquidity?.usd ?? 0) - Number(left.liquidity?.usd ?? 0))[0];
      
      if (pair) {
        price = Number(pair.priceUsd);
        liquidity = Number(pair.liquidity?.usd ?? 0);
        const fdv = Number(pair.fdv ?? 0);
        marketCap = fdv > 0 ? fdv : liquidity * 10;
        change24h = Number(pair.priceChange?.h24 ?? 0);
      }
    } catch { /* GeckoTerminal is the next DEX-data source. */ }
    if (oraclePrice) price = oraclePrice;
    if (price === 0) {
      try {
        const chain = token.network === 'Ethereum' ? 'eth' : 'pulsechain';
        const gtData = await geckoRequest(`https://api.geckoterminal.com/api/v2/simple/networks/${chain}/token_price/${token.contract}`, 10000);
        price = Number(gtData?.data?.attributes?.token_prices?.[token.contract.toLowerCase()] ?? 0);
      } catch { /* CoinGecko is the final fallback. */ }
    }
    if (price === 0) {
      try {
        const coinGeckoIds: Record<string, string> = { ETH: 'ethereum', PLS: 'pulsechain', HEX: 'hex', pHEX: 'hex', PLSX: 'pulsex', PRVX: 'provex', INC: 'incentive' };
        const coinId = coinGeckoIds[token.symbol];
        if (coinId) {
          const cgData = await jsonRequest(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`, 10000);
          price = Number(cgData?.[coinId]?.usd ?? 0);
          marketCap = Number(cgData?.[coinId]?.usd_market_cap ?? marketCap);
          change24h = Number(cgData?.[coinId]?.usd_24h_change ?? change24h);
        }
      } catch { /* Keep the price unavailable instead of inventing one. */ }
    }
    
    if (marketCap === 0 && price > 0 && tokenData.total_supply) {
      const decimals = tokenData.decimals ?? 18;
      const supplyNum = Number(formatUnits(String(tokenData.total_supply), decimals));
      marketCap = price * supplyNum;
    }

    change7d = change24h;
    change30d = change24h;
    
    return { 
      price, 
      change24h, 
      change7d,
      change30d,
      marketCap: marketCap / 1000000,
      liquidity: liquidity / 1000000,
      supply, 
      holders, 
      loading: false, 
      error: '' 
    };
  } catch (e) {
    console.log('fetchTokenStats error:', e);
    return { price: 0, change24h: 0, change7d: 0, change30d: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: false, error: 'Failed to load' };
  }
}

async function fetchDefiLlamaChart(token: TokenInfo, period: string, cutoff: number) {
  if (period === '24H') return [];
  try {
    const chain = token.network === 'Ethereum' ? 'ethereum' : 'pulsechain';
    const coin = `${chain}:${token.contract}`;
    const ranges: Record<string, { span: number; interval: string; width: string }> = {
      '7D': { span: 168, interval: '1h', width: '2h' },
      '30D': { span: 180, interval: '4h', width: '6h' },
      '3M': { span: 180, interval: '12h', width: '12h' },
      '6M': { span: 180, interval: '1d', width: '12h' },
      '1Y': { span: 365, interval: '1d', width: '12h' },
      ATL: { span: 500, interval: '1w', width: '3d' },
      All: { span: 500, interval: '1w', width: '3d' },
    };
    const range = ranges[period];
    if (!range) return [];
    const data = await jsonRequest(`https://coins.llama.fi/chart/${coin}?start=${cutoff}&span=${range.span}&period=${range.interval}&searchWidth=${range.width}`, 20000);
    const coinData = data?.coins?.[coin] ?? Object.values(data?.coins ?? {})[0] as any;
    return (Array.isArray(coinData?.prices) ? coinData.prices : [])
      .map((point: any) => ({ time: Number(point.timestamp), value: Number(point.price) }))
      .filter((point: { time: number; value: number }) => point.time >= cutoff && point.value > 0)
      .sort((left: { time: number }, right: { time: number }) => left.time - right.time);
  } catch { return []; }
}

async function fetchDexPoolChart(token: TokenInfo, period: string, cutoff: number) {
  const network: ChainNetwork = token.network === 'Ethereum' ? 'Ethereum' : 'PulseChain';
  try {
    const poolsData = await geckoRequest(`https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK[network]}/tokens/${token.contract}/pools?page=1`, 15000);
    const pools = Array.isArray(poolsData?.data) ? poolsData.data.slice(0, 3) : [];
    const timeframe = period === '24H' ? 'minute' : period === '7D' || period === '30D' ? 'hour' : 'day';
    const aggregate = period === '24H' ? 15 : period === '30D' ? 4 : 1;
    const limitMap: Record<string, number> = { '24H': 96, '7D': 168, '30D': 180, '3M': 100, '6M': 190, '1Y': 370, ATL: 1000, All: 1000 };
    // The keyless pool endpoint is rate-limited and serves six months per page.
    // Four pages cover two years for unlisted tokens without leaving the UI stuck.
    const maxPages = period === '1Y' ? 2 : period === 'ATL' || period === 'All' ? 4 : 1;
    let best: { time: number; value: number }[] = [];
    for (const pool of pools) {
      const poolAddress = pool?.attributes?.address || String(pool?.id || '').split('_').pop();
      if (!validAddress(poolAddress || '')) continue;
      // Passing the contract itself is unambiguous even when pool metadata uses
      // provider-specific relationship IDs instead of an address suffix.
      const tokenSide = token.contract;
      const poolPoints = new Map<number, number>();
      let beforeTimestamp: number | null = null;
      try {
        for (let page = 0; page < maxPages; page += 1) {
          const before = beforeTimestamp ? `&before_timestamp=${beforeTimestamp}` : '';
          const ohlcv = await geckoRequest(`https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK[network]}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limitMap[period] || 180}&currency=usd&token=${tokenSide}${before}`, 15000);
          const candles = Array.isArray(ohlcv?.data?.attributes?.ohlcv_list) ? ohlcv.data.attributes.ohlcv_list : [];
          if (!candles.length) break;
          for (const candle of candles) {
            const time = Number(candle[0]);
            const value = Number(candle[4]);
            if (time >= cutoff && value > 0) poolPoints.set(time, value);
          }
          const oldest = Math.min(...candles.map((candle: any[]) => Number(candle[0])));
          const paginationStalled = beforeTimestamp !== null && oldest >= beforeTimestamp;
          if (!Number.isFinite(oldest) || oldest <= cutoff || paginationStalled) break;
          beforeTimestamp = oldest - 1;
          await new Promise(resolve => window.setTimeout(resolve, 250));
        }
        const points = [...poolPoints].map(([time, value]) => ({ time, value })).sort((left, right) => left.time - right.time);
        if (points.length > best.length || (points[0]?.time ?? Infinity) < (best[0]?.time ?? Infinity)) best = points;
        if (points.length >= 2) return points;
      } catch { /* Try the next liquid pool. */ }
    }
    return best;
  } catch { /* fall through */ }
  return [];
}

async function fetchChartOHLCVUncached(token: TokenInfo, period: string): Promise<{ time: number; value: number }[]> {
  const now = Math.floor(Date.now() / 1000);
  const periodSeconds: Record<string, number> = { '24H': 86400, '7D': 604800, '30D': 2592000, '3M': 7776000, '6M': 15552000, '1Y': 31536000, 'ATL': 315360000, 'All': 315360000 };
  const cutoff = now - (periodSeconds[period] || 2592000);

  // Long ranges use contract-address history first; short ranges use pool-swap OHLCV.
  const broadHistory = await fetchDefiLlamaChart(token, period, cutoff);
  if (broadHistory.length >= 2) return broadHistory;
  const dexHistory = await fetchDexPoolChart(token, period, cutoff);
  if (dexHistory.length >= 2) return dexHistory;

  // Final fallback for listed coins. Public access is intentionally capped at one year.
  try {
    const coinGeckoIds: Record<string, string> = {
      ETH: 'ethereum', PLS: 'pulsechain', HEX: 'hex', pHEX: 'hex', PLSX: 'pulsex', PRVX: 'provex', INC: 'incentive',
    };
    const coinId = coinGeckoIds[token.symbol];
    if (!coinId) return [];
    const periodDays: Record<string, number> = { '24H': 1, '7D': 7, '30D': 30, '3M': 90, '6M': 180, '1Y': 365 };
    const days = periodDays[period] || 30;
    const data = await jsonRequest(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`, 15000);
    if (!data?.prices) return [];
    return data.prices
      .map((p: any) => ({ time: Math.floor(p[0] / 1000), value: Number(p[1]) }))
      .filter((d: { time: number; value: number }) => d.value > 0);
  } catch {
    return [];
  }
}

function fetchChartOHLCV(token: TokenInfo, period: string) {
  const key = `${token.network}:${token.contract.toLowerCase()}:${period}`;
  const cached = chartRequestCache.get(key);
  if (cached) return cached;
  const request = fetchChartOHLCVUncached(token, period).then(data => {
    if (data.length < 2) chartRequestCache.delete(key);
    return data;
  }).catch(error => {
    chartRequestCache.delete(key);
    throw error;
  });
  chartRequestCache.set(key, request);
  return request;
}

function percentFromSeries(data: { time: number; value: number }[]): number {
  if (data.length < 2) return 0;
  const first = data[0].value;
  const last = data[data.length - 1].value;
  if (!(first > 0) || !Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return ((last - first) / first) * 100;
}

function fallbackPercentage(stats: TokenStats | undefined, period: string): number | null {
  if (!stats) return null;
  if (period === '24H') return stats.change24h;
  if (period === '7D') return stats.change7d;
  if (period === '30D') return stats.change30d;
  return null;
}

async function readHexCalculatorMetrics(network: ChainNetwork): Promise<Omit<HexCalculatorMetrics, 'loading' | 'error'>> {
  const contract = VERIFIED_TOKEN_CONTRACTS[network]?.HEX;
  if (!contract) throw new Error(`${network} HEX contract is unavailable`);
  const priceToken = TOKEN_DATA[network === 'Ethereum' ? 'HEX' : 'pHEX'];
  const [dayHex, globalsHex, priceResult] = await Promise.all([
    rpcRequest<string>(network, 'eth_call', [{ to: contract, data: HEX_STAKE_SELECTORS.currentDay }, 'latest']),
    rpcRequest<string>(network, 'eth_call', [{ to: contract, data: HEX_CALCULATOR_SELECTORS.globals }, 'latest']),
    fetchTokenStats(priceToken).catch(() => null),
  ]);
  const currentDay = Number(BigInt(dayHex));
  const globals = decodeAbiWords(globalsHex);
  if (globals.length < 3) throw new Error('HEX share rate was not returned by the contract');
  const shareRate = Number(BigInt(`0x${globals[2]}`));
  if (!(shareRate > 0)) throw new Error('HEX share rate is unavailable');
  const beginDay = Math.max(0, currentDay - 30);
  const rangeData = `${HEX_CALCULATOR_SELECTORS.dailyDataRange}${abiWord(beginDay)}${abiWord(currentDay)}`;
  const rangeHex = await rpcRequest<string>(network, 'eth_call', [{ to: contract, data: rangeData }, 'latest']);
  const rangeWords = decodeAbiWords(rangeHex);
  const length = rangeWords.length > 1 ? Math.min(Number(BigInt(`0x${rangeWords[1]}`)), rangeWords.length - 2) : 0;
  const mask72 = (1n << 72n) - 1n;
  const dailyRates = rangeWords.slice(2, 2 + length).flatMap(word => {
    const packed = BigInt(`0x${word}`);
    const payoutHearts = packed & mask72;
    const stakeShares = (packed >> 72n) & mask72;
    if (payoutHearts === 0n || stakeShares === 0n) return [];
    return [Number(payoutHearts) * 1e4 / Number(stakeShares)];
  }).filter(rate => Number.isFinite(rate) && rate > 0);
  if (!dailyRates.length) throw new Error('Recent HEX payout data is unavailable');
  return {
    network,
    shareRate,
    oneTShareHex: shareRate / 10,
    dailyHexPerTShare: dailyRates.reduce((total, rate) => total + rate, 0) / dailyRates.length,
    price: priceResult && priceResult.price > 0 ? priceResult.price : null,
    sampleDays: dailyRates.length,
  };
}

function calculateHexStake(amountHex: number, days: number, metrics: HexCalculatorMetrics) {
  if (!(amountHex > 0) || !(days > 0) || !(metrics.shareRate > 0)) return null;
  const hearts = BigInt(Math.round(amountHex * 1e8));
  const cappedExtraDays = BigInt(Math.min(Math.max(days - 1, 0), 3640));
  const maxHearts = 150_000_000n * 100_000_000n;
  const cappedHearts = hearts < maxHearts ? hearts : maxHearts;
  const lpb = 1820n;
  const bpb = maxHearts * 10n;
  const bonusHearts = hearts * (cappedExtraDays * bpb + cappedHearts * lpb) / (lpb * bpb);
  const stakeShares = (hearts + bonusHearts) * 100_000n / BigInt(Math.round(metrics.shareRate));
  const tShares = Number(stakeShares) / 1e12;
  const estimatedYield = tShares * metrics.dailyHexPerTShare * days;
  return {
    tShares,
    bonusPercent: Number(bonusHearts) / Number(hearts) * 100,
    estimatedYield,
    estimatedReturn: amountHex + estimatedYield,
  };
}

function HexStakesPanel({ state, open, filter, network, walletCount, privateMode, onToggle, onFilter, onNetwork, onRefresh }: { state: HexStakeState; open: boolean; filter: 'all' | 'active' | 'matured'; network: Network; walletCount: number; privateMode: boolean; onToggle: () => void; onFilter: (filter: 'all' | 'active' | 'matured') => void; onNetwork: (network: Network) => void; onRefresh: () => void }) {
  const isMatured = (stake: HexStake) => stake.currentDay >= stake.endDay;
  const activeCount = state.stakes.filter(stake => !isMatured(stake)).length;
  const maturedCount = state.stakes.length - activeCount;
  const visibleStakes = state.stakes.filter(stake => filter === 'all' || (filter === 'matured' ? isMatured(stake) : !isMatured(stake)));
  const totalHex = state.stakes.reduce((total, stake) => total + stake.stakedHex, 0);
  const totalValue = state.stakes.reduce((total, stake) => total + (stake.price === null ? 0 : stake.stakedHex * stake.price), 0);
  const hasPricedStake = state.stakes.some(stake => stake.price !== null);
  const totalUnstakedHex = state.endedStakes.reduce((total, stake) => total + stake.returnedHex, 0);
  const totalUnstakedValue = state.endedStakes.reduce((total, stake) => total + (stake.price === null ? 0 : stake.returnedHex * stake.price), 0);
  const hasPricedUnstaked = state.endedStakes.some(stake => stake.price !== null);
  const stakingAddresses = [...state.stakes, ...state.endedStakes].reduce((addresses, stake) => {
    const existing = addresses.get(stake.walletId) ?? { walletId: stake.walletId, label: stake.walletLabel, address: stake.walletAddress, networks: new Set<ChainNetwork>(), open: 0, ended: 0 };
    existing.networks.add(stake.network);
    if ('endDay' in stake) existing.open += 1;
    else existing.ended += 1;
    addresses.set(stake.walletId, existing);
    return addresses;
  }, new Map<string, { walletId: string; label: string; address: string; networks: Set<ChainNetwork>; open: number; ended: number }>());
  const dateLabel = (day: number) => new Date(HEX_LAUNCH_MS + day * 86_400_000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const timestampLabel = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return <section className={`hex-stakes-panel ${open ? 'open' : ''}`}>
    <button className="hex-stakes-fold" type="button" onClick={onToggle} aria-expanded={open}>
      <span className="hex-stakes-title"><i className="hex-stakes-orbit"><img src={CORE_ICONS.HEX} alt="HEX logo"/></i><span><small>STAKE MATURITY</small><b>HEX Stakes</b></span></span><ChevronDown size={17}/>
    </button>
    {open && <div className="hex-stakes-body">
      <div className="hex-stakes-scope"><span><b>All wallets</b><small>{walletCount} {walletCount === 1 ? 'address' : 'addresses'} · {networkLabel(state.network)}</small></span><button type="button" className={state.loading ? 'loading' : ''} onClick={onRefresh} disabled={state.loading} aria-label="Refresh HEX stakes"><RefreshCw size={15}/>{state.loading ? 'Reading' : 'Refresh'}</button></div>
      <div className="hex-stakes-network-switch" role="group" aria-label="HEX stakes network">{(['Ethereum', 'PulseChain', 'Both'] as Network[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => onNetwork(option)}>{option === 'Both' ? 'Both networks' : option}</button>)}</div>
      {state.loading && state.stakes.length === 0 && state.endedStakes.length === 0 ? <div className="hex-stakes-empty"><RefreshCw size={18} className="spin-icon"/>Reading live and historical HEX stake contracts…</div> : <>
        <div className="hex-stakes-summary"><div><small>CURRENTLY STAKED</small><strong>{privateMode ? '••••' : hasPricedStake ? money(totalValue) : 'Price unavailable'}</strong><em>{privateMode ? '••••' : `${compactAmount(String(totalHex), 2)} HEX principal`}</em></div><div className="unstaked-total"><small>UNSTAKED / RETURNED</small><strong>{privateMode ? '••••' : hasPricedUnstaked ? money(totalUnstakedValue) : state.endedStakes.length ? 'Price unavailable' : '$0.00'}</strong><em>{privateMode ? '••••' : `${compactAmount(String(totalUnstakedHex), 2)} HEX · ${state.endedStakes.length} ended`}</em></div></div>
        <div className="hex-staking-addresses"><div className="hex-subheading"><span><b>Staking addresses</b><small>Addresses with open or ended HEX stakes</small></span><em>{stakingAddresses.size}</em></div>{stakingAddresses.size ? <div className="hex-address-list">{[...stakingAddresses.values()].map(item => <article key={item.walletId}><div><span><b>{item.label}</b>{[...item.networks].map(chain => <em className={chain === 'Ethereum' ? 'ethereum' : 'pulsechain'} key={chain}>{chain === 'Ethereum' ? 'ETH' : 'PLS'}</em>)}</span><code title={item.address}>{privateMode ? '••••••••••••••••••••' : item.address}</code></div><small>{item.open} open · {item.ended} unstaked</small></article>)}</div> : <div className="hex-address-empty">No staking addresses found on {networkLabel(network)}.</div>}</div>
        <div className="hex-stakes-filters" role="group" aria-label="Filter HEX stakes">{([['all', `All ${state.stakes.length}`], ['active', `Active ${activeCount}`], ['matured', `Matured ${maturedCount}`]] as const).map(([id, label]) => <button key={id} type="button" className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => onFilter(id)}>{label}</button>)}</div>
        {state.error && <div className="hex-stakes-warning">{state.error}</div>}
        {visibleStakes.length > 0 ? <div className="hex-stakes-list">{visibleStakes.map(stake => {
          const matured = isMatured(stake);
          const daysRemaining = Math.max(stake.endDay - stake.currentDay, 0);
          const progress = Math.max(0, Math.min(100, ((stake.currentDay - stake.lockedDay) / Math.max(stake.stakedDays, 1)) * 100));
          const symbol = stake.network === 'PulseChain' ? 'pHEX' : 'HEX';
          return <article className={`hex-stake-card ${matured ? 'matured' : ''}`} key={stake.id}>
            <div className="hex-stake-card-head"><span><img src={CORE_ICONS[tokenKey(symbol)]} alt={`${symbol} logo`}/><span><small>{stake.walletLabel} · {stake.network}</small><b>{privateMode ? '••••' : compactAmount(String(stake.stakedHex), 2)} {symbol}</b></span></span><em>{matured ? 'Matured / ready' : `${daysRemaining.toLocaleString()} days left`}</em></div>
            <div className="hex-stake-value"><span><small>{matured ? 'Term reached' : 'Matures'}</small><b>{dateLabel(stake.endDay)}</b></span><span><small>Principal at current price</small><b>{privateMode ? '••••' : stake.price === null ? 'Price unavailable' : money(stake.stakedHex * stake.price)}</b></span></div>
            <div className="hex-stake-progress"><i style={{ width: `${progress}%` }}/></div>
            <div className="hex-stake-meta"><span>Stake #{stake.stakeId}</span><span>{stake.stakedDays.toLocaleString()} day term</span>{stake.unlockedDay > 0 && <span>Good accounted</span>}</div>
          </article>;
        })}</div> : <div className="hex-stakes-empty">{state.stakes.length ? `No ${filter} stakes in this view.` : `No open or matured HEX stakes found across ${walletCount} ${walletCount === 1 ? 'address' : 'addresses'} on ${networkLabel(state.network)}.`}</div>}
        {state.endedStakes.length > 0 && <div className="hex-ended-history"><div className="hex-subheading"><span><b>Recently unstaked</b><small>HEX returned after payout and penalty</small></span><em>{state.endedStakes.length}</em></div><div>{state.endedStakes.slice(0, 8).map(stake => { const symbol = stake.network === 'PulseChain' ? 'pHEX' : 'HEX'; return <article key={stake.id}><img src={CORE_ICONS[tokenKey(symbol)]} alt={`${symbol} logo`}/><span><small>{stake.walletLabel} · {stake.network}</small><b>{privateMode ? '••••' : `${compactAmount(String(stake.returnedHex), 2)} ${symbol}`}</b></span><span><small>{timestampLabel(stake.endedAt)}</small><b>{privateMode ? '••••' : stake.price === null ? 'Price unavailable' : money(stake.returnedHex * stake.price)}</b></span></article>; })}</div></div>}
        <p className="hex-stakes-note"><LockKeyhole size={12}/>Watch-only contract data. Staked value uses locked principal at today’s price. Unstaked value uses the HEX returned in verified StakeEnd events at today’s price, not its historical sale value.</p>
      </>}
    </div>}
  </section>;
}

function HexCalculatorPanel({ open, network, metrics, onToggle, onNetwork, onRefresh }: { open: boolean; network: ChainNetwork; metrics: HexCalculatorMetrics; onToggle: () => void; onNetwork: (network: ChainNetwork) => void; onRefresh: () => void }) {
  const [amount, setAmount] = useState('30000');
  const [duration, setDuration] = useState('2');
  const [unit, setUnit] = useState<'days' | 'months' | 'years'>('months');
  const amountHex = Math.max(0, Number(amount.replace(/,/g, '')) || 0);
  const durationValue = Math.max(0, Number(duration) || 0);
  const rawDays = unit === 'years' ? durationValue * 365 : unit === 'months' ? durationValue * 30.4375 : durationValue;
  const days = Math.max(1, Math.min(5555, Math.round(rawDays)));
  const result = calculateHexStake(amountHex, days, metrics);
  const endDate = new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const setPreset = (nextDuration: string, nextUnit: 'months' | 'years') => { setDuration(nextDuration); setUnit(nextUnit); };
  return <section className={`hex-calculator-panel ${open ? 'open' : ''}`}>
    <button className="hex-calculator-fold" type="button" onClick={onToggle} aria-expanded={open}>
      <span className="hex-calculator-title"><i><Calculator size={22}/></i><span><small>ON-CHAIN STAKE ESTIMATE</small><b>HEX Calculator</b></span></span><ChevronDown size={17}/>
    </button>
    {open && <div className="hex-calculator-body">
      <div className="hex-calculator-network" role="group" aria-label="HEX calculator network">{(['Ethereum', 'PulseChain'] as ChainNetwork[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => onNetwork(option)}>{option}</button>)}</div>
      <div className="hex-calculator-fields">
        <label><span>HEX to stake</span><input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value.replace(/[^0-9.,]/g, ''))} aria-label="HEX amount to stake"/></label>
        <label><span>Stake length</span><div><input inputMode="decimal" value={duration} onChange={event => setDuration(event.target.value.replace(/[^0-9.]/g, ''))} aria-label="Stake duration"/><select value={unit} onChange={event => setUnit(event.target.value as 'days' | 'months' | 'years')} aria-label="Stake duration unit"><option value="days">Days</option><option value="months">Months</option><option value="years">Years</option></select></div></label>
      </div>
      <div className="hex-calculator-presets"><button type="button" onClick={() => setPreset('2', 'months')}>2 months</button><button type="button" onClick={() => setPreset('1', 'years')}>1 year</button><button type="button" onClick={() => setPreset('5', 'years')}>5 years</button><button type="button" onClick={() => setPreset('10', 'years')}>10 years</button><button type="button" onClick={() => setPreset('15', 'years')}>15 years</button></div>
      {metrics.loading ? <div className="hex-calculator-status"><RefreshCw size={18} className="spin-icon"/>Reading live HEX share rate and payouts…</div> : metrics.error ? <div className="hex-calculator-status error-message">{metrics.error}<button type="button" onClick={onRefresh}>Try again</button></div> : result ? <>
        <div className="hex-calculator-share"><span><small>HEX FOR 1 BASE T-SHARE</small><strong>{compactAmount(String(metrics.oneTShareHex), 2)} HEX</strong></span><span><small>LIVE SHARE RATE</small><strong>{metrics.shareRate.toLocaleString()}</strong></span></div>
        <div className="hex-calculator-results">
          <div><small>ESTIMATED T-SHARES</small><strong>{result.tShares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong><em>{result.bonusPercent.toFixed(2)}% stake bonus</em></div>
          <div><small>ESTIMATED YIELD</small><strong>{compactAmount(String(result.estimatedYield), 2)} HEX</strong><em>{metrics.price ? money(result.estimatedYield * metrics.price) : 'Live HEX value unavailable'}</em></div>
          <div><small>ESTIMATED RETURN</small><strong>{compactAmount(String(result.estimatedReturn), 2)} HEX</strong><em>Principal + estimated yield</em></div>
          <div><small>ESTIMATED END DATE</small><strong>{endDate}</strong><em>{days.toLocaleString()} days · max 5,555</em></div>
        </div>
        <p className="hex-calculator-note"><ShieldCheck size={13}/>Share count uses the verified {network} HEX contract formula and current share rate. Yield uses the average payout from the last {metrics.sampleDays} completed on-chain days. Future daily payouts, global T-shares and HEX price can change, so this is an estimate—not a guaranteed return.</p>
      </> : <div className="hex-calculator-status">Enter a HEX amount to calculate a stake.</div>}
    </div>}
  </section>;
}

function App() {
  const [wallets, setWallets] = useState<TrackedWallet[]>(readWallets);
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>(readGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(() => readGroups()[0]?.id ?? DEFAULT_GROUP_ID);
  const [newGroupName, setNewGroupName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<string | null>(null);
  const [trackedCollapsed, setTrackedCollapsed] = useState(true);
  const [newWalletPanelOpen, setNewWalletPanelOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(true);
  const [hexStakesOpen, setHexStakesOpen] = useState(true);
  const [hexStakeNetwork, setHexStakeNetwork] = useState<Network>(readNetwork);
  const [hexStakeFilter, setHexStakeFilter] = useState<'all' | 'active' | 'matured'>('all');
  const [hexStakeRefresh, setHexStakeRefresh] = useState(0);
  const [hexStakeState, setHexStakeState] = useState<HexStakeState>({ stakes: [], endedStakes: [], loading: false, error: '', refreshedAt: null, network: readNetwork() });
  const [hexCalculatorOpen, setHexCalculatorOpen] = useState(true);
  const [hexCalculatorNetwork, setHexCalculatorNetwork] = useState<ChainNetwork>(() => readNetwork() === 'Ethereum' ? 'Ethereum' : 'PulseChain');
  const [hexCalculatorRefresh, setHexCalculatorRefresh] = useState(0);
  const [hexCalculatorMetrics, setHexCalculatorMetrics] = useState<HexCalculatorMetrics>({ network: readNetwork() === 'Ethereum' ? 'Ethereum' : 'PulseChain', shareRate: 0, oneTShareHex: 0, dailyHexPerTShare: 0, price: null, sampleDays: 0, loading: true, error: '' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [settingsTransparency, setSettingsTransparency] = useState(readSettingsTransparency);
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled);
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<Network>(readNetwork);
  const [error, setError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [copied, setCopied] = useState('');
  const [privateMode, setPrivateMode] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultSelectedWalletId);
  const [portfolios, setPortfolios] = useState<Record<string, Portfolio>>({});
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [hideDust, setHideDust] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [tokenStats, setTokenStats] = useState<Record<string, TokenStats>>({});
  const [chartOpen, setChartOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('24H');
  const [chartData, setChartData] = useState<{ time: number; value: number }[]>([]);
  const [chartPercentage, setChartPercentage] = useState<number | null>(0);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartRetry, setChartRetry] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const portfolioRequestRef = useRef<Record<string, Network>>({});
  const walletStakeKey = wallets.map(wallet => `${wallet.id}:${wallet.address.toLowerCase()}:${wallet.label}`).join('|');

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets)), [wallets]);
  useEffect(() => localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(walletGroups)), [walletGroups]);
  useEffect(() => localStorage.setItem(NETWORK_STORAGE_KEY, network), [network]);
  useEffect(() => { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); document.documentElement.lang = language; }, [language]);
  useEffect(() => localStorage.setItem(SETTINGS_TRANSPARENCY_STORAGE_KEY, String(settingsTransparency)), [settingsTransparency]);
  useEffect(() => localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled)), [soundEnabled]);
  useEffect(() => { if (!wallets.some(wallet => wallet.id === selectedId)) setSelectedId(wallets[0]?.id ?? ''); }, [wallets, selectedId]);
  useEffect(() => setShowAllAssets(false), [selectedId]);
  useEffect(() => { setChartOpen(false); setChartPeriod('24H'); setChartData([]); setChartPercentage(0); setChartLoading(false); }, [selectedToken]);

  useEffect(() => {
    if (!soundEnabled) return;
    const soundTargets = '.panel-fold,.group-fold,.new-wallet-fold,.allocation-fold,.hex-stakes-fold,.hex-calculator-fold';
    const handlePanelClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(soundTargets)) playPanelChime();
    };
    document.addEventListener('click', handlePanelClick);
    return () => document.removeEventListener('click', handlePanelClick);
  }, [soundEnabled]);

  useEffect(() => {
    if (!hexCalculatorOpen) return;
    let cancelled = false;
    setHexCalculatorMetrics(current => ({ ...current, network: hexCalculatorNetwork, loading: true, error: '' }));
    void readHexCalculatorMetrics(hexCalculatorNetwork).then(metrics => {
      if (!cancelled) setHexCalculatorMetrics({ ...metrics, loading: false, error: '' });
    }).catch(() => {
      if (!cancelled) setHexCalculatorMetrics(current => ({ ...current, network: hexCalculatorNetwork, loading: false, error: 'Live HEX calculator data is temporarily unavailable.' }));
    });
    return () => { cancelled = true; };
  }, [hexCalculatorNetwork, hexCalculatorOpen, hexCalculatorRefresh]);

  useEffect(() => {
    if (!hexStakesOpen) return;
    if (!wallets.length) {
      setHexStakeState({ stakes: [], endedStakes: [], loading: false, error: '', refreshedAt: null, network: hexStakeNetwork });
      return;
    }
    let cancelled = false;
    setHexStakeState(current => ({ ...current, stakes: current.network === hexStakeNetwork ? current.stakes : [], endedStakes: current.network === hexStakeNetwork ? current.endedStakes : [], loading: true, error: '', network: hexStakeNetwork }));
    void readHexStakes(wallets, hexStakeNetwork).then(result => {
      if (cancelled) return;
      const liveError = result.failed.length === 0 ? '' : result.failed.length === (hexStakeNetwork === 'Both' ? 2 : 1)
        ? 'HEX stake data is temporarily unavailable from the selected network.'
        : `${result.failed.join(' and ')} stake data is temporarily unavailable.`;
      const historyError = result.historyFailed.length ? `${result.historyFailed.join(' and ')} unstaked history is temporarily incomplete.` : '';
      setHexStakeState({ stakes: result.stakes, endedStakes: result.endedStakes, loading: false, error: [liveError, historyError].filter(Boolean).join(' '), refreshedAt: Date.now(), network: hexStakeNetwork });
    }).catch(() => {
      if (cancelled) return;
      setHexStakeState(current => ({ ...current, loading: false, error: 'HEX stake data is temporarily unavailable. Tap refresh to try again.', network: hexStakeNetwork }));
    });
    return () => { cancelled = true; };
  }, [walletStakeKey, hexStakeNetwork, hexStakesOpen, hexStakeRefresh]);

  useEffect(() => {
    if (!selectedToken || !TOKEN_DATA[selectedToken]) return;
    if (!chartOpen && chartPeriod === '24H') {
      setChartData([]);
      setChartLoading(false);
      return;
    }
    const token = TOKEN_DATA[selectedToken];
    let cancelled = false;
    setChartLoading(true);
    void fetchChartOHLCV(token, chartPeriod).then(data => {
      if (cancelled) return;
      setChartData(data);
      setChartPercentage(data.length >= 2 ? percentFromSeries(data) : fallbackPercentage(tokenStats[selectedToken], chartPeriod));
      setChartLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setChartData([]);
      setChartPercentage(fallbackPercentage(tokenStats[selectedToken], chartPeriod));
      setChartLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedToken, chartPeriod, chartRetry, chartOpen]);

  useEffect(() => {
    if (!chartOpen || !selectedToken || chartData.length < 2 || !chartContainerRef.current) return;
    const token = TOKEN_DATA[selectedToken];
    const container = chartContainerRef.current;
    const chart = createChart(container, {
        width: chartContainerRef.current.clientWidth,
        height: 220,
        layout: { background: { color: '#0a0a0a' }, textColor: '#6f6776', fontSize: 10 },
        grid: { vertLines: { visible: false }, horzLines: { color: '#ffffff08' } },
        rightPriceScale: { visible: false },
        timeScale: { borderColor: '#ffffff0c', timeVisible: true, secondsVisible: false },
        crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
        handleScroll: false,
        handleScale: false,
    });
    const series = chart.addSeries(LineSeries, {
        color: token.color,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
    });
    series.setData(chartData.map(point => ({ time: point.time as any, value: point.value })));
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; seriesRef.current = null; }
    };
  }, [selectedToken, chartData, chartOpen]);

  useEffect(() => {
    if (!selectedToken || chartData.length >= 2) return;
    setChartPercentage(fallbackPercentage(tokenStats[selectedToken], chartPeriod));
  }, [tokenStats, selectedToken, chartPeriod, chartData.length]);

  const refreshWallet = async (wallet: TrackedWallet, requestedNetwork: Network = network) => {
    portfolioRequestRef.current[wallet.id] = requestedNetwork;
    setPortfolios(current => ({ ...current, [wallet.id]: { assets: current[wallet.id]?.network === requestedNetwork ? current[wallet.id].assets : [], loading: true, error: '', refreshedAt: current[wallet.id]?.network === requestedNetwork ? current[wallet.id].refreshedAt : null, network: requestedNetwork } }));
    try {
      const assets = await loadPortfolio({ ...wallet, network: requestedNetwork });
      if (portfolioRequestRef.current[wallet.id] !== requestedNetwork) return;
      setPortfolios(current => ({ ...current, [wallet.id]: { assets, loading: false, error: '', refreshedAt: Date.now(), network: requestedNetwork } }));
    } catch (requestError) {
      if (portfolioRequestRef.current[wallet.id] !== requestedNetwork) return;
      const message = requestError instanceof Error && requestError.name === 'AbortError' ? 'The live indexer timed out. Tap refresh to try again.' : 'Live portfolio data is temporarily unavailable.';
      setPortfolios(current => ({ ...current, [wallet.id]: { assets: current[wallet.id]?.network === requestedNetwork ? current[wallet.id].assets : [], loading: false, error: message, refreshedAt: current[wallet.id]?.network === requestedNetwork ? current[wallet.id].refreshedAt : null, network: requestedNetwork } }));
    }
  };

  useEffect(() => {
    wallets.filter(wallet => !portfolios[wallet.id] || portfolios[wallet.id].network !== network).slice(0, 3).forEach(wallet => void refreshWallet(wallet, network));
  }, [wallets, portfolios, network]);

  const chooseNetwork = (nextNetwork: Network) => {
    setNetwork(nextNetwork);
    setError('');
    setFormNotice(wallets.length ? `Refreshing every tracked address on ${networkLabel(nextNetwork)}…` : '');
  };

  const addWallet = (event: FormEvent) => {
    event.preventDefault();
    const cleanAddress = address.trim();
    if (!validAddress(cleanAddress)) return setError('Enter a valid Ethereum-compatible public address.');
    const existingWallet = wallets.find(wallet => wallet.address.toLowerCase() === cleanAddress.toLowerCase());
    if (existingWallet) {
      if (existingWallet.network === network) return setError(`${existingWallet.label} already tracks ${networkLabel(network)}.`);
      setWallets(current => current.map(wallet => wallet.id === existingWallet.id
        ? { ...wallet, label: label.trim() || wallet.label, network }
        : wallet));
      setPortfolios(current => {
        const next = { ...current };
        delete next[existingWallet.id];
        return next;
      });
      setSelectedId(existingWallet.id);
      setFormNotice(`${existingWallet.label} is now showing ${networkLabel(network)}.`);
      setAddress(''); setLabel(''); setError('');
      return;
    }
    const newWallet = { id: crypto.randomUUID(), label: label.trim() || `Wallet ${wallets.length + 1}`, address: cleanAddress, network, groupId: selectedGroupId };
    setWallets([...wallets, newWallet]); setSelectedId(newWallet.id);
    setFormNotice(`${newWallet.label} is tracking ${networkLabel(network)}.`);
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

  const deleteGroup = (id: string) => {
    if (id === DEFAULT_GROUP_ID) return;
    const removedWalletIds = new Set(wallets.filter(wallet => (wallet.groupId ?? DEFAULT_GROUP_ID) === id).map(wallet => wallet.id));
    setWalletGroups(current => current.filter(group => group.id !== id));
    setWallets(current => current.filter(wallet => !removedWalletIds.has(wallet.id)));
    setPortfolios(current => {
      const next = { ...current };
      removedWalletIds.forEach(walletId => delete next[walletId]);
      return next;
    });
    setSelectedGroupId(current => current === id ? DEFAULT_GROUP_ID : current);
    setCollapsedGroups(current => current.filter(groupId => groupId !== id));
    setPendingDeleteGroupId(null);
  };

  const renameWallet = (id: string, name: string) => {
    setWallets(current => current.map(wallet => wallet.id === id ? { ...wallet, label: name } : wallet));
  };

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value); setCopied(id); setTimeout(() => setCopied(''), 1200);
  };
  const refreshApp = () => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('refresh', Date.now().toString());
    window.location.replace(nextUrl.toString());
  };
  const selectedWallet = wallets.find(wallet => wallet.id === selectedId) ?? wallets[0];
  const selectedPortfolioCandidate = selectedWallet ? portfolios[selectedWallet.id] : undefined;
  const selectedPortfolio = selectedPortfolioCandidate?.network === network ? selectedPortfolioCandidate : undefined;
  const orderedWallets = [...wallets].sort((left, right) => {
    const leftNumber = /^Wallet\s+(\d+)$/i.exec(left.label)?.[1];
    const rightNumber = /^Wallet\s+(\d+)$/i.exec(right.label)?.[1];
    return leftNumber && rightNumber ? Number(leftNumber) - Number(rightNumber) : 0;
  });
  const networkLoading = wallets.some(wallet => portfolios[wallet.id]?.network !== network || portfolios[wallet.id]?.loading);
  useEffect(() => {
    if (!networkLoading && wallets.length && formNotice.startsWith('Refreshing every tracked address')) {
      setFormNotice(`All tracked addresses now show ${networkLabel(network)}.`);
    }
  }, [networkLoading, network, wallets.length, formNotice]);
  const knownValue = wallets.reduce((total, wallet) => {
    const portfolio = portfolios[wallet.id];
    return total + (portfolio?.network === network ? portfolio.assets.reduce((walletTotal, asset) => walletTotal + (asset.value ?? 0), 0) : 0);
  }, 0);
  const selectedValue = selectedPortfolio?.assets.reduce((total, asset) => total + (asset.value ?? 0), 0) ?? 0;
  const selectedEthereumValue = selectedPortfolio?.assets.reduce((total, asset) => total + (asset.network === 'Ethereum' ? asset.value ?? 0 : 0), 0) ?? 0;
  const selectedPulseValue = selectedPortfolio?.assets.reduce((total, asset) => total + (asset.network === 'PulseChain' ? asset.value ?? 0 : 0), 0) ?? 0;
  const matchingWallet = validAddress(address) ? wallets.find(wallet => wallet.address.toLowerCase() === address.toLowerCase()) : undefined;
  const filteredAssets = selectedPortfolio?.assets.filter(asset => {
    const symbol = tokenKey(asset.symbol);
    const name = tokenKey(asset.name);
    const isDust = HIDDEN_DUST_SYMBOLS.has(symbol) || [...HIDDEN_DUST_SYMBOLS].some(dust => symbol.includes(dust) || name.includes(dust));
    if (!hideDust) return true;
    if (isDust) return false;
    const verifiedContract = VERIFIED_TOKEN_CONTRACTS[asset.network]?.[symbol];
    if (verifiedContract && !isVerifiedCoreAsset(asset)) return false;
    return isVerifiedCoreAsset(asset) || FEATURED_SYMBOLS.has(symbol) || (asset.value !== null && asset.value >= 0.01);
  }) ?? [];
  const hiddenDustCount = (selectedPortfolio?.assets.length ?? 0) - filteredAssets.length;
  const visibleAssets = filteredAssets.slice(0, showAllAssets ? undefined : 30);
  const allocationAssets = wallets.flatMap(wallet => {
    const portfolio = portfolios[wallet.id];
    return portfolio?.network === network ? portfolio.assets : [];
  });
  const allocationByToken = allocationAssets.reduce((tokens, asset) => {
    const value = Math.max(asset.value ?? 0, 0);
    if (!(value > 0)) return tokens;
    const symbol = displayAssetSymbol(asset);
    const key = tokenKey(symbol);
    const existing = tokens.get(key);
    if (existing) existing.value += value;
    else tokens.set(key, { symbol, value, icon: CORE_ICONS[key] || asset.icon, color: ALLOCATION_COLORS[key] || ALLOCATION_FALLBACK_COLORS[tokens.size % ALLOCATION_FALLBACK_COLORS.length] });
    return tokens;
  }, new Map<string, { symbol: string; value: number; icon: string | null; color: string }>());
  const pricedAllocationAssets = [...allocationByToken.values()].sort((left, right) => right.value - left.value);
  const allocationTotal = pricedAllocationAssets.reduce((total, asset) => total + asset.value, 0);
  const allocationLeaders = pricedAllocationAssets.slice(0, 5);
  const allocationRemainder = pricedAllocationAssets.slice(5).reduce((total, asset) => total + asset.value, 0);
  const allocationItems = allocationRemainder > 0 ? [...allocationLeaders, { symbol: 'Other', value: allocationRemainder, icon: null, color: ALLOCATION_FALLBACK_COLORS[5] }] : allocationLeaders;
  let allocationCursor = 0;
  const allocationGradient = allocationItems.length && allocationTotal > 0 ? `conic-gradient(${allocationItems.map(item => { const start = allocationCursor; allocationCursor += (item.value / allocationTotal) * 100; return `${item.color} ${start.toFixed(2)}% ${allocationCursor.toFixed(2)}%`; }).join(', ')})` : 'conic-gradient(#ffffff10 0 100%)';
  const ui = UI_COPY[language];

  return <div className="landing-shell">
    <main className="landing-main">
      <section className="intake-section">
        <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
        <div className="intake-copy">
          <div className="hero-title-row"><h1>{ui.hero}<br/><span>{ui.privateView}</span></h1></div>
          <p>{ui.subtitle}</p>
          <div className="trust-row"><span><LockKeyhole size={15}/>{ui.noConnection}</span><span><ShieldCheck size={15}/>{ui.noSeed}</span><span className="trust-live"><Radio size={12}/>Live</span></div>
          <div className="ecosystem-strip"><span>{ui.builtFor}</span><div>{['ETH', 'PLS', 'HEX', 'pHEX', 'PLSX', 'PRVX', 'INC'].map(sym => (
            <button key={sym} className={`eco-token-btn ${selectedToken === sym ? 'active' : ''}`} onClick={() => { setSelectedToken(sym); if (!tokenStats[sym]) { setTokenStats(current => ({ ...current, [sym]: { price: 0, change24h: 0, change7d: 0, change30d: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } })); void fetchTokenStats(TOKEN_DATA[sym]).then(stats => setTokenStats(current => ({ ...current, [sym]: stats }))); } }}>
              <img src={CORE_ICONS[tokenKey(sym)] || ''} alt={sym} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
              <span>{sym}</span>
            </button>
          ))}</div></div>

          {selectedToken && TOKEN_DATA[selectedToken] && <div className="token-detail-panel">
            <div className="token-panel-glow" style={{ background: TOKEN_DATA[selectedToken].borderGradient, opacity: 0.15 }}/>
            <div className="token-panel-content" style={{ background: `linear-gradient(#0c0910,#08060b) padding-box, ${TOKEN_DATA[selectedToken].borderGradient} border-box`, border: '2px solid transparent', boxShadow: `0 24px 70px #000, 0 0 45px ${TOKEN_DATA[selectedToken].color}22` }}>
              <div className="token-panel-header">
                <div className="token-panel-title">
                  <div className="token-icon">
                    <img src={CORE_ICONS[tokenKey(selectedToken)] || ''} alt={selectedToken} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                    {!CORE_ICONS[tokenKey(selectedToken)] && <span>{selectedToken.slice(0, 2)}</span>}
                  </div>
                  <div>
                    <h3>{selectedToken}</h3>
                    <div className="token-subtitle-row">
                      <p>{TOKEN_DATA[selectedToken].subtitle}</p>
                      <span className={`token-price-change ${chartPercentage === null || chartPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {chartLoading ? 'Loading' : chartPercentage === null ? 'Unavailable' : `${chartPercentage >= 0 ? '+' : ''}${chartPercentage.toFixed(2)}%`} <small>{chartPeriod}</small>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="token-panel-price">
                  <span className="token-price-value green-value">{tokenStats[selectedToken]?.price ? money(tokenStats[selectedToken].price) : 'Loading...'}</span>
                </div>
              </div>
              <div className="chart-period-selector">
                {['24H', '7D', '30D', '3M', '6M', '1Y', 'ATL', 'All'].map(p => (
                  <button key={p} className={`chart-period-btn ${chartPeriod === p ? 'active' : ''}`} onClick={() => { setChartPercentage(fallbackPercentage(tokenStats[selectedToken], p)); setChartPeriod(p); setChartOpen(true); }}>{p}</button>
                ))}
              </div>
              <div className="token-stats-row">
                <div className="token-stat">
                  <span>MC</span>
                  <b className="green-value">{tokenStats[selectedToken]?.marketCap ? `$${tokenStats[selectedToken].marketCap.toFixed(1)}M` : 'N/A'}</b>
                </div>
                <div className="token-stat">
                  <span>Liquidity</span>
                  <b className="green-value">{tokenStats[selectedToken]?.liquidity ? `$${tokenStats[selectedToken].liquidity.toFixed(1)}M` : 'N/A'}</b>
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
              <button className="token-chart-button" onClick={() => { const opening = !chartOpen; setChartOpen(opening); if (opening && chartData.length < 2) setChartRetry(value => value + 1); }}>{chartOpen ? 'Hide Chart' : 'Show Chart'} {chartOpen ? <ChevronDown size={16} style={{ transform: 'rotate(180deg)' }}/> : <ChevronDown size={16}/>}</button>
              {chartOpen && <div className="token-chart-container">
                {chartLoading ? <div className="chart-status"><RefreshCw size={17} className="spin-icon"/>Building {chartPeriod} chart…</div>
                  : chartData.length >= 2 ? <div ref={chartContainerRef} className="token-chart" role="img" aria-label={`${selectedToken} ${chartPeriod} price chart`} data-chart-points={chartData.length}/>
                    : <div className="chart-status">No verified price history is available for this range.</div>}
              </div>}
              <button className="token-close-button" onClick={() => setSelectedToken(null)}>Close</button>
            </div>
          </div>}
        </div>
      </section>

        <form className={`address-panel ${addressFormOpen ? 'open' : 'collapsed'}`} onSubmit={addWallet}>
          <div className="panel-glow"/>
          <button className="panel-heading panel-fold" type="button" onClick={() => setAddressFormOpen(value => !value)} aria-expanded={addressFormOpen}><div className="wallet-orbit"><ScanSearch size={24}/></div><div><p className="eyebrow">{ui.addAddress}</p><h2>{ui.enterAddress}</h2></div><ChevronDown size={18}/></button>
          {addressFormOpen && <div className="address-panel-body">
            <p className="panel-note">Your address stays on this device. It is never added to our code or public GitHub.</p>
            <label className="field-label">Wallet name <span>optional</span><input value={label} onChange={e => setLabel(e.target.value)} placeholder="Give this wallet a private label" autoComplete="off"/></label>
            <label className="field-label">Public wallet address<div className={`address-input ${error ? 'invalid' : ''}`}><input aria-label="Public wallet address" value={address} onChange={e => {setAddress(e.target.value.trim()); setError(''); setFormNotice('')}} placeholder="Paste the complete public address" autoCapitalize="off" autoCorrect="off" spellCheck={false}/></div>{error && <small className="error">{error}</small>}</label>
            <label className="field-label">Add to wallet<div className="wallet-selector">{walletGroups.map(group => { const groupWallets = wallets.filter(w => (w.groupId ?? DEFAULT_GROUP_ID) === group.id); return <button type="button" key={group.id} className={`wallet-selector-item ${selectedGroupId === group.id ? 'selected' : ''}`} onClick={() => setSelectedGroupId(group.id)}><span className="wallet-selector-name">{group.name}</span><span className="wallet-selector-count">{groupWallets.length} {groupWallets.length === 1 ? 'wallet' : 'wallets'}</span></button>; })}</div></label>
            <fieldset><legend>Choose network <span className="network-live-label">Controls all tracked wallets</span></legend><div className="network-choice"><button type="button" aria-pressed={network === 'PulseChain'} className={network === 'PulseChain' ? 'active' : ''} onClick={() => chooseNetwork('PulseChain')}><i className="pulse-dot"/><span><b>PulseChain</b><small>PLS · Chain 369</small></span></button><button type="button" aria-pressed={network === 'Ethereum'} className={network === 'Ethereum' ? 'active' : ''} onClick={() => chooseNetwork('Ethereum')}><i className="eth-diamond">◆</i><span><b>Ethereum</b><small>ETH · Chain 1</small></span></button><button type="button" aria-pressed={network === 'Both'} className={network === 'Both' ? 'active' : ''} onClick={() => chooseNetwork('Both')}><i className="both-network-icon"><span className="pulse-dot"/><span className="eth-diamond">◆</span></i><span><b>Both networks</b><small>PLS + ETH combined</small></span></button></div></fieldset>
            <button className="scan-button" type="submit">{matchingWallet && matchingWallet.network !== network ? `Update ${matchingWallet.label} to ${networkLabel(network)}` : 'Track this wallet'} <ArrowRight size={18}/></button>
            {formNotice && <small className="network-success" role="status">{formNotice}</small>}
            <div className="privacy-line"><LockKeyhole size={13}/>Stored locally in your browser only</div>
          </div>}
        </form>

      {wallets.length > 0 && <><section className={`tracked-section tracked-panel ${trackedCollapsed ? 'collapsed' : 'open'}`}>
        <div className="tracked-glow"/>
        <div className="panel-heading panel-fold" role="button" tabIndex={0} onClick={() => setTrackedCollapsed(value => !value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setTrackedCollapsed(value => !value); } }} aria-expanded={!trackedCollapsed}>
          <div className="wallet-orbit"><WalletCards size={24}/></div>
          <div className="panel-heading-text"><p className="eyebrow">{ui.privateWatchlist}</p><h2>{ui.trackedWallets}</h2></div>
          <button className="panel-action-btn" onClick={(e) => { e.stopPropagation(); setPrivateMode(v => !v); }}>{privateMode ? <EyeOff size={13}/> : <Eye size={13}/>} {privateMode ? ui.reveal : ui.hide}</button>
          <ChevronDown size={18}/>
        </div>
        {!trackedCollapsed && <div className="vault-board">
          <div className="vault-summary">
            <div className="portfolio-totals"><div><span>{ui.totalPortfolio} · {networkLabel(network)}</span><strong>{privateMode ? '••••••' : networkLoading ? ui.syncing : knownValue > 0 ? money(knownValue) : '$0.00'}</strong><small>{wallets.length} {wallets.length === 1 ? ui.address : ui.addresses} · {networkLabel(network)}</small></div>{selectedWallet && <div className="selected-total"><span>{selectedWallet.label} · {networkLabel(network)}</span><strong>{privateMode ? '••••••' : networkLoading ? ui.syncing : selectedValue > 0 ? money(selectedValue) : '$0.00'}</strong><small>{privateMode ? 'Network values hidden' : network === 'Both' ? `ETH ${money(selectedEthereumValue)} · PLS ${money(selectedPulseValue)}` : `${networkLabel(network)} · all priced coins`}</small></div>}</div>
            {selectedWallet && <button className={`sync-control ${networkLoading ? 'spinning' : ''}`} onClick={() => wallets.forEach(wallet => void refreshWallet(wallet, network))} disabled={networkLoading}><RefreshCw size={16}/>{networkLoading ? ui.syncing : ui.syncAll}</button>}
          </div>
          <div className="wallet-groups">
            {walletGroups.map(group => {
              const groupWallets = orderedWallets.filter(wallet => (wallet.groupId ?? DEFAULT_GROUP_ID) === group.id);
              const groupValue = groupWallets.reduce((total, wallet) => { const portfolio = portfolios[wallet.id]; return total + (portfolio?.network === network ? portfolio.assets.reduce((sum, asset) => sum + (asset.value ?? 0), 0) : 0); }, 0);
              const collapsed = collapsedGroups.includes(group.id);
              return <section className="wallet-group" key={group.id}>
                <div className="wallet-group-head"><button className="group-fold" onClick={() => setCollapsedGroups(current => collapsed ? current.filter(id => id !== group.id) : [...current, group.id])} aria-expanded={!collapsed}><ChevronDown size={16}/><span>{groupWallets.length} {groupWallets.length === 1 ? ui.address : ui.addresses} · {collapsed ? ui.showCards : ui.hideCards}</span></button><input aria-label={`Name for ${group.name}`} value={group.name} onChange={event => renameGroup(group.id, event.target.value)}/><b>{privateMode ? '••••' : groupValue > 0 ? money(groupValue) : ui.liveAssets}</b></div>
                {!collapsed && <div className="address-rail" aria-label={`${group.name} saved addresses`}>
                  {groupWallets.map((wallet, index) => <button className={`mini-wallet n${index % 4} ${wallet.id === selectedWallet?.id ? 'selected' : ''}`} key={wallet.id} onClick={() => setSelectedId(wallet.id)}>
                    <span className="mini-number">{String(index + 1).padStart(2, '0')}</span><div><small>{networkLabel(network)}</small><b>{wallet.label}</b><em>{privateMode ? '••••••••••••••••' : short(wallet.address)}</em></div><i/>
                  </button>)}
                  {groupWallets.length === 0 && <p className="empty-group">Choose this wallet in the address form to add an address.</p>}
                </div>}
              </section>;
            })}
          </div>
          {!trackedCollapsed && selectedWallet && <div className="asset-panel">
            <div className="asset-panel-head"><div><p className="eyebrow">{ui.selectedAddress} · {networkLabel(network)}</p><input className="address-name-input" aria-label="Rename selected wallet" value={selectedWallet.label} onChange={event => renameWallet(selectedWallet.id, event.target.value)}/><button onClick={() => copy(selectedWallet.address, selectedWallet.id)}>{privateMode ? '••••••••••••••••' : short(selectedWallet.address)} {copied === selectedWallet.id ? <em>COPIED</em> : <Copy size={13}/>}</button></div><div className="selected-actions"><button className={hideDust ? 'dust-active' : ''} onClick={() => setHideDust(value => !value)}>{hideDust ? `${ui.showDust}${hiddenDustCount ? ` · ${hiddenDustCount} hidden` : ''}` : ui.hideDust}</button>{network !== 'PulseChain' && <a href={`https://etherscan.io/address/${selectedWallet.address}`} target="_blank" rel="noreferrer" aria-label="Open Ethereum explorer">ETH <ArrowUpRight size={15}/></a>}{network !== 'Ethereum' && <a href={`https://scan.pulsechain.com/address/${selectedWallet.address}`} target="_blank" rel="noreferrer" aria-label="Open PulseChain explorer">PLS <ArrowUpRight size={15}/></a>}<button onClick={() => setWallets(wallets.filter(wallet => wallet.id !== selectedWallet.id))} aria-label={`Remove ${selectedWallet.label}`}><Trash2 size={16}/></button></div></div>
            <div className="asset-list">
              {(!selectedPortfolio || selectedPortfolio.loading) && (selectedPortfolio?.assets.length ?? 0) === 0 && <div className="asset-message"><RefreshCw size={20} className="spin-icon"/>Reading live {networkLabel(network)} assets…</div>}
              {selectedPortfolio?.error && <div className="asset-message error-message">{selectedPortfolio.error}<button onClick={() => refreshWallet(selectedWallet)}>Try again</button></div>}
              {!selectedPortfolio?.loading && !selectedPortfolio?.error && selectedPortfolio?.assets.length === 0 && <div className="asset-message">No indexed assets were found for this address.</div>}
              {visibleAssets.map(asset => { const shownSymbol = displayAssetSymbol(asset); const shownKey = tokenKey(shownSymbol); return <article className="asset-row" key={asset.id} data-network={asset.network}>
                <div className={`asset-logo ${asset.native ? 'native' : ''} ${shownKey.toLowerCase()}-logo`}><span>{shownSymbol.slice(0, 3)}</span>{(CORE_ICONS[shownKey] || asset.icon)?.startsWith('http') || CORE_ICONS[shownKey] ? <img src={CORE_ICONS[shownKey] || asset.icon || ''} alt={`${shownSymbol} logo`} onError={event => { event.currentTarget.style.display = 'none'; }}/>: null}</div>
                <div className="asset-main"><div className="asset-name"><b>{shownSymbol} <small>({asset.name})</small>{network === 'Both' && <em className={`asset-network-badge ${asset.network === 'Ethereum' ? 'ethereum' : 'pulsechain'}`}>{asset.network}</em>}</b></div><div className="asset-balance"><b>{privateMode ? '••••' : compactAmount(asset.amount)} <small>{shownSymbol}</small></b></div></div>
                <div className="asset-price"><b>{privateMode ? '••••' : asset.value === null ? '—' : money(asset.value)}</b><small>{privateMode ? 'Price hidden' : money(asset.price)}</small></div>
              </article>; })}
              {filteredAssets.length > 30 && <button className="show-assets" onClick={() => setShowAllAssets(value => !value)}>{showAllAssets ? 'Show top assets' : `View all ${filteredAssets.length} visible assets`}</button>}
            </div>
            <div className="live-data-note"><Radio size={11}/>Live read-only data from {networkLabel(network)} · {selectedPortfolio?.refreshedAt ? `updated ${new Date(selectedPortfolio.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'waiting to sync'}</div>
          </div>}
        </div>}
      </section><div className={`new-wallet-panel ${newWalletPanelOpen ? 'open' : ''}`}><div className="new-wallet-glow"/><button className="new-wallet-fold" onClick={() => setNewWalletPanelOpen(value => !value)} aria-expanded={newWalletPanelOpen}><span className="new-wallet-title"><i className="wallet-orbit"><FolderPlus size={20}/></i><span><small>{ui.organize}</small><b>{ui.createAnother}</b></span></span><ChevronDown size={17}/></button>{newWalletPanelOpen && <div className="new-wallet-body"><p className="panel-note">Create a separate wallet for personal addresses, whales, or any watchlist you choose.</p><div className="created-wallets"><p>{ui.createdWallets}</p>{walletGroups.map(group => { const addressCount = wallets.filter(wallet => (wallet.groupId ?? DEFAULT_GROUP_ID) === group.id).length; const confirming = pendingDeleteGroupId === group.id; return <article className={`created-wallet-row ${confirming ? 'confirming' : ''}`} key={group.id}><div className="created-wallet-summary"><span><b>{group.name}</b><small>{addressCount} {addressCount === 1 ? ui.address : ui.addresses}</small></span>{group.id === DEFAULT_GROUP_ID ? <em>Default</em> : <button type="button" className="wallet-delete-trigger" onClick={() => setPendingDeleteGroupId(group.id)} aria-label={`Delete ${group.name}`}><Trash2 size={15}/>Delete</button>}</div>{confirming && <div className="wallet-delete-warning" role="alertdialog" aria-label={`Confirm deletion of ${group.name}`}><b>Are you sure you want to delete this wallet?</b><small>{addressCount ? `This removes ${addressCount} saved ${addressCount === 1 ? 'address' : 'addresses'} from this device.` : 'This wallet is empty and will be removed from this device.'}</small><div><button type="button" onClick={() => setPendingDeleteGroupId(null)}>Cancel</button><button type="button" className="confirm-delete" onClick={() => deleteGroup(group.id)}>Delete wallet</button></div></div>}</article>; })}</div><div className="group-creator"><FolderPlus size={15}/><input aria-label="New wallet group name" value={newGroupName} onChange={event => setNewGroupName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addGroup(); } }} placeholder="Name a new wallet, e.g. Whales"/><button onClick={addGroup} disabled={!newGroupName.trim()}>Create wallet</button></div></div>}</div><section className={`allocation-panel ${allocationOpen ? 'open' : ''}`}><button className="allocation-fold" type="button" onClick={() => setAllocationOpen(value => !value)} aria-expanded={allocationOpen}><span className="allocation-title"><i className="wallet-orbit"><ChartPie size={20}/></i><span><small>{ui.allocationEyebrow}</small><b>{ui.allocation}</b></span></span><ChevronDown size={17}/></button>{allocationOpen && <div className="allocation-body"><div className="allocation-scope"><span><b>All wallets</b><small>{wallets.length} {wallets.length === 1 ? ui.address : ui.addresses} · {networkLabel(network)}</small></span><div className="allocation-network-switch" role="group" aria-label="Allocation network">{(['Ethereum', 'PulseChain', 'Both'] as Network[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => chooseNetwork(option)}>{option}</button>)}</div></div>{networkLoading ? <div className="allocation-empty"><RefreshCw size={18} className="spin-icon"/>Reading all wallet allocations…</div> : allocationItems.length && allocationTotal > 0 ? <div className="allocation-content"><div className="allocation-donut" style={{ background: allocationGradient }}><span><b>All wallets</b><small>{privateMode ? '••••' : money(allocationTotal)}</small><em>{wallets.length} {wallets.length === 1 ? ui.address : ui.addresses}</em></span></div><div className="allocation-legend">{allocationItems.map((item, index) => <div className="allocation-item" key={`${item.symbol}-${index}`} style={{ '--allocation-color': item.color } as React.CSSProperties}><i>{item.icon ? <img src={item.icon} alt={`${item.symbol} logo`} onError={event => { event.currentTarget.style.display = 'none'; }}/> : <span/>}</i><span className="allocation-color-swatch"/><b>{item.symbol}</b><strong>{`${((item.value / allocationTotal) * 100).toFixed(1)}%`}</strong></div>)}</div></div> : <div className="allocation-empty">{ui.noAllocation}</div>}</div>}</section></>}

      {wallets.length > 0 && <HexStakesPanel state={hexStakeState} open={hexStakesOpen} filter={hexStakeFilter} network={hexStakeNetwork} walletCount={wallets.length} privateMode={privateMode} onToggle={() => setHexStakesOpen(value => !value)} onFilter={setHexStakeFilter} onNetwork={setHexStakeNetwork} onRefresh={() => setHexStakeRefresh(value => value + 1)}/>}

      <HexCalculatorPanel open={hexCalculatorOpen} network={hexCalculatorNetwork} metrics={hexCalculatorMetrics} onToggle={() => setHexCalculatorOpen(value => !value)} onNetwork={setHexCalculatorNetwork} onRefresh={() => setHexCalculatorRefresh(value => value + 1)}/>

      {wallets.length === 0 && <section className="next-preview"><p className="eyebrow">WHAT COMES NEXT</p><h2>Your wallet becomes a living dashboard.</h2><div className="preview-panels"><div/><div/><div/></div><p>Token panels inspired by your reference design will appear here after we connect live portfolio data.</p></section>}
    </main>
    {settingsOpen && <section className="settings-panel" style={{ '--settings-opacity': settingsTransparency / 100 } as React.CSSProperties} aria-label={ui.settings}>
      <div className="settings-head">
        <div className="settings-head-title">{settingsSection && <button className="settings-back" type="button" onClick={() => setSettingsSection(null)} aria-label="Back to settings"><ArrowLeft size={17}/></button>}<div><p className="eyebrow">{ui.settings.toUpperCase()}</p><h2>{settingsSection === 'language' ? ui.language : settingsSection === 'network' ? 'Network' : settingsSection === 'customize' ? 'Customize' : settingsSection === 'sound' ? 'Sound' : ui.settings}</h2></div></div>
        <button type="button" onClick={() => { setSettingsOpen(false); setSettingsSection(null); }} aria-label="Close settings"><X size={18}/></button>
      </div>
      {!settingsSection && <div className="settings-menu">
        <button type="button" onClick={() => setSettingsSection('language')}><i><Languages size={20}/></i><span><b>{ui.language}</b><small>{LANGUAGE_OPTIONS.find(option => option.id === language)?.native}</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('network')}><i><NetworkIcon size={20}/></i><span><b>Network</b><small>{networkLabel(network)}</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('customize')}><i><SlidersHorizontal size={20}/></i><span><b>Customize</b><small>Panel transparency · {settingsTransparency}%</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('sound')}><i>{soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}</i><span><b>Sound</b><small>Panel sounds · {soundEnabled ? 'On' : 'Off'}</small></span><ChevronDown size={17}/></button>
      </div>}
      {settingsSection === 'language' && <div className="language-options" role="group" aria-label={ui.language}>{LANGUAGE_OPTIONS.map(option => <button type="button" key={option.id} className={language === option.id ? 'active' : ''} aria-pressed={language === option.id} onClick={() => setLanguage(option.id)}><span>{option.native}</span><small>{option.label}</small></button>)}</div>}
      {settingsSection === 'network' && <div className="settings-network-options" role="group" aria-label="Network">{(['Ethereum', 'PulseChain', 'Both'] as Network[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => chooseNetwork(option)}><i className={option === 'Ethereum' ? 'eth-diamond' : option === 'PulseChain' ? 'pulse-dot' : 'both-network-icon'}>{option === 'Ethereum' ? '◆' : option === 'Both' ? <><span className="pulse-dot"/><span className="eth-diamond">◆</span></> : null}</i><span><b>{option === 'Both' ? 'Both networks' : option}</b><small>{option === 'Ethereum' ? 'ETH · Chain 1' : option === 'PulseChain' ? 'PLS · Chain 369' : 'PulseChain + Ethereum'}</small></span></button>)}</div>}
      {settingsSection === 'customize' && <div className="settings-customize"><div className="transparency-label"><span><b>Panel transparency</b><small>See your portfolio behind Settings</small></span><strong>{settingsTransparency}%</strong></div><input type="range" min="35" max="98" step="1" value={settingsTransparency} onChange={event => setSettingsTransparency(Number(event.target.value))} aria-label="Settings panel transparency"/><div className="transparency-scale"><span>More transparent</span><span>More solid</span></div><div className="transparency-presets">{[{ label: 'Glass', value: 45 }, { label: 'Balanced', value: 77 }, { label: 'Solid', value: 94 }].map(option => <button type="button" key={option.label} className={settingsTransparency === option.value ? 'active' : ''} onClick={() => setSettingsTransparency(option.value)}><span>{option.label}</span><small>{option.value}%</small></button>)}</div></div>}
      {settingsSection === 'sound' && <div className="settings-network-options sound-options" role="group" aria-label="Panel sound"><button type="button" className={soundEnabled ? 'active' : ''} aria-pressed={soundEnabled} onClick={() => { setSoundEnabled(true); playPanelChime(); }}><i><Volume2 size={20}/></i><span><b>Sound on</b><small>Play a soft chime when a panel opens or closes</small></span></button><button type="button" className={!soundEnabled ? 'active' : ''} aria-pressed={!soundEnabled} onClick={() => setSoundEnabled(false)}><i><VolumeX size={20}/></i><span><b>Sound off</b><small>Keep panel controls silent</small></span></button></div>}
    </section>}
    <footer><div className="footer-tools"><button className={`settings-button ${settingsOpen ? 'active' : ''}`} type="button" onClick={() => { setSettingsSection(null); setSettingsOpen(value => !value); }} aria-expanded={settingsOpen}><Settings size={15}/>{ui.settings}</button><button className="refresh-button" onClick={refreshApp} aria-label="Refresh PulseVault"><RefreshCw size={14}/>{ui.refresh}</button></div><span>{ui.footer}</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
