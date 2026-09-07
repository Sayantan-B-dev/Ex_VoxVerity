# Blockchain Evidence - Hackathon Judge Prep

Use this file as your pre-demo briefing: read the MEDIUM set for standard judge questions, then drill the HARD set before finals.
Each answer cites the real files and functions so you can open the code live when a judge pushes for proof.

### Q1. What is stored on-chain versus off-chain in VoxVerity?

On-chain we store only a tiny fingerprint: `evidenceHash`, `recordId`, `createdAt`, and the `registrar` address, exactly as defined by the `Evidence` struct in `blockchain/contracts/VoiceIntegrityRegistry.sol`. Everything bulky or sensitive stays off-chain in Supabase, including the full `manifest` JSON, `evidence_hash`, `hash_algorithm`, and call linkage in the `evidence_records` table. Chain linkage metadata lives in a second table called `blockchain_registrations`, which holds `network`, `chain_id`, `contract_address`, `tx_hash`, `block_number`, and `status`. The split is enforced by `registerEvidenceOnChain` in `apps/web/lib/blockchain.ts`, which sends only two `bytes32` values plus one `uint64` timestamp to the contract. This design keeps gas costs tiny and keeps audio and PII out of public chain state while preserving a tamper-evident pointer anyone can re-check.

### Q2. Why did you choose Polygon Amoy for anchoring evidence?

Polygon Amoy is the current Polygon proof-of-stake testnet, and the choice is pinned in code as `BLOCKCHAIN_NETWORK = "polygon-amoy"` with `BLOCKCHAIN_CHAIN_ID = 80002` in `apps/web/lib/blockchain.ts`. It gives us fast blocks, EVM compatibility with our Solidity contract, and free test MATIC so judges and developers can register evidence without spending real money. The ethers v6 client in `registerEvidenceOnChain` builds a `JsonRpcProvider` pointed at `BLOCKCHAIN_RPC_URL` with the Amoy network object passed explicitly for chain ID 80002. Both writers, `apps/web/app/api/evidence/route.ts` and `finalizeCallEvidence` in `apps/web/lib/evidence.ts`, record the same network and chain ID into `blockchain_registrations`. For a hackathon demo this is the right tradeoff because testnet anchoring proves the full flow end to end while mainnet deployment remains a later funding and key-custody decision.

### Q3. What is a canonical manifest in this system?

The canonical manifest is the small JSON object whose SHA-256 hash becomes the evidence fingerprint, built in `apps/web/app/api/evidence/route.ts` for manual packaging and in `finalizeCallEvidence` in `apps/web/lib/evidence.ts` for automatic call close. The manual route builds `call_id`, `incident_id`, `risk_score`, `created_by`, `created_at`, and `model_versions`, while the auto path builds `call_id`, `risk_score`, `risk_severity`, `created_by`, `created_at`, and a fuller `model_versions` map. Canonicalization here is simple and strict: the hash is computed as `SHA-256(JSON.stringify(manifest))`, so the exact key order and serialization produced by that one call is what gets hashed. The same serialization is repeated at verify time in `apps/web/app/api/blockchain/verify/route.ts`, which recomputes the hash from the stored `manifest` and compares it to `evidence_hash`. If any field or byte order changes, the recomputed hash will not match and local verification fails before the chain is even consulted.

### Q4. How is SHA-256 reproducibility guaranteed from packaging to verification?

Reproducibility comes from using one algorithm and one serialization on both ends: Node `crypto.createHash("sha256")` over `JSON.stringify(manifest)` rendered as hex. The packaging side in `apps/web/app/api/evidence/route.ts` and the auto path in `apps/web/lib/evidence.ts` both use this exact construction to produce `evidence_hash`. The verify side in `apps/web/app/api/blockchain/verify/route.ts` imports Node `crypto`, recomputes the same digest from the stored `rec.manifest`, and sets `localVerified` by strict equality with `rec.evidence_hash`. The stored `hash_algorithm` column is always the string `SHA-256`, so a future algorithm change would be visible in the row rather than silent. Because the manifest is stored verbatim in `evidence_records`, anyone can reproduce the digest offline with any SHA-256 tool and confirm the stored hash is honest.

### Q5. What happens when the blockchain is not configured?

