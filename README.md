# Syther Project

Just wrapping SNX with a few extra features, getting ready for Synthetix V3.

![Syther](./syther.png)

## Features

- Start fresh, with Synthetix V3

## Basic Flow

Basic Flow:

    User -> AMMPool: SNX
    User <- AMMPool: sySNX
    User -> MainSyther.sol: SNX
    MainSyther.sol -> User: sySNX
    MainSyther.sol -> SNX Staking: SNX
    MainSyther.sol <- SNX Staking: snxUSD
    MainSyther.sol -> InvestModule.sol: snxUSD
    MainSyther.sol -> AMMPool: SNX
    MainSyther.sol <- AMMPool: sySNX
    User -> AMMPool: sySNX
    User <- AMMPool: SNX

```css

 ┌────┐┌───────┐┌──────────────┐┌───────────┐┌────────────────┐
 │User││AMMPool││MainSyther.sol││SNX Staking││InvestModule.sol│
 └─┬──┘└───┬───┘└──────┬───────┘└─────┬─────┘└───────┬────────┘
   │       │           │              │              │
   │  SNX  │           │              │              │
   │──────>│           │              │              │
   │       │           │              │              │
   │ sySNX │           │              │              │
   │<──────│           │              │              │
   │       │           │              │              │
   │       │SNX        │              │              │
   │──────────────────>│              │              │
   │       │           │              │              │
   │       sySNX       │              │              │
   │<──────────────────│              │              │
   │       │           │              │              │
   │       │           │     SNX      │              │
   │       │           │─────────────>│              │
   │       │           │              │              │
   │       │           │    snxUSD    │              │
   │       │           │<─────────────│              │
   │       │           │              │              │
   │       │           │           snxUSD            │
   │       │           │────────────────────────────>│
   │       │           │              │              │
   │       │    SNX    │              │              │
   │       │<──────────│              │              │
   │       │           │              │              │
   │       │   sySNX   │              │              │
   │       │──────────>│              │              │
   │       │           │              │              │
   │ sySNX │           │              │              │
   │──────>│           │              │              │
   │       │           │              │              │
   │  SNX  │           │              │              │
   │<──────│           │              │              │
 ┌─┴──┐┌───┴───┐┌──────┴───────┐┌─────┴─────┐┌───────┴────────┐
 │User││AMMPool││MainSyther.sol││SNX Staking││InvestModule.sol│
 └────┘└───────┘└──────────────┘└───────────┘└────────────────┘


```

## Contracts

- `MainSyther.sol` - Main contract for the project, is used to deposit SNX and mint snxUSD
  - Creates an account with the Synthetix Staking contract
  - Is used to mint sySNX with SNX
  - Contract stakes SNX in the Synthetix Staking contract and mints snxUSD
  - Contract invests snxUSD in the InvestModule contract
  - Periodically, contract withdraws snxUSD from the InvestModule contract and burns snxUSD for SNX
  - Contract swaps SNX for sySNX to keep the ratio of sySNX to SNX constant
- `InvestModule.sol` - Contract that manages snxUSD and invests it to other protocols to earn a yield
- AMMPool - Third party Automated Market Maker contract, could be curve that pairs sySNX with SNX
  - Is used to swap SNX for sySNX (entering a position)
  - Is used to swap sySNX for SNX (exiting a position)

## TODO

- [x] Create MainSyther.sol file
- [ ] Do the rest
