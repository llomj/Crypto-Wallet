import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, Calculator, ChartPie, ChevronDown, CircleDollarSign, Copy, Eye, EyeOff, FlaskConical, FolderPlus, Info, Languages, LockKeyhole, Network as NetworkIcon, Palette, Radio, RefreshCw, ScanSearch, Settings, ShieldCheck, SlidersHorizontal, Trash2, Vibrate, Volume2, VolumeX, WalletCards, X } from 'lucide-react';
import { createChart, IChartApi, ISeriesApi, LineStyle, LineSeries } from 'lightweight-charts';
import './styles.css';

type ChainNetwork = 'PulseChain' | 'Ethereum';
type Network = ChainNetwork | 'Both';
type Language = 'en' | 'fr' | 'es' | 'nl';
type FiatCurrency = 'USD' | 'XPF' | 'AUD' | 'CAD' | 'CHF' | 'EUR' | 'GBP' | 'JPY' | 'NZD' | 'SGD';
type SettingsSection = 'currency' | 'customize' | 'info' | 'language' | 'network' | 'sound' | null;
type CustomPanel = 'tracked' | 'address' | 'newWallet' | 'allocation' | 'hexStakes' | 'hexCalculator' | 'hexSimulator' | 'sentiment';
type PanelTheme = 'default' | 'pink' | 'green' | 'cyan' | 'purple' | 'gold' | 'red' | 'blue' | 'teal' | 'orange' | 'silver' | 'hex' | 'pulse' | 'aurora' | 'cyber' | 'sunset' | 'ocean' | 'toxic' | 'ember' | 'prism' | 'plasma';
type TrackedWallet = { id: string; label: string; address: string; network: Network; groupId?: string };
type WalletGroup = { id: string; name: string };
type Asset = { id: string; symbol: string; name: string; amount: string; price: number | null; value: number | null; icon: string | null; network: ChainNetwork; native?: boolean; decimals?: number };
type Portfolio = { assets: Asset[]; loading: boolean; error: string; refreshedAt: number | null; network: Network };
type HexStake = { id: string; walletId: string; walletLabel: string; walletAddress: string; network: ChainNetwork; stakeId: string; stakedHex: number; lockedDay: number; stakedDays: number; endDay: number; unlockedDay: number; currentDay: number; price: number | null };
type HexEndedStake = { id: string; walletId: string; walletLabel: string; walletAddress: string; network: ChainNetwork; stakeId: string; endedAt: number; stakedHex: number; returnedHex: number; price: number | null };
type HexStakeState = { stakes: HexStake[]; endedStakes: HexEndedStake[]; loading: boolean; error: string; refreshedAt: number | null; network: Network };
type HexCalculatorMetrics = { network: ChainNetwork; shareRate: number; oneTShareHex: number; dailyHexPerTShare: number; price: number | null; sampleDays: number; loading: boolean; error: string };
type HexLiquidHolding = { walletId: string; network: ChainNetwork; amount: number; value: number | null; loading: boolean };
type MarketSentimentState = { bitcoin: number | null; bitcoinLabel: string; ethereum: number | null; pulseChain: number | null; btcDominance: number | null; ethDominance: number | null; pulseDominance: number | null; altDominance: number | null; ehexEthereumDominance: number | null; phexPulseDominance: number | null; refreshedAt: number | null; loading: boolean; error: string };
type TokenStats = {
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  liquidity: number;
  supply: string;
  holders: string;
  staked?: string;
  loading: boolean;
  error: string;
};
const STORAGE_KEY = 'pulse-vault-private-wallets-v2';
const GROUP_STORAGE_KEY = 'pulse-vault-wallet-groups-v1';
const NETWORK_STORAGE_KEY = 'pulse-vault-active-network-v1';
const LANGUAGE_STORAGE_KEY = 'pulse-vault-language-v1';
const SETTINGS_TRANSPARENCY_STORAGE_KEY = 'pulse-vault-settings-transparency-v1';
const SOUND_STORAGE_KEY = 'pulse-vault-panel-sound-v1';
const HAPTIC_STORAGE_KEY = 'pulse-vault-panel-haptic-v1';
const PANEL_THEMES_STORAGE_KEY = 'pulse-vault-panel-themes-v1';
const CUSTOM_GRADIENTS_STORAGE_KEY = 'pulse-vault-custom-gradients-v1';
const MARKET_SENTIMENT_CACHE_KEY = 'pulse-vault-market-sentiment-v1';
const FIAT_CURRENCY_STORAGE_KEY = 'pulse-vault-fiat-currency-v1';
const FIAT_RATES_STORAGE_KEY = 'pulse-vault-fiat-rates-v1';
const PORTFOLIO_CACHE_KEY = 'pulse-vault-last-portfolios-v1';
const SWAP_PRICE_CACHE_KEY = 'pulse-vault-last-swap-prices-v1';
const DEFAULT_GROUP_ID = 'my-wallet';
const PANEL_OPTIONS: { id: CustomPanel; label: string; cssVariable: string }[] = [
  { id: 'tracked', label: 'Tracked wallets', cssVariable: '--tracked-panel-border' },
  { id: 'address', label: 'Public address', cssVariable: '--address-panel-border' },
  { id: 'newWallet', label: 'New wallet', cssVariable: '--new-wallet-border' },
  { id: 'allocation', label: 'Allocation', cssVariable: '--allocation-border' },
  { id: 'hexStakes', label: 'HEX stakes', cssVariable: '--hex-stakes-border' },
  { id: 'hexCalculator', label: 'HEX calculator', cssVariable: '--hex-calculator-border' },
  { id: 'hexSimulator', label: 'HEX simulation', cssVariable: '--hex-simulator-border' },
  { id: 'sentiment', label: 'Market sentiment', cssVariable: '--sentiment-border' },
];
const PANEL_THEME_GRADIENTS: Record<Exclude<PanelTheme, 'default'>, string> = {
  pink: 'linear-gradient(135deg,#ff2ca8,#ff2ca8)',
  green: 'linear-gradient(135deg,#00ed94,#00ed94)',
  cyan: 'linear-gradient(135deg,#14d9ff,#14d9ff)',
  purple: 'linear-gradient(135deg,#8c38ff,#8c38ff)',
  gold: 'linear-gradient(135deg,#ffcf24,#ffcf24)',
  red: 'linear-gradient(135deg,#ff405f,#ff405f)',
  blue: 'linear-gradient(135deg,#397cff,#397cff)',
  teal: 'linear-gradient(135deg,#12cdb4,#12cdb4)',
  orange: 'linear-gradient(135deg,#ff7a18,#ff7a18)',
  silver: 'linear-gradient(135deg,#aeb8ca,#aeb8ca)',
  hex: 'linear-gradient(118deg,#ff2ca8 0%,#ff3f68 24%,#ff7a18 48%,#ffd229 66%,#fa3ba9 84%,#8c38ff 100%)',
  pulse: 'linear-gradient(125deg,#14d9ff,#8c38ff 42%,#ff2ca8 74%,#ff7a18)',
  aurora: 'linear-gradient(125deg,#00ed94,#14d9ff 48%,#4778ff 78%,#8c38ff)',
  cyber: 'linear-gradient(125deg,#ff2ca8,#8c38ff 36%,#14d9ff 70%,#00ed94)',
  sunset: 'linear-gradient(125deg,#ff304a,#ff7a18 46%,#ffd229)',
  ocean: 'linear-gradient(125deg,#0077ff,#14d9ff 48%,#00ed94)',
  toxic: 'linear-gradient(125deg,#c6ff00,#00ed94 48%,#14d9ff)',
  ember: 'linear-gradient(125deg,#7d1424,#ff304a 48%,#ff9d00)',
  prism: 'linear-gradient(125deg,#ff304a,#ffcf24 28%,#00ed94 52%,#14d9ff 76%,#8c38ff)',
  plasma: 'linear-gradient(125deg,#4417a8,#8c38ff 35%,#ff2ca8 70%,#ff7a18)',
};
const SOLID_PANEL_THEMES: PanelTheme[] = ['pink', 'green', 'cyan', 'purple', 'gold', 'red', 'blue', 'teal', 'orange', 'silver'];
const GRADIENT_PANEL_THEMES: PanelTheme[] = ['hex', 'pulse', 'aurora', 'cyber', 'sunset', 'ocean', 'toxic', 'ember', 'prism', 'plasma'];
const ALLOCATION_COLORS: Record<string, string> = { ETH: '#7868f2', WETH: '#627eea', PLS: '#35d8f2', WPLS: '#35d8f2', HEX: '#ff2ca8', PHEX: '#ff9d00', PLSX: '#00ed94', PRVX: '#a84cff', INC: '#00e6a8', HDRN: '#18c8ff', ICSA: '#f5b942', PDI: '#df48ff', PDA: '#ff8c42', ASIC: '#ffcf40', USDC: '#2775ca' };
const ALLOCATION_FALLBACK_COLORS = ['#ff2ca8', '#8c38ff', '#14d9ff', '#00e6a8', '#ff9d00', '#f85f73'];
const PULSECHAIN_OA_SUPPLY: Partial<Record<string, number>> = {
  PLSX: 122e12,
  PHEX: 563e9,
  INC: 71e3,
  PRVX: 951_992_149_160,
};
const LANGUAGE_OPTIONS: { id: Language; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'es', label: 'Spanish', native: 'Español' },
  { id: 'fr', label: 'French', native: 'Français' },
  { id: 'nl', label: 'Dutch', native: 'Nederlands' },
];
const FIAT_OPTIONS: { id: FiatCurrency; label: string; region: string; symbol: string; locale: string }[] = [
  { id: 'USD', label: 'US dollar', region: 'United States', symbol: '$', locale: 'en-US' },
  { id: 'XPF', label: 'CFP franc', region: 'New Caledonia · French Pacific', symbol: 'F', locale: 'fr-NC' },
  { id: 'AUD', label: 'Australian dollar', region: 'Australia', symbol: 'A$', locale: 'en-AU' },
  { id: 'CAD', label: 'Canadian dollar', region: 'Canada', symbol: 'CA$', locale: 'en-CA' },
  { id: 'CHF', label: 'Swiss franc', region: 'Switzerland', symbol: 'CHF', locale: 'fr-CH' },
  { id: 'EUR', label: 'Euro', region: 'Euro area', symbol: '€', locale: 'fr-FR' },
  { id: 'GBP', label: 'Pound sterling', region: 'United Kingdom', symbol: '£', locale: 'en-GB' },
  { id: 'JPY', label: 'Japanese yen', region: 'Japan', symbol: '¥', locale: 'ja-JP' },
  { id: 'NZD', label: 'New Zealand dollar', region: 'New Zealand', symbol: 'NZ$', locale: 'en-NZ' },
  { id: 'SGD', label: 'Singapore dollar', region: 'Singapore', symbol: 'S$', locale: 'en-SG' },
];
const DEFAULT_FIAT_RATES: Record<FiatCurrency, number | null> = { USD: 1, XPF: null, AUD: null, CAD: null, CHF: null, EUR: null, GBP: null, JPY: null, NZD: null, SGD: null };
let activeFiatCurrency: FiatCurrency = 'USD';
let activeFiatRates: Record<FiatCurrency, number | null> = { ...DEFAULT_FIAT_RATES };
const UI_COPY = {
  en: { hero: '', privateView: 'Private Wallet Portfolio', subtitle: 'Track your PulseChain and Ethereum wallets from one mobile-first, watch-only dashboard.', noConnection: 'No wallet connection', noSeed: 'No seed phrase', builtFor: 'BUILT FOR THE ECOSYSTEM', addAddress: 'ADD AN ADDRESS', enterAddress: 'Enter a public address', privateWatchlist: 'PRIVATE WATCHLIST', trackedWallets: 'Your tracked wallets', reveal: 'Reveal', hide: 'Hide', totalPortfolio: 'TOTAL PORTFOLIO', syncing: 'Syncing…', syncAll: 'Sync all', address: 'address', addresses: 'addresses', showCards: 'Show cards', hideCards: 'Hide cards', liveAssets: 'Live assets', selectedAddress: 'SELECTED ADDRESS', showDust: 'Show dust', hideDust: 'Hide dust', organize: 'ORGANIZE YOUR WATCHLIST', createAnother: 'Create another wallet', createdWallets: 'Created wallets', allocation: 'Portfolio allocation', allocationEyebrow: 'CRYPTOCURRENCY MIX', noAllocation: 'No priced assets are available for this wallet yet.', settings: 'Settings', language: 'Language', refresh: 'Refresh', footer: 'Watch-only portfolio intelligence' },
  fr: { hero: '', privateView: 'Portefeuille privé.', subtitle: 'Suivez vos portefeuilles PulseChain et Ethereum depuis un tableau de bord mobile en lecture seule.', noConnection: 'Aucune connexion wallet', noSeed: 'Aucune phrase secrète', builtFor: 'CONÇU POUR L’ÉCOSYSTÈME', addAddress: 'AJOUTER UNE ADRESSE', enterAddress: 'Saisir une adresse publique', privateWatchlist: 'LISTE PRIVÉE', trackedWallets: 'Vos portefeuilles suivis', reveal: 'Afficher', hide: 'Masquer', totalPortfolio: 'PORTEFEUILLE TOTAL', syncing: 'Synchronisation…', syncAll: 'Tout synchroniser', address: 'adresse', addresses: 'adresses', showCards: 'Afficher les cartes', hideCards: 'Masquer les cartes', liveAssets: 'Actifs en direct', selectedAddress: 'ADRESSE SÉLECTIONNÉE', showDust: 'Afficher la poussière', hideDust: 'Masquer la poussière', organize: 'ORGANISER VOTRE LISTE', createAnother: 'Créer un autre portefeuille', createdWallets: 'Portefeuilles créés', allocation: 'Répartition du portefeuille', allocationEyebrow: 'MIX DE CRYPTOMONNAIES', noAllocation: 'Aucun actif valorisé disponible pour ce portefeuille.', settings: 'Réglages', language: 'Langue', refresh: 'Actualiser', footer: 'Suivi de portefeuille en lecture seule' },
  es: { hero: '', privateView: 'Cartera privada.', subtitle: 'Sigue tus carteras de PulseChain y Ethereum desde un panel móvil de solo lectura.', noConnection: 'Sin conexión de cartera', noSeed: 'Sin frase semilla', builtFor: 'CREADO PARA EL ECOSISTEMA', addAddress: 'AÑADIR UNA DIRECCIÓN', enterAddress: 'Introduce una dirección pública', privateWatchlist: 'LISTA PRIVADA', trackedWallets: 'Tus carteras seguidas', reveal: 'Mostrar', hide: 'Ocultar', totalPortfolio: 'CARTERA TOTAL', syncing: 'Sincronizando…', syncAll: 'Sincronizar todo', address: 'dirección', addresses: 'direcciones', showCards: 'Mostrar tarjetas', hideCards: 'Ocultar tarjetas', liveAssets: 'Activos en directo', selectedAddress: 'DIRECCIÓN SELECCIONADA', showDust: 'Mostrar polvo', hideDust: 'Ocultar polvo', organize: 'ORGANIZA TU LISTA', createAnother: 'Crear otra cartera', createdWallets: 'Carteras creadas', allocation: 'Distribución de la cartera', allocationEyebrow: 'MEZCLA DE CRIPTOMONEDAS', noAllocation: 'Todavía no hay activos con precio para esta cartera.', settings: 'Ajustes', language: 'Idioma', refresh: 'Actualizar', footer: 'Seguimiento de cartera de solo lectura' },
  nl: { hero: '', privateView: 'Privé walletportfolio.', subtitle: 'Volg je PulseChain- en Ethereum-wallets in één mobiel, alleen-lezen dashboard.', noConnection: 'Geen walletverbinding', noSeed: 'Geen herstelzin', builtFor: 'GEBOUWD VOOR HET ECOSYSTEEM', addAddress: 'ADRES TOEVOEGEN', enterAddress: 'Voer een openbaar adres in', privateWatchlist: 'PRIVÉVOLGLIJST', trackedWallets: 'Je gevolgde wallets', reveal: 'Tonen', hide: 'Verbergen', totalPortfolio: 'TOTALE PORTFOLIO', syncing: 'Synchroniseren…', syncAll: 'Alles vernieuwen', address: 'adres', addresses: 'adressen', showCards: 'Kaarten tonen', hideCards: 'Kaarten verbergen', liveAssets: 'Live activa', selectedAddress: 'GESELECTEERD ADRES', showDust: 'Dust tonen', hideDust: 'Dust verbergen', organize: 'ORGANISEER JE VOLGLIJST', createAnother: 'Nog een wallet maken', createdWallets: 'Aangemaakte wallets', allocation: 'Portfolioverdeling', allocationEyebrow: 'CRYPTO-MIX', noAllocation: 'Er zijn nog geen activa met prijs beschikbaar voor deze wallet.', settings: 'Instellingen', language: 'Taal', refresh: 'Vernieuwen', footer: 'Alleen-lezen portfolio-inzicht' },
} as const;
const FEATURED_SYMBOLS = new Set(['PLS', 'WPLS', 'ETH', 'WETH', 'PLSX', 'HEX', 'PHEX', 'INC', 'PRVX', 'HDRN', 'ICSA', 'PDI', 'PDAI', 'ASIC', 'PDA', 'PLSD', 'USDC', 'USDT', 'BTC', 'WBTC']);
const HIDDEN_DUST_SYMBOLS = new Set(['FTVC', 'SCIVIVE', 'SCIVVE', 'SCIVVI', 'SCIVVII', 'SCIVV', 'RHPEPE', 'HXY']);
const WRAPPED_NATIVE: Record<ChainNetwork, string> = {
  PulseChain: '0xA1077a294dDe1B09bB078844Df40758a5D0f9a27',
  Ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};