The system is deliberately fail-soft so the demo never crashes on a laptop without a wallet or RPC URL. The helper `config` in `apps/web/lib/blockchain.ts` reads `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, and `VOICE_REGISTRY_ADDRESS`, and `isConfigured` requires all three to be present. When any are missing, `registerEvidenceOnChain` and `verifyEvidenceOnChain` return `{ ok: false, status: "not_configured" }` instead of throwing. Both callers handle this: `apps/web/app/api/evidence/route.ts` still returns HTTP 201 with the evidence row and a `blockchain` object showing the soft failure, and `finalizeCallEvidence` simply records the attempt and continues. The attempt is persisted in `blockchain_registrations` with `status` set to the chain status and no `tx_hash`, so the UI can show pending wiring rather than a broken error. This is why you can demo evidence packaging fully offline and wire Amoy registration later without code changes.

### Q6. Where are tx_hash and block_number stored and how are they set?

Successful registration returns `tx_hash` from `tx.hash` and `block_number` from `receipt.blockNumber` after `tx.wait()` inside `registerEvidenceOnChain` in `apps/web/lib/blockchain.ts`. If the receipt is null the code stores null for the block number rather than guessing, using the expression `receipt.blockNumber ?? null`. Both API writers, `apps/web/app/api/evidence/route.ts` and `finalizeCallEvidence` in `apps/web/lib/evidence.ts`, insert a row into `blockchain_registrations` with `contract_address`, `tx_hash`, `block_number`, plus `network` and `chain_id`, and set `status` to `confirmed`. They also stamp `blockchain_tx` onto the parent `evidence_records` row and set `verified` to true at registration time. Failed or unconfigured attempts still insert a `blockchain_registrations` row but with only `status` and no transaction fields, which preserves the audit trail. Judges can therefore trace every evidence ID to zero or one confirmed transaction plus any number of recorded attempts.

### Q7. Walk through the end-to-end verify flow a judge would click.

The judge supplies an `evidence_id` to `POST /api/blockchain/verify`, implemented in `apps/web/app/api/blockchain/verify/route.ts`, which first enforces org scoping through `requireOrg`. The route loads the `evidence_records` row for that org, recomputes `SHA-256(JSON.stringify(manifest))`, and compares it to the stored `evidence_hash` to get `localVerified`. It then calls `verifyEvidenceOnChain` from `apps/web/lib/blockchain.ts` with the record ID and stored hash, which performs a read-only `verifyEvidence` call against `VoiceIntegrityRegistry` when configured. The final verdict combines both checks: if the chain client reports ok then both local and on-chain must agree, and if the chain is unconfigured the verdict falls back to the local check alone. The route persists the boolean back to `evidence_records.verified`, writes an `evidence.verify` audit row, and returns `verified`, `recomputed`, `on_chain`, `blockchain_tx`, `network`, and `contract` in one payload.

### Q8. How is the blockchain private key handled and kept out of the browser?

The private key exists only as the server environment variable `BLOCKCHAIN_PRIVATE_KEY`, read inside the `config` helper in `apps/web/lib/blockchain.ts` and never referenced by any client component. That module starts with `import "server-only"`, which makes the bundler throw if client code ever tries to import it, so key material cannot leak into browser JavaScript. Only the write path constructs an ethers `Wallet` from the key, and only for the single `registerEvidence` transaction, while the verify path in `verifyEvidenceOnChain` uses a provider-only `Contract` with no signer at all. The contract address and RPC URL come from `VOICE_REGISTRY_ADDRESS` and `BLOCKCHAIN_RPC_URL`, which are likewise server-only and surface to the client only as an address string in verify responses. If the key is absent the module returns `not_configured` instead of throwing, so there is never a reason to hardcode a fallback key for local development.

### Q9. Why do you never put raw audio or biometric embeddings on-chain?

The contract header in `blockchain/contracts/VoiceIntegrityRegistry.sol` states the rule explicitly: the registry never stores raw audio, embeddings, or personal data on-chain. Audio and voiceprints are large, sensitive, and permanent on a public ledger, which would create irreversible privacy exposure and absurd gas costs for every call. Instead the system stores a 32-byte SHA-256 digest plus a 32-byte record ID and a small timestamp, which is enough to detect any later alteration of the off-chain manifest. Raw signals stay in memory or in access-controlled Supabase rows, and only derived scores such as `risk_score` and `risk_severity` flow into the hashed manifest via `apps/web/lib/evidence.ts`. This hash-only pattern is also what lets the demo comply with the project rule against biometric payloads on-chain while still giving judges a public anchor they can inspect on Amoy.

### Q10. What does gas cost look like and why is testnet acceptable here?

Each registration calls `registerEvidence` with two `bytes32` values and one `uint64`, which stores a single small struct and emits one `EvidenceRegistered` event in `blockchain/contracts/VoiceIntegrityRegistry.sol`. That is one of the cheapest state-changing shapes on an EVM chain because there are no loops, no dynamic arrays, and no bulk data, only a mapping write keyed by `recordId`. On Polygon Amoy the fee is paid in free test MATIC from a faucet, so hackathon registration and verification cost the team nothing while proving the exact production code path. The web layer records the paid transaction in `blockchain_registrations` with `tx_hash` and `block_number` via `apps/web/app/api/evidence/route.ts`, so cost and confirmation are auditable per row. Moving to mainnet later would change only `BLOCKCHAIN_RPC_URL`, funding, and key custody, not the contract interface or the evidence schema.

### Q11. How is evidence tamper detected after registration?

Tamper detection is a two-layer comparison implemented in `apps/web/app/api/blockchain/verify/route.ts`. First the route recomputes the digest from the stored manifest and requires strict equality with `evidence_hash`, so any edit to score, severity, timestamps, or model versions flips `localVerified` to false. Second it calls `verifyEvidenceOnChain` in `apps/web/lib/blockchain.ts`, which invokes the view function `verifyEvidence` on `VoiceIntegrityRegistry` to compare the expected hash with the anchored hash for that `recordId`. The final `verified` flag is true only when the local check passes and, when the chain is configured, the on-chain check also returns true. Because the anchored hash is immutable once mined and the recomputation is deterministic SHA-256, an attacker who edits the database row cannot also rewrite the chain entry to match. The mismatch is then persisted to `evidence_records.verified` and logged with an `evidence.verify` audit event.

### Q12. How is recordId derived and converted to bytes32?

The record ID starts as the Supabase UUID of the newly inserted `evidence_records` row, returned by the `select("id, evidence_hash")` call in `apps/web/app/api/evidence/route.ts` and in `finalizeCallEvidence`. That UUID string is passed as the second argument to `registerEvidenceOnChain` in `apps/web/lib/blockchain.ts`, which normalizes it with the `toBytes32` helper before touching the chain. The helper strips any `0x` prefix and hyphens, left-pads the remaining hex with zeros to 64 characters, and truncates to exactly 64 characters with a `0x` prefix. A UUID contributes 32 hex characters so it lands in the low half of the word, while a SHA-256 evidence hash already fills all 64 characters with no padding needed. The same normalization runs on the verify path, so the lookup key used in `verifyEvidenceOnChain` always matches the key used at registration for the same row.

### Q13. What exactly does registerEvidence enforce in Solidity?

The function `registerEvidence` in `blockchain/contracts/VoiceIntegrityRegistry.sol` takes `evidenceHash`, `recordId`, and `createdAt` and writes one `Evidence` struct into the `evidenceRegistry` mapping. It reverts when `evidenceHash` is zero, when `recordId` is zero, and when the record already exists, which blocks empty anchors and accidental or malicious overwrites. On success it records `msg.sender` as `registrar`, sets `exists` to true, and emits `EvidenceRegistered` with the record ID, hash, timestamp, and registrar address. There is deliberately no update or delete function, so the anchor is append-only and history cannot be rewritten through the contract. The web layer depends on these reverts surfacing through ethers in `registerEvidenceOnChain`, which catches them and returns `status: "failed"` with the revert message instead of crashing the request.

### Q14. What do the read functions verifyEvidence, getEvidence, and recordExists do?

These three view functions in `blockchain/contracts/VoiceIntegrityRegistry.sol` expose the registry without spending gas or requiring a signer. The `recordExists` function returns the boolean `exists` flag for a `recordId`, which is the cheapest existence probe a UI can call. The `getEvidence` function returns the stored hash, timestamp, and registrar address but reverts with `Evidence not found` when the record is absent. The `verifyEvidence` function is the soft variant: it returns false for a missing record and otherwise returns whether the stored hash equals the supplied `expectedHash`. The web client in `apps/web/lib/blockchain.ts` uses `verifyEvidence` for the `/api/blockchain/verify` flow because a tampered or unknown ID should yield a clean false rather than an exception path.

### Q15. What is the difference between POST /api/evidence and finalizeCallEvidence?

The `POST` handler in `apps/web/app/api/evidence/route.ts` is the manual, on-demand packaging endpoint that requires `call_id` in the body and returns HTTP 201 with the new ID, hash, manifest, and chain result. The `finalizeCallEvidence` function in `apps/web/lib/evidence.ts` is the automatic path that runs at call close: it loads the `calls` row, marks it `completed` with `ended_at`, and builds the manifest from the stored risk fields. Their manifests differ in a way judges may spot: the manual route records `incident_id` and `model_versions` with only `risk_engine` at version 3.2, while the auto path records `risk_severity` and a fuller model map at engine version 1. Both paths then follow the same tail sequence of SHA-256 hashing, `evidence_records` insert, `registerEvidenceOnChain`, `blockchain_registrations` insert, and audit write. Think of POST as the judge-clickable demo button and `finalizeCallEvidence` as the production lifecycle hook.

### Q16. What risk-engine outputs actually get hashed into evidence?

The hashed manifest carries the policy outputs of `evaluate` in `services/ai-service/app/risk/engine.py`, specifically the integer `score` from 0 to 100 and its `severity` band of LOW, MEDIUM, HIGH, or CRITICAL. In the auto path, `finalizeCallEvidence` in `apps/web/lib/evidence.ts` reads `risk_score` and `risk_severity` from the `calls` row and copies them into the manifest alongside `call_id`, `created_by`, `created_at`, and `model_versions`. In the manual path, `apps/web/app/api/evidence/route.ts` accepts `risk_score` from the request body with a default of zero when the caller omits it. The engine itself blends spoof, human-pattern, speaker, and acoustic signals with fixed weights into one deterministic score, so identical inputs always hash to the identical digest. Hashing the score and severity rather than raw features is what makes the anchor small, stable, and free of biometric data.

### Q17. Why does the provider use staticNetwork with an explicit Amoy object?

The provider is constructed as `new JsonRpcProvider(cfg.rpcUrl, POLYGON_AMOY, { staticNetwork: true })` in both `registerEvidenceOnChain` and `verifyEvidenceOnChain` in `apps/web/lib/blockchain.ts`. The `POLYGON_AMOY` object pins `{ name: "polygon-amoy", chainId: 80002 }` so ethers never needs to call `eth_chainId` to discover the network. The `staticNetwork` flag then tells ethers to skip its detection and retry loop entirely, which matters because the default behavior retries an unreachable RPC for a long time and floods logs with failed detection spam. With this setup a dead or misconfigured `BLOCKCHAIN_RPC_URL` fails fast and surfaces as `status: "failed"` instead of hanging the API route. Both the write path with a `Wallet` signer and the read-only verify path share this construction, so judges get quick error feedback either way.

### Q18. What audit trail is written around evidence and chain actions?

Every evidence and chain step emits an application audit row through the `audit` helper in addition to the chain event. The manual route in `apps/web/app/api/evidence/route.ts` writes `blockchain.register` with `tx_hash` and `contract` on success and always writes `evidence.register` with the hash algorithm. The auto path in `apps/web/lib/evidence.ts` writes a single `evidence.auto_register` event carrying the evidence ID and the chain status string such as `confirmed` or `not_configured`. The verify route in `apps/web/app/api/blockchain/verify/route.ts` writes `evidence.verify` with the boolean verdict and the on-chain status. These rows complement the on-chain `EvidenceRegistered` event from `VoiceIntegrityRegistry`, giving operators a queryable off-chain timeline even when the wallet is unwired.

### Q19. What does the EvidenceRegistered event give you that storage alone does not?

The `EvidenceRegistered` event in `blockchain/contracts/VoiceIntegrityRegistry.sol` emits `recordId` as an indexed topic plus the hash, timestamp, and registrar address on every successful registration. Storage in the `evidenceRegistry` mapping holds the current state, but events provide an append-only log that block explorers and indexers can search by record ID without scanning every transaction. The web ABI in `apps/web/lib/blockchain.ts` includes this event signature precisely so future monitoring or dispute tooling can subscribe to confirmations per evidence ID. The `registrar` field inside the event also proves which server key performed the anchoring, which matters for custody review. Even before any indexer exists, a judge can find the registration on the Amoy explorer using the `tx_hash` stored in `blockchain_registrations` and see the event payload beside the transaction.

### Q20. What does the verified boolean in evidence_records actually mean?

The `verified` column is a cached verdict, not a cryptographic proof by itself, and its meaning depends on chain configuration. At packaging time both `apps/web/app/api/evidence/route.ts` and `finalizeCallEvidence` in `apps/web/lib/evidence.ts` set `verified` to true only when `registerEvidenceOnChain` returns ok with a mined transaction. At check time `apps/web/app/api/blockchain/verify/route.ts` recomputes it as local hash equality AND on-chain agreement when the chain is reachable, or local equality alone when the status is `not_configured`. The verify route then persists the fresh boolean back to the row and returns both `verified` and `recomputed` so the UI can show its work. Judges should read a true value as the output matching its anchor at last check, and should re-POST to the verify endpoint rather than trusting a stale flag.

### Q21. How does the hash-then-sign pattern protect privacy while proving integrity?

The app never asks the key to sign audio or scores directly. It first compresses the manifest to a fixed 32-byte SHA-256 digest, converts it with `toBytes32`, and only then has the server `Wallet` in `apps/web/lib/blockchain.ts` sign a transaction carrying that digest to `registerEvidence` in `blockchain/contracts/VoiceIntegrityRegistry.sol`. The chain therefore learns nothing about callers, transcripts, or embeddings, yet the digest binds every manifest byte because SHA-256 is preimage resistant. Verification repeats the hash locally in `apps/web/app/api/blockchain/verify/route.ts` and compares it with the anchored digest through the `verifyEvidence` view. A single changed character in the manifest produces a completely different digest, so tampering is detected without ever decrypting or revealing private content on-chain.

```
TEXT FLOW: hash-then-sign in VoxVerity

  [ manifest JSON ]            off-chain, Supabase evidence_records
        |
        v
  SHA-256 over JSON.stringify  apps/web/app/api/evidence/route.ts
        |                      apps/web/lib/evidence.ts
        v
  0x bytes32 evidenceHash  +  recordId bytes32  +  createdAt uint64
        |
        v
  Wallet signs tx               apps/web/lib/blockchain.ts (server only)
        |                       BLOCKCHAIN_PRIVATE_KEY never leaves server
        v
  VoiceIntegrityRegistry        blockchain/contracts/VoiceIntegrityRegistry.sol
  .registerEvidence(...)        emits EvidenceRegistered(recordId, hash, time, registrar)
        |
        v
  tx_hash + block_number        stored in blockchain_registrations, status=confirmed

