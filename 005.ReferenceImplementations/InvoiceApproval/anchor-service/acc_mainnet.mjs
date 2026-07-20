// Bearing Compliance Receipts — Accumulate MAINNET (DE BARY LLC)
// REAL FUNDS. Guard: requires ACC_ALLOW_MAINNET=true for any spending command.
// Key (seed) is read-only from KEYFILE; operational state (adi, dataAccount) in STATEFILE.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { homedir } from 'os';
import { api_v3, core, Signer, ED25519Key } from 'accumulate.js';

const ENDPOINT  = process.env.ACC_ENDPOINT || 'https://mainnet.accumulatenetwork.io/v3';
const KEYFILE   = process.env.ACC_KEYFILE  || `${homedir()}/.secrets/bearing_acc_mainnet.json`;
const STATEFILE = process.env.ACC_STATE    || `${homedir()}/.secrets/bearing_acc_mainnet_state.json`;
const ADI_NAME  = process.env.ACC_ADI      || 'marcdebary.acme';

const client = new api_v3.JsonRpcClient(ENDPOINT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadKey() {
  if (!existsSync(KEYFILE)) throw new Error(`Key file not found: ${KEYFILE}`);
  const k = JSON.parse(readFileSync(KEYFILE, 'utf8'));
  if (!k.seed) throw new Error('Key file has no "seed" field');
  return k;
}
function loadState() {
  if (!existsSync(STATEFILE)) return {};
  return JSON.parse(readFileSync(STATEFILE, 'utf8'));
}
function saveState(s) { writeFileSync(STATEFILE, JSON.stringify(s, null, 2)); }

function requireMainnetOptIn() {
  if (process.env.ACC_ALLOW_MAINNET !== 'true') {
    throw new Error('SPENDING BLOCKED: set ACC_ALLOW_MAINNET=true to run spending commands on mainnet.');
  }
}

// ACME has 8 decimals. Accept whole/decimal ACME on CLI, convert to base units (bigint).
function acmeToBaseUnits(acmeStr) {
  const [whole, frac = ''] = String(acmeStr).split('.');
  const fracPadded = (frac + '00000000').slice(0, 8);
  return BigInt(whole || '0') * 100000000n + BigInt(fracPadded || '0');
}

async function submitAndWait(txn, sig, label) {
  const subs = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const sub of subs) {
    if (!sub.success) throw new Error(`${label}: submit failed: ${JSON.stringify(sub.asObject?.() ?? sub)}`);
  }
  const txid = Buffer.from(txn.hash()).toString('hex');
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    try {
      const r = await client.call('query', { scope: `acc://${txid}@unknown` });
      const status = r?.status;
      if (status === 'delivered') { console.log(`${label}: DELIVERED txid=${txid}`); return txid; }
      if (status === 'failed' || r?.error) throw new Error(`${label}: FAILED ${JSON.stringify(r?.error ?? r?.status)}`);
    } catch (e) { /* keep polling until timeout */ }
  }
  console.log(`${label}: submitted txid=${txid} (delivery not confirmed within timeout — check explorer)`);
  return txid;
}

async function queryCredits(url) {
  try { const r = await client.call('query', { scope: url }); return r?.account?.creditBalance ?? 0; }
  catch { return null; }
}
async function queryAcme(lta) {
  try { const r = await client.call('query', { scope: lta }); return r?.account?.balance ?? null; }
  catch { return null; }
}