const PDAI_ICON_URL = 'https://cdn.dexscreener.com/cms/images/f5d7803513d354423216d2e075a923570577681f0a877bde8e7e3a0f56d0ca1d?width=800&height=800&quality=95&format=auto';
const PLSD_ICON_URL = 'https://cdn.dexscreener.com/cms/images/77332210fa6e6ffee65eb467aaf3a64c315289a6f6a53a9201a0d1a72548ba6c?width=800&height=800&quality=95&format=auto';
const VERIFIED_TOKEN_CONTRACTS: Partial<Record<ChainNetwork, Record<string, string>>> = {
  Ethereum: {
    HEX: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    WETH: WRAPPED_NATIVE.Ethereum,
    HDRN: '0x3819f64f282bf135d62168C1e513280dAF905e06',
    ICSA: '0xfc4913214444af5c715cc9f7b52655e788a569ed',
    PLSD: '0x34F0915a5f15a66Eba86F6a58bE1A471FB7836A7',
    USDC: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  PulseChain: {
    HEX: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    WPLS: WRAPPED_NATIVE.PulseChain,
    PLSX: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
    PRVX: '0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11',
    INC: '0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',
    HDRN: '0x3819f64f282bf135d62168C1e513280dAF905e06',
    ICSA: '0xfc4913214444af5c715cc9f7b52655e788a569ed',
    WETH: WRAPPED_NATIVE.Ethereum,
    ASIC: '0x347a96a5BD06D2E15199b032F46fB724d6c73047',
    PDI: '0xC50948bac01116F246259070Ea6084C04649efDF',
    USDC: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    PDAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    PLSD: '0x34F0915a5f15a66Eba86F6a58bE1A471FB7836A7',
  },
};
const RPC_URLS: Record<ChainNetwork, string[]> = {
  PulseChain: [import.meta.env.VITE_PULSECHAIN_RPC_URL || 'https://rpc.pulsechain.com'],
  Ethereum: [import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com'],
};
const GECKO_NETWORK: Record<ChainNetwork, string> = { PulseChain: 'pulsechain', Ethereum: 'eth' };
const ETH_USD_FEED = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';
const HEX_LAUNCH_MS = Date.UTC(2019, 11, 3);
const PULSECHAIN_LAUNCH_MS = Date.UTC(2023, 4, 13);
const HEX_STAKE_SELECTORS = { currentDay: '0x5c9302c9', stakeCount: '0x33060d90', stakeLists: '0x2607443b' } as const;
const HEX_CALCULATOR_SELECTORS = { globals: '0xc3124525', dailyDataRange: '0x6a210a0e' } as const;
const HEX_STAKE_END_TOPIC = '0x72d9c5a7ab13846e08d9c838f9e866a1bb4a66a2fd3ba3c9e7da3cf9e394dfd7';
const chartRequestCache = new Map<string, Promise<{ time: number; value: number }[]>>();
const CHART_STORAGE_KEY = 'pulse-vault-chart-cache-v1';
const CHART_STORAGE_TTL_MS = 15 * 60 * 1000;
let pulseChainStatsSnapshotRequest: Promise<Record<string, any>> | null = null;
let pulseStakedSupplyRequest: Promise<string | null> | null = null;
const hexStakedSupplyRequests = new Map<ChainNetwork, Promise<string | null>>();
let geckoRequestQueue: Promise<unknown> = Promise.resolve();
let lastGeckoRequestAt = 0;
const CORE_ICONS: Record<string, string> = {
  ETH: `${import.meta.env.BASE_URL}token-icons/eth.png`,
  PLS: `${import.meta.env.BASE_URL}token-icons/pls.png`,
  WPLS: `${import.meta.env.BASE_URL}token-icons/pls.png`,
  PLSX: `${import.meta.env.BASE_URL}token-icons/plsx.png`,
  HEX: `${import.meta.env.BASE_URL}token-icons/hex.png`,
  CHEX: `${import.meta.env.BASE_URL}token-icons/hex.png`,
  INC: `${import.meta.env.BASE_URL}token-icons/inc.png`,
  PHEX: `${import.meta.env.BASE_URL}token-icons/phex.png`,
  USDC: `${import.meta.env.BASE_URL}token-icons/usdc.png`,
  USDT: `${import.meta.env.BASE_URL}token-icons/usdt.svg`,
  BTC: `${import.meta.env.BASE_URL}token-icons/btc.svg`,
  WBTC: `${import.meta.env.BASE_URL}token-icons/wbtc.svg`,
  WETH: `${import.meta.env.BASE_URL}token-icons/eth.png`,
  HDRN: `${import.meta.env.BASE_URL}token-icons/hdrn.png`,
  ICSA: `${import.meta.env.BASE_URL}token-icons/icsa.png`,
  ASIC: `${import.meta.env.BASE_URL}token-icons/asic.png`,
  PDA: `${import.meta.env.BASE_URL}token-icons/pda.png`,
  PDAI: PDAI_ICON_URL,
  PDI: `${import.meta.env.BASE_URL}token-icons/pdi.png`,
  PRVX: `${import.meta.env.BASE_URL}token-icons/prvx.png`,
  PLSD: PLSD_ICON_URL,
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
  cHEX: {
    symbol: 'cHEX',
    name: 'Combined HEX',
    subtitle: 'Ethereum HEX + PulseChain pHEX',
    contract: '0x2B591e99afE9f32eAA6214f7B7629768c40Eeb39',
    network: 'Both',
    color: '#D73CFF',
    borderGradient: 'linear-gradient(90deg, #FF1493, #FF9D00 36%, #8B5CF6 68%, #14D9FF)',
  },
  HDRN_PULSE: { symbol: 'HDRN', name: 'Hedron', subtitle: 'PulseChain', contract: VERIFIED_TOKEN_CONTRACTS.PulseChain!.HDRN, network: 'PulseChain', color: '#18c8ff', borderGradient: 'linear-gradient(90deg,#18c8ff,#725cff)' },
  HDRN_ETH: { symbol: 'HDRN', name: 'Hedron', subtitle: 'Ethereum', contract: VERIFIED_TOKEN_CONTRACTS.Ethereum!.HDRN, network: 'Ethereum', color: '#18c8ff', borderGradient: 'linear-gradient(90deg,#18c8ff,#725cff)' },
  ICSA_PULSE: { symbol: 'ICSA', name: 'Icosa', subtitle: 'PulseChain', contract: VERIFIED_TOKEN_CONTRACTS.PulseChain!.ICSA, network: 'PulseChain', color: '#f5b942', borderGradient: 'linear-gradient(90deg,#f5b942,#ff6f91)' },
  ICSA_ETH: { symbol: 'ICSA', name: 'Icosa', subtitle: 'Ethereum', contract: VERIFIED_TOKEN_CONTRACTS.Ethereum!.ICSA, network: 'Ethereum', color: '#f5b942', borderGradient: 'linear-gradient(90deg,#f5b942,#ff6f91)' },
  ASIC_PULSE: { symbol: 'ASIC', name: 'Application Specific Internet Coin', subtitle: 'PulseChain', contract: VERIFIED_TOKEN_CONTRACTS.PulseChain!.ASIC, network: 'PulseChain', color: '#ffcf40', borderGradient: 'linear-gradient(90deg,#ffcf40,#ff6b35)' },
  PDI_PULSE: { symbol: 'PDI', name: 'Pindex', subtitle: 'PulseChain', contract: VERIFIED_TOKEN_CONTRACTS.PulseChain!.PDI, network: 'PulseChain', color: '#df48ff', borderGradient: 'linear-gradient(90deg,#df48ff,#5286ff)' },
  PDAI_PULSE: { symbol: 'pDAI', name: 'DAI on PulseChain', subtitle: 'PulseChain', contract: VERIFIED_TOKEN_CONTRACTS.PulseChain!.PDAI, network: 'PulseChain', color: '#16bff2', borderGradient: 'linear-gradient(90deg,#ff0f74,#b900ff 34%,#2455ff 68%,#14d9ff)' },
};
const SWAP_TOKENS = [
  { id: 'BTC', symbol: 'BTC', network: 'Both', coinGeckoId: 'bitcoin' },
  { id: 'WBTC_ETH', symbol: 'WBTC', network: 'Ethereum', coinGeckoId: 'wrapped-bitcoin' },
  { id: 'USDC_PULSE', symbol: 'USDC', network: 'PulseChain', coinGeckoId: 'usd-coin', fallbackPrice: 1 },
  { id: 'PDAI_PULSE', symbol: 'pDAI', network: 'PulseChain', source: 'PDAI_PULSE' },
  { id: 'USDT_ETH', symbol: 'USDT', network: 'Ethereum', coinGeckoId: 'tether', fallbackPrice: 1 },
  { id: 'USDT_PULSE', symbol: 'USDT', network: 'PulseChain', coinGeckoId: 'tether', fallbackPrice: 1 },
  { id: 'PLS', symbol: 'PLS', network: 'PulseChain', source: 'PLS' },
  { id: 'WPLS_PULSE', symbol: 'WPLS', network: 'PulseChain', source: 'PLS' },
  { id: 'WPLS_ETH', symbol: 'WPLS', network: 'Ethereum', source: 'PLS' },
  { id: 'PHEX', symbol: 'pHEX', network: 'PulseChain', source: 'pHEX' },
  { id: 'PLSX', symbol: 'PLSX', network: 'PulseChain', source: 'PLSX' },
  { id: 'INC', symbol: 'INC', network: 'PulseChain', source: 'INC' },
  { id: 'PRVX', symbol: 'PRVX', network: 'PulseChain', source: 'PRVX' },
  { id: 'HDRN_PULSE', symbol: 'HDRN', network: 'PulseChain', source: 'HDRN_PULSE' },
  { id: 'HDRN_ETH', symbol: 'HDRN', network: 'Ethereum', source: 'HDRN_ETH' },
  { id: 'ICSA_PULSE', symbol: 'ICSA', network: 'PulseChain', source: 'ICSA_PULSE' },
  { id: 'ICSA_ETH', symbol: 'ICSA', network: 'Ethereum', source: 'ICSA_ETH' },
  { id: 'ASIC_PULSE', symbol: 'ASIC', network: 'PulseChain', source: 'ASIC_PULSE' },
  { id: 'WETH_PULSE', symbol: 'WETH', network: 'PulseChain', source: 'ETH' },
  { id: 'ETH', symbol: 'ETH', network: 'Ethereum', source: 'ETH' },
  { id: 'HEX', symbol: 'HEX', network: 'Ethereum', source: 'HEX' },
] as const;
type SwapTokenKey = typeof SWAP_TOKENS[number]['id'];
type SwapTokenDefinition = typeof SWAP_TOKENS[number];

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

function readHapticEnabled() {
  try { return localStorage.getItem(HAPTIC_STORAGE_KEY) === 'true'; }
  catch { return false; }
}

function readPanelThemes(): Partial<Record<CustomPanel, PanelTheme>> {
  try {
    const saved = JSON.parse(localStorage.getItem(PANEL_THEMES_STORAGE_KEY) || '{}') as Record<string, unknown>;
    const panelIds = new Set(PANEL_OPTIONS.map(option => option.id));
    const themes = new Set<PanelTheme>(['default', ...Object.keys(PANEL_THEME_GRADIENTS) as Exclude<PanelTheme, 'default'>[]]);
    return Object.fromEntries(Object.entries(saved).filter(([panel, theme]) => panelIds.has(panel as CustomPanel) && themes.has(theme as PanelTheme))) as Partial<Record<CustomPanel, PanelTheme>>;
  } catch { return {}; }
}

function readPortfolioCache(): Record<string, Portfolio> {
  try {
    const saved = JSON.parse(localStorage.getItem(PORTFOLIO_CACHE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}

function cachedPortfolio(walletId: string, network: Network) {
  return readPortfolioCache()[`${walletId}:${network}`];
}

function savePortfolioCache(walletId: string, portfolio: Portfolio) {
  try {
    const cache = readPortfolioCache();
    cache[`${walletId}:${portfolio.network}`] = portfolio;
    localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(cache));
  } catch { /* Offline data is best-effort when device storage is unavailable. */ }
}

function readSwapPriceCache(): Partial<Record<SwapTokenKey, number>> {
  try {
    const saved = JSON.parse(localStorage.getItem(SWAP_PRICE_CACHE_KEY) || '{}') as Partial<Record<SwapTokenKey, number>>;
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}

function saveSwapPriceCache(prices: Partial<Record<SwapTokenKey, number>>) {
  try { localStorage.setItem(SWAP_PRICE_CACHE_KEY, JSON.stringify(prices)); }
  catch { /* Keep the live quote even if storage is unavailable. */ }
}

function emptyMarketSentiment(): MarketSentimentState {
  return { bitcoin: null, bitcoinLabel: '', ethereum: null, pulseChain: null, btcDominance: null, ethDominance: null, pulseDominance: null, altDominance: null, ehexEthereumDominance: null, phexPulseDominance: null, refreshedAt: null, loading: false, error: '' };
}

function readMarketSentimentCache(): MarketSentimentState {
  try {
    const saved = JSON.parse(localStorage.getItem(MARKET_SENTIMENT_CACHE_KEY) || 'null');
    return saved && typeof saved === 'object' ? { ...emptyMarketSentiment(), ...saved, loading: false } : emptyMarketSentiment();
  } catch { return emptyMarketSentiment(); }
}

function saveMarketSentimentCache(state: MarketSentimentState) {
  try { localStorage.setItem(MARKET_SENTIMENT_CACHE_KEY, JSON.stringify({ ...state, loading: false })); }
  catch { /* Live sentiment remains usable if device storage is unavailable. */ }
}

function readCustomGradients(): Partial<Record<CustomPanel, { from: string; to: string }>> {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_GRADIENTS_STORAGE_KEY) || '{}') as Record<string, { from?: unknown; to?: unknown }>;
    return Object.fromEntries(Object.entries(saved).filter(([panel, colors]) => PANEL_OPTIONS.some(option => option.id === panel) && /^#[0-9a-f]{6}$/i.test(String(colors.from)) && /^#[0-9a-f]{6}$/i.test(String(colors.to)))) as Partial<Record<CustomPanel, { from: string; to: string }>>;
  } catch { return {}; }
}

function triggerHaptic() {
  try { navigator.vibrate?.(18); }
  catch { /* Haptics are best-effort and browser controlled. */ }
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
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.012);
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
function isHiddenDustAsset(asset: Pick<Asset, 'symbol' | 'name'>) {
  return [asset.symbol, asset.name].map(tokenKey).some(label =>
    HIDDEN_DUST_SYMBOLS.has(label) || [...HIDDEN_DUST_SYMBOLS].some(dust => label.includes(dust)),
  );
}
function validAddress(value: string) { return /^0x[a-fA-F0-9]{40}$/.test(value.trim()); }
function networkLabel(network: Network) { return network === 'Both' ? 'PulseChain + Ethereum' : network; }
function assetContract(asset: Asset) { return asset.id.replace(/^(PulseChain|Ethereum):/, '').toLowerCase(); }
function displayAssetSymbol(asset: Asset) {
  const symbol = tokenKey(asset.symbol);
  const canonicalHex = VERIFIED_TOKEN_CONTRACTS[asset.network]?.HEX.toLowerCase();
  const canonicalPdai = VERIFIED_TOKEN_CONTRACTS.PulseChain?.PDAI.toLowerCase();
  if (asset.network === 'PulseChain' && assetContract(asset) === canonicalPdai) return 'pDAI';
  return symbol === 'HEX' && asset.network === 'PulseChain' && assetContract(asset) === canonicalHex ? 'pHEX' : asset.symbol;
}
function isVerifiedCoreAsset(asset: Asset) {
  if (asset.native) return true;
  const displayKey = tokenKey(displayAssetSymbol(asset));
  const contractKey = displayKey === 'PHEX' ? 'HEX' : displayKey;
  const expectedContract = VERIFIED_TOKEN_CONTRACTS[asset.network]?.[contractKey];
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
  if (Math.abs(number) >= 1_000_000_000_000) return `${(number / 1_000_000_000_000).toFixed(decimals)}T`;
  if (Math.abs(number) >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(decimals)}B`;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(decimals)}K`;
  return number.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function compactSupply(value: string) {
  return compactAmount(value, 2);
}
function readFiatCurrency(): FiatCurrency {
  try {
    const saved = localStorage.getItem(FIAT_CURRENCY_STORAGE_KEY) as FiatCurrency | null;
    return FIAT_OPTIONS.some(option => option.id === saved) ? saved! : 'USD';
  } catch { return 'USD'; }
}
function readFiatRates(): Record<FiatCurrency, number | null> {
  try {
    const saved = JSON.parse(localStorage.getItem(FIAT_RATES_STORAGE_KEY) || '{}') as Partial<Record<FiatCurrency, unknown>>;
    return Object.fromEntries(FIAT_OPTIONS.map(option => [option.id, option.id === 'USD' ? 1 : Number(saved[option.id]) > 0 ? Number(saved[option.id]) : null])) as Record<FiatCurrency, number | null>;
  } catch { return { ...DEFAULT_FIAT_RATES }; }
}
function setActiveFiat(currency: FiatCurrency, rates: Record<FiatCurrency, number | null>) {
  activeFiatCurrency = currency;
  activeFiatRates = rates;
}
function formatFiat(value: number, compact = false) {
  const option = FIAT_OPTIONS.find(item => item.id === activeFiatCurrency)!;
  const rate = activeFiatRates[activeFiatCurrency];
  if (!(rate && rate > 0)) return `${option.symbol}—`;
  const converted = value * rate;
  const small = converted > 0 && converted < 1;
  return new Intl.NumberFormat(option.locale, {
    style: 'currency', currency: option.id, currencyDisplay: 'narrowSymbol',
    ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : small ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: option.id === 'XPF' || option.id === 'JPY' ? 0 : 2 }),
  }).format(converted);
}
function compactUsd(value: number) {
  return value > 0 ? formatFiat(value, true) : 'N/A';
}
function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Price unavailable';
  return formatFiat(value);
}

function usdcPlaceholder(network: ChainNetwork): Asset {
  return {
    id: `${network}:${VERIFIED_TOKEN_CONTRACTS[network]!.USDC}`, symbol: 'USDC', name: 'USD Coin', amount: '0', price: 1, value: 0,
    icon: CORE_ICONS.USDC, network, decimals: 6,
  };
}

function ensureUsdcAssets(assets: Asset[], network: Network) {
  const networks: ChainNetwork[] = network === 'Both' ? ['PulseChain', 'Ethereum'] : [network];
  const next = [...assets];
  for (const chain of networks) {
    if (!next.some(asset => asset.network === chain && tokenKey(asset.symbol) === 'USDC')) next.push(usdcPlaceholder(chain));
  }
  return next;
}

const PULSE_LEAGUE_SUPPLY: Record<string, number> = {
  PLS: 15.4e12,
  PLSX: 19.6e12,
  PHEX: 70.5e9,
  INC: 55.46e6,
  PRVX: 320.7e9,
};
const PULSE_LEAGUES = [
  { label: 'Poseidon', emoji: '🔱', percent: 10 },
  { label: 'Whale', emoji: '🐋', percent: 1 },
  { label: 'Shark', emoji: '🦈', percent: 0.1 },
  { label: 'Dolphin', emoji: '🐬', percent: 0.01 },
  { label: 'Squid', emoji: '🦑', percent: 0.001 },
  { label: 'Turtle', emoji: '🐢', percent: 0.0001 },
] as const;

function pulseLeagueForAssets(assets: Asset[]) {
  const holdings = new Map<string, number>();
  for (const asset of assets) {
    if (asset.network !== 'PulseChain') continue;
    let symbol = tokenKey(displayAssetSymbol(asset));
    if (symbol === 'WPLS') symbol = 'PLS';
    if (!PULSE_LEAGUE_SUPPLY[symbol]) continue;
    holdings.set(symbol, (holdings.get(symbol) ?? 0) + Math.max(0, Number(asset.amount) || 0));
  }
  const highestPercent = [...holdings].reduce((highest, [symbol, amount]) => Math.max(highest, amount / PULSE_LEAGUE_SUPPLY[symbol] * 100), 0);
  return PULSE_LEAGUES.find(league => highestPercent >= league.percent)
    ?? { label: 'Shrimp', emoji: '🦐', percent: 0.000001 } as const;
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

function dexPairTokenPrice(pair: any, targetAddress: string) {
  const base = String(pair?.baseToken?.address ?? '').toLowerCase();
  const quote = String(pair?.quoteToken?.address ?? '').toLowerCase();
  const baseUsd = Number(pair?.priceUsd ?? 0);
  const quotePerBase = Number(pair?.priceNative ?? 0);
  if (base === targetAddress && baseUsd > 0) return baseUsd;
  if (quote === targetAddress && baseUsd > 0 && quotePerBase > 0) return baseUsd / quotePerBase;
  return 0;
}

function aggregateDexTokenMarket(pairs: any[], targetAddress: string) {
  const priced = pairs.flatMap(pair => {
    const price = dexPairTokenPrice(pair, targetAddress);
    const liquidity = Math.max(0, Number(pair?.liquidity?.usd ?? 0));
    return price > 0 && Number.isFinite(price) ? [{ pair, price, liquidity }] : [];
  });
  if (!priced.length) return null;
  const liquid = priced.filter(item => item.liquidity > 0);
  const candidates = liquid.length ? liquid : priced;
  const totalWeight = candidates.reduce((total, item) => total + (item.liquidity || 1), 0);
  const price = candidates.reduce((total, item) => total + item.price * (item.liquidity || 1), 0) / totalWeight;
  const mostLiquid = [...candidates].sort((left, right) => right.liquidity - left.liquidity)[0];
  const targetIsBase = String(mostLiquid.pair?.baseToken?.address ?? '').toLowerCase() === targetAddress;
  const image = targetIsBase && typeof mostLiquid.pair?.info?.imageUrl === 'string' ? mostLiquid.pair.info.imageUrl : null;
  return { price, icon: image };
}

const PULSECHAIN_PRIORITY_PRICE_CONTRACTS = new Set([
  VERIFIED_TOKEN_CONTRACTS.PulseChain!.WPLS,
  VERIFIED_TOKEN_CONTRACTS.PulseChain!.HDRN,
  VERIFIED_TOKEN_CONTRACTS.PulseChain!.ICSA,
  VERIFIED_TOKEN_CONTRACTS.PulseChain!.PDAI,
].map(contract => contract.toLowerCase()));

async function enrichMarketAssets(assets: Asset[], network: ChainNetwork) {
  const chainId = network === 'PulseChain' ? 'pulsechain' : 'ethereum';
  const prioritized = [...assets.filter(asset => FEATURED_SYMBOLS.has(tokenKey(displayAssetSymbol(asset)))), ...assets];
  const unique = prioritized.filter((asset, index, list) => list.findIndex(item => item.id.toLowerCase() === asset.id.toLowerCase()) === index).slice(0, 30);
  const enriched = new Map<string, { price: number; icon: string | null }>();
  const contracts = unique.map(asset => ({ asset, contract: asset.native ? WRAPPED_NATIVE[network] : asset.id })).filter(item => validAddress(item.contract));
  try {
    const data = await jsonRequest(`https://api.dexscreener.com/latest/dex/tokens/${contracts.map(item => item.contract).join(',')}`, 10000);
    const pairs = (Array.isArray(data.pairs) ? data.pairs : []).filter((pair: any) => pair.chainId === chainId);
    for (const item of contracts) {
      const targetAddress = item.contract.toLowerCase();
      const market = aggregateDexTokenMarket(pairs.filter((candidate: any) => {
        const base = String(candidate?.baseToken?.address ?? '').toLowerCase();
        const quote = String(candidate?.quoteToken?.address ?? '').toLowerCase();
        return base === targetAddress || quote === targetAddress;
      }), targetAddress);
      if (market) enriched.set(item.asset.id, market);
    }
  } catch { /* GeckoTerminal is the next DEX-data source. */ }
  if (network === 'PulseChain') {
    const priorityMissing = contracts.filter(item => !enriched.has(item.asset.id) && PULSECHAIN_PRIORITY_PRICE_CONTRACTS.has(item.contract.toLowerCase()));
    const priorityResults = await Promise.allSettled(priorityMissing.map(async item => {
      const data = await jsonRequest(`https://api.dexscreener.com/latest/dex/tokens/${item.contract}`, 10000, 3);
      const pairs = (Array.isArray(data?.pairs) ? data.pairs : []).filter((pair: any) => pair.chainId === chainId);
      return { item, market: aggregateDexTokenMarket(pairs, item.contract.toLowerCase()) };
    }));
    priorityResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.market) enriched.set(result.value.item.asset.id, result.value.market);
    });
  }
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

function preserveKnownAssetPrices(assets: Asset[], previousAssets: Asset[]) {
  const previous = new Map(previousAssets.filter(asset => asset.price !== null && asset.price > 0).map(asset => [`${asset.network}:${assetContract(asset)}`, asset]));
  return assets.map(asset => {
    if (asset.price !== null && asset.price > 0) return asset;
    const saved = previous.get(`${asset.network}:${assetContract(asset)}`);
    if (!saved?.price) return asset;
    return { ...asset, price: saved.price, value: Number(asset.amount) * saved.price, icon: asset.icon || saved.icon };
  });
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
  if (wallet.network !== 'Both') return ensureUsdcAssets(await loadChainPortfolio(wallet.address, wallet.network), wallet.network);
  const chainResults = await Promise.allSettled([
    loadChainPortfolio(wallet.address, 'PulseChain'),
    loadChainPortfolio(wallet.address, 'Ethereum'),
  ]);
  const networks: ChainNetwork[] = ['PulseChain', 'Ethereum'];
  const combined = chainResults.flatMap((result, index) => result.status === 'fulfilled'
    ? result.value.map(asset => ({ ...asset, id: `${networks[index]}:${asset.id}` }))
    : []);
  if (!combined.length) throw new Error('Both network portfolio requests failed.');
  return ensureUsdcAssets(combined.sort((left, right) => (right.value ?? -1) - (left.value ?? -1)), 'Both');
}

function liquidHexHolding(assets: Asset[], network: ChainNetwork) {
  const contract = VERIFIED_TOKEN_CONTRACTS[network]?.HEX.toLowerCase();
  const matching = contract ? assets.filter(asset => asset.network === network && assetContract(asset) === contract) : [];
  return matching.reduce((holding, asset) => ({
    amount: holding.amount + Math.max(0, Number(asset.amount) || 0),
    value: asset.value === null || holding.value === null ? null : holding.value + Math.max(0, asset.value),
  }), { amount: 0, value: 0 as number | null });
}

async function fetchPulseStakedSupply() {
  if (pulseStakedSupplyRequest) return pulseStakedSupplyRequest;
  pulseStakedSupplyRequest = (async () => { try {
    const response = await fetch('https://rpc-pulsechain.g4mm4.io/beacon-api/eth/v1/beacon/states/head/validators?status=active_ongoing');
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const marker = '"status":"active_ongoing"';
    let carry = '';
    let validatorCount = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = carry + decoder.decode(value, { stream: true });
      validatorCount += chunk.split(marker).length - 1;
      carry = chunk.slice(-(marker.length - 1));
    }
    return validatorCount > 0 ? compactSupply(String(validatorCount * 32_000_000)) : null;
  } catch { return null; } })();
  return pulseStakedSupplyRequest;
}