VERIFY: recompute digest locally, then call verifyEvidence(recordId, expectedHash).
MATCH on both layers = verified. MISMATCH on either layer = tampered.
```

### Q22. Why can nobody overwrite or replay an existing evidence anchor?

Replay here means resubmitting the same `recordId` with a different hash to rewrite history. The contract blocks this with a single guard in `registerEvidence` in `blockchain/contracts/VoiceIntegrityRegistry.sol`: it requires `evidenceRegistry[recordId].exists` to be false and reverts with `Record already exists` otherwise. Because there is no update or delete function, the first writer wins permanently for that key, and the stored `registrar` shows who that writer was. On the web side, `toBytes32` in `apps/web/lib/blockchain.ts` makes the key deterministic from the evidence UUID, so an accidental double-submit maps to the same key and fails loudly instead of creating a silent duplicate. The failure surfaces as `status: "failed"` with the revert reason, and the caller still records the attempt in `blockchain_registrations` for review.

```
TEXT SEQUENCE: duplicate registration attempt

  Client                  Web API                        Contract
    |                        |                               |
    |-- POST /api/evidence ->|                               |
    |                        |-- registerEvidence(hashA, id) ->|
    |                        |<-- OK, tx #1 mined -----------|
    |                        |-- insert blockchain_           |
    |                            registrations confirmed     |
    |                        |                               |
    |-- retry same id, ----->|                               |
        hashB                |-- registerEvidence(hashB, id)->|
                             |<-- REVERT "Record ----------|
                             |    already exists"           |
                             |-- insert attempt, status= ---|
                                 failed (audit preserved)   |

