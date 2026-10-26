// The English texts of the customer emails. English is the fallback for every key, so this
// object defines the set of keys.
export const en = {
  "common.greeting": "Hi {name},",
  "common.greetingNoName": "Hi there,",
  "common.footerQuestions": "Questions? Reply to this email",
  "common.footerWrite": "write to {email}",
  "common.footerWhatsapp": "WhatsApp us at {whatsapp}",
  "common.viewOrder": "View your order",
  "common.shipTo": "Ship to",
  "common.yourOrder": "Your order",
  "common.shipping": "Shipping",
  "common.total": "Total",
  "common.or": "or",
  // The owner emails are English only. The key is here so the shell reads one source.
  "common.ownerFooter":
    "This is an alert for the store owner from the {store} backend. Change the address at Settings → Bank transfer in Medusa Admin.",

  "orderPlaced.subject": "Order #{n} confirmed",
  "orderPlaced.eyebrow": "Order #{n} · {date}",
  "orderPlaced.heading": "Thank you, {name}.",
  "orderPlaced.headingNoName": "Thank you.",
  "orderPlaced.introUnpaid":
    "We received your order. We prepare it for shipping after we confirm your payment.",
  "orderPlaced.introPaid":
    "We received your order and your payment. We prepare it for shipping now, and we send the tracking number by email.",
  "orderPlaced.payByTransfer": "Pay by bank transfer",
  "orderPlaced.amount": "Amount",
  "orderPlaced.bank": "Bank",
  "orderPlaced.account": "Account",
  "orderPlaced.name": "Name",
  "orderPlaced.deadline":
    "Transfer the exact amount and upload the receipt before {deadline}. We cancel the order after that time.",
  "orderPlaced.upload": "Upload the receipt",

  "orderShipped.subject": "Your order #{n} is on its way",
  "orderShipped.eyebrow": "Order #{n} · {date}",
  "orderShipped.heading": "On its way.",
  "orderShipped.shippedWith": "We shipped your order on {date} with {method}.",
  "orderShipped.shipped": "We shipped your order on {date}.",
  "orderShipped.trackingNumber": "Tracking number",
  "orderShipped.courier": "Courier",
  "orderShipped.track": "Track your parcel",
  "orderShipped.inShipment": "In this shipment",

  "morePayment.subject": "More payment is needed for order #{n}",
  "morePayment.eyebrow": "Order #{n}",
  "morePayment.heading": "We need a bit more.",
  "morePayment.intro": "We checked your receipt for order #{n}. The store needs more payment:",
  "morePayment.next": "Transfer the difference, then upload one more receipt on the order page.",

  "magicLink.subject": "Sign in to {store}",
  "magicLink.heading": "Your sign-in link.",
  "magicLink.intro":
    "Hi {name}, click the button to sign in to {store}. The link works one time and expires in 15 minutes.",
  "magicLink.introNoName":
    "Click the button to sign in to {store}. The link works one time and expires in 15 minutes.",
  "magicLink.button": "Sign in",
  "magicLink.request": "Request",
  "magicLink.time": "Time",
  "magicLink.ignore":
    "If you did not ask to sign in, ignore this email. Nobody can sign in without this link.",

  "welcome.subject": "Welcome to {store}",
  "welcome.heading": "Welcome, {name}.",
  "welcome.headingNoName": "Welcome.",
  "welcome.intro": "Your account is ready. With your account, you can:",
  "welcome.item1": "see your orders and their status,",
  "welcome.item2": "save your delivery addresses,",
  "welcome.item3": "keep a wishlist,",
  "welcome.item4": "review the products that you bought.",
  "welcome.signIn":
    "To sign in, type your email address on our site. We send you a link each time, so you do not need a password.",
  "welcome.button": "Start shopping",

  "orderCancelled.subject": "Order #{n} is cancelled",
  "orderCancelled.eyebrow": "Order #{n} · {date}",
  "orderCancelled.heading": "We cancelled your order.",
  "orderCancelled.timeout":
    "We did not get your payment within {hours} hours, so we cancelled order #{n} and released the items. Nothing was charged.",
  "orderCancelled.timeoutNext":
    "If you still want the items, place the order again. The stock may have changed.",
  "orderCancelled.staffNote": "The store cancelled order #{n}. A note from the store:",
  "orderCancelled.staff": "The store cancelled order #{n}. Contact us if you have questions.",
  "orderCancelled.refundBank":
    "We refund {amount} to the account you paid from within two working days.",
  "orderCancelled.refundGateway": "The refund comes in a separate email.",
  "orderCancelled.shopAgain": "Shop again",
  "orderCancelled.lines": "The cancelled order",

  "payment.method.bankTransfer": "bank transfer",
  "payment.method.other": "payment",

  "paymentConfirmed.subject": "We received your payment for order #{n}",
  "paymentConfirmed.eyebrow": "Order #{n} · {date}",
  "paymentConfirmed.heading": "Payment received.",
  "paymentConfirmed.intro":
    "Thank you, {name}. We confirmed your {method}. We prepare your order for shipping now, and we send the tracking number by email.",
  "paymentConfirmed.introNoName":
    "Thank you. We confirmed your {method}. We prepare your order for shipping now, and we send the tracking number by email.",
  "paymentConfirmed.amount": "Amount",
  "paymentConfirmed.received": "Received",
  "paymentConfirmed.method": "Method",

  "refundSent.subject": "We refunded {amount} for order #{n}",
  "refundSent.eyebrow": "Order #{n} · {date}",
  "refundSent.heading": "Refund sent.",
  "refundSent.bank":
    "We refunded {amount} to the account you paid from. A bank transfer can take one working day to show.",
  "refundSent.other":
    "We refunded {amount} to your payment method. A refund can take a few days to show.",
  "refundSent.amount": "Amount",
  "refundSent.sent": "Sent",
  "refundSent.reason": "Reason",

  "orderDelivered.subject": "Your order #{n} is delivered",
  "orderDelivered.eyebrow": "Order #{n} · {date}",
  "orderDelivered.heading": "Delivered.",
  "orderDelivered.intro": "Your parcel arrived on {date}. We hope you like what you ordered.",
  "orderDelivered.inDelivery": "In this delivery",
  "orderDelivered.problem":
    "If something is wrong with the parcel, reply to this email within 7 days.",

  "reviewRequest.subject": "How is your {product}?",
  "reviewRequest.eyebrow": "Order #{n}",
  "reviewRequest.heading": "A week in. What do you think?",
  "reviewRequest.intro":
    "Hi {name}, your order arrived a week ago. A short review helps other shoppers, and it takes a minute.",
  "reviewRequest.introNoName":
    "Your order arrived a week ago. A short review helps other shoppers, and it takes a minute.",
  "reviewRequest.button": "Write a review",
  "reviewRequest.once":
    "You see this email once per order, and only for the products you have not reviewed.",

  "wishlist.subjectStock": "Back in stock: {product}",
  "wishlist.subjectPrice": "Price drop: {product}",
  "wishlist.heading": "Good news from your wishlist.",
  "wishlist.backInStock": "Back in stock",
  "wishlist.priceDrop": "Price drop",
  "wishlist.button": "Open your wishlist",
  "wishlist.why":
    "You get this email because these items are on your wishlist. Remove an item from the wishlist to stop alerts for it.",
} as const