function fetchHexStakedSupply(network: ChainNetwork) {
  const cached = hexStakedSupplyRequests.get(network);
  if (cached) return cached;
  const request = (async () => {
    try {
      const contract = VERIFIED_TOKEN_CONTRACTS[network]?.HEX;
      if (!contract) return null;
      const globalsHex = await rpcRequest<string>(network, 'eth_call', [{ to: contract, data: HEX_CALCULATOR_SELECTORS.globals }, 'latest']);
      const [lockedHeartsWord] = decodeAbiWords(globalsHex);
      if (!lockedHeartsWord) return null;
      const lockedHex = Number(BigInt(`0x${lockedHeartsWord}`)) / 1e8;
      return lockedHex > 0 ? compactSupply(String(lockedHex)) : null;
    } catch {
      return null;
    }
  })();
  hexStakedSupplyRequests.set(network, request);
  return request;
}

function fetchPulseChainStatsSnapshot() {
  if (pulseChainStatsSnapshotRequest) return pulseChainStatsSnapshotRequest;
  pulseChainStatsSnapshotRequest = fetch('https://r.jina.ai/http://www.pulsechainstats.com/api/data/24H')
    .then(async response => {
      if (!response.ok) throw new Error(`PulseChainStats reader returned ${response.status}`);
      const text = await response.text();
      const jsonStart = text.indexOf('{"data"');
      if (jsonStart < 0) throw new Error('PulseChainStats payload was not found');
      const payload = JSON.parse(text.slice(jsonStart).trim());
      return payload?.data ?? {};
    })
    .catch(error => {
      pulseChainStatsSnapshotRequest = null;
      throw error;
    });
  return pulseChainStatsSnapshotRequest;
}