RESULT: hashA remains the anchor. hashB never overwrites it.
```

### Q23. What about chain reorgs on Amoy - could a confirmation disappear?

Amoy is a fast testnet where short reorgs are possible, meaning a transaction seen in one block could theoretically be displaced before finality. VoxVerity mitigates this pragmatically rather than claiming absolute finality: `registerEvidenceOnChain` in `apps/web/lib/blockchain.ts` awaits `tx.wait()` and stores the resulting `receipt.blockNumber` in `blockchain_registrations`, so every anchor carries its block height. The verify path never trusts the stored `tx_hash` alone; `apps/web/app/api/blockchain/verify/route.ts` re-reads live state through the `verifyEvidence` view on every check. If a reorg ever displaced the transaction, the next verify call would return false or not-found instead of silently trusting stale metadata. For a hackathon evidence demo this live re-read is the correct posture, and a production hardening step would be waiting for N confirmations before marking `status` as `confirmed`.

```
TEXT TABLE: reorg handling posture

  Concern                  | What VoxVerity does today
  -------------------------|-----------------------------------------
  Tx seen then displaced   | verify re-reads chain state every time
                           | via verifyEvidence in blockchain.ts
  Stale block_number       | block_number stored as hint only, never
                           | trusted as proof (proof = live view call)
  Missing record           | verifyEvidence returns false, route marks
                           | verified=false, audit evidence.verify
  Future hardening         | wait N confirmations before confirmed,
                           | add re-check worker, expose confirmations
                           | count in UI from receipt data
