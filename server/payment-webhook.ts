
import { popupSignalServer } from './websocket-server';

// Example function to handle payment success webhook from bank
export async function handlePaymentSuccess(paymentData: any) {
  try {
    const { transactionUuid, status, amount } = paymentData;
    
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      console.log(`Payment successful for transaction: ${transactionUuid}`);
      
      // Signal all connected clients to close popup for this transaction
      popupSignalServer.signalPopupClose(
        transactionUuid, 
        `payment_modal_${transactionUuid}`, // Matching popup ID pattern
        undefined // Send to all machines, or specify machineId if known
      );

      // You can also save payment record to database here
      // await savePaymentRecord(paymentData);
      
      return { success: true, message: 'Payment processed and popup closed' };
    }
    
    return { success: false, message: 'Payment not successful' };
  } catch (error) {
    console.error('Error handling payment success:', error);
    return { success: false, error: error.message };
  }
}

// Example HTTP endpoint for bank webhook
export function setupPaymentWebhook(app: any) {
  app.post('/api/webhook/payment-success', async (req, res) => {
    try {
      console.log('Payment webhook received:', req.body);
      
      const result = await handlePaymentSuccess(req.body);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Payment webhook error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });
}

// Manual trigger for testing (you can call this from anywhere)
export function triggerPopupClose(transactionUuid: string, machineId?: string) {
  popupSignalServer.signalPopupClose(
    transactionUuid,
    `payment_modal_${transactionUuid}`,
    machineId
  );
}