async function fetchTokenStats(token: TokenInfo): Promise<TokenStats> {
  try {
    const baseExplorer = token.network === 'PulseChain' ? 'https://api.scan.pulsechain.com' : 'https://eth.blockscout.com';
    const chainId = token.network === 'PulseChain' ? 'pulsechain' : 'ethereum';
    const [tokenData, dexData, pulseChainSnapshot, staked] = await Promise.all([
      jsonRequest(`${baseExplorer}/api/v2/tokens/${token.contract}`, 10000).catch(() => null),
      jsonRequest(`https://api.dexscreener.com/latest/dex/tokens/${token.contract}`, 10000).catch(() => null),
      token.network === 'PulseChain' ? fetchPulseChainStatsSnapshot().catch((): Record<string, any> => ({})) : Promise.resolve<Record<string, any>>({}),
      tokenKey(token.symbol) === 'HEX' || tokenKey(token.symbol) === 'PHEX' ? fetchHexStakedSupply(token.network as ChainNetwork) : Promise.resolve(null),
    ]);

    const targetAddress = token.contract.toLowerCase();
    const pairMap = new Map<string, any>();
    for (const pair of Array.isArray(dexData?.pairs) ? dexData.pairs : []) {
      if (pair?.chainId !== chainId) continue;
      const base = String(pair?.baseToken?.address ?? '').toLowerCase();
      const quote = String(pair?.quoteToken?.address ?? '').toLowerCase();
      if (base !== targetAddress && quote !== targetAddress) continue;
      const pairId = String(pair?.pairAddress ?? `${pair?.dexId}:${base}:${quote}`).toLowerCase();
      if (!pairMap.has(pairId)) pairMap.set(pairId, pair);
    }
    const allPairs = [...pairMap.values()];
    const liquidity = allPairs.reduce((total, pair) => total + Math.max(0, Number(pair?.liquidity?.usd ?? 0)), 0);
    const pricedPairs = allPairs.filter(pair => String(pair?.baseToken?.address ?? '').toLowerCase() === targetAddress && Number(pair?.priceUsd) > 0);
    const priceWeight = pricedPairs.reduce((total, pair) => total + Math.max(0, Number(pair?.liquidity?.usd ?? 0)), 0);
    let price = priceWeight > 0
      ? pricedPairs.reduce((total, pair) => total + Number(pair.priceUsd) * Math.max(0, Number(pair?.liquidity?.usd ?? 0)), 0) / priceWeight
      : Number(pricedPairs[0]?.priceUsd ?? 0);
    let change24h = priceWeight > 0
      ? pricedPairs.reduce((total, pair) => total + Number(pair?.priceChange?.h24 ?? 0) * Math.max(0, Number(pair?.liquidity?.usd ?? 0)), 0) / priceWeight
      : Number(pricedPairs[0]?.priceChange?.h24 ?? 0);

    let supplyNumber = 0;
    let supply = 'N/A';
    let holders = 'N/A';
    if (tokenData?.total_supply) {
      const decimals = tokenData.decimals ?? 18;
      supplyNumber = Number(formatUnits(String(tokenData.total_supply), decimals));
    }
    const holderCount = Number(tokenData?.holders_count ?? tokenData?.holders ?? 0);
    if (holderCount > 0) {
      holders = holderCount >= 1000 ? compactAmount(String(holderCount), 1) : holderCount.toLocaleString();
    }

    let marketCap = 0;
    const coinGeckoIds: Record<string, string> = { ETH: 'ethereum', PLS: 'pulsechain', HEX: 'hex', pHEX: 'hex', PLSX: 'pulsex', PRVX: 'provex', INC: 'incentive' };
    const coinId = coinGeckoIds[token.symbol];
    let coinGeckoMarketCap = 0;
    try {
      if (coinId) {
        const cgData = await jsonRequest(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`, 10000);
        const coin = cgData?.[coinId];
        if (!(price > 0)) price = Number(coin?.usd ?? 0);
        coinGeckoMarketCap = Number(coin?.usd_market_cap ?? 0);
        if (!Number.isFinite(change24h)) change24h = Number(coin?.usd_24h_change ?? 0);
      }
    } catch { /* DEX aggregation remains the primary live source. */ }

    const oraclePrice = token.symbol === 'ETH' ? await ethereumOraclePrice() : null;
    if (oraclePrice) price = oraclePrice;
    if (!(price > 0)) {
      try {
        const gtNetwork = token.network === 'Ethereum' ? 'eth' : 'pulsechain';
        const gtData = await geckoRequest(`https://api.geckoterminal.com/api/v2/simple/networks/${gtNetwork}/token_price/${token.contract}`, 10000);
        price = Number(gtData?.data?.attributes?.token_prices?.[targetAddress] ?? 0);
      } catch { /* Keep unavailable rather than inventing a price. */ }
    }

    if (token.symbol === 'PLS' && coinGeckoMarketCap > 0 && price > 0) {
      supplyNumber = coinGeckoMarketCap / price;
    } else if (token.network === 'PulseChain') {
      supplyNumber = Math.max(0, supplyNumber - (PULSECHAIN_OA_SUPPLY[tokenKey(token.symbol)] ?? 0));
    }
    if (supplyNumber > 0) supply = compactSupply(String(supplyNumber));
    marketCap = token.symbol === 'ETH' && coinGeckoMarketCap > 0 ? coinGeckoMarketCap : price > 0 && supplyNumber > 0 ? price * supplyNumber : Number(pricedPairs[0]?.fdv ?? 0);

    let resolvedLiquidity = liquidity;
    const pulseChainStatsKey: Partial<Record<string, string>> = { PLS: 'pls', PHEX: 'hex', PLSX: 'plsx', PRVX: 'prvx', INC: 'inc' };
    const pulseChainCurrent = pulseChainSnapshot?.[pulseChainStatsKey[tokenKey(token.symbol)] ?? '']?.current;
    if (pulseChainCurrent) {
      price = Number(pulseChainCurrent.price ?? price);
      marketCap = Number(pulseChainCurrent.marketCapOAExcluded ?? pulseChainCurrent.marketCap ?? marketCap);
      supplyNumber = Number(pulseChainCurrent.supplyOAExcluded ?? pulseChainCurrent.supply ?? supplyNumber);
      supply = supplyNumber > 0 ? compactSupply(String(supplyNumber)) : supply;
      const sourceLiquidity = Number(pulseChainCurrent.liquidity ?? liquidity);
      if (sourceLiquidity > 0) resolvedLiquidity = sourceLiquidity;
      if (Number(pulseChainCurrent.holders) > 0) holders = compactAmount(String(pulseChainCurrent.holders), 1);
    }

    return {
      price,
      change24h: Number.isFinite(change24h) ? change24h : 0,
      change7d: Number.isFinite(change24h) ? change24h : 0,
      change30d: Number.isFinite(change24h) ? change24h : 0,
      marketCap: marketCap / 1_000_000,
      liquidity: resolvedLiquidity / 1_000_000,
      supply,
      holders,
      staked: staked ?? undefined,
      loading: false,
      error: allPairs.length || price > 0 ? '' : 'Live market data is temporarily unavailable',
    };
  } catch (error) {
    console.warn('fetchTokenStats error:', error);
    return { price: 0, change24h: 0, change7d: 0, change30d: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: false, error: 'Failed to load' };
  }
}

function parseCompactMetric(value: string) {
  const match = value.trim().match(/^([\d,.]+)\s*([KMBT])?$/i);
  if (!match) return 0;
  const multipliers: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
  return Number(match[1].replace(/,/g, '')) * (multipliers[(match[2] || '').toUpperCase()] || 1);
}

async function fetchCombinedHexStats(): Promise<TokenStats> {
  const [ethereumHex, pulseHex] = await Promise.all([fetchTokenStats(TOKEN_DATA.HEX), fetchTokenStats(TOKEN_DATA.pHEX)]);
  const combinedPrice = ethereumHex.price + pulseHex.price;
  const weightedChange = (key: 'change24h' | 'change7d' | 'change30d') => combinedPrice > 0
    ? (ethereumHex[key] * ethereumHex.price + pulseHex[key] * pulseHex.price) / combinedPrice
    : 0;
  const combinedSupply = parseCompactMetric(ethereumHex.supply) + parseCompactMetric(pulseHex.supply);
  const combinedHolders = parseCompactMetric(ethereumHex.holders) + parseCompactMetric(pulseHex.holders);
  const combinedStaked = parseCompactMetric(ethereumHex.staked ?? '') + parseCompactMetric(pulseHex.staked ?? '');
  return {
    price: combinedPrice,
    change24h: weightedChange('change24h'),
    change7d: weightedChange('change7d'),
    change30d: weightedChange('change30d'),
    marketCap: ethereumHex.marketCap + pulseHex.marketCap,
    liquidity: ethereumHex.liquidity + pulseHex.liquidity,
    supply: combinedSupply > 0 ? compactSupply(String(combinedSupply)) : 'N/A',
    holders: combinedHolders > 0 ? compactAmount(String(combinedHolders), 1) : 'N/A',
    staked: combinedStaked > 0 ? compactSupply(String(combinedStaked)) : undefined,
    loading: false,
    error: ethereumHex.error && pulseHex.error ? 'Combined HEX data is temporarily unavailable' : '',
  };
}

function fetchTokenStatsForSymbol(symbol: string) {
  return symbol === 'cHEX' ? fetchCombinedHexStats() : fetchTokenStats(TOKEN_DATA[symbol]);
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

async function fetchCoinGeckoChart(token: TokenInfo, period: string) {
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
      .map((point: any) => ({ time: Math.floor(point[0] / 1000), value: Number(point[1]) }))
      .filter((point: { time: number; value: number }) => point.value > 0);
  } catch {
    return [];
  }
}

function requireChartSeries(request: Promise<{ time: number; value: number }[]>) {
  return request.then(data => {
    if (data.length < 2) throw new Error('Chart source returned no verified history');
    return data;
  });
}

async function fetchChartOHLCVUncached(token: TokenInfo, period: string): Promise<{ time: number; value: number }[]> {
  const now = Math.floor(Date.now() / 1000);
  const periodSeconds: Record<string, number> = { '24H': 86400, '7D': 604800, '30D': 2592000, '3M': 7776000, '6M': 15552000, '1Y': 31536000, 'ATL': 315360000, 'All': 315360000 };
  const cutoff = now - (periodSeconds[period] || 2592000);

  // Query independent public market sources together so a slow fallback cannot
  // hold the chart open for another full network timeout.
  try {
    return await Promise.any([
      requireChartSeries(fetchDefiLlamaChart(token, period, cutoff)),
      requireChartSeries(fetchDexPoolChart(token, period, cutoff)),
      requireChartSeries(fetchCoinGeckoChart(token, period)),
    ]);
  } catch {
    return [];
  }
}

function readStoredChart(key: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(CHART_STORAGE_KEY) || '{}');
    const entry = stored[key];
    if (!entry || Date.now() - Number(entry.savedAt) > CHART_STORAGE_TTL_MS || !Array.isArray(entry.data) || entry.data.length < 2) return null;
    return entry.data as { time: number; value: number }[];
  } catch {
    return null;
  }
}

function storeChart(key: string, data: { time: number; value: number }[]) {
  if (data.length < 2) return;
  try {
    const stored = JSON.parse(localStorage.getItem(CHART_STORAGE_KEY) || '{}');
    stored[key] = { savedAt: Date.now(), data };
    localStorage.setItem(CHART_STORAGE_KEY, JSON.stringify(stored));
  } catch { /* Chart caching is an optional performance enhancement. */ }
}

function fetchChartOHLCV(token: TokenInfo, period: string) {
  const key = `${token.network}:${token.contract.toLowerCase()}:${period}`;
  const cached = chartRequestCache.get(key);
  if (cached) return cached;
  const stored = readStoredChart(key);
  if (stored) {
    const request = Promise.resolve(stored);
    chartRequestCache.set(key, request);
    return request;
  }
  const request = fetchChartOHLCVUncached(token, period).then(data => {
    if (data.length < 2) chartRequestCache.delete(key);
    else storeChart(key, data);
    return data;
  }).catch(error => {
    chartRequestCache.delete(key);
    throw error;
  });
  chartRequestCache.set(key, request);
  return request;
}

function fetchCombinedHexChart(period: string) {
  const key = `Both:combined-hex:${period}`;
  const cached = chartRequestCache.get(key);
  if (cached) return cached;
  const request = Promise.all([fetchChartOHLCV(TOKEN_DATA.HEX, period), fetchChartOHLCV(TOKEN_DATA.pHEX, period)]).then(([ethereum, pulse]) => {
    if (ethereum.length < 2 || pulse.length < 2) return [];
    const times = [...new Set([...ethereum.map(point => point.time), ...pulse.map(point => point.time)])].sort((left, right) => left - right);
    const start = Math.max(ethereum[0].time, pulse[0].time);
    let ethereumIndex = 0;
    let pulseIndex = 0;
    let ethereumPrice: number | null = null;
    let pulsePrice: number | null = null;
    return times.flatMap(time => {
      while (ethereumIndex < ethereum.length && ethereum[ethereumIndex].time <= time) ethereumPrice = ethereum[ethereumIndex++].value;
      while (pulseIndex < pulse.length && pulse[pulseIndex].time <= time) pulsePrice = pulse[pulseIndex++].value;
      return time >= start && ethereumPrice !== null && pulsePrice !== null ? [{ time, value: ethereumPrice + pulsePrice }] : [];
    });
  }).then(data => {
    if (data.length < 2) chartRequestCache.delete(key);
    return data;
  }).catch(error => {
    chartRequestCache.delete(key);
    throw error;
  });
  chartRequestCache.set(key, request);
  return request;
}

function fetchChartForSymbol(symbol: string, period: string) {
  return symbol === 'cHEX' ? fetchCombinedHexChart(period) : fetchChartOHLCV(TOKEN_DATA[symbol], period);
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

function SwapPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [fromToken, setFromToken] = useState<SwapTokenKey>('BTC');
  const [toToken, setToToken] = useState<SwapTokenKey>('USDC_PULSE');
  const [amount, setAmount] = useState('1');
  const [prices, setPrices] = useState<Partial<Record<SwapTokenKey, number>>>(readSwapPriceCache);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const coinIds = [...new Set(SWAP_TOKENS.flatMap(token => 'coinGeckoId' in token ? [token.coinGeckoId] : []))];
    const simplePriceRequest = coinIds.length
      ? jsonRequest(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`, 10000).catch(() => ({}))
      : Promise.resolve({});
    const llamaPriceRequest = coinIds.length
      ? jsonRequest(`https://coins.llama.fi/prices/current/${coinIds.map(id => `coingecko:${id}`).join(',')}`, 10000).catch(() => ({ coins: {} }))
      : Promise.resolve({ coins: {} });
    void Promise.all([simplePriceRequest, llamaPriceRequest]).then(([simplePrices, llamaPrices]) => Promise.all(SWAP_TOKENS.map(async token => {
      try {
        if ('source' in token) {
          const stats = await fetchTokenStats(TOKEN_DATA[token.source]);
          return [token.id, stats.price > 0 ? stats.price : null] as const;
        }
        const livePrice = 'coinGeckoId' in token ? Number(simplePrices?.[token.coinGeckoId]?.usd ?? llamaPrices?.coins?.[`coingecko:${token.coinGeckoId}`]?.price ?? 0) : 0;
        const fallback = 'fallbackPrice' in token ? token.fallbackPrice : null;
        return [token.id, livePrice > 0 ? livePrice : fallback] as const;
      } catch {
        return [token.id, 'fallbackPrice' in token ? token.fallbackPrice : null] as const;
      }
    }))).then(results => {
      if (cancelled) return;
      const next = results.reduce((merged, [key, price]) => { if (price !== null && price > 0) merged[key] = price; return merged; }, { ...readSwapPriceCache() } as Partial<Record<SwapTokenKey, number>>);
      setPrices(next);
      saveSwapPriceCache(next);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, refresh]);
  const numericAmount = Math.max(0, Number(amount.replace(/,/g, '')) || 0);
  const fromPrice = prices[fromToken] ?? null;
  const toPrice = prices[toToken] ?? null;
  const quote = fromPrice && toPrice ? numericAmount * fromPrice / toPrice : null;
  const rate = fromPrice && toPrice ? fromPrice / toPrice : null;
  const formatAmount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: value >= 1 ? 6 : 10 });
  const updateAmount = (value: string) => { const cleaned = value.replace(',', '.').replace(/[^0-9.]/g, ''); const [whole, ...fraction] = cleaned.split('.'); setAmount(`${whole}${fraction.length ? `.${fraction.join('')}` : ''}`); };
  const chooseFrom = (next: SwapTokenKey) => { if (next === toToken) setToToken(fromToken); setFromToken(next); };
  const chooseTo = (next: SwapTokenKey) => { if (next === fromToken) setFromToken(toToken); setToToken(next); };
  const fromDefinition = SWAP_TOKENS.find(token => token.id === fromToken)!;
  const toDefinition = SWAP_TOKENS.find(token => token.id === toToken)!;
  const tokenControl = (tokenId: SwapTokenKey, side: 'from' | 'to') => {
    const selected = SWAP_TOKENS.find(token => token.id === tokenId)!;
    const choose = (next: SwapTokenKey) => { side === 'from' ? chooseFrom(next) : chooseTo(next); setPicker(null); };
    return <div className="swap-token-control-wrap">
      <button className="swap-token-control" type="button" onClick={() => setPicker(current => current === side ? null : side)} aria-expanded={picker === side} aria-label={`Choose ${side === 'from' ? 'from' : 'to'} token`}>
        <img src={CORE_ICONS[tokenKey(selected.symbol)]} alt={`${selected.symbol} logo`}/>
        <span><small>{side === 'from' ? 'You enter' : 'Estimated output'}</small><b>{selected.symbol}<em>{networkLabel(selected.network)}</em></b></span><ChevronDown size={16}/>
      </button>
      {picker === side && <div className="swap-token-picker" role="listbox" aria-label={`${side === 'from' ? 'From' : 'To'} token list`}>{SWAP_TOKENS.map(token => <button type="button" role="option" aria-selected={token.id === tokenId} className={token.id === tokenId ? 'selected' : ''} key={token.id} onClick={() => choose(token.id)}><img src={CORE_ICONS[tokenKey(token.symbol)]} alt=""/><span><b>{token.symbol}</b><small>{networkLabel(token.network)}</small></span><em>{prices[token.id] ? money(prices[token.id]!) : '—'}</em></button>)}</div>}
    </div>;
  };
  return <section className={`swap-panel ${open ? 'open' : ''}`}>
    <button className="swap-fold" type="button" onClick={onToggle} aria-expanded={open}>
      <span className="swap-title"><i><ArrowDownUp size={21}/></i><span><small>LIVE EXCHANGE QUOTE</small><b>Swap</b></span></span><ChevronDown size={17}/>
    </button>
    {open && <div className="swap-body">
      <div className="swap-box">
        <div className="swap-side">{tokenControl(fromToken, 'from')}<input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" value={amount} onChange={event => updateAmount(event.target.value)} aria-label="Swap amount"/><em>{fromPrice ? money(numericAmount * fromPrice) : loading ? 'Loading live price…' : 'Price unavailable'}</em></div>
        <button className="swap-direction" type="button" onClick={() => { setFromToken(toToken); setToToken(fromToken); }} aria-label="Reverse swap direction"><ArrowDownUp size={17}/></button>
        <div className="swap-side output">{tokenControl(toToken, 'to')}<strong>{loading ? '…' : quote === null ? '—' : formatAmount(quote)}</strong><em>{quote !== null && toPrice ? money(quote * toPrice) : loading ? 'Loading live price…' : 'Price unavailable'}</em></div>
      </div>
      <div className="swap-rate"><span><small>INDICATIVE RATE</small><b>{rate === null ? loading ? 'Reading live markets…' : 'Price unavailable' : `1 ${fromDefinition.symbol} = ${formatAmount(rate)} ${toDefinition.symbol}`}</b></span><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}><RefreshCw size={13} className={loading ? 'spin-icon' : ''}/>Refresh</button></div>
      <p className="swap-note"><LockKeyhole size={12}/>Watch-only exchange estimate using the app’s live token prices. It does not connect a wallet or submit a PulseX transaction.</p>
    </div>}
  </section>;
}

function sentimentLabel(score: number | null) {
  if (score === null) return 'Unavailable';
  if (score <= 24) return 'Extreme Fear';
  if (score <= 44) return 'Fear';
  if (score <= 55) return 'Neutral';
  if (score <= 74) return 'Greed';
  return 'Extreme Greed';
}

function sentimentColor(score: number | null) {
  if (score === null || score <= 24) return '#ff405f';
  if (score <= 44) return '#ff7848';
  if (score <= 55) return '#ffcf24';
  if (score <= 74) return '#43dfa8';
  return '#00ed94';
}

function momentumScore(change24h: number) {
  return Math.max(0, Math.min(100, Math.round(50 + change24h * 4)));
}