```

### Q24. Is front-running a registration transaction a real threat here?

Front-running matters when a pending transaction has extractable value, such as a trade or auction bid that someone can copy for profit. An evidence anchor carries no value and no privileged ordering: it stores a hash that is already public by design, alongside a record ID and timestamp, via `registerEvidence` in `blockchain/contracts/VoiceIntegrityRegistry.sol`. An attacker who sees the pending transaction in the Amoy mempool learns only a 32-byte digest they cannot reverse into audio or PII, and copying it under a different `recordId` proves nothing about the original record. The worst they can do is register their own copy first, which does not invalidate the legitimate anchor because verification always checks the specific `recordId` derived from the evidence UUID through `toBytes32` in `apps/web/lib/blockchain.ts`. There is no fee market competition for the anchor itself, so the rational response is to ignore mempool visibility and rely on the record-ID binding.

```
TEXT FLOW: why front-running gains nothing

  Honest server
    manifest -> hash H, recordId R
    submits registerEvidence(H, R, time) to mempool
        |
        +-- Attacker sees (H, R) in mempool
        |
        +-- Option A: submit (H, R) with higher gas
        |     -> contract REVERTS (R already exists after honest tx,
        |        or honest tx reverts if attacker somehow lands first
        |        but then honest retry also reverts and ops sees clash)
        |
        +-- Option B: submit (H, R2) under attacker's own key
              -> mines fine, but verifyEvidence(R, H) for the REAL
                 record R is unaffected. R2 anchor is meaningless.

  CONCLUSION: no value extracted, original proof intact.
