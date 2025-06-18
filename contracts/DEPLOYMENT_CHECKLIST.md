# Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in `PRIVATE_KEY` with deployer private key
- [ ] Add RPC URLs for target networks:
  - [ ] `ETHEREUM_RPC_URL`
  - [ ] `POLYGON_RPC_URL`
  - [ ] `ARBITRUM_RPC_URL`
  - [ ] `OPTIMISM_RPC_URL`
  - [ ] `BASE_RPC_URL`
- [ ] Add Etherscan API keys for verification:
  - [ ] `ETHERSCAN_API_KEY`
  - [ ] `POLYGONSCAN_API_KEY`
  - [ ] `ARBISCAN_API_KEY`
  - [ ] `OPTIMISM_ETHERSCAN_API_KEY`
  - [ ] `BASESCAN_API_KEY`

### Code Verification
- [ ] Run `npm run compile` - contracts compile successfully
- [ ] Run `npm test` - all tests pass (19/19)
- [ ] Run `npm run deploy:local` - local deployment works
- [ ] Review gas usage in `gas-report.md`

### Security Review
- [ ] OpenZeppelin contracts are up to date
- [ ] No hardcoded addresses or values
- [ ] Proper access controls implemented
- [ ] Reentrancy guards in place
- [ ] Input validation on all functions

## Deployment Process

### Network-by-Network Deployment

#### Ethereum Mainnet
- [ ] Set reasonable gas price
- [ ] Run `npm run deploy:ethereum`
- [ ] Verify deployment on Etherscan
- [ ] Update contract address in `scripts/verify-contracts.js`
- [ ] Update contract address in `scripts/manage-tokens.js`
- [ ] Run `npm run verify:contracts` (Ethereum)

#### Polygon
- [ ] Run `npm run deploy:polygon`
- [ ] Verify deployment on Polygonscan
- [ ] Update contract addresses in scripts
- [ ] Run verification

#### Arbitrum
- [ ] Run `npm run deploy:arbitrum`
- [ ] Verify deployment on Arbiscan
- [ ] Update contract addresses in scripts
- [ ] Run verification

#### Optimism
- [ ] Run `npm run deploy:optimism`
- [ ] Verify deployment on Optimism Etherscan
- [ ] Update contract addresses in scripts
- [ ] Run verification

#### Base
- [ ] Run `npm run deploy:base`
- [ ] Verify deployment on Basescan
- [ ] Update contract addresses in scripts
- [ ] Run verification

### Alternative: Multi-Chain Deployment
- [ ] Configure all networks in `.env`
- [ ] Run `npm run deploy:all`
- [ ] Verify all deployments manually
- [ ] Update all contract addresses in scripts

## Post-Deployment

### Contract Configuration
For each network:
- [ ] Supported tokens are automatically added (USDT, USDC)
- [ ] Platform fee recipient is set correctly
- [ ] Contract ownership is verified
- [ ] Contract is not paused

### Verification & Documentation
- [ ] All contracts verified on block explorers
- [ ] Contract addresses documented
- [ ] ABI files exported for frontend integration
- [ ] Gas costs documented for each network

### Testing on Live Networks
- [ ] Create test session with small amount
- [ ] Complete test session successfully
- [ ] Verify payment distribution (90/10 split)
- [ ] Test cancellation functionality
- [ ] Verify all events are emitted correctly

### Frontend Integration
- [ ] Contract addresses updated in frontend config
- [ ] ABI files integrated
- [ ] Multi-chain support configured
- [ ] Token addresses for each network configured

## Security Considerations

### Access Control
- [ ] Only deployer has owner permissions
- [ ] Platform fee recipient is correct address
- [ ] No unnecessary admin permissions granted

### Token Security
- [ ] Only USDT and USDC are supported initially
- [ ] Token addresses are correct for each network
- [ ] Token decimals handled properly (6 for USDT/USDC)

### Emergency Procedures
- [ ] Pause functionality tested
- [ ] Emergency contact procedures documented
- [ ] Upgrade path planned (if needed)

## Monitoring

### Events to Monitor
- [ ] `SessionCreated` - New sessions
- [ ] `SessionCompleted` - Successful completions
- [ ] `SessionCancelled` - Cancellations
- [ ] `TokenAdded/Removed` - Token management

### Metrics to Track
- [ ] Total sessions created
- [ ] Total volume processed
- [ ] Platform fees collected
- [ ] Success/cancellation rates

## Rollback Plan

### If Issues Found
- [ ] Pause contract immediately
- [ ] Document the issue
- [ ] Plan fix or redeployment
- [ ] Communicate with stakeholders

### Critical Issues
- [ ] Security vulnerability found
- [ ] Funds at risk
- [ ] Contract behavior incorrect

In case of critical issues:
1. Pause all contracts immediately
2. Secure any at-risk funds
3. Deploy fixed version
4. Migrate state if necessary

## Final Checklist

- [ ] All networks deployed successfully
- [ ] All contracts verified
- [ ] All tests passing on live contracts
- [ ] Frontend integration complete
- [ ] Monitoring systems in place
- [ ] Documentation updated
- [ ] Team trained on operations
- [ ] Emergency procedures ready

## Network Information

### Contract Addresses
```
Ethereum: [TO BE FILLED]
Polygon:  [TO BE FILLED]
Arbitrum: [TO BE FILLED]
Optimism: [TO BE FILLED]
Base:     [TO BE FILLED]
```

### Deployment Dates
```
Ethereum: [TO BE FILLED]
Polygon:  [TO BE FILLED]
Arbitrum: [TO BE FILLED]
Optimism: [TO BE FILLED]
Base:     [TO BE FILLED]
```

### Deployer Address
```
[TO BE FILLED]
```