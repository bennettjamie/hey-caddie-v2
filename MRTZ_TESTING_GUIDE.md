# MRTZ Ledger & Settlement System - Testing Guide

This guide will help you test the new MRTZ Ledger & Settlement System to ensure everything works correctly.

## Prerequisites

1. **Firebase Indexes**: Before testing, make sure Firestore indexes are set up:
   ```bash
   npm run setup-indexes  # View index requirements
   npm run deploy:indexes # Deploy indexes (requires Firebase CLI)
   ```
   
   Or manually create indexes in Firebase Console using the `firestore.indexes.json` file.

2. **Firebase Configuration**: Ensure your `.env.local` has proper Firebase credentials.

## Testing Checklist

### Phase 1: Basic Ledger Functionality

#### Test 1: Complete a Round with Betting
1. Start a new round with 2-4 players
2. Set up betting:
   - Start a Skins bet (e.g., 0.25 MRTZ)
   - Start a Nassau bet (e.g., 1.0 MRTZ)
3. Play through at least 9 holes, entering scores
4. Complete the round (finish all 18 holes or use "Finish Round" button)
5. **Expected**: 
   - Round review modal appears
   - Bet summary shows MRTZ totals
   - Settlement modal asks if settled IRL
   - Ledger entries are created in Firebase

#### Test 2: View Ledger Entries
1. Navigate to `/mrtz` page
2. Select a player from the dropdown
3. Click on "Ledger" tab
4. **Expected**:
   - See transaction history
   - Transactions show correct amounts
   - Dates and descriptions are accurate
   - Filters work (type, status)

#### Test 3: Check Balances
1. On `/mrtz` page, view the balance summary at the top
2. **Expected**:
   - Current Balance shows confirmed transactions
   - Pending In shows MRTZ owed to player
   - Pending Out shows MRTZ player owes
   - Net Balance = Current + Pending In - Pending Out

### Phase 2: Settlement System

#### Test 4: Create Settlement (Money)
1. Complete a round where players owe each other MRTZ
2. Navigate to `/mrtz` → "Balances" tab
3. Find an outstanding balance
4. Click "Create Settlement"
5. Select "Money Exchange"
6. Enter an optional money amount
7. Create settlement
8. **Expected**:
   - Settlement appears in "Settlements" tab
   - Status is "pending"
   - Other party can agree/reject

#### Test 5: Agree to Settlement
1. As the other party, navigate to `/mrtz` → "Settlements" tab
2. Find the pending settlement
3. Click "✓ Agree"
4. **Expected**:
   - Settlement status changes to "agreed" then "completed"
   - Transactions are marked as "settled"
   - Balances update accordingly

#### Test 6: Settlement with Good Deed
1. Submit a good deed (see Test 8)
2. Wait for validation
3. Create a settlement using the good deed
4. **Expected**:
   - Settlement links to good deed
   - MRTZ is applied correctly

### Phase 3: Good Deeds System

#### Test 7: Submit Good Deed
1. Navigate to `/mrtz` → "Good Deeds" tab
2. Fill out the form:
   - Deed Type: Course Cleanup
   - Description: "Picked up trash on holes 1-3"
   - MRTZ Value: 1.0
   - Select validators (other players)
   - Optional: Select course location
3. Submit
4. **Expected**:
   - Good deed appears in "Validations" tab for validators
   - Status is "pending"

#### Test 8: Validate Good Deed
1. As a validator, navigate to `/mrtz` → "Validations" tab
2. Find the pending good deed
3. Review the description
4. Click "✓ Approve" or "✗ Reject"
5. Add optional comment
6. **Expected**:
   - If all validators approve: Status changes to "validated", MRTZ is awarded
   - If any reject: Status changes to "rejected", no MRTZ awarded
   - Validation status updates in real-time

### Phase 4: Carry-Over System

#### Test 9: Create Carry-Over
1. Complete a round with unresolved bets:
   - Skins with ties (no clear winner on some holes)
   - Nassau with ties (front 9, back 9, or overall)
