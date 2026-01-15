# Payment System Implementation for Trucking Web App

## Overview

This implementation adds a comprehensive payment system to your trucking web application with the following business rules:

1. **30-Day Payment Terms**: Each delivery must be paid within 30 days from the delivery date
2. **Booking Restriction**: Clients with overdue payments cannot book new trucks until all payments are settled
3. **Philippine Market Support**: Uses PayMongo payment gateway which supports PHP currency and popular Philippine payment methods
4. **Admin Management**: Complete admin dashboard for payment tracking and management

## Features

### Client Features
- View payment history and outstanding balances
- Pay invoices online using multiple payment methods (Cards, GCash, GrabPay, PayMaya)
- Track payment due dates and status
- Account status indicator (good standing vs. payment required)

### Admin Features
- Monitor all payments across the system
- Track overdue payments with alerts
- Generate payment links for clients
- Update client payment statuses
- Comprehensive payment analytics and reporting

### Payment Methods Supported
- Credit/Debit Cards (Visa, Mastercard, etc.)
- GCash
- GrabPay
- PayMaya
- Online Banking

## Installation & Setup

### 1. Environment Variables

Add the following variables to your `.env` file:

```env
# PayMongo Payment Gateway (Philippines)
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here
```

### 2. Get PayMongo API Keys

1. Sign up at [PayMongo Dashboard](https://dashboard.paymongo.com/)
2. Navigate to Developers > API Keys
3. Copy your Secret Key and Public Key
4. For testing, use test keys (starting with `sk_test_` and `pk_test_`)
5. For production, use live keys (starting with `sk_live_` and `pk_live_`)

### 3. Install Dependencies

The payment system uses existing dependencies. No additional packages are required.

### 4. Initialize Payment Data

Run the payment setup script to create payments for existing deliveries:

```bash
node create-delivery-payments.js
```

This script will:
- Create payment records for existing deliveries
- Set 30-day payment terms from delivery dates
- Update client payment statuses
- Mark legacy payments appropriately

### 5. Database Schema

The payment system adds a new `payments` collection to Firestore with the following structure:

```javascript
{
  deliveryId: string,
  clientId: string,
  paymentIntentId: string, // PayMongo payment intent ID
  amount: number,
  currency: string, // 'PHP'
  status: string, // 'pending', 'paid', 'overdue', 'failed'
  dueDate: timestamp,
  deliveryDate: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  paidAt: timestamp,
  paymentMethod: string,
  transactionFee: number,
  netAmount: number,
  paymentLinkId: string,
  paymentLinkUrl: string,
  metadata: {
    clientName: string,
    truckPlate: string,
    pickupLocation: string,
    deliveryAddress: string
  }
}
```

## API Endpoints

### Payment Management
- `POST /api/payments/create` - Create payment for delivery
- `POST /api/payments/process` - Process payment completion
- `GET /api/payments/client/:clientId` - Get client payment summary
- `GET /api/payments/client/:clientId/can-book` - Check booking eligibility
- `POST /api/payments/:paymentId/create-link` - Create payment link
- `POST /api/payments/webhook` - PayMongo webhook handler
- `GET /api/payments/overdue` - Get overdue payments (admin)
- `POST /api/payments/update-client-status/:clientId` - Update client status

## Frontend Components

### Client Components
- `PaymentManagement.js` - Main payment page for clients
  - Payment history table
  - Outstanding balance summary
  - Quick pay functionality
  - Account status display

### Admin Components
- `PaymentsDashboard.js` - Admin payment management
  - Payment statistics dashboard
  - All payments table with filters
  - Overdue payments monitoring
  - Payment link generation

## Payment Flow

### 1. Delivery Completion
When a delivery is completed, a payment record is automatically created with:
- Amount based on delivery rate
- Due date set to 30 days from delivery date
- Status set to 'pending'

### 2. Client Payment Process
1. Client views outstanding payments in payment management page
2. Client clicks "Pay Now" to generate a PayMongo payment link
3. Payment link opens in new window with secure PayMongo checkout
4. Client completes payment using preferred method
5. PayMongo sends webhook to update payment status
6. System updates client booking eligibility

### 3. Booking Restriction
Before allowing new truck bookings, the system checks:
- If client has any overdue payments (past due date)
- If overdue payments exist, booking is blocked with error message
- Client must settle all overdue payments to resume booking

## Business Logic

### Payment Terms
- **Due Date**: 30 days from delivery date
- **Grace Period**: None - payments become overdue immediately after due date
- **Booking Restriction**: Immediate upon any overdue payment

### Fee Structure (PayMongo)
- **Credit Cards**: 3.5% + fixed fee
- **GCash**: 2.5%
- **GrabPay**: 2.5%
- **PayMaya**: 2.5%

### Status Transitions
```
pending → paid (successful payment)
pending → overdue (past due date)
pending → failed (payment failed)
overdue → paid (late payment)
```

## Error Handling

### Client-Side
- Payment link creation failures
- Network connectivity issues
- Authentication token expiration
- Payment processing errors

### Server-Side
- PayMongo API failures
- Database transaction failures
- Webhook processing errors
- Client status update failures

## Testing

### Test Environment
1. Use PayMongo test API keys
2. Test with provided test card numbers
3. Verify webhook handling with PayMongo webhook testing tools

### Test Cards (PayMongo)
- **Visa**: 4343434343434345
- **Mastercard**: 5555555555554444
- **Declined Card**: 4000000000000002

## Production Deployment

### 1. PayMongo Setup
- Switch to live API keys
- Configure production webhook URLs
- Set up proper SSL certificates

### 2. Security Considerations
- Store API keys securely (environment variables)
- Validate webhook signatures
- Implement rate limiting for payment endpoints
- Use HTTPS for all payment-related requests

### 3. Monitoring
- Track payment success rates
- Monitor webhook delivery
- Set up alerts for failed payments
- Regular overdue payment reports

## Troubleshooting

### Common Issues

1. **PayMongo API Key Errors**
   - Verify API keys are correct and for the right environment
   - Check API key permissions in PayMongo dashboard

2. **Webhook Not Received**
   - Verify webhook URL is accessible from internet
   - Check webhook signature validation
   - Monitor server logs for webhook processing

3. **Payment Status Not Updating**
   - Check webhook processing logs
   - Verify database update transactions
   - Test webhook endpoint manually

4. **Client Booking Blocked Incorrectly**
   - Run client status update manually
   - Check payment due date calculations
   - Verify overdue payment logic

## Support

For payment gateway issues:
- PayMongo Documentation: https://developers.paymongo.com/
- PayMongo Support: support@paymongo.com

For implementation issues:
- Check server logs for detailed error messages
- Verify database connectivity and permissions
- Test API endpoints using Postman or similar tools

## Future Enhancements

1. **Automated Reminders**
   - Email/SMS notifications for upcoming due dates
   - Escalating reminder sequences

2. **Payment Plans**
   - Installment payment options
   - Partial payment support

3. **Reporting**
   - Advanced payment analytics
   - Revenue tracking and forecasting
   - Client payment behavior analysis

4. **Integration**
   - Accounting system integration
   - Bank reconciliation features
   - Tax reporting capabilities 