async function main() {
  const cmd = process.argv[2];
  const k = loadKey();
  const s = loadState();

  const key = ED25519Key.from(Buffer.from(k.seed, 'hex'));
  const lite = Signer.forLite(key);
  const lid = lite.url.toString();
  const lta = `${lid}/ACME`;

  // Safety: derived address must match the stored one, else we'd control the wrong account.
  if (k.lid && k.lid !== lid) throw new Error(`DERIVATION MISMATCH: derived ${lid} != stored ${k.lid}. Aborting.`);

  if (cmd === 'info') {
    console.log(JSON.stringify({
      endpoint: ENDPOINT,
      derived_lid: lid, derived_lta: lta,
      stored_lid: k.lid, stored_lta: k.lta,
      match: (k.lid === lid && k.lta === lta),
      adi_target: `acc://${ADI_NAME}`,
      adi_created: s.adi ?? null, dataAccount: s.dataAccount ?? null,
    }, null, 2));
    return;
  }

  if (cmd === 'balance') {
    const acme = await queryAcme(lta);
    const credits = await queryCredits(lid);
    console.log(`ACME (LTA):    ${acme}`);
    console.log(`Credits (LID): ${credits}`);
    return;
  }

  if (cmd === 'oracle') {
    const ns = await client.networkStatus();
    const oracle = ns.oracle.price;
    // Estimate: credits ≈ acme_baseunits * oracle / 1e8 / 1e2 (protocol scales oracle by 1e8, credits have 1e2 precision)
    const perAcme = Number(BigInt(oracle)) / 1e8 * 100; // credits per 1 ACME (estimate)
    console.log(`oracle.price (raw): ${oracle}`);
    console.log(`~ estimated credits per 1 ACME: ${perAcme.toFixed(2)}`);
    console.log(`~ ACME needed for 500 credits (1 ADI): ${(500 / perAcme).toFixed(4)}`);
    console.log('NOTE: exact yield confirmed empirically by the small test conversion.');
    return;
  }

  if (cmd === 'credits-lite') {
    requireMainnetOptIn();
    const acmeArg = process.argv[3];
    if (!acmeArg) throw new Error('usage: credits-lite <acme-amount>');
    const amount = acmeToBaseUnits(acmeArg);
    const ns = await client.networkStatus();
    const oracle = ns.oracle.price;
    const before = await queryCredits(lid);
    console.log(`Converting ${acmeArg} ACME -> credits on ${lid} (oracle=${oracle}) ...`);
    const txn = new core.Transaction({
      header: { principal: lta },
      body: new core.AddCredits({ recipient: lid, amount, oracle }),
    });
    const sig = await lite.sign(txn, { timestamp: Date.now() });
    await submitAndWait(txn, sig, 'addCredits(lite)');
    await sleep(2000);
    const after = await queryCredits(lid);
    console.log(`Credits before: ${before}  ->  after: ${after}  (gained ~${Number(after) - Number(before)})`);
    return;
  }

  if (cmd === 'create-adi') {
    requireMainnetOptIn();
    const adi = ADI_NAME;
    const keyHash = key.address.publicKeyHash;
    console.log(`Creating ADI acc://${adi} (cost 500 credits for 8+ chars) ...`);
    const txn = new core.Transaction({
      header: { principal: lid },
      body: new core.CreateIdentity({
        url: `acc://${adi}`,
        keyHash,
        keyBookUrl: `acc://${adi}/book`,
      }),
    });
    const sig = await lite.sign(txn, { timestamp: Date.now() });
    const txid = await submitAndWait(txn, sig, 'createIdentity');
    s.adi = `acc://${adi}`; saveState(s);
    console.log(`ADI created: acc://${adi}  txid=${txid}`);
    return;
  }

  if (cmd === 'credits-page') {
    requireMainnetOptIn();
    if (!s.adi) throw new Error('No ADI in state — run create-adi first.');
    const acmeArg = process.argv[3];
    if (!acmeArg) throw new Error('usage: credits-page <acme-amount>');
    const amount = acmeToBaseUnits(acmeArg);
    const ns = await client.networkStatus();
    const oracle = ns.oracle.price;
    const page = `${s.adi}/book/1`;
    console.log(`Converting ${acmeArg} ACME -> credits on key page ${page} ...`);
    const txn = new core.Transaction({
      header: { principal: lta },
      body: new core.AddCredits({ recipient: page, amount, oracle }),
    });
    const sig = await lite.sign(txn, { timestamp: Date.now() });
    await submitAndWait(txn, sig, 'addCredits(keypage)');
    console.log(`Key page funded: ${page}`);
    return;
  }

  if (cmd === 'create-data-account') {
    requireMainnetOptIn();
    if (!s.adi) throw new Error('No ADI in state — run create-adi first.');
    const page = `${s.adi}/book/1`;
    const dataAccount = `${s.adi}/receipts`;
    console.log(`Creating data account ${dataAccount} (cost 25 credits from key page) ...`);
    const pageSigner = Signer.forPage(page, key).withVersion(1);
    const txn = new core.Transaction({
      header: { principal: s.adi },
      body: new core.CreateDataAccount({ url: dataAccount }),
    });
    const sig = await pageSigner.sign(txn, { timestamp: Date.now() });
    const txid = await submitAndWait(txn, sig, 'createDataAccount');
    s.dataAccount = dataAccount; saveState(s);
    console.log(`Data account created: ${dataAccount}  txid=${txid}`);
    return;
  }

  if (cmd === 'write-receipt') {
    requireMainnetOptIn();
    if (!s.dataAccount) throw new Error('No data account in state — run create-data-account first.');
    const payloadPath = process.argv[3];
    if (!payloadPath) throw new Error('usage: write-receipt <payload.json>');
    const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    const receiptHash = createHash('sha256').update(canonical).digest();
    const page = `${s.adi}/book/1`;
    const pageSigner = Signer.forPage(page, key).withVersion(1);
    const txn = new core.Transaction({
      header: { principal: s.dataAccount, memo: `bearing-receipt:${payload.solution_id ?? ''}` },
      body: new core.WriteData({
        entry: new core.DoubleHashDataEntry({ data: [receiptHash] }),
      }),
    });
    const sig = await pageSigner.sign(txn, { timestamp: Date.now() });
    const txid = await submitAndWait(txn, sig, 'writeData');
    const result = {
      receipt_hash: receiptHash.toString('hex'),
      canonical_payload: canonical,
      txid,
      data_account: s.dataAccount,
      explorer: `https://explorer.accumulatenetwork.io/acc/${s.dataAccount.replace('acc://', '')}`,
    };
    console.log(JSON.stringify(result, null, 2));
    s.lastReceipt = result; saveState(s);
    return;
  }

  console.log('usage: info | balance | oracle | credits-lite <acme> | create-adi | credits-page <acme> | create-data-account | write-receipt <payload.json>');
  console.log('(spending commands require env ACC_ALLOW_MAINNET=true)');
}

main().catch((e) => { console.error('ERROR:', e && e.message ? e.message : e); process.exit(1); });
