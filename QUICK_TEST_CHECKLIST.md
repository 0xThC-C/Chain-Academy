# Quick Testing Checklist - Chain Academy V2 Payment System

## ✅ Pre-Test Verification (COMPLETED)
- [x] Smart contracts deployed and verified on Sepolia
- [x] Frontend running at http://localhost:3000
- [x] All contract tests passing (65/65)
- [x] Contract addresses properly configured in frontend

## 🔧 Manual Testing Checklist

### Phase 1: Basic Connectivity ⏱️ 5 minutes
- [ ] **Open Frontend**: Visit http://localhost:3000
- [ ] **Page Loads**: Homepage displays without errors
- [ ] **Find Wallet Button**: Locate wallet connection interface
- [ ] **Browser Console**: Check for JavaScript errors (F12)

### Phase 2: Wallet Connection ⏱️ 10 minutes
- [ ] **Install MetaMask**: Or use existing Web3 wallet
- [ ] **Add Sepolia Network**: Chain ID 11155111
- [ ] **Get Test ETH**: From https://sepoliafaucet.com/
- [ ] **Connect Wallet**: Click connect and approve
- [ ] **Verify Network**: Ensure connected to Sepolia
- [ ] **Check Address Display**: Wallet address should be visible

### Phase 3: Navigation Testing ⏱️ 5 minutes
- [ ] **Dashboard**: Navigate to /dashboard
- [ ] **Reviews**: Navigate to /reviews  
- [ ] **Payment Page**: Navigate to /payment
- [ ] **Mentors Page**: Try /mentors (expected issue)
- [ ] **Profile Page**: Try /profile/[address]

### Phase 4: Contract Interaction ⏱️ 15 minutes
- [ ] **Read Contract Data**: Test basic contract reads
- [ ] **Platform Fee**: Should show 10% (1000 basis points)
- [ ] **Token Support**: USDC/USDT should be supported
- [ ] **Session Counter**: Should return current count

### Phase 5: Payment Flow ⏱️ 20 minutes
**Prerequisites**: Testnet ETH + Test tokens needed

- [ ] **Access Payment Page**: Navigate to /payment
- [ ] **Mock Session Data**: Create test booking
- [ ] **Select Token**: Choose USDC or USDT
- [ ] **Token Approval**: Approve contract to spend tokens
- [ ] **Payment Transaction**: Complete booking payment
- [ ] **Session Creation**: Verify session created in contract
- [ ] **Transaction Receipt**: Get transaction hash

### Phase 6: Progressive Payments ⏱️ 30 minutes
**Prerequisites**: Active session required

- [ ] **Start Session**: Begin mentorship session
- [ ] **Heartbeat System**: Test connection monitoring
- [ ] **Progressive Release**: Monitor payment releases
- [ ] **Pause/Resume**: Test session control
- [ ] **Complete Session**: End session and verify final payment

## 🚨 Issue Tracking

### Expected Issues (Known)
- [ ] **Mentors Page 404**: Route exists but component may have rendering issue
- [ ] **Token Balances**: Need to mint/obtain test tokens
- [ ] **UI Polish**: Some interface elements may need refinement

### Unexpected Issues (Track Here)
- [ ] Issue 1: ________________________________
- [ ] Issue 2: ________________________________
- [ ] Issue 3: ________________________________
- [ ] Issue 4: ________________________________

## 📋 Quick Commands for Testing

### Frontend Check
```bash
curl http://localhost:3000  # Should return HTML
```

### Contract Verification
```bash
# Check contract on Etherscan
open https://sepolia.etherscan.io/address/0x409C486D1A686e9499E9561bFf82781843598eDF
```

### Browser Console Tests
```javascript
// In browser console on the frontend
console.log("Current URL:", window.location.href);
console.log("Ethereum available:", !!window.ethereum);
console.log("Connected accounts:", window.ethereum?.selectedAddress);
```

## 🛠️ Troubleshooting

### If Frontend Won't Load
```bash
cd "/home/mathewsl/Chain Academy V2"
pm2 restart all
# Or manually:
cd frontend && npm start
```

### If Wallet Won't Connect
1. Check if using Sepolia testnet
2. Try different wallet (MetaMask, Coinbase)
3. Clear browser cache
4. Check browser console for errors

### If Transactions Fail
1. Verify sufficient testnet ETH for gas
2. Check token balances
3. Ensure correct network (Sepolia)
4. Try lower gas price if timeout

## 📞 Contract Addresses (Quick Copy)

```
Mentorship: 0x409C486D1A686e9499E9561bFf82781843598eDF
Progressive Escrow: 0xa161C5F6B18120269c279D31A7FEcAFb86c737EC
Mock USDC: 0x556C875376950B70E0b5A670c9f15885093002B9
Mock USDT: 0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085
```

## 🎯 Success Criteria

### Minimum Viable Test
- [ ] Frontend loads without errors
- [ ] Wallet connects successfully
- [ ] Can read contract data
- [ ] Basic navigation works

### Complete Payment Test
- [ ] Token approval transaction succeeds
- [ ] Payment transaction completes
- [ ] Session is created in contract
- [ ] Progressive payments can be monitored

### Full System Test
- [ ] End-to-end payment flow works
- [ ] Progressive payment releases properly
- [ ] Session management functions correctly
- [ ] Emergency functions accessible

---

**Start Time**: ________________  
**Completion Time**: ________________  
**Tester**: ________________  
**Overall Result**: ⭐⭐⭐⭐⭐ (Rate 1-5 stars)