async function fetchMarketSentiment(previous: MarketSentimentState): Promise<MarketSentimentState> {
  const [fearResult, globalResult, majorsResult, pulseResult, ehexResult, paprikaGlobalResult, paprikaEthResult] = await Promise.allSettled([
    jsonRequest('https://api.alternative.me/fng/?limit=1', 10000),
    jsonRequest('https://api.coingecko.com/api/v3/global', 10000),
    jsonRequest('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', 10000),
    Promise.all([fetchTokenStats(TOKEN_DATA.PLS), fetchTokenStats(TOKEN_DATA.PLSX), fetchTokenStats(TOKEN_DATA.pHEX), fetchTokenStats(TOKEN_DATA.INC), fetchTokenStats(TOKEN_DATA.PRVX)]),
    fetchTokenStats(TOKEN_DATA.HEX),
    jsonRequest('https://api.coinpaprika.com/v1/global', 10000),
    jsonRequest('https://api.coinpaprika.com/v1/tickers/eth-ethereum', 10000),
  ]);
  const fear = fearResult.status === 'fulfilled' ? fearResult.value?.data?.[0] : null;
  const global = globalResult.status === 'fulfilled' ? globalResult.value?.data : null;
  const majors = majorsResult.status === 'fulfilled' ? majorsResult.value : null;
  const pulseStats = pulseResult.status === 'fulfilled' ? pulseResult.value : [];
  const ehexStats = ehexResult.status === 'fulfilled' ? ehexResult.value : null;
  const paprikaGlobal = paprikaGlobalResult.status === 'fulfilled' ? paprikaGlobalResult.value : null;
  const paprikaEth = paprikaEthResult.status === 'fulfilled' ? paprikaEthResult.value : null;
  const pulseChanges = pulseStats.map(stat => stat.change24h).filter(change => Number.isFinite(change));
  const pulseChange = pulseChanges.length ? pulseChanges.reduce((total, change) => total + change, 0) / pulseChanges.length : null;
  const bitcoin = Number(fear?.value);
  const ethChange = Number(majors?.ethereum?.usd_24h_change ?? paprikaEth?.quotes?.USD?.percent_change_24h);
  const btcDominance = Number(global?.market_cap_percentage?.btc ?? paprikaGlobal?.bitcoin_dominance_percentage);
  const ethDominance = Number(global?.market_cap_percentage?.eth ?? (Number(paprikaEth?.quotes?.USD?.market_cap) / Number(paprikaGlobal?.market_cap_usd) * 100));
  const totalMarketCap = Number(global?.total_market_cap?.usd ?? paprikaGlobal?.market_cap_usd);
  const pulseMarketCap = pulseStats.reduce((total, stat) => total + Math.max(0, stat.marketCap) * 1_000_000, 0);
  const pulseDominance = totalMarketCap > 0 && pulseMarketCap > 0 ? pulseMarketCap / totalMarketCap * 100 : NaN;
  const ethereumMarketCap = totalMarketCap > 0 && ethDominance > 0 ? totalMarketCap * ethDominance / 100 : NaN;
  const ehexMarketCap = Math.max(0, ehexStats?.marketCap ?? 0) * 1_000_000;
  const phexMarketCap = Math.max(0, pulseStats[2]?.marketCap ?? 0) * 1_000_000;
  const ehexEthereumDominance = ethereumMarketCap > 0 && ehexMarketCap > 0 ? ehexMarketCap / ethereumMarketCap * 100 : NaN;
  const phexPulseDominance = pulseMarketCap > 0 && phexMarketCap > 0 ? phexMarketCap / pulseMarketCap * 100 : NaN;
  const next: MarketSentimentState = {
    bitcoin: Number.isFinite(bitcoin) ? bitcoin : previous.bitcoin,
    bitcoinLabel: typeof fear?.value_classification === 'string' ? fear.value_classification : previous.bitcoinLabel,
    ethereum: Number.isFinite(ethChange) ? momentumScore(ethChange) : previous.ethereum,
    pulseChain: pulseChange !== null ? momentumScore(pulseChange) : previous.pulseChain,
    btcDominance: Number.isFinite(btcDominance) ? btcDominance : previous.btcDominance,
    ethDominance: Number.isFinite(ethDominance) ? ethDominance : previous.ethDominance,
    pulseDominance: Number.isFinite(pulseDominance) ? pulseDominance : previous.pulseDominance,
    altDominance: Number.isFinite(btcDominance) && Number.isFinite(ethDominance) ? Math.max(0, 100 - btcDominance - ethDominance - (Number.isFinite(pulseDominance) ? pulseDominance : 0)) : previous.altDominance,
    ehexEthereumDominance: Number.isFinite(ehexEthereumDominance) ? ehexEthereumDominance : previous.ehexEthereumDominance,
    phexPulseDominance: Number.isFinite(phexPulseDominance) ? phexPulseDominance : previous.phexPulseDominance,
    refreshedAt: Date.now(), loading: false,
    error: fearResult.status === 'rejected' && globalResult.status === 'rejected' && majorsResult.status === 'rejected' && pulseResult.status === 'rejected' ? 'Live sentiment sources are temporarily unavailable. Showing the last saved reading.' : '',
  };
  saveMarketSentimentCache(next);
  return next;
}

function MarketSentimentPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [state, setState] = useState<MarketSentimentState>(readMarketSentimentCache);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState(current => ({ ...current, loading: true, error: '' }));
    void fetchMarketSentiment(readMarketSentimentCache()).then(next => { if (!cancelled) setState(next); });
    return () => { cancelled = true; };
  }, [open, refresh]);
  const meters = [
    { key: 'bitcoin', label: 'Bitcoin', value: state.bitcoin, detail: state.bitcoinLabel || sentimentLabel(state.bitcoin), note: 'Fear & Greed' },
    { key: 'ethereum', label: 'Ethereum', value: state.ethereum, detail: sentimentLabel(state.ethereum), note: '24H momentum' },
    { key: 'pulse', label: 'PulseChain', value: state.pulseChain, detail: sentimentLabel(state.pulseChain), note: 'PLS · PLSX · pHEX' },
  ];
  const dominance = [
    { label: 'BTC', value: state.btcDominance, color: '#f7931a' },
    { label: 'ETH', value: state.ethDominance, color: '#7792ff' },
    { label: 'PULSECHAIN', value: state.pulseDominance, color: '#14d9ff' },
    { label: 'ALTCOINS', value: state.altDominance, color: '#d644ff' },
    { label: 'eHEX / ETH', value: state.ehexEthereumDominance, color: '#ff2ca8' },
    { label: 'pHEX / PULSE', value: state.phexPulseDominance, color: '#ff9d00' },
  ];
  const dominanceLabel = (value: number) => value > 0 && value < 0.1 ? `${value.toFixed(4)}%` : `${value.toFixed(1)}%`;
  return <section className={`sentiment-panel ${open ? 'open' : ''}`}>
    <button className="sentiment-fold" type="button" onClick={onToggle} aria-expanded={open}><span className="sentiment-title"><i><Activity size={21}/></i><span><small>MARKET TEMPERATURE</small><b>Market Sentiment</b></span></span><ChevronDown size={17}/></button>
    {open && <div className="sentiment-body">
      <div className="sentiment-meters">{meters.map(meter => <article key={meter.key}><div className="sentiment-gauge" style={{ '--sentiment-score': meter.value ?? 0, '--sentiment-color': sentimentColor(meter.value) } as React.CSSProperties}><span><strong>{meter.value === null ? '—' : Math.round(meter.value)}</strong><small>/100</small></span></div><div><small>{meter.note}</small><b>{meter.label}</b><em>{meter.detail}</em></div></article>)}</div>
      <div className="dominance-section"><div className="dominance-heading"><span><small>GLOBAL MARKET SHARE</small><b>Bitcoin, Ethereum, PulseChain & Altcoins</b></span><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={state.loading}><RefreshCw size={13} className={state.loading ? 'spin-icon' : ''}/>Refresh</button></div><div className="dominance-grid">{dominance.map(item => <article key={item.label}><span><i style={{ background: item.color }}/><small>{item.label}</small></span><strong>{item.value === null ? '—' : dominanceLabel(item.value)}</strong></article>)}</div></div>
      {state.error && <p className="sentiment-error">{state.error}</p>}
      <p className="sentiment-source">Bitcoin Fear & Greed: Alternative.me · global dominance: CoinGecko · eHEX / ETH compares eHEX market cap with Ethereum market cap · pHEX / PULSE shows pHEX within the tracked PulseChain core market · ETH and PulseChain readings are transparent 24-hour momentum indicators, not official fear indexes.</p>
    </div>}
  </section>;
}

function HexStakesPanel({ state, open, filter, network, walletCount, holdingsValue, holdingsLoading, privateMode, onToggle, onFilter, onNetwork, onRefresh }: { state: HexStakeState; open: boolean; filter: 'all' | 'active' | 'matured'; network: Network; walletCount: number; holdingsValue: number; holdingsLoading: boolean; privateMode: boolean; onToggle: () => void; onFilter: (filter: 'all' | 'active' | 'matured') => void; onNetwork: (network: Network) => void; onRefresh: () => void }) {
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
        <div className="hex-stakes-summary"><div className="token-holdings-total"><small>TOKEN HOLDINGS</small><strong>{privateMode ? '••••' : holdingsLoading ? 'Reading…' : money(holdingsValue)}</strong><em>{networkLabel(network)} liquid portfolio</em></div><div><small>HEX STAKES</small><strong>{privateMode ? '••••' : hasPricedStake ? money(totalValue) : state.stakes.length ? 'Price unavailable' : money(0)}</strong><em>{privateMode ? '••••' : `${compactAmount(String(totalHex), 2)} HEX principal`}</em></div><div className="net-worth-total"><small>NET WORTH</small><strong>{privateMode ? '••••' : holdingsLoading ? 'Reading…' : money(holdingsValue + totalValue)}</strong><em>Holdings + currently staked HEX</em></div><div className="unstaked-total"><small>UNSTAKED / RETURNED</small><strong>{privateMode ? '••••' : hasPricedUnstaked ? money(totalUnstakedValue) : state.endedStakes.length ? 'Price unavailable' : money(0)}</strong><em>{privateMode ? '••••' : `${compactAmount(String(totalUnstakedHex), 2)} HEX · ${state.endedStakes.length} ended`}</em></div></div>
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

function editableMetric(value: number, maximumFractionDigits = 8) {
  return Number.isFinite(value) ? value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits }) : '0';
}
function editableWholeUnits(value: number) {
  return Number.isFinite(value) ? String(Math.floor(Math.max(0, value))) : '0';
}
function wholeUnitInput(value: string) {
  return value.replace(/,/g, '').split('.')[0].replace(/[^0-9]/g, '');
}

