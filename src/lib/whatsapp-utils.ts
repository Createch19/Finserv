
import type { AppSettings } from "@/types";

/**
 * Placeholders used in templates:
 * [CUSTOMER_NAME]
 * [AMOUNT]
 * [BALANCE]
 * [DATE]
 * [MODEL]
 * [EMI_INFO]
 * [UPI_LINK]
 * [MISSED_DATE]
 */

const DEFAULT_PAYMENT_TEMPLATE = `*Payment Received!*

Dear *[CUSTOMER_NAME]*,
We have received your payment of *₹[AMOUNT]* towards your *[EMI_INFO]* for *[MODEL]* on [DATE].

*Remaining Balance:* ₹[BALANCE]

Thank you for your payment!
*FINSERV*`;

const DEFAULT_REMINDER_TEMPLATE = `*EMI REMINDER*

Dear *[CUSTOMER_NAME]*,
This is a friendly reminder that your EMI of *₹[AMOUNT]* for *[MODEL]* was due on *[MISSED_DATE]*.

*Outstanding Balance:* ₹[BALANCE]

Please pay as soon as possible via the link below or using the QR code:
[UPI_LINK]

Ignore if already paid.
*FINSERV*`;

/**
 * Generates a WhatsApp deep link with a dynamic message.
 */
export function getWhatsAppLink(
  phone: string,
  template: string,
  data: Record<string, string | number>
) {
  let message = template;

  // Replace placeholders
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `[${key}]`;
    message = message.split(placeholder).join(String(value));
  });

  // Clean phone number: remove non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Ensure country code (defaulting to 91 for India)
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Specific helper for payment receipts
 */
export function getWhatsAppPaymentLink(
  phone: string,
  name: string,
  amount: number,
  model: string,
  balance: number,
  date: string,
  emiInfo: string = "",
  settings?: AppSettings
) {
  const template = settings?.whatsappPaymentTemplate || DEFAULT_PAYMENT_TEMPLATE;
  
  return getWhatsAppLink(phone, template, {
    CUSTOMER_NAME: name.toUpperCase(),
    AMOUNT: Math.round(amount).toLocaleString('en-IN'),
    BALANCE: Math.round(balance).toLocaleString('en-IN'),
    DATE: date,
    MODEL: model,
    EMI_INFO: emiInfo || "EMI"
  });
}

/**
 * Specific helper for reminders
 */
export function getWhatsAppReminderLink(
  phone: string,
  name: string,
  amount: number,
  model: string,
  balance: number,
  missedDate: string,
  settings?: AppSettings
) {
  const template = settings?.whatsappReminderTemplate || DEFAULT_REMINDER_TEMPLATE;
  const upiId = settings?.businessUpiId || "";
  
  // Generate UPI deep link if ID exists
  const upiLink = upiId 
    ? `upi://pay?pa=${upiId}&pn=FINSERV&am=${Math.round(amount)}&cu=INR`
    : "Contact admin for payment details";

  return getWhatsAppLink(phone, template, {
    CUSTOMER_NAME: name.toUpperCase(),
    AMOUNT: Math.round(amount).toLocaleString('en-IN'),
    BALANCE: Math.round(balance).toLocaleString('en-IN'),
    MODEL: model,
    MISSED_DATE: missedDate,
    UPI_LINK: upiLink
  });
}
