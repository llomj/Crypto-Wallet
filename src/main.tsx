import React, { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Copy, Eye, EyeOff, LayoutDashboard, LockKeyhole, Radio, ShieldCheck, Trash2, WalletCards, Zap } from 'lucide-react';
import './styles.css';

type Network = 'PulseChain' | 'Ethereum';
type TrackedWallet = { id: string; label: string; address: string; network: Network };
const STORAGE_KEY = 'pulse-vault-private-wallets-v2';

function readWallets(): TrackedWallet[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function short(address: string) { return `${address.slice(0, 7)}…${address.slice(-5)}`; }
function validAddress(value: string) { return /^0x[a-fA-F0-9]{40}$/.test(value.trim()); }

function App() {
  const [wallets, setWallets] = useState<TrackedWallet[]>(readWallets);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<Network>('PulseChain');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [privateMode, setPrivateMode] = useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets)), [wallets]);

  const addWallet = (event: FormEvent) => {
    event.preventDefault();
    const cleanAddress = address.trim();
    if (!validAddress(cleanAddress)) return setError('Enter a valid Ethereum-compatible public address.');
    if (wallets.some(w => w.address.toLowerCase() === cleanAddress.toLowerCase() && w.network === network)) return setError('You already track this address on that network.');
    setWallets([{ id: crypto.randomUUID(), label: label.trim() || `Wallet ${wallets.length + 1}`, address: cleanAddress, network }, ...wallets]);
    setAddress(''); setLabel(''); setError('');
  };

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value); setCopied(id); setTimeout(() => setCopied(''), 1200);
  };

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
          <label>Public wallet address<div className={`address-input ${error ? 'invalid' : ''}`}><span>0x</span><input aria-label="Public wallet address" value={address.startsWith('0x') ? address.slice(2) : address} onChange={e => {setAddress(`0x${e.target.value.replace(/^0x/, '')}`); setError('')}} placeholder="Paste the remaining address characters" autoCapitalize="off" autoCorrect="off" spellCheck={false}/></div>{error && <small className="error">{error}</small>}</label>
          <fieldset><legend>Choose network</legend><div className="network-choice"><button type="button" className={network === 'PulseChain' ? 'active' : ''} onClick={() => setNetwork('PulseChain')}><i className="pulse-dot"/><span><b>PulseChain</b><small>PLS · Chain 369</small></span></button><button type="button" className={network === 'Ethereum' ? 'active' : ''} onClick={() => setNetwork('Ethereum')}><i className="eth-diamond">◆</i><span><b>Ethereum</b><small>ETH · Chain 1</small></span></button></div></fieldset>
          <button className="scan-button" type="submit">Track this wallet <ArrowRight size={18}/></button>
          <div className="privacy-line"><LockKeyhole size={13}/>Stored locally in your browser only</div>
        </form>
      </section>

      {wallets.length > 0 && <section className="tracked-section">
        <div className="section-head"><div><p className="eyebrow">PRIVATE WATCHLIST</p><h2>Your tracked wallets</h2></div><button className="privacy-toggle" onClick={() => setPrivateMode(v => !v)}>{privateMode ? <EyeOff size={16}/> : <Eye size={16}/>} {privateMode ? 'Reveal' : 'Hide'} addresses</button></div>
        <div className="wallet-cards">
          {wallets.map((wallet, index) => <article className={`neon-wallet n${index % 4}`} key={wallet.id}>
            <div className="wallet-card-main"><div className="wallet-token"><WalletCards size={21}/></div><div><small>{wallet.network}</small><h3>{wallet.label}</h3><button onClick={() => copy(wallet.address, wallet.id)}>{privateMode ? '••••••••••••••••' : short(wallet.address)} {copied === wallet.id ? <em>COPIED</em> : <Copy size={13}/>}</button></div></div>
            <div className="card-status"><i/>MONITORING</div>
            <div className="wallet-card-actions"><a href={`${wallet.network === 'PulseChain' ? 'https://scan.pulsechain.com/address/' : 'https://etherscan.io/address/'}${wallet.address}`} target="_blank" rel="noreferrer">Explorer <ArrowUpRight size={15}/></a><button onClick={() => setWallets(wallets.filter(w => w.id !== wallet.id))} aria-label={`Remove ${wallet.label}`}><Trash2 size={16}/></button></div>
          </article>)}
        </div>
      </section>}

      {wallets.length === 0 && <section className="next-preview"><p className="eyebrow">WHAT COMES NEXT</p><h2>Your wallet becomes a living dashboard.</h2><div className="preview-panels"><div/><div/><div/></div><p>Token panels inspired by your reference design will appear here after we connect live portfolio data.</p></section>}
    </main>
    <footer><div className="brand mini"><Zap size={14}/>PULSE<span>VAULT</span></div><span>Watch-only portfolio intelligence</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