```

### Q25. Who holds the registrar key and what is the blast radius if it leaks?

Today there is exactly one registrar: the server wallet loaded from `BLOCKCHAIN_PRIVATE_KEY` in the `config` helper in `apps/web/lib/blockchain.ts`. The contract records this key as `registrar` (the `msg.sender`) in the `Evidence` struct in `blockchain/contracts/VoiceIntegrityRegistry.sol` and in the `EvidenceRegistered` event, so every anchor is attributable to that address. Custody is basic but explicit: the key lives only in server environment, the module is guarded by `import "server-only"`, and no client bundle or log should ever contain it. If the key leaked, the attacker could register new anchors impersonating the service but could not rewrite existing records because `registerEvidence` rejects duplicates and offers no update path. Rotation means generating a new key, funding it with Amoy test MATIC, updating `BLOCKCHAIN_PRIVATE_KEY` and redeploying or reusing `VOICE_REGISTRY_ADDRESS`, with old anchors remaining valid under the old registrar address.

```
TEXT TABLE: registrar key custody

  Question            | Answer in this repo
  --------------------|--------------------------------------------
  Where is the key    | Server env BLOCKCHAIN_PRIVATE_KEY only,
                      | read in apps/web/lib/blockchain.ts
  Who can use it      | Only registerEvidenceOnChain via ethers Wallet
  Who CANNOT see it   | Browser clients (server-only guard), chain
                      | observers (they see address, not key), logs
  What leak allows    | New fake anchors under trusted registrar name
  What leak forbids   | Editing or deleting existing anchors
                      | (no update function in the contract)
  Recovery            | Rotate env key, attribute old rows by registrar
                      | address from getEvidence or explorer events
```

### Q26. How does the audit trail tie database rows to chain events?

There are three mutually reinforcing layers: Supabase rows, application audit events, and chain logs. The `evidence_records` row holds the manifest and digest, the `blockchain_registrations` row holds `tx_hash`, `block_number`, `contract_address`, and `status`, and both are written together by `apps/web/app/api/evidence/route.ts` and `finalizeCallEvidence` in `apps/web/lib/evidence.ts`. The `audit` helper adds a human-readable timeline with `evidence.register`, `blockchain.register`, `evidence.auto_register`, and `evidence.verify` actions tied to org and user. Finally the chain emits `EvidenceRegistered` from `VoiceIntegrityRegistry` with the same record ID, hash, timestamp, and registrar. A dispute reviewer starts from either end: from a `tx_hash` on the Amoy explorer back to the evidence UUID, or from the evidence UUID forward to its transaction, and both paths must converge on the same digest.

```
TEXT SEQUENCE: audit layers on a successful registration

  evidence_records            blockchain_registrations      chain + audit log
    |                                |                          |
    |-- insert manifest + hash ----->|                          |
    |   (apps/web/app/api/           |                          |
    |    evidence/route.ts)          |                          |
    |                                |-- registerEvidenceOnChain |
    |                                |   (apps/web/lib/         |
    |                                |    blockchain.ts) ------->|
    |                                |                          |-- EvidenceRegistered
    |                                |<-- tx_hash, block# ------|
    |<-- stamp blockchain_tx, -------|                          |
    |    verified=true               |-- insert confirmed row --|
    |                                |                          |-- audit blockchain.register
    |-- audit evidence.register -----|------------------------->|   + evidence.register

  INVARIANT: evidence_hash == chain hash == recomputed manifest hash.
