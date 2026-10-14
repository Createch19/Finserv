
/**
 * Generates a WhatsApp deep link with a pre-filled message for payment confirmation.
 */
export function getWhatsAppPaymentLink(
  phone: string,
  name: string,
  amount: number,
  model: string,
  balance: number,
  date: string
) {
  // Clean phone number: remove non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Ensure country code (defaulting to 91 for India as per local app context)
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const message = `*Payment Received!*

Dear *${name.toUpperCase()}*,
We have received your payment of *₹${Math.round(amount).toLocaleString('en-IN')}* towards your *${model}* EMI on ${date}.

*Remaining Balance:* ₹${Math.round(balance).toLocaleString('en-IN')}

Thank you for your payment!
*FINSERV*`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
