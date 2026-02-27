# Metagraph Explorer — Glossary

## What is "per tempo"?

Every Bittensor subnet operates on a **tempo** — a fixed number of blocks between consensus rounds. Each subnet has its own tempo (typically 99–360 blocks, roughly 20 seconds to ~6 minutes depending on the subnet).

At the end of each tempo:
1. Validators' weight-setting is tallied via the Yuma Consensus algorithm
2. Incentive scores are recalculated for all miners
3. **Emissions** are distributed — new TAO and alpha tokens are minted and allocated

So when you see **`tao_emission_per_tempo`** and **`alpha_emission_per_tempo`**, that's the amount of tokens emitted to the subnet each time a tempo completes.

### Quick math
- If a subnet has `tempo = 99` blocks and block time ≈ 12 seconds:
  - One tempo ≈ 99 × 12s = **~20 minutes**
  - Emissions per hour ≈ 3 × per-tempo value
  - Emissions per day ≈ 72 × per-tempo value

## Column Definitions

| Column | Description |
|--------|-------------|
| **subnet_uid** | The network-unique identifier (netuid) of the subnet (0–128+) |
| **subnet_name** | Human-readable name from the subnet's on-chain identity (if set) |
| **owner_uid** | The UID of the subnet owner's hotkey *within that subnet's metagraph*. `-1` if the owner hotkey isn't registered in the subnet. `0` is common for subnets where the owner is the first registered neuron. |
| **alpha_price_tao** | Current price of the subnet's alpha token denominated in TAO. Derived from the subnet's liquidity pool (alpha_in / alpha_out). Higher price = more TAO has flowed into this subnet. |
| **tao_emission_per_tempo** | TAO emitted to this subnet each tempo. Currently ~0.5 TAO per tempo for most subnets (emission is distributed fairly uniformly). |
| **alpha_emission_per_tempo** | Alpha tokens emitted to the subnet each tempo. Typically 1.0α — the alpha side of the emission is constant, while the TAO side varies based on the subnet's share. |
| **emission_share_pct** | This subnet's share of total network TAO emissions, as a percentage. With ~129 subnets each getting ~0.5 TAO/tempo, most sit around 1.27%. |
| **top_miner_uid** | The UID of the miner with the highest incentive score in this subnet |
| **top_miner_incentive** | The incentive score of that top miner (0.0–1.0). A score of 1.0 often means a single dominant miner or a very early-stage subnet. |

## Key Concepts

### Alpha Tokens
Each subnet has its own "alpha" token that trades against TAO in an on-chain liquidity pool. The alpha price reflects market demand for that subnet's token. Staking into a subnet means buying its alpha.

### Incentive
A normalized score (0–1) reflecting how much value a miner provides according to validators. Higher incentive = larger share of miner emissions. The Yuma Consensus algorithm computes this from validator weights.

### Owner UID
Subnet creators register a hotkey as the "owner." If that hotkey is also registered as a neuron in the subnet, it has a UID. Many subnet owners are also validators (or miners) in their own subnet.