```

### Q27. What would it take to forge a convincing fake evidence package?

An attacker must defeat both layers simultaneously, not just one. First they would need to craft a fake manifest whose SHA-256 equals the anchored digest, which means breaking SHA-256 preimage resistance, or they would need to replace the chain anchor itself. Replacing the anchor requires either the registrar private key from `BLOCKCHAIN_PRIVATE_KEY` or a contract upgrade path that does not exist, since `VoiceIntegrityRegistry` has no owner override or update function. The easier attack is database-only editing, but that fails the verify flow in `apps/web/app/api/blockchain/verify/route.ts` because recomputation exposes the mismatch and the live `verifyEvidence` view disagrees. The remaining realistic attack is social: tricking an operator into packaging a false manifest before anchoring, which is why `created_by` is captured in the manifest and every packaging step writes an `audit` row. Defense in depth therefore rests on hash strength, append-only contract semantics, key custody, and human review of what gets packaged.

```
TEXT TABLE: forgery cost per attack path

  Attack path                    | Difficulty        | Detected by
  -------------------------------|-------------------|----------------------
  Edit manifest in DB only       | Easy (SQL write)  | Local recompute in
                                 |                   | verify route: mismatch
  Find SHA-256 second preimage   | Infeasible        | Cryptography itself
  Overwrite chain record         | Impossible via    | Contract reverts on
                                 | contract (no      | duplicate recordId
                                 | update fn)        |
  Register rival anchor (new ID) | Easy with any key | Verify checks the
                                 |                   | ORIGINAL recordId, so
                                 |                   | rival row is ignored
  Steal registrar key + anchor   | Hard (server env  | Registrar address
  false future records           | + server-only)    | + audit created_by
```

### Q28. What are the cost and latency tradeoffs of anchoring every call?

On-chain anchoring adds one transaction of latency and a small fee per evidence package, in exchange for third-party verifiability that a database alone cannot provide. The fee is minimal because `registerEvidence` in `blockchain/contracts/VoiceIntegrityRegistry.sol` writes one mapping entry and one event, and on Amoy it is paid in free test MATIC. Latency is dominated by `tx.wait()` in `registerEvidenceOnChain` in `apps/web/lib/blockchain.ts`, which blocks until the receipt arrives, typically seconds on Amoy versus milliseconds for the Supabase inserts in `apps/web/app/api/evidence/route.ts`. The design refuses to let chain latency break the product: failures return `status: "failed"` or `"not_configured"` and the evidence row still persists with an attempt logged in `blockchain_registrations`. Operators who need lower cost can therefore batch, sample, or anchor only HIGH and CRITICAL severities without changing the verify contract.

```
TEXT TABLE: cost vs latency per layer

  Layer                    | Cost              | Latency        | Value
  -------------------------|-------------------|----------------|----------------
  Supabase evidence row    | Near zero         | Milliseconds   | Queryable detail
  SHA-256 recompute        | Near zero CPU     | Microseconds   | Tamper detection
  Amoy registerEvidence tx | Test MATIC only   | Seconds        | Public anchor +
                           | (faucet funded)   | (tx.wait)      | registrar proof
  Amoy verifyEvidence view | Free (read-only)  | Sub-second RPC | Live confirmation
  Fail-soft fallback       | Zero              | Zero extra     | Demo never blocks

  POLICY KNOB: anchor all calls, or only HIGH/CRITICAL scores
  from services/ai-service/app/risk/engine.py, to tune spend.
