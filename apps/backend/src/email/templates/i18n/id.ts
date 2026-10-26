import type { EmailKey } from "./index"

// The Indonesian texts of the customer emails. The type makes a missing key a compile error.
export const id: Record<EmailKey, string> = {
  "common.greeting": "Halo {name},",
  "common.greetingNoName": "Halo,",
  "common.footerQuestions": "Ada pertanyaan? Balas email ini",
  "common.footerWrite": "tulis ke {email}",
  "common.footerWhatsapp": "WhatsApp kami di {whatsapp}",
  "common.footerPhone": "telepon kami di {phone}",
  "common.viewOrder": "Lihat pesanan Anda",
  "common.shipTo": "Kirim ke",
  "common.yourOrder": "Pesanan Anda",
  "common.shipping": "Ongkir",
  "common.total": "Total",
  "common.or": "atau",
  // The owner emails are English only, so this text is the English text.
  "common.ownerFooter":
    "This is an alert for the store owner from the {store} backend. Change the address at Settings → Store in Medusa Admin.",

  "orderPlaced.subject": "Pesanan #{n} diterima",
  "orderPlaced.eyebrow": "Pesanan #{n} · {date}",
  "orderPlaced.heading": "Terima kasih, {name}.",
  "orderPlaced.headingNoName": "Terima kasih.",
  "orderPlaced.introUnpaid":
    "Kami menerima pesanan Anda. Kami menyiapkannya untuk pengiriman setelah pembayaran Anda terkonfirmasi.",
  "orderPlaced.introPaid":
    "Kami menerima pesanan dan pembayaran Anda. Kami menyiapkannya untuk pengiriman sekarang, dan kami kirim nomor resi lewat email.",
  "orderPlaced.payByTransfer": "Bayar dengan transfer bank",
  "orderPlaced.amount": "Jumlah",
  "orderPlaced.bank": "Bank",
  "orderPlaced.account": "Rekening",
  "orderPlaced.name": "Atas nama",
  "orderPlaced.deadline":
    "Transfer dengan jumlah yang tepat dan unggah bukti transfer sebelum {deadline}. Setelah itu, pesanan kami batalkan.",
  "orderPlaced.upload": "Unggah bukti transfer",

  "orderShipped.subject": "Pesanan #{n} sedang dikirim",
  "orderShipped.eyebrow": "Pesanan #{n} · {date}",
  "orderShipped.heading": "Sedang dikirim.",
  "orderShipped.shippedWith": "Kami mengirim pesanan Anda pada {date} dengan {method}.",
  "orderShipped.shipped": "Kami mengirim pesanan Anda pada {date}.",
  "orderShipped.trackingNumber": "Nomor resi",
  "orderShipped.courier": "Kurir",
  "orderShipped.track": "Lacak paket Anda",
  "orderShipped.inShipment": "Dalam kiriman ini",

  "morePayment.subject": "Pesanan #{n} butuh pembayaran tambahan",
  "morePayment.eyebrow": "Pesanan #{n}",
  "morePayment.heading": "Kami butuh sedikit lagi.",
  "morePayment.intro":
    "Kami sudah memeriksa bukti transfer untuk pesanan #{n}. Toko butuh pembayaran tambahan:",
  "morePayment.next":
    "Transfer kekurangannya, lalu unggah satu bukti transfer lagi di halaman pesanan.",

  "magicLink.subject": "Masuk ke {store}",
  "magicLink.heading": "Tautan masuk Anda.",
  "magicLink.intro":
    "Halo {name}, klik tombol untuk masuk ke {store}. Tautan ini berlaku satu kali dan kedaluwarsa dalam 15 menit.",
  "magicLink.introNoName":
    "Klik tombol untuk masuk ke {store}. Tautan ini berlaku satu kali dan kedaluwarsa dalam 15 menit.",
  "magicLink.button": "Masuk",
  "magicLink.request": "Permintaan",
  "magicLink.time": "Waktu",
  "magicLink.ignore":
    "Jika Anda tidak meminta untuk masuk, abaikan email ini. Tidak ada yang bisa masuk tanpa tautan ini.",

  "welcome.subject": "Selamat datang di {store}",
  "welcome.heading": "Selamat datang, {name}.",
  "welcome.headingNoName": "Selamat datang.",
  "welcome.intro": "Akun Anda sudah siap. Dengan akun ini, Anda bisa:",
  "welcome.item1": "melihat pesanan Anda dan statusnya,",
  "welcome.item2": "menyimpan alamat pengiriman Anda,",
  "welcome.item3": "membuat wishlist,",
  "welcome.item4": "mengulas produk yang Anda beli.",
  "welcome.signIn":
    "Untuk masuk, ketik alamat email Anda di situs kami. Kami kirim tautan setiap kali, jadi Anda tidak perlu kata sandi.",
  "welcome.button": "Mulai belanja",

  "orderCancelled.subject": "Pesanan #{n} dibatalkan",
  "orderCancelled.eyebrow": "Pesanan #{n} · {date}",
  "orderCancelled.heading": "Pesanan Anda kami batalkan.",
  "orderCancelled.timeout":
    "Kami tidak menerima pembayaran Anda dalam {hours} jam, jadi pesanan #{n} kami batalkan dan stoknya kami lepas. Tidak ada biaya yang ditagih.",
  "orderCancelled.timeoutNext":
    "Jika Anda masih ingin barangnya, buat pesanan lagi. Stok mungkin sudah berubah.",
  "orderCancelled.staffNote": "Toko membatalkan pesanan #{n}. Catatan dari toko:",
  "orderCancelled.staff": "Toko membatalkan pesanan #{n}. Hubungi kami jika ada pertanyaan.",
  "orderCancelled.refundBank":
    "Kami kembalikan {amount} ke rekening yang Anda pakai dalam dua hari kerja.",
  "orderCancelled.refundGateway": "Pengembalian dana dikirim lewat email terpisah.",
  "orderCancelled.shopAgain": "Belanja lagi",
  "orderCancelled.lines": "Pesanan yang dibatalkan",

  "payment.method.bankTransfer": "transfer bank",
  "payment.method.other": "pembayaran",

  "paymentConfirmed.subject": "Pembayaran pesanan #{n} kami terima",
  "paymentConfirmed.eyebrow": "Pesanan #{n} · {date}",
  "paymentConfirmed.heading": "Pembayaran diterima.",
  "paymentConfirmed.intro":
    "Terima kasih, {name}. Kami sudah mengonfirmasi {method} Anda. Kami menyiapkan pesanan Anda untuk pengiriman sekarang, dan kami kirim nomor resi lewat email.",
  "paymentConfirmed.introNoName":
    "Terima kasih. Kami sudah mengonfirmasi {method} Anda. Kami menyiapkan pesanan Anda untuk pengiriman sekarang, dan kami kirim nomor resi lewat email.",
  "paymentConfirmed.amount": "Jumlah",
  "paymentConfirmed.received": "Diterima",
  "paymentConfirmed.method": "Metode",

  "refundSent.subject": "Pengembalian dana {amount} untuk pesanan #{n}",
  "refundSent.eyebrow": "Pesanan #{n} · {date}",
  "refundSent.heading": "Dana dikembalikan.",
  "refundSent.bank":
    "Kami sudah mengembalikan {amount} ke rekening yang Anda pakai untuk membayar. Transfer bank bisa butuh satu hari kerja sampai dananya terlihat.",
  "refundSent.other":
    "Kami sudah mengembalikan {amount} ke metode pembayaran Anda. Pengembalian dana bisa butuh beberapa hari sampai dananya terlihat.",
  "refundSent.amount": "Jumlah",
  "refundSent.sent": "Dikirim",
  "refundSent.reason": "Alasan",

  "orderDelivered.subject": "Pesanan #{n} sudah sampai",
  "orderDelivered.eyebrow": "Pesanan #{n} · {date}",
  "orderDelivered.heading": "Sudah sampai.",
  "orderDelivered.intro": "Paket Anda sampai pada {date}. Semoga Anda suka dengan pesanan Anda.",
  "orderDelivered.inDelivery": "Dalam kiriman ini",
  "orderDelivered.problem": "Jika ada masalah dengan paketnya, balas email ini dalam 7 hari.",

  "reviewRequest.subject": "Bagaimana {product} Anda?",
  "reviewRequest.eyebrow": "Pesanan #{n}",
  "reviewRequest.heading": "Sudah seminggu. Bagaimana menurut Anda?",
  "reviewRequest.intro":
    "Halo {name}, pesanan Anda sampai seminggu yang lalu. Ulasan singkat membantu pembeli lain, dan hanya butuh satu menit.",
  "reviewRequest.introNoName":
    "Pesanan Anda sampai seminggu yang lalu. Ulasan singkat membantu pembeli lain, dan hanya butuh satu menit.",
  "reviewRequest.button": "Tulis ulasan",
  "reviewRequest.once":
    "Email ini hanya dikirim sekali per pesanan, dan hanya untuk produk yang belum Anda ulas.",

  "wishlist.subjectStock": "Stok kembali: {product}",
  "wishlist.subjectPrice": "Harga turun: {product}",
  "wishlist.heading": "Kabar baik dari wishlist Anda.",
  "wishlist.backInStock": "Stok kembali",
  "wishlist.priceDrop": "Harga turun",
  "wishlist.button": "Buka wishlist Anda",
  "wishlist.why":
    "Anda menerima email ini karena produk ini ada di wishlist Anda. Hapus produk dari wishlist untuk menghentikan pemberitahuan untuk produk itu.",
}