2. In Unresolved Bets Modal:
   - Choose "Exclude from MRTZ" or "Carry Over"
   - Select "Carry Over" for settlement
3. **Expected**:
   - Carry-over entry created in Firebase
   - Shows in `/mrtz` page under "Active Carry-Overs"
   - Can be resolved in future rounds

#### Test 10: Resolve Carry-Over
1. Start a new round with same players
2. Play through holes
3. Resolve carry-over (future feature - currently tracked but resolution UI pending)
4. **Expected**:
   - Carry-over marked as resolved
   - MRTZ distributed correctly
   - Ledger entries created

### Phase 5: Outstanding Balances

#### Test 11: View Outstanding Balances
1. Complete multiple rounds with different players
2. Navigate to `/mrtz` → "Balances" tab
3. **Expected**:
   - See "Owed to Me" section with totals
   - See "I Owe" section with totals
   - Net balance calculated correctly
   - Can create settlements from balances

#### Test 12: Create Settlement from Outstanding Balance
1. In "Balances" tab, find a balance
2. Click "Create Settlement"
3. Choose settlement type
4. Complete settlement
5. **Expected**:
   - Settlement created with all related transactions
   - Balances update after settlement completes

### Phase 6: Edge Cases & Error Handling

#### Test 13: Offline Mode
1. Disconnect from internet
2. Complete a round
3. **Expected**:
   - Round data saved locally
   - Ledger entries queued (if implemented)
   - Syncs when back online

#### Test 14: Multiple Rounds
1. Complete 3-5 rounds with same players
2. Check ledger for all rounds
3. **Expected**:
   - All transactions appear
   - Balances are cumulative
   - No duplicate entries

#### Test 15: Settlement Rejection
1. Create a settlement
2. As other party, reject it
3. **Expected**:
   - Settlement status: "rejected"
   - Rejection reason saved
   - Transactions remain pending
   - Can create new settlement

## Common Issues & Solutions

### Issue: "Index not found" errors
**Solution**: Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

### Issue: Transactions not appearing
**Solution**: 
- Check Firebase Console → Firestore → `mrtz_ledger` collection
- Verify player ID matches
- Check browser console for errors

### Issue: Balances not updating
**Solution**:
- Check `mrtz_balances` collection in Firebase
- Verify transaction status is "confirmed" or "settled"
- Refresh the page

### Issue: Good deed validation not working
**Solution**:
- Ensure validators are different from submitter
- Check all validators have approved
- Verify good deed status in Firebase

## Performance Testing

1. **Load Time**: Navigate to `/mrtz` with 100+ transactions
   - Should load in < 2 seconds
   - Use pagination if needed

2. **Query Performance**: 
   - Test with filters (type, status)
   - Should respond quickly with indexes

3. **Concurrent Users**:
   - Multiple players viewing ledger simultaneously
   - Settlements should update in real-time

## Data Verification

After testing, verify in Firebase Console:

1. **Collections Created**:
   - `mrtz_ledger` - Has transaction entries
   - `mrtz_balances` - Has balance documents per player
   - `mrtz_settlements` - Has settlement agreements
   - `mrtz_carryovers` - Has carry-over entries (if applicable)
   - `mrtz_good_deeds` - Has good deed submissions

2. **Data Integrity**:
   - Transaction amounts match round results
   - Balances sum correctly
   - Settlement parties match transactions
   - Good deeds link to transactions when validated

## Next Steps After Testing

1. **Fix any bugs** found during testing
2. **Optimize queries** if performance is slow
3. **Add missing features** based on feedback
4. **Update documentation** with any changes
5. **Deploy to production** when ready

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Firebase Console for data
3. Review this guide for common solutions
4. Check `firestore.indexes.json` for required indexes

---

**Last Updated**: After MRTZ Ledger System Implementation
**Version**: 1.0.0