```

### Q29. What are the failure modes and what does the user see for each?

There are four distinct failure modes and each has an explicit status string rather than a thrown exception. When env vars are missing, both chain helpers in `apps/web/lib/blockchain.ts` return `not_configured` and the API still returns 201 with the evidence saved and the chain object explaining the pending wiring. When the RPC is down or the transaction reverts, for example on a duplicate `recordId` or zero hash, the helpers return `failed` with the ethers or revert message and an attempt row is logged. When the local hash mismatches at verify time in `apps/web/app/api/blockchain/verify/route.ts`, the verdict is false even if the chain is reachable, which signals database tampering or a serialization change. When the chain disagrees but the local hash matches, the verdict is also false, which signals a wrong record ID, wrong contract address in `VOICE_REGISTRY_ADDRESS`, or a genuine anchor mismatch the operator must investigate.

```
TEXT TABLE: failure mode to UX mapping

  Status / signal              | Stored where              | User sees
  -----------------------------|---------------------------|------------------
  not_configured               | blockchain_registrations  | Evidence saved,
  (missing RPC/key/address)    | .status                   | badge: chain pending
  failed (RPC down, revert)    | blockchain_registrations  | Evidence saved,
                               | .status + message         | badge: anchor failed
  localVerified=false          | verify response           | Verified: NO,
  (manifest edited)            | .recomputed vs hash       | reason: local mismatch
  chain.valid=false            | verify response .on_chain | Verified: NO,
  (wrong anchor or record)     |                           | reason: chain mismatch
  verified=true                | evidence_records.verified | Verified: YES +
                               |                           | tx link + network
```

### Q30. What is the end-to-end trust argument you would give a judge in 60 seconds?

The trust argument is a chain of bindings where each link is independently checkable. The risk engine in `services/ai-service/app/risk/engine.py` deterministically maps signals to a score and severity, the packaging routes in `apps/web/app/api/evidence/route.ts` and `apps/web/lib/evidence.ts` bind those outputs plus identity and timestamps into a manifest, SHA-256 binds the manifest to a 32-byte digest, the digest is bound to a record ID by the `EvidenceRegistered` event from `blockchain/contracts/VoiceIntegrityRegistry.sol`, and the transaction is bound to a registrar key whose address is public. A judge can verify every link with three artifacts: the manifest JSON, the `evidence_hash`, and the `tx_hash` from `blockchain_registrations`. The known limitations are stated openly: model versions differ between writers (3.2 on the manual route versus 1.0 in the auto path), testnet anchors carry less economic finality than mainnet, and the `verified` flag is a cache that must be refreshed through `POST /api/blockchain/verify`. None of those weaken the core claim, which is tamper-evidence rather than absolute fraud proof.

```
TEXT FLOW: the five-link trust chain

  [1] Signals -> score/severity   services/ai-service/app/risk/engine.py
        |                         deterministic evaluate, 0-100 + band
        v
  [2] Score -> manifest           apps/web/app/api/evidence/route.ts
        |                         apps/web/lib/evidence.ts
        v                         (+ created_by, created_at, model_versions)
  [3] Manifest -> digest          SHA-256(JSON.stringify(manifest)), hex
        |
        v
  [4] Digest -> chain anchor      VoiceIntegrityRegistry.registerEvidence
        |                         keyed by recordId, signed by registrar
        v
  [5] Anchor -> public proof      tx_hash + block_number + EvidenceRegistered
                                  verifiable on Amoy explorer + verifyEvidence

  JUDGE CHECK: recompute [3], compare with [4] via verifyEvidence,
  confirm [5] event matches. Any broken link fails closed (verified=false).
```

## Rapid-fire one-liners

| Question | One-sentence answer |
|---|---|
| What goes on-chain? | Only the 32-byte evidence hash, record ID, timestamp, and registrar address from `VoiceIntegrityRegistry`. |
| What stays off-chain? | The full manifest, scores, and call linkage stay in Supabase `evidence_records` and `blockchain_registrations`. |
| Why Polygon Amoy? | It is a free, fast, EVM-compatible testnet pinned as chain ID 80002 for demo anchoring. |
| How is the hash made? | SHA-256 over `JSON.stringify(manifest)` computed identically at package and verify time. |
| What is recordId? | The evidence row UUID normalized to `bytes32` by `toBytes32` for the contract key. |
| What if chain is unwired? | The API stays fail-soft with `not_configured` and the evidence row still saves. |
| Where is the private key? | Only in server env `BLOCKCHAIN_PRIVATE_KEY` behind a `server-only` blockchain module. |
| How is tampering caught? | Local hash recompute plus the live `verifyEvidence` view must both agree or verdict is false. |
| Can records be overwritten? | No, the contract reverts duplicates and exposes no update or delete function. |
| What proves an anchor publicly? | The `tx_hash`, `block_number`, and `EvidenceRegistered` event inspectable on the Amoy explorer. |
