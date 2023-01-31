# Syther Project

Just wrapping SNX with a few extra features.

## Features

- [x] Deposit SNX
- [x] Mint sUSD max SNX

## Basic Flow

Basic Flow:

    MainSyther.sol -> Staker.sol: SNX
    Staker.sol -> SNX Staking: SNX
    Staker.sol <- SNX Staking: sUSD
    MainSyther.sol <- Staker.sol: sySNX

```css
 ┌──────────────┐┌──────────┐┌───────────┐
 │MainSyther.sol││Staker.sol││SNX Staking│
 └──────┬───────┘└────┬─────┘└─────┬─────┘
        │             │            │
        │     SNX     │            │
        │────────────>│            │
        │             │            │
        │             │    SNX     │
        │             │───────────>│
        │             │            │
        │             │    sUSD    │
        │             │<───────────│
        │             │            │
        │    sySNX    │            │
        │<────────────│            │
 ┌──────┴───────┐┌────┴─────┐┌─────┴─────┐
 │MainSyther.sol││Staker.sol││SNX Staking│
 └──────────────┘└──────────┘└───────────┘
```

## Contracts

- `MainSyther.sol` - Main contract for the project, is used to deposit SNX and mint sUSD max SNX.
- `Staker.sol` - Contract that handles the staking and minting of sUSD, holds the staked SNX and debt.

## TODO

- [ ] Withdraw SNX
- [ ] Burn sUSD max SNX
- [ ] Claim rewards
- [ ] OnlyOwner functions (personal use only)
- [ ] Upgradability of the contract (use Proxy pattern)

## Future

- Make contract investable for everyone
- Integrate Staking V3