function HexCalculatorPanel({ open, network, metrics, holding, onToggle, onNetwork, onRefresh }: { open: boolean; network: ChainNetwork; metrics: HexCalculatorMetrics; holding: HexLiquidHolding; onToggle: () => void; onNetwork: (network: ChainNetwork) => void; onRefresh: () => void }) {
  const [amount, setAmount] = useState('0');
  const [duration, setDuration] = useState('2');
  const [unit, setUnit] = useState<'days' | 'months' | 'years'>('months');
  const seededHoldingRef = useRef('');
  useEffect(() => {
    if (holding.loading) return;
    const seedKey = `${holding.walletId}:${holding.network}`;
    if (seededHoldingRef.current === seedKey) return;
    setAmount(editableWholeUnits(holding.amount));
    seededHoldingRef.current = seedKey;
  }, [holding]);
  const amountHex = Math.max(0, Number(amount.replace(/,/g, '')) || 0);
  const durationValue = Math.max(0, Number(duration) || 0);
  const rawDays = unit === 'years' ? durationValue * 365 : unit === 'months' ? durationValue * 30.4375 : durationValue;
  const days = Math.max(1, Math.min(5555, Math.round(rawDays)));
  const result = calculateHexStake(amountHex, days, metrics);
  const endDate = new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedAmount = (() => { const [whole, fraction] = amount.split('.'); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction !== undefined ? `.${fraction}` : ''}`; })();
  return <section className={`hex-calculator-panel ${open ? 'open' : ''}`}>
    <button className="hex-calculator-fold" type="button" onClick={onToggle} aria-expanded={open}>
      <span className="hex-calculator-title"><i><Calculator size={22}/></i><span><small>ON-CHAIN STAKE ESTIMATE</small><b>HEX Calculator</b></span></span><ChevronDown size={17}/>
    </button>
    {open && <div className="hex-calculator-body">
      <div className="hex-calculator-network" role="group" aria-label="HEX calculator network">{(['Ethereum', 'PulseChain'] as ChainNetwork[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => onNetwork(option)}>{option}</button>)}</div>
      <div className="hex-calculator-fields">
        <label><span>HEX to stake</span><input inputMode="numeric" value={formattedAmount} onChange={event => setAmount(wholeUnitInput(event.target.value))} aria-label="HEX amount to stake"/></label>
        <label><span>Stake length</span><div><input inputMode="decimal" value={duration} onChange={event => setDuration(event.target.value.replace(/[^0-9.]/g, ''))} aria-label="Stake duration"/><select value={unit} onChange={event => setUnit(event.target.value as 'days' | 'months' | 'years')} aria-label="Stake duration unit"><option value="days">Days</option><option value="months">Months</option><option value="years">Years</option></select></div></label>
      </div>
      <div className="hex-calculator-input-value"><span><small>HEX TO STAKE VALUE</small><strong className="hex-dollar-value">{metrics.price ? money(amountHex * metrics.price) : 'Live HEX value unavailable'}</strong></span><span><small>LIQUID {network === 'PulseChain' ? 'pHEX' : 'HEX'} IN SELECTED WALLET</small><strong>{holding.loading ? 'Reading…' : `${compactAmount(String(holding.amount), 2)} ${network === 'PulseChain' ? 'pHEX' : 'HEX'}`}</strong></span></div>
      {metrics.loading || holding.loading ? <div className="hex-calculator-status hex-live-loading"><span><RefreshCw size={18} className="spin-icon"/>Reading live HEX balance, share rate and payouts…</span><div className="hex-loading-track" aria-label="Loading live HEX calculator data"><i/></div></div> : metrics.error ? <div className="hex-calculator-status error-message">{metrics.error}<button type="button" onClick={onRefresh}>Try again</button></div> : result ? <>
        <div className="hex-calculator-share"><span><small>HEX FOR 1 BASE T-SHARE</small><strong>{compactAmount(String(metrics.oneTShareHex), 2)} HEX</strong></span><span><small>DAILY HEX / T-SHARE</small><strong>{metrics.dailyHexPerTShare.toLocaleString(undefined, { maximumFractionDigits: 3 })} HEX</strong></span><span><small>LIVE SHARE RATE</small><strong>{metrics.shareRate.toLocaleString()}</strong></span></div>
        <div className="hex-calculator-results">
          <div><small>ESTIMATED T-SHARES</small><strong>{result.tShares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong><em>{result.bonusPercent.toFixed(2)}% stake bonus</em></div>
          <div><small>ESTIMATED YIELD</small><strong>{compactAmount(String(result.estimatedYield), 2)} HEX</strong><em className="hex-dollar-value">{metrics.price ? money(result.estimatedYield * metrics.price) : 'Live HEX value unavailable'}</em></div>
          <div><small>ESTIMATED RETURN</small><strong>{compactAmount(String(result.estimatedReturn), 2)} HEX</strong><em className="hex-dollar-value">{metrics.price ? money(result.estimatedReturn * metrics.price) : 'Live HEX value unavailable'}</em></div>
          <div><small>ESTIMATED END DATE</small><strong>{endDate}</strong><em>{days.toLocaleString()} days · max 5,555</em></div>
        </div>
        <p className="hex-calculator-note"><ShieldCheck size={13}/>Share count uses the verified {network} HEX contract formula and current share rate. Yield uses the average payout from the last {metrics.sampleDays} completed on-chain days. Future daily payouts, global T-shares and HEX price can change, so this is an estimate—not a guaranteed return.</p>
      </> : <div className="hex-calculator-status">Enter a HEX amount to calculate a stake.</div>}
    </div>}
  </section>;
}

function HexSimulationCalculatorPanel({ open, network, metrics, holding, onToggle, onNetwork }: { open: boolean; network: ChainNetwork; metrics: HexCalculatorMetrics; holding: HexLiquidHolding; onToggle: () => void; onNetwork: (network: ChainNetwork) => void }) {
  const [amount, setAmount] = useState('0');
  const [duration, setDuration] = useState('1');
  const [unit, setUnit] = useState<'days' | 'months' | 'years'>('years');
  const [hexPrice, setHexPrice] = useState('0');
  const [hexPerTShare, setHexPerTShare] = useState('0');
  const [dailyPayout, setDailyPayout] = useState('0');
  const seededSimulationRef = useRef('');
  useEffect(() => {
    if (metrics.loading || metrics.error || holding.loading || metrics.network !== network || holding.network !== network) return;
    const seedKey = `${holding.walletId}:${network}`;
    if (seededSimulationRef.current === seedKey) return;
    setAmount(editableWholeUnits(holding.amount));
    setHexPrice(editableMetric(metrics.price ?? 0, 12));
    setHexPerTShare(editableMetric(metrics.oneTShareHex, 6));
    setDailyPayout(editableMetric(metrics.dailyHexPerTShare, 6));
    seededSimulationRef.current = seedKey;
  }, [holding, metrics, network]);
  const cleanNumber = (value: string) => Math.max(0, Number(value.replace(/,/g, '')) || 0);
  const formatInput = (value: string) => { const [whole, fraction] = value.split('.'); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction !== undefined ? `.${fraction}` : ''}`; };
  const updateNumber = (value: string, setter: (value: string) => void) => { const cleaned = value.replace(/,/g, '').replace(/[^0-9.]/g, ''); const [whole, ...fraction] = cleaned.split('.'); setter(`${whole}${fraction.length ? `.${fraction.join('')}` : ''}`); };
  const updateWholeNumber = (value: string, setter: (value: string) => void) => setter(wholeUnitInput(value));
  const updateDecimalNumber = (value: string, setter: (value: string) => void) => { const cleaned = value.replace(',', '.').replace(/[^0-9.]/g, ''); const [whole, ...fraction] = cleaned.split('.'); setter(`${whole}${fraction.length ? `.${fraction.join('')}` : ''}`); };
  const amountHex = cleanNumber(amount);
  const durationValue = cleanNumber(duration);
  const days = Math.max(1, Math.min(5555, Math.round(unit === 'years' ? durationValue * 365 : unit === 'months' ? durationValue * 30.4375 : durationValue)));
  const simulatedPrice = cleanNumber(hexPrice);
  const oneTShareHex = cleanNumber(hexPerTShare);
  const payout = cleanNumber(dailyPayout);
  const simulationMetrics: HexCalculatorMetrics = { network, shareRate: oneTShareHex * 10, oneTShareHex, dailyHexPerTShare: payout, price: simulatedPrice, sampleDays: 0, loading: false, error: '' };
  const result = calculateHexStake(amountHex, days, simulationMetrics);
  const endDate = new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return <section className={`hex-simulator-panel ${open ? 'open' : ''}`}>
    <button className="hex-simulator-fold" type="button" onClick={onToggle} aria-expanded={open}>
      <span className="hex-simulator-title"><i><FlaskConical size={22}/></i><span><small>MANUAL FUTURE SCENARIO</small><b>HEX Calculator Simulation</b></span></span><ChevronDown size={17}/>
    </button>
    {open && <div className="hex-simulator-body">
      <p className="hex-simulator-intro">Defaults use the current {network} wallet balance, live HEX price, on-chain share rate and recent on-chain payout. Every value remains editable for your own scenario.</p>
      <div className="hex-calculator-network" role="group" aria-label="HEX simulation network">{(['Ethereum', 'PulseChain'] as ChainNetwork[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => onNetwork(option)}>{option}</button>)}</div>
      {(metrics.loading || holding.loading) && <div className="hex-simulator-loading"><span><RefreshCw size={18} className="spin-icon"/>Loading live calculator defaults…</span><div className="hex-loading-track" aria-label="Loading live HEX simulation defaults"><i/></div></div>}
      <div className="hex-simulator-fields">
        <label><span>HEX to stake</span><input inputMode="numeric" value={formatInput(amount)} onChange={event => updateWholeNumber(event.target.value, setAmount)} aria-label="Simulation HEX amount"/></label>
        <label><span>Stake length</span><div><input inputMode="decimal" value={duration} onChange={event => updateNumber(event.target.value, setDuration)} aria-label="Simulation stake duration"/><select value={unit} onChange={event => setUnit(event.target.value as 'days' | 'months' | 'years')} aria-label="Simulation duration unit"><option value="days">Days</option><option value="months">Months</option><option value="years">Years</option></select></div></label>
        <label><span>Simulated HEX price</span><div className="simulator-money-input"><i>$</i><input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" enterKeyHint="done" value={hexPrice} onChange={event => updateDecimalNumber(event.target.value, setHexPrice)} aria-label="Simulated HEX price"/></div></label>
        <label><span>HEX per base T-share</span><input inputMode="decimal" value={formatInput(hexPerTShare)} onChange={event => updateNumber(event.target.value, setHexPerTShare)} aria-label="Simulated HEX per T-share"/></label>
        <label className="simulator-wide-field"><span>Daily HEX payout per T-share</span><input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" enterKeyHint="done" value={dailyPayout} onChange={event => updateDecimalNumber(event.target.value, setDailyPayout)} aria-label="Simulated daily HEX payout per T-share"/></label>
      </div>
      <div className="hex-simulator-input-value"><span><small>HEX TO STAKE VALUE</small><strong className="hex-dollar-value">{simulatedPrice > 0 ? money(amountHex * simulatedPrice) : 'Enter a simulated price'}</strong></span><span><small>LIVE DEFAULT SOURCE</small><strong>{network === 'PulseChain' ? 'pHEX · PulseChain' : 'HEX · Ethereum'}</strong></span></div>
      {result ? <div className="hex-simulator-results">
        <div><small>ESTIMATED T-SHARES</small><strong>{result.tShares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong><em>{result.bonusPercent.toFixed(2)}% stake bonus</em></div>
        <div><small>ESTIMATED YIELD</small><strong>{compactAmount(String(result.estimatedYield), 2)} HEX</strong><em className="hex-dollar-value">{simulatedPrice > 0 ? money(result.estimatedYield * simulatedPrice) : 'Enter a simulated price'}</em></div>
        <div><small>ESTIMATED RETURN</small><strong>{compactAmount(String(result.estimatedReturn), 2)} HEX</strong><em className="hex-dollar-value">{simulatedPrice > 0 ? money(result.estimatedReturn * simulatedPrice) : 'Enter a simulated price'}</em></div>
        <div><small>SIMULATED END VALUE</small><strong className="simulator-usd-value">{money(result.estimatedReturn * simulatedPrice)}</strong><em className="hex-dollar-value">At {money(simulatedPrice)} per HEX</em></div>
        <div className="simulator-end-date"><small>ESTIMATED END DATE</small><strong>{endDate}</strong><em>{days.toLocaleString()} days</em></div>
      </div> : <div className="hex-calculator-status">Enter positive values to build a simulation.</div>}
      <p className="hex-simulator-note"><Info size={13}/>This is a user-defined scenario, not a prediction. Real future share rate, daily payouts and HEX price can differ substantially.</p>
    </div>}
  </section>;
}

function App() {
  const [wallets, setWallets] = useState<TrackedWallet[]>(readWallets);
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>(readGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(() => readGroups()[0]?.id ?? DEFAULT_GROUP_ID);
  const [newGroupName, setNewGroupName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(() => readGroups().map(group => group.id));
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<string | null>(null);
  const [pendingDeleteWalletId, setPendingDeleteWalletId] = useState<string | null>(null);
  const [trackedCollapsed, setTrackedCollapsed] = useState(true);
  const [newWalletPanelOpen, setNewWalletPanelOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [hexStakesOpen, setHexStakesOpen] = useState(false);
  const [hexStakeNetwork, setHexStakeNetwork] = useState<Network>('Both');
  const [hexStakeFilter, setHexStakeFilter] = useState<'all' | 'active' | 'matured'>('all');
  const [hexStakeRefresh, setHexStakeRefresh] = useState(0);
  const [hexStakeState, setHexStakeState] = useState<HexStakeState>({ stakes: [], endedStakes: [], loading: true, error: '', refreshedAt: null, network: 'Both' });
  const [hexHoldingState, setHexHoldingState] = useState<{ value: number; loading: boolean; network: Network }>({ value: 0, loading: false, network: 'Both' });
  const [hexCalculatorOpen, setHexCalculatorOpen] = useState(false);
  const [hexSimulatorOpen, setHexSimulatorOpen] = useState(false);
  const [sentimentOpen, setSentimentOpen] = useState(false);
  const [hexCalculatorNetwork, setHexCalculatorNetwork] = useState<ChainNetwork>(() => readNetwork() === 'Ethereum' ? 'Ethereum' : 'PulseChain');
  const [hexCalculatorRefresh, setHexCalculatorRefresh] = useState(0);
  const [hexCalculatorMetrics, setHexCalculatorMetrics] = useState<HexCalculatorMetrics>({ network: readNetwork() === 'Ethereum' ? 'Ethereum' : 'PulseChain', shareRate: 0, oneTShareHex: 0, dailyHexPerTShare: 0, price: null, sampleDays: 0, loading: true, error: '' });
  const [hexCalculatorHolding, setHexCalculatorHolding] = useState<HexLiquidHolding>({ walletId: '', network: readNetwork() === 'Ethereum' ? 'Ethereum' : 'PulseChain', amount: 0, value: null, loading: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [settingsTransparency, setSettingsTransparency] = useState(readSettingsTransparency);
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled);
  const [hapticEnabled, setHapticEnabled] = useState(readHapticEnabled);
  const [customPanel, setCustomPanel] = useState<CustomPanel>('tracked');
  const [panelThemes, setPanelThemes] = useState<Partial<Record<CustomPanel, PanelTheme>>>(readPanelThemes);
  const [customGradients, setCustomGradients] = useState<Partial<Record<CustomPanel, { from: string; to: string }>>>(readCustomGradients);
  const [customGradientDraft, setCustomGradientDraft] = useState({ from: '#ff2ca8', to: '#14d9ff' });
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>(readFiatCurrency);
  const [fiatRates, setFiatRates] = useState<Record<FiatCurrency, number | null>>(readFiatRates);
  const [fiatRatesLoading, setFiatRatesLoading] = useState(true);
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
  const hexStakeCacheRef = useRef<Partial<Record<Network, HexStakeState>>>({});
  const hexStakeNetworkRef = useRef<Network>('Both');
  const walletStakeKey = wallets.map(wallet => `${wallet.id}:${wallet.address.toLowerCase()}:${wallet.label}`).join('|');
  setActiveFiat(fiatCurrency, fiatRates);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets)), [wallets]);
  useEffect(() => localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(walletGroups)), [walletGroups]);
  useEffect(() => localStorage.setItem(NETWORK_STORAGE_KEY, network), [network]);
  useEffect(() => { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); document.documentElement.lang = language; }, [language]);
  useEffect(() => localStorage.setItem(FIAT_CURRENCY_STORAGE_KEY, fiatCurrency), [fiatCurrency]);
  useEffect(() => localStorage.setItem(SETTINGS_TRANSPARENCY_STORAGE_KEY, String(settingsTransparency)), [settingsTransparency]);
  useEffect(() => localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled)), [soundEnabled]);
  useEffect(() => localStorage.setItem(HAPTIC_STORAGE_KEY, String(hapticEnabled)), [hapticEnabled]);
  useEffect(() => localStorage.setItem(PANEL_THEMES_STORAGE_KEY, JSON.stringify(panelThemes)), [panelThemes]);
  useEffect(() => localStorage.setItem(CUSTOM_GRADIENTS_STORAGE_KEY, JSON.stringify(customGradients)), [customGradients]);
  useEffect(() => { if (!wallets.some(wallet => wallet.id === selectedId)) setSelectedId(wallets[0]?.id ?? ''); }, [wallets, selectedId]);
  useEffect(() => {
    let cancelled = false;
    const quotes = FIAT_OPTIONS.filter(option => option.id !== 'USD' && option.id !== 'XPF').map(option => option.id).join(',');
    void jsonRequest(`https://api.frankfurter.dev/v2/rates?base=USD&quotes=${quotes}`, 12000).then((rows: { quote?: string; rate?: number }[]) => {
      if (cancelled || !Array.isArray(rows)) return;
      const next = { ...DEFAULT_FIAT_RATES };
      for (const row of rows) {
        if (FIAT_OPTIONS.some(option => option.id === row.quote) && Number(row.rate) > 0) next[row.quote as FiatCurrency] = Number(row.rate);
      }
      if (next.EUR) next.XPF = next.EUR * 119.331742;
      setFiatRates(next);
      localStorage.setItem(FIAT_RATES_STORAGE_KEY, JSON.stringify(next));
    }).catch(() => undefined).finally(() => { if (!cancelled) setFiatRatesLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => setShowAllAssets(false), [selectedId]);
  useEffect(() => { setChartOpen(false); setChartPeriod('24H'); setChartData([]); setChartPercentage(0); setChartLoading(false); }, [selectedToken]);
  useEffect(() => {
    if (selectedToken && chartPeriod === '24H' && !chartOpen && !tokenStats[selectedToken]?.loading) setChartPercentage(tokenStats[selectedToken]?.change24h ?? null);
  }, [selectedToken, chartPeriod, chartOpen, tokenStats]);

  useEffect(() => {
    if (!soundEnabled && !hapticEnabled) return;
    const soundTargets = '.panel-fold,.group-fold,.new-wallet-fold,.allocation-fold,.swap-fold,.hex-stakes-fold,.hex-calculator-fold,.hex-simulator-fold,.sentiment-fold';
    const handlePanelClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(soundTargets)) {
        if (soundEnabled) playPanelChime();
        if (hapticEnabled) triggerHaptic();
      }
    };
    document.addEventListener('click', handlePanelClick);
    return () => document.removeEventListener('click', handlePanelClick);
  }, [soundEnabled, hapticEnabled]);

  useEffect(() => {
    let cancelled = false;
    setHexCalculatorMetrics(current => ({ ...current, network: hexCalculatorNetwork, loading: true, error: '' }));
    void readHexCalculatorMetrics(hexCalculatorNetwork).then(metrics => {
      if (!cancelled) setHexCalculatorMetrics({ ...metrics, loading: false, error: '' });
    }).catch(() => {
      if (!cancelled) setHexCalculatorMetrics(current => ({ ...current, network: hexCalculatorNetwork, loading: false, error: 'Live HEX calculator data is temporarily unavailable.' }));
    });
    return () => { cancelled = true; };
  }, [hexCalculatorNetwork, hexCalculatorRefresh]);

  useEffect(() => {
    if (!wallets.length) {
      hexStakeCacheRef.current = {};
      setHexStakeState({ stakes: [], endedStakes: [], loading: false, error: '', refreshedAt: null, network: hexStakeNetworkRef.current });
      return;
    }
    let cancelled = false;
    hexStakeCacheRef.current = {};
    setHexStakeState(current => ({ ...current, loading: true, error: '', network: hexStakeNetworkRef.current }));
    void (async () => {
      for (const scope of ['Both', 'PulseChain', 'Ethereum'] as Network[]) {
        if (cancelled) return;
        try {
          const result = await readHexStakes(wallets, scope);
          if (cancelled) return;
          const liveError = result.failed.length === 0 ? '' : result.failed.length === (scope === 'Both' ? 2 : 1)
            ? 'HEX stake data is temporarily unavailable from the selected network.'
            : `${result.failed.join(' and ')} stake data is temporarily unavailable.`;
          const historyError = result.historyFailed.length ? `${result.historyFailed.join(' and ')} unstaked history is temporarily incomplete.` : '';
          const nextState: HexStakeState = { stakes: result.stakes, endedStakes: result.endedStakes, loading: false, error: [liveError, historyError].filter(Boolean).join(' '), refreshedAt: Date.now(), network: scope };
          hexStakeCacheRef.current[scope] = nextState;
          if (hexStakeNetworkRef.current === scope) setHexStakeState(nextState);
        } catch {
          if (cancelled) return;
          const nextState: HexStakeState = { stakes: [], endedStakes: [], loading: false, error: 'HEX stake data is temporarily unavailable. Tap refresh to try again.', refreshedAt: Date.now(), network: scope };
          hexStakeCacheRef.current[scope] = nextState;
          if (hexStakeNetworkRef.current === scope) setHexStakeState(nextState);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [walletStakeKey, hexStakeRefresh]);

  useEffect(() => {
    if (!wallets.length) {
      setHexHoldingState({ value: 0, loading: false, network: hexStakeNetwork });
      return;
    }
    let cancelled = false;
    const requestedNetwork = hexStakeNetwork;
    setHexHoldingState(current => ({ value: current.network === requestedNetwork ? current.value : 0, loading: true, network: requestedNetwork }));
    void Promise.allSettled(wallets.map(wallet => loadPortfolio({ ...wallet, network: requestedNetwork }))).then(results => {
      if (cancelled) return;
      const value = results.reduce((portfolioTotal, result) => portfolioTotal + (result.status === 'fulfilled' ? result.value.reduce((walletTotal, asset) => walletTotal + (asset.value ?? 0), 0) : 0), 0);
      setHexHoldingState({ value, loading: false, network: requestedNetwork });
    });
    return () => { cancelled = true; };
  }, [walletStakeKey, hexStakeNetwork, hexStakeRefresh]);

  useEffect(() => {
    if (!selectedToken || !TOKEN_DATA[selectedToken]) return;
    if (!chartOpen && chartPeriod === '24H') {
      setChartData([]);
      setChartLoading(false);
      return;
    }
    let cancelled = false;
    setChartLoading(true);
    void fetchChartForSymbol(selectedToken, chartPeriod).then(data => {
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
    const saved = cachedPortfolio(wallet.id, requestedNetwork);
    const previousPortfolio = portfolios[wallet.id]?.network === requestedNetwork ? portfolios[wallet.id] : saved;
    setPortfolios(current => {
      const currentPortfolio = current[wallet.id]?.network === requestedNetwork ? current[wallet.id] : undefined;
      const fallback = currentPortfolio ?? saved;
      return { ...current, [wallet.id]: { assets: ensureUsdcAssets(fallback?.assets ?? [], requestedNetwork), loading: true, error: '', refreshedAt: fallback?.refreshedAt ?? null, network: requestedNetwork } };
    });
    try {
      const liveAssets = await loadPortfolio({ ...wallet, network: requestedNetwork });
      const assets = preserveKnownAssetPrices(liveAssets, previousPortfolio?.assets ?? []);
      if (portfolioRequestRef.current[wallet.id] !== requestedNetwork) return;
      const nextPortfolio: Portfolio = { assets, loading: false, error: '', refreshedAt: Date.now(), network: requestedNetwork };
      savePortfolioCache(wallet.id, nextPortfolio);
      setPortfolios(current => ({ ...current, [wallet.id]: nextPortfolio }));
    } catch (requestError) {
      if (portfolioRequestRef.current[wallet.id] !== requestedNetwork) return;
      const message = requestError instanceof Error && requestError.name === 'AbortError' ? 'The live indexer timed out. Tap refresh to try again.' : 'Live portfolio data is temporarily unavailable.';
      setPortfolios(current => {
        const fallback = current[wallet.id]?.network === requestedNetwork ? current[wallet.id] : saved;
        const assets = ensureUsdcAssets(fallback?.assets ?? [], requestedNetwork);
        return { ...current, [wallet.id]: { assets, loading: false, error: assets.some(asset => asset.value !== 0) ? 'Offline — showing the last data saved on this device.' : message, refreshedAt: fallback?.refreshedAt ?? null, network: requestedNetwork } };
      });
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
  const selectedCalculatorWalletKey = selectedWallet ? `${selectedWallet.id}:${selectedWallet.address.toLowerCase()}` : '';
  useEffect(() => {
    if (!selectedWallet) {
      setHexCalculatorHolding({ walletId: '', network: hexCalculatorNetwork, amount: 0, value: 0, loading: false });
      return;
    }
    let cancelled = false;
    const walletId = selectedWallet.id;
    setHexCalculatorHolding(current => ({ walletId, network: hexCalculatorNetwork, amount: current.walletId === walletId && current.network === hexCalculatorNetwork ? current.amount : 0, value: current.walletId === walletId && current.network === hexCalculatorNetwork ? current.value : null, loading: true }));
    void loadChainPortfolio(selectedWallet.address, hexCalculatorNetwork).then(assets => {
      if (cancelled) return;
      const holding = liquidHexHolding(assets, hexCalculatorNetwork);
      setHexCalculatorHolding({ walletId, network: hexCalculatorNetwork, ...holding, loading: false });
    }).catch(() => {
      if (!cancelled) setHexCalculatorHolding({ walletId, network: hexCalculatorNetwork, amount: 0, value: null, loading: false });
    });
    return () => { cancelled = true; };
  }, [selectedCalculatorWalletKey, hexCalculatorNetwork, hexCalculatorRefresh]);
  const selectedExplorerNetwork: ChainNetwork = network === 'Ethereum' || (network === 'Both' && selectedWallet?.network === 'Ethereum') ? 'Ethereum' : 'PulseChain';
  const selectHexStakeNetwork = (scope: Network) => {
    hexStakeNetworkRef.current = scope;
    setHexStakeNetwork(scope);
    const cached = hexStakeCacheRef.current[scope];
    setHexStakeState(cached ?? { stakes: [], endedStakes: [], loading: true, error: '', refreshedAt: null, network: scope });
  };
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
  const selectedAssets = ensureUsdcAssets(selectedPortfolio?.assets ?? [], network);
  const filteredAssets = selectedAssets.filter(asset => {
    const symbol = tokenKey(asset.symbol);
    if (!hideDust) return true;
    if (isHiddenDustAsset(asset)) return false;
    const verifiedContract = VERIFIED_TOKEN_CONTRACTS[asset.network]?.[symbol];
    if (verifiedContract && !isVerifiedCoreAsset(asset)) return false;
    return isVerifiedCoreAsset(asset) || FEATURED_SYMBOLS.has(symbol) || (asset.value !== null && asset.value >= 0.01);
  });
  const hiddenDustCount = selectedAssets.length - filteredAssets.length;
  const visibleAssets = [...filteredAssets]
    .sort((left, right) => Number(tokenKey(right.symbol) === 'USDC') - Number(tokenKey(left.symbol) === 'USDC'))
    .slice(0, showAllAssets ? undefined : 30);
  const allocationAssets = wallets.flatMap(wallet => {
    const portfolio = portfolios[wallet.id];
    return portfolio?.network === network ? portfolio.assets : [];
  });
  const pulseLeague = pulseLeagueForAssets(allocationAssets);
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
  const panelThemeStyle = PANEL_OPTIONS.reduce((style, option) => {
    const manual = customGradients[option.id];
    if (manual) {
      (style as Record<string, string>)[option.cssVariable] = `linear-gradient(125deg,${manual.from},${manual.to})`;
      return style;
    }
    const theme = panelThemes[option.id];
    if (theme && theme !== 'default') (style as Record<string, string>)[option.cssVariable] = PANEL_THEME_GRADIENTS[theme];
    return style;
  }, {} as React.CSSProperties);

  return <div className="landing-shell" style={panelThemeStyle}>
    <main className="landing-main">
      <section className="intake-section">
        <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
        <div className="intake-copy">
          <div className="sticky-hero">
          <div className="hero-title-row"><h1>{ui.hero && <>{ui.hero}<br/></>}<span>{ui.privateView}</span></h1><span className="pulse-league" title={`PulseChain league: ${pulseLeague.label}`} aria-label={`PulseChain league: ${pulseLeague.label}`}><i>{pulseLeague.emoji}</i></span></div>
          <p>{ui.subtitle}</p>
          <div className="trust-row"><span><LockKeyhole size={15}/>{ui.noConnection}</span><span><ShieldCheck size={15}/>{ui.noSeed}</span><span className="trust-live"><Radio size={12}/>Live</span></div>
          <div className="ecosystem-strip"><span>{ui.builtFor}</span><div>{['ETH', 'PLS', 'HEX', 'pHEX', 'cHEX', 'PLSX', 'PRVX', 'INC'].map(sym => (
            <button key={sym} className={`eco-token-btn ${sym === 'cHEX' ? 'combined-hex' : ''} ${selectedToken === sym ? 'active' : ''}`} onClick={() => {
              setSelectedToken(sym);
              if (!tokenStats[sym]) {
                setTokenStats(current => ({ ...current, [sym]: { price: 0, change24h: 0, change7d: 0, change30d: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' } }));
                void fetchTokenStatsForSymbol(sym).then(stats => setTokenStats(current => ({ ...current, [sym]: { ...stats, staked: current[sym]?.staked ?? stats.staked } })));
              }
              if (sym === 'PLS' && !tokenStats.PLS?.staked) void fetchPulseStakedSupply().then(staked => { if (staked) setTokenStats(current => ({ ...current, PLS: { ...(current.PLS ?? { price: 0, change24h: 0, change7d: 0, change30d: 0, marketCap: 0, liquidity: 0, supply: 'N/A', holders: 'N/A', loading: true, error: '' }), staked } })); });
            }}>
              <img src={CORE_ICONS[tokenKey(sym)] || ''} alt={sym} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
              <span>{sym}</span>
            </button>
          ))}</div></div>
          </div>

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
                    <div className="token-subtitle-row"><p>{selectedToken === 'PLS' ? `Day ${Math.max(1, Math.floor((Date.now() - PULSECHAIN_LAUNCH_MS) / 86_400_000) + 1).toLocaleString()}` : TOKEN_DATA[selectedToken].subtitle}</p></div>
                  </div>
                </div>
                <div className="token-panel-price">
                  <span className="token-price-value green-value">{tokenStats[selectedToken]?.price ? money(tokenStats[selectedToken].price) : 'Loading...'}</span>
                  <span className={`token-price-change ${chartPercentage === null || chartPercentage >= 0 ? 'positive' : 'negative'}`}>
                    {chartLoading ? 'Loading' : chartPercentage === null ? 'Unavailable' : `${chartPercentage >= 0 ? '+' : ''}${chartPercentage.toFixed(2)}%`} <small>{chartPeriod}</small>
                  </span>
                </div>
              </div>
              <div className="token-stats-row">
                <div className="token-stat">
                  <span>Market Cap</span>
                  <b className="green-value">{tokenStats[selectedToken]?.marketCap ? compactUsd(tokenStats[selectedToken].marketCap * 1_000_000) : 'N/A'}</b>
                </div>
                <div className="token-stat">
                  <span>Liquidity</span>
                  <b className="green-value">{tokenStats[selectedToken]?.liquidity ? compactUsd(tokenStats[selectedToken].liquidity * 1_000_000) : 'N/A'}</b>
                </div>
                <div className="token-stat">
                  <span>Supply</span>
                  <b>{tokenStats[selectedToken]?.supply || 'N/A'}</b>
                </div>
                <div className="token-stat"><span>Staked</span><b>{selectedToken === 'PLS' && !tokenStats[selectedToken]?.staked ? 'Reading…' : tokenStats[selectedToken]?.staked || 'N/A'}</b></div>
                <div className="token-stat"><span>Holders</span><b>{tokenStats[selectedToken]?.holders || 'N/A'}</b></div>
              </div>
              <button className="token-chart-button" onClick={() => { const opening = !chartOpen; setChartOpen(opening); if (opening && chartData.length < 2) setChartRetry(value => value + 1); }}>{chartOpen ? 'Hide Chart' : 'Show Chart'} {chartOpen ? <ChevronDown size={16} style={{ transform: 'rotate(180deg)' }}/> : <ChevronDown size={16}/>}</button>
              {chartOpen && <><div className="chart-period-selector">
                {['24H', '7D', '30D', '3M', '6M', '1Y', 'ATL', 'All'].map(p => (
                  <button key={p} className={`chart-period-btn ${chartPeriod === p ? 'active' : ''}`} onClick={() => { setChartPercentage(fallbackPercentage(tokenStats[selectedToken], p)); setChartPeriod(p); }}>{p}</button>
                ))}
              </div><div className="token-chart-container">
                {chartLoading ? <div className="chart-status"><RefreshCw size={17} className="spin-icon"/>Building {chartPeriod} chart…</div>
                  : chartData.length >= 2 ? <div ref={chartContainerRef} className="token-chart" role="img" aria-label={`${selectedToken} ${chartPeriod} price chart`} data-chart-points={chartData.length}/>
                    : <div className="chart-status">No verified price history is available for this range.</div>}
              </div></>}
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
            <div className="portfolio-totals"><div><span>{ui.totalPortfolio} · {networkLabel(network)}</span><strong>{privateMode ? '••••••' : networkLoading ? ui.syncing : knownValue > 0 ? money(knownValue) : money(0)}</strong><small>{wallets.length} {wallets.length === 1 ? ui.address : ui.addresses} · {networkLabel(network)}</small></div>{selectedWallet && <div className="selected-total"><span>{selectedWallet.label} · {networkLabel(network)}</span><strong>{privateMode ? '••••••' : networkLoading ? ui.syncing : selectedValue > 0 ? money(selectedValue) : money(0)}</strong><small>{privateMode ? 'Network values hidden' : network === 'Both' ? `ETH ${money(selectedEthereumValue)} · PLS ${money(selectedPulseValue)}` : `${networkLabel(network)} · all priced coins`}</small></div>}</div>
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
            <div className="asset-panel-head"><div><p className="eyebrow">{ui.selectedAddress} · {networkLabel(network)}</p><input className="address-name-input" aria-label="Rename selected wallet" value={selectedWallet.label} onChange={event => renameWallet(selectedWallet.id, event.target.value)}/><button onClick={() => copy(selectedWallet.address, selectedWallet.id)}>{privateMode ? '••••••••••••••••' : short(selectedWallet.address)} {copied === selectedWallet.id ? <em>COPIED</em> : <Copy size={13}/>}</button></div><div className="selected-actions"><button className={hideDust ? 'dust-active' : ''} onClick={() => setHideDust(value => !value)}>{hideDust ? `${ui.showDust}${hiddenDustCount ? ` · ${hiddenDustCount} hidden` : ''}` : ui.hideDust}</button><a href={`${selectedExplorerNetwork === 'Ethereum' ? 'https://etherscan.io/address/' : 'https://scan.pulsechain.com/address/'}${selectedWallet.address}`} target="_blank" rel="noreferrer" aria-label={`Open ${selectedExplorerNetwork} explorer`}>Explorer <ArrowUpRight size={15}/></a><button onClick={() => setPendingDeleteWalletId(selectedWallet.id)} aria-label={`Delete ${selectedWallet.label}`}><Trash2 size={16}/></button></div></div>
            {pendingDeleteWalletId === selectedWallet.id && <div className="address-delete-warning" role="alertdialog" aria-label={`Confirm deletion of ${selectedWallet.label}`}><span><b>Are you sure you want to delete this address?</b><small>{selectedWallet.label} will be removed from this device. This does not affect the blockchain wallet.</small></span><div><button type="button" onClick={() => setPendingDeleteWalletId(null)}>Cancel</button><button type="button" className="confirm-delete" onClick={() => { setWallets(current => current.filter(wallet => wallet.id !== selectedWallet.id)); setPendingDeleteWalletId(null); }}>Delete address</button></div></div>}
            <div className="asset-list">
              {(!selectedPortfolio || selectedPortfolio.loading) && (selectedPortfolio?.assets.length ?? 0) === 0 && <div className="asset-message"><RefreshCw size={20} className="spin-icon"/>Reading live {networkLabel(network)} assets…</div>}
              {selectedPortfolio?.error && <div className="asset-message error-message">{selectedPortfolio.error}<button onClick={() => refreshWallet(selectedWallet)}>Try again</button></div>}
              {!selectedPortfolio?.loading && !selectedPortfolio?.error && selectedPortfolio?.assets.length === 0 && <div className="asset-message">No indexed assets were found for this address.</div>}
              {visibleAssets.map(asset => { const shownSymbol = displayAssetSymbol(asset); const shownKey = tokenKey(shownSymbol); return <article className="asset-row" key={asset.id} data-network={asset.network}>
                <div className={`asset-logo ${asset.native ? 'native' : ''} ${shownKey.toLowerCase()}-logo`}><span>{shownSymbol.slice(0, 3)}</span>{(CORE_ICONS[shownKey] || asset.icon)?.startsWith('http') || CORE_ICONS[shownKey] ? <img src={CORE_ICONS[shownKey] || asset.icon || ''} alt={`${shownSymbol} logo`} onError={event => { event.currentTarget.style.display = 'none'; }}/>: null}</div>
                <div className="asset-main"><div className="asset-name"><b>{shownSymbol} <small>({asset.name})</small></b></div>{network === 'Both' && <div className="asset-network-row"><em className={`asset-network-badge ${asset.network === 'Ethereum' ? 'ethereum' : 'pulsechain'}`}><i>{asset.network === 'Ethereum' ? '◆' : ''}</i>{asset.network}</em></div>}<div className="asset-balance"><b>{privateMode ? '••••' : compactAmount(asset.amount)} <small>{shownSymbol}</small></b></div></div>
                <div className="asset-price"><b>{privateMode ? '••••' : asset.value === null ? '—' : money(asset.value)}</b><small>{privateMode ? 'Price hidden' : money(asset.price)}</small></div>
              </article>; })}
              {filteredAssets.length > 30 && <button className="show-assets" onClick={() => setShowAllAssets(value => !value)}>{showAllAssets ? 'Show top assets' : `View all ${filteredAssets.length} visible assets`}</button>}
            </div>
            <div className="live-data-note"><Radio size={11}/>Live read-only data from {networkLabel(network)} · {selectedPortfolio?.refreshedAt ? `updated ${new Date(selectedPortfolio.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'waiting to sync'}</div>
          </div>}
        </div>}
      </section><div className={`new-wallet-panel ${newWalletPanelOpen ? 'open' : ''}`}><div className="new-wallet-glow"/><button className="new-wallet-fold" onClick={() => setNewWalletPanelOpen(value => !value)} aria-expanded={newWalletPanelOpen}><span className="new-wallet-title"><i className="wallet-orbit"><FolderPlus size={20}/></i><span><small>{ui.organize}</small><b>{ui.createAnother}</b></span></span><ChevronDown size={17}/></button>{newWalletPanelOpen && <div className="new-wallet-body"><p className="panel-note">Create a separate wallet for personal addresses, whales, or any watchlist you choose.</p><div className="created-wallets"><p>{ui.createdWallets}</p>{walletGroups.map(group => { const addressCount = wallets.filter(wallet => (wallet.groupId ?? DEFAULT_GROUP_ID) === group.id).length; const confirming = pendingDeleteGroupId === group.id; return <article className={`created-wallet-row ${confirming ? 'confirming' : ''}`} key={group.id}><div className="created-wallet-summary"><span><b>{group.name}</b><small>{addressCount} {addressCount === 1 ? ui.address : ui.addresses}</small></span>{group.id === DEFAULT_GROUP_ID ? <em>Default</em> : <button type="button" className="wallet-delete-trigger" onClick={() => setPendingDeleteGroupId(group.id)} aria-label={`Delete ${group.name}`}><Trash2 size={15}/>Delete</button>}</div>{confirming && <div className="wallet-delete-warning" role="alertdialog" aria-label={`Confirm deletion of ${group.name}`}><b>Are you sure you want to delete this wallet?</b><small>{addressCount ? `This removes ${addressCount} saved ${addressCount === 1 ? 'address' : 'addresses'} from this device.` : 'This wallet is empty and will be removed from this device.'}</small><div><button type="button" onClick={() => setPendingDeleteGroupId(null)}>Cancel</button><button type="button" className="confirm-delete" onClick={() => deleteGroup(group.id)}>Delete wallet</button></div></div>}</article>; })}</div><div className="group-creator"><FolderPlus size={15}/><input aria-label="New wallet group name" value={newGroupName} onChange={event => setNewGroupName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addGroup(); } }} placeholder="Name a new wallet, e.g. Whales"/><button onClick={addGroup} disabled={!newGroupName.trim()}>Create wallet</button></div></div>}</div><section className={`allocation-panel ${allocationOpen ? 'open' : ''}`}><button className="allocation-fold" type="button" onClick={() => setAllocationOpen(value => !value)} aria-expanded={allocationOpen}><span className="allocation-title"><i className="wallet-orbit"><ChartPie size={20}/></i><span><small>{ui.allocationEyebrow}</small><b>{ui.allocation}</b></span></span><ChevronDown size={17}/></button>{allocationOpen && <div className="allocation-body"><div className="allocation-scope"><span><b>All wallets</b><small>{wallets.length} {wallets.length === 1 ? ui.address : ui.addresses} · {networkLabel(network)}</small></span><div className="allocation-network-switch" role="group" aria-label="Allocation network">{(['Ethereum', 'PulseChain', 'Both'] as Network[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => chooseNetwork(option)}>{option}</button>)}</div></div>{networkLoading ? <div className="allocation-empty"><RefreshCw size={18} className="spin-icon"/>Reading all wallet allocations…</div> : allocationItems.length && allocationTotal > 0 ? <div className="allocation-content"><div className="allocation-donut" style={{ background: allocationGradient }}><span><b>All wallets</b><small>{privateMode ? '••••' : money(allocationTotal)}</small><em>{wallets.length} {wallets.length === 1 ? ui.address : ui.addresses}</em></span></div><div className="allocation-legend">{allocationItems.map((item, index) => <div className="allocation-item" key={`${item.symbol}-${index}`} style={{ '--allocation-color': item.color } as React.CSSProperties}><i>{item.icon ? <img src={item.icon} alt={`${item.symbol} logo`} onError={event => { event.currentTarget.style.display = 'none'; }}/> : <span/>}</i><span className="allocation-color-swatch"/><b>{item.symbol}</b><span className="allocation-item-values"><strong>{`${((item.value / allocationTotal) * 100).toFixed(1)}%`}</strong><small>{privateMode ? '••••' : money(item.value)}</small></span></div>)}</div></div> : <div className="allocation-empty">{ui.noAllocation}</div>}</div>}</section></>}

      <SwapPanel open={swapOpen} onToggle={() => setSwapOpen(value => !value)}/>

      {wallets.length > 0 && <HexStakesPanel state={hexStakeState} open={hexStakesOpen} filter={hexStakeFilter} network={hexStakeNetwork} walletCount={wallets.length} holdingsValue={hexHoldingState.network === hexStakeNetwork ? hexHoldingState.value : 0} holdingsLoading={hexHoldingState.network !== hexStakeNetwork || hexHoldingState.loading} privateMode={privateMode} onToggle={() => setHexStakesOpen(value => !value)} onFilter={setHexStakeFilter} onNetwork={selectHexStakeNetwork} onRefresh={() => setHexStakeRefresh(value => value + 1)}/>}

      <HexCalculatorPanel open={hexCalculatorOpen} network={hexCalculatorNetwork} metrics={hexCalculatorMetrics} holding={hexCalculatorHolding} onToggle={() => setHexCalculatorOpen(value => !value)} onNetwork={setHexCalculatorNetwork} onRefresh={() => setHexCalculatorRefresh(value => value + 1)}/>
      <HexSimulationCalculatorPanel open={hexSimulatorOpen} network={hexCalculatorNetwork} metrics={hexCalculatorMetrics} holding={hexCalculatorHolding} onToggle={() => setHexSimulatorOpen(value => !value)} onNetwork={setHexCalculatorNetwork}/>
      <MarketSentimentPanel open={sentimentOpen} onToggle={() => setSentimentOpen(value => !value)}/>

      {wallets.length === 0 && <section className="next-preview"><p className="eyebrow">WHAT COMES NEXT</p><h2>Your wallet becomes a living dashboard.</h2><div className="preview-panels"><div/><div/><div/></div><p>Token panels inspired by your reference design will appear here after we connect live portfolio data.</p></section>}
    </main>
    {settingsOpen && <section className="settings-panel" style={{ '--settings-opacity': settingsTransparency / 100 } as React.CSSProperties} aria-label={ui.settings}>
      <div className="settings-head">
        <div className="settings-head-title">{settingsSection && <button className="settings-back" type="button" onClick={() => setSettingsSection(null)} aria-label="Back to settings"><ArrowLeft size={17}/></button>}<div><p className="eyebrow">{ui.settings.toUpperCase()}</p><h2>{settingsSection === 'currency' ? 'Currency' : settingsSection === 'customize' ? 'Customize' : settingsSection === 'info' ? 'How to use the app' : settingsSection === 'language' ? ui.language : settingsSection === 'network' ? 'Network' : settingsSection === 'sound' ? 'Sound & haptics' : ui.settings}</h2></div></div>
        <button type="button" onClick={() => { setSettingsOpen(false); setSettingsSection(null); }} aria-label="Close settings"><X size={18}/></button>
      </div>
      {!settingsSection && <div className="settings-menu">
        <button type="button" onClick={() => setSettingsSection('currency')}><i><CircleDollarSign size={20}/></i><span><b>Currency</b><small>{FIAT_OPTIONS.find(option => option.id === fiatCurrency)?.label} · {fiatCurrency}</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('customize')}><i><SlidersHorizontal size={20}/></i><span><b>Customize</b><small>Panel transparency · {settingsTransparency}%</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('info')}><i><Info size={20}/></i><span><b>Info</b><small>Learn what every dashboard panel does</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('language')}><i><Languages size={20}/></i><span><b>{ui.language}</b><small>{LANGUAGE_OPTIONS.find(option => option.id === language)?.native}</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('network')}><i><NetworkIcon size={20}/></i><span><b>Network</b><small>{networkLabel(network)}</small></span><ChevronDown size={17}/></button>
        <button type="button" onClick={() => setSettingsSection('sound')}><i>{soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}</i><span><b>Sound</b><small>Sound {soundEnabled ? 'on' : 'off'} · Haptics {hapticEnabled ? 'on' : 'off'}</small></span><ChevronDown size={17}/></button>
      </div>}
      {settingsSection === 'currency' && <div className="currency-settings"><div className="currency-rate-note"><CircleDollarSign size={16}/><span><b>Wallet display currency</b><small>{fiatRatesLoading ? 'Refreshing daily exchange rates…' : fiatRates[fiatCurrency] ? `1 USD = ${fiatRates[fiatCurrency]!.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${fiatCurrency}` : 'Saved rate unavailable · reconnect to refresh'}</small></span></div><div className="settings-network-options currency-options" role="group" aria-label="Wallet display currency">{FIAT_OPTIONS.map(option => <button type="button" key={option.id} className={fiatCurrency === option.id ? 'active' : ''} aria-pressed={fiatCurrency === option.id} onClick={() => setFiatCurrency(option.id)}><i>{option.symbol}</i><span><b>{option.label}</b><small>{option.region} · {option.id}</small></span></button>)}</div><p className="currency-source">Daily reference rates are cached on this device for offline display. CFP franc uses its fixed euro parity.</p></div>}
      {settingsSection === 'language' && <div className="language-options" role="group" aria-label={ui.language}>{LANGUAGE_OPTIONS.map(option => <button type="button" key={option.id} className={language === option.id ? 'active' : ''} aria-pressed={language === option.id} onClick={() => setLanguage(option.id)}><span>{option.native}</span><small>{option.label}</small></button>)}</div>}
      {settingsSection === 'network' && <div className="settings-network-options" role="group" aria-label="Network">{(['Ethereum', 'PulseChain', 'Both'] as Network[]).map(option => <button type="button" key={option} className={network === option ? 'active' : ''} aria-pressed={network === option} onClick={() => chooseNetwork(option)}><i className={option === 'Ethereum' ? 'eth-diamond' : option === 'PulseChain' ? 'pulse-dot' : 'both-network-icon'}>{option === 'Ethereum' ? '◆' : option === 'Both' ? <><span className="pulse-dot"/><span className="eth-diamond">◆</span></> : null}</i><span><b>{option === 'Both' ? 'Both networks' : option}</b><small>{option === 'Ethereum' ? 'ETH · Chain 1' : option === 'PulseChain' ? 'PLS · Chain 369' : 'PulseChain + Ethereum'}</small></span></button>)}</div>}
      {settingsSection === 'customize' && <div className="settings-customize">
        <div className="transparency-label"><span><b>Panel transparency</b><small>See your portfolio behind Settings</small></span><strong>{settingsTransparency}%</strong></div>
        <input type="range" min="35" max="98" step="1" value={settingsTransparency} onChange={event => setSettingsTransparency(Number(event.target.value))} aria-label="Settings panel transparency"/>
        <div className="transparency-scale"><span>More transparent</span><span>More solid</span></div>
        <div className="transparency-presets">{[{ label: 'Glass', value: 45 }, { label: 'Balanced', value: 77 }, { label: 'Solid', value: 94 }].map(option => <button type="button" key={option.label} className={settingsTransparency === option.value ? 'active' : ''} onClick={() => setSettingsTransparency(option.value)}><span>{option.label}</span><small>{option.value}%</small></button>)}</div>
        <div className="panel-customizer">
          <div className="settings-subheading"><Palette size={16}/><span><b>Customize panels</b><small>Choose a panel, then a solid color or gradient</small></span></div>
          <div className="panel-targets" role="group" aria-label="Panel to customize">{PANEL_OPTIONS.map(option => <button type="button" key={option.id} className={customPanel === option.id ? 'active' : ''} aria-pressed={customPanel === option.id} onClick={() => setCustomPanel(option.id)}>{option.label}</button>)}</div>
          <small className="palette-label">DEFAULT</small>
          <button type="button" className={`panel-default-theme ${(panelThemes[customPanel] ?? 'default') === 'default' && !customGradients[customPanel] ? 'active' : ''}`} onClick={() => { setCustomGradients(current => { const next = { ...current }; delete next[customPanel]; return next; }); setPanelThemes(current => ({ ...current, [customPanel]: 'default' })); }}>Use original panel colors</button>
          <small className="palette-label">COLOR PALETTE</small>
          <div className="panel-theme-grid colors">{SOLID_PANEL_THEMES.map(theme => <button type="button" key={theme} className={`panel-theme-swatch ${panelThemes[customPanel] === theme && !customGradients[customPanel] ? 'active' : ''}`} style={{ background: PANEL_THEME_GRADIENTS[theme as Exclude<PanelTheme, 'default'>] }} aria-label={`${theme} panel color`} aria-pressed={panelThemes[customPanel] === theme && !customGradients[customPanel]} onClick={() => { setCustomGradients(current => { const next = { ...current }; delete next[customPanel]; return next; }); setPanelThemes(current => ({ ...current, [customPanel]: theme })); }}/>)}</div>
          <small className="palette-label">GRADIENT PALETTE</small>
          <div className="panel-theme-grid gradients">{GRADIENT_PANEL_THEMES.map(theme => <button type="button" key={theme} className={`panel-theme-swatch ${panelThemes[customPanel] === theme && !customGradients[customPanel] ? 'active' : ''}`} style={{ background: PANEL_THEME_GRADIENTS[theme as Exclude<PanelTheme, 'default'>] }} aria-label={`${theme} panel gradient`} aria-pressed={panelThemes[customPanel] === theme && !customGradients[customPanel]} onClick={() => { setCustomGradients(current => { const next = { ...current }; delete next[customPanel]; return next; }); setPanelThemes(current => ({ ...current, [customPanel]: theme })); }}/>)}</div>
          <small className="palette-label">MANUAL GRADIENT</small>
          <div className="manual-gradient"><label><span>Start</span><input type="color" value={customGradientDraft.from} onChange={event => setCustomGradientDraft(current => ({ ...current, from: event.target.value }))}/></label><i style={{ background: `linear-gradient(90deg,${customGradientDraft.from},${customGradientDraft.to})` }}/><label><span>End</span><input type="color" value={customGradientDraft.to} onChange={event => setCustomGradientDraft(current => ({ ...current, to: event.target.value }))}/></label><button type="button" onClick={() => setCustomGradients(current => ({ ...current, [customPanel]: customGradientDraft }))}>Apply</button></div>
          <button type="button" className="reset-panel-themes" onClick={() => { setPanelThemes({}); setCustomGradients({}); }}>Reset every panel to default</button>
        </div>
      </div>}
      {settingsSection === 'sound' && <div className="sound-settings"><div className="settings-subheading"><Volume2 size={16}/><span><b>Panel sound</b><small>A louder cyber chime for panel controls</small></span></div><div className="settings-network-options sound-options" role="group" aria-label="Panel sound"><button type="button" className={`enabled-option ${soundEnabled ? 'active' : ''}`} aria-pressed={soundEnabled} onClick={() => { setSoundEnabled(true); playPanelChime(); }}><i><Volume2 size={20}/></i><span><b>Sound on</b><small>Play the chime when panels open or close</small></span></button><button type="button" className={`disabled-option ${!soundEnabled ? 'active' : ''}`} aria-pressed={!soundEnabled} onClick={() => setSoundEnabled(false)}><i><VolumeX size={20}/></i><span><b>Sound off</b><small>Keep panel controls silent</small></span></button></div><div className="settings-subheading haptic-heading"><Vibrate size={16}/><span><b>Haptic feedback</b><small>Phone vibration where supported by the browser</small></span></div><div className="settings-network-options sound-options" role="group" aria-label="Panel haptics"><button type="button" className={`enabled-option ${hapticEnabled ? 'active' : ''}`} aria-pressed={hapticEnabled} onClick={() => { setHapticEnabled(true); triggerHaptic(); }}><i><Vibrate size={20}/></i><span><b>Haptics on</b><small>Vibrate briefly when a panel is pressed</small></span></button><button type="button" className={`disabled-option ${!hapticEnabled ? 'active' : ''}`} aria-pressed={!hapticEnabled} onClick={() => setHapticEnabled(false)}><i><X size={20}/></i><span><b>Haptics off</b><small>Disable vibration feedback</small></span></button></div></div>}
      {settingsSection === 'info' && <div className="settings-info"><p>This is a watch-only portfolio. It never requests a seed phrase and cannot move your cryptocurrency.</p><article><b>Cryptocurrency logo row</b><span>Press ETH, PLS, HEX, pHEX, cHEX, PLSX, PRVX, or INC to open its live market panel. Choose a time range and press Show Chart to view its price history. cHEX combines Ethereum HEX and PulseChain pHEX market data.</span></article><article><b>Your tracked wallets</b><span>Opens your locally saved watch-only addresses, wallet totals, live assets, dust controls, naming, explorer access, and the protected address-delete flow.</span></article><article><b>Enter a public address</b><span>Add a public 0x address and choose Ethereum, PulseChain, or both networks. Public addresses remain stored only in this browser.</span></article><article><b>Create another wallet</b><span>Create named groups such as Personal or Whales, then organize multiple tracked addresses inside them.</span></article><article><b>Portfolio allocation</b><span>Combines priced assets from all tracked addresses into a cryptocurrency allocation chart for Ethereum, PulseChain, or both.</span></article><article><b>Swap</b><span>Select two tokens and enter an amount to see a live price-based exchange estimate. This watch-only quote does not connect a wallet or submit a PulseX transaction.</span></article><article><b>HEX Stakes</b><span>Reads open, matured, and previously ended HEX stakes directly from the selected blockchain contracts. Its net worth combines liquid token holdings with currently staked HEX for Ethereum, PulseChain, or both.</span></article><article><b>HEX Calculator</b><span>Enter a HEX amount and stake length in days, months, or years. It uses the live share rate and recent on-chain payouts to estimate T-shares and potential return; future returns are not guaranteed.</span></article><article><b>HEX Calculator Simulation</b><span>Enter your own HEX price, HEX per T-share and daily payout assumptions to explore a manual future scenario without changing the live calculator.</span></article></div>}
    </section>}
    <footer><div className="footer-tools"><button className={`settings-button ${settingsOpen ? 'active' : ''}`} type="button" onClick={() => { const opening = !settingsOpen; setSettingsSection(null); setSettingsOpen(opening); if (opening) window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }} aria-expanded={settingsOpen}><Settings size={15}/>{ui.settings}</button><button className="refresh-button" onClick={refreshApp} aria-label="Refresh PulseVault"><RefreshCw size={14}/>{ui.refresh}</button></div><span>{ui.footer}</span></footer>
  </div>;
}

const rootHost = globalThis as typeof globalThis & { __pulseVaultReactRoot?: ReturnType<typeof createRoot> };
const appRoot = rootHost.__pulseVaultReactRoot ??= createRoot(document.getElementById('root')!);
appRoot.render(<React.StrictMode><App/></React.StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}
