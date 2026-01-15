# Payment Cancellation System

## Overview
This document describes the payment cancellation system that ensures when a delivery is cancelled, the associated payment bill is also cancelled and deleted to prevent charging customers for deliveries that were never completed.

## Critical Business Rule
**When a delivery is cancelled, ALL associated payments must be automatically cancelled to prevent billing customers for services not rendered.**

## Implementation Details

### 1. Payment Cancellation Methods

#### Server-side PaymentService (`server/services/PaymentService.js`)
- `cancelPayment(deliveryId)` - Cancels all payments associated with a delivery
- `cancelPayMongoPaymentIntent(paymentIntentId)` - Handles PayMongo-specific cancellation

#### Client-side PaymentService (`client/server/services/PaymentService.js`)
- `cancelPayment(deliveryId)` - Test mode payment cancellation

### 2. Integration Points

#### Client Delivery Cancellation (`client/server/controllers/clientControllers.js`)
- **Route**: `POST /api/clients/deliveries/:id/cancel`
- **Before** delivery cancellation: Calls `paymentService.cancelPayment(id)`
- **Behavior**: Cancels payment first, then proceeds with delivery cancellation
- **Error Handling**: Continues with delivery cancellation even if payment cancellation fails

#### Admin Delivery Status Update (`client/server/controllers/adminController.js`)
- **Route**: `PUT /api/admin/deliveries/:id/status`
- **When status = 'cancelled'**: Automatically cancels associated payments
- **Logging**: Logs payment cancellation results for audit

#### Delivery Status Routes (`client/server/routes/deliveryRoutes.js`)
- **Route**: `PUT /api/deliveries/:id/status`
- **When status = 'cancelled'**: Triggers payment cancellation

### 3. Payment Cancellation Route

#### Standalone Payment Cancellation
- **Route**: `POST /api/payments/:deliveryId/cancel`
- **Purpose**: Allows manual payment cancellation for specific deliveries
- **Authentication**: Requires JWT authentication
- **Audit**: Logs all payment cancellation actions

### 4. Payment Summary Exclusions

#### Server PaymentService
- **Method**: `getClientPaymentSummary(userId)`
- **Behavior**: Excludes deliveries with status 'cancelled' or payment status 'cancelled'
- **Result**: Cancelled deliveries do not appear in payment summaries or billing

#### Client PaymentService (Test Mode)
- **Method**: `getClientPaymentSummary(userId)`
- **Behavior**: Same exclusion logic for test mode

### 5. Payment States

#### Valid Payment States
- `pending` - Payment awaiting completion
- `paid` - Payment successfully completed
- `cancelled` - Payment cancelled due to delivery cancellation
- `failed` - Payment attempt failed

#### Delivery Payment Status
- When delivery is cancelled: `paymentStatus = 'cancelled'`
- When payment is cancelled: `paymentCancelledAt` timestamp is set
- Cancellation reason is logged: `cancellationReason = 'Delivery cancelled'`

### 6. Error Handling

#### Graceful Degradation
- If payment cancellation fails, delivery cancellation still proceeds
- Warning logged but process continues
- Prevents delivery cancellation from being blocked by payment issues

#### PayMongo Integration
- Handles PayMongo payment intent cancellation
- Gracefully handles cases where PayMongo cancellation fails
- Continues with local database updates regardless

### 7. Audit Trail

#### Payment Cancellation Logging
- All payment cancellations are logged to audit trail
- Includes delivery ID, user, reason, and cancelled payment details
- Action type: `payment_cancelled`

#### Delivery Cancellation Logging
- Enhanced delivery cancellation logs include payment cancellation results
- Provides complete audit trail of both delivery and payment actions

### 8. Business Logic Protection

#### Cannot Cancel Paid Payments
- If payment status is already 'paid', cancellation is prevented
- Returns appropriate error message
- Protects against accidental cancellation of completed payments

#### Delivery Status Validation
- Only allows payment cancellation for valid cancellation scenarios
- Prevents payment cancellation for completed/delivered orders

### 9. Database Schema Updates

#### Deliveries Collection
```javascript
{
  deliveryStatus: 'cancelled',
  paymentStatus: 'cancelled',
  paymentCancelledAt: Timestamp,
  cancellationReason: 'Delivery cancelled',
  // ... other fields
}
```

#### Payments Collection (if using separate payments)
```javascript
{
  status: 'cancelled',
  cancelledAt: Timestamp,
  cancellationReason: 'Delivery cancelled',
  // ... other fields
}
```

### 10. API Response Examples

#### Successful Cancellation
```json
{
  "success": true,
  "message": "Delivery cancelled successfully. No payment is required.",
  "data": {
    "deliveryId": "delivery123",
    "cancelledAt": "2024-01-15T10:30:00Z",
    "deliveryStatus": "cancelled",
    "paymentCancellation": {
      "success": true,
      "message": "Payment cancelled successfully",
      "cancelledPayments": [
        {
          "paymentId": "payment123",
          "amount": 98,
          "currency": "PHP"
        }
      ]
    }
  }
}
```

#### Payment Already Paid
```json
{
  "success": false,
  "message": "Cannot cancel payment that has already been paid",
  "paymentStatus": "paid"
}
```

## Testing Recommendations

### 1. Test Scenarios
- Cancel delivery with pending payment → Payment should be cancelled
- Cancel delivery with paid payment → Should prevent cancellation or handle appropriately
- Cancel delivery with no payment → Should complete successfully
- Payment service failure → Delivery cancellation should still proceed

### 2. Verification Points
- Payment summary excludes cancelled deliveries
- Audit trail includes payment cancellation events
- PayMongo integration handles cancellation properly
- Database consistency after cancellation

## Security Considerations

### 1. Authorization
- Only delivery owner or admin can cancel deliveries/payments
- Payment cancellation requires proper authentication
- Audit trail tracks all cancellation actions

### 2. Data Integrity
- Transactions ensure consistency between delivery and payment updates
- Graceful error handling prevents partial state corruption
- Comprehensive logging for troubleshooting

## Monitoring and Alerts

### 1. Recommended Monitoring
- Payment cancellation success/failure rates
- Delivery cancellations without payment cancellation
- PayMongo API errors during cancellation
- Audit trail completeness

### 2. Business Metrics
- Number of cancelled deliveries vs cancelled payments
- Revenue impact of cancellations
- Customer satisfaction with cancellation process

## Conclusion

This payment cancellation system ensures that customers are never charged for cancelled deliveries, maintaining business integrity and customer trust. The system is designed with robust error handling, comprehensive audit trails, and graceful degradation to ensure reliable operation even when external payment systems experience issues. 