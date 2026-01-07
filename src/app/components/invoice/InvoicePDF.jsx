import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image, Svg, Path } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxK.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmWUlfBBc4.ttf', fontWeight: 'bold' },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fBBc4.ttf', fontWeight: 'medium' },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOjCnqEu92Fr1Mu51TjASc6CsQ.ttf', fontWeight: 'light' }
  ],
});

// Brand Colors
const colors = {
  primary: '#1f4235',    // Dark Green
  secondary: '#2c5e4b',
  accent: '#c29854',     // Gold
  lightGold: '#f0e6d2',
  text: '#1a1a1a',
  lightText: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
  bg: '#f9fafb'
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: colors.text,
    backgroundColor: colors.white,
    lineHeight: 1.5,
  },
  // Header Section
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoSection: {
    width: '50%',
  },
  logo: {
    width: 150,
    height: 50,
    objectFit: 'contain',
  },
  invoiceInfo: {
    width: '40%',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  invoiceLabel: {
    fontSize: 9,
    color: colors.lightText,
    marginRight: 10,
  },
  invoiceValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },

  // Billing Section
  billingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: colors.bg,
    padding: 15,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  billTo: {
    width: '48%',
  },
  billFrom: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  billText: {
    fontSize: 9,
    marginBottom: 3,
    color: colors.text,
  },
  billLabel: {
    color: colors.lightText,
    fontSize: 8,
  },

  // Table
  table: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: colors.bg,
  },
  // Column Widths - Adjusted for 4 columns
  col1: { width: '10%', textAlign: 'center' }, // SN
  col2: { width: '50%', textAlign: 'left' },  // Description of Services
  col4: { width: '20%', textAlign: 'center' }, // Period
  col5: { width: '20%', textAlign: 'right' },  // Product Price

  cellText: {
    fontSize: 9,
    color: colors.text,
  },
  cellSubText: {
    fontSize: 7,
    color: colors.lightText,
    marginTop: 2,
  },

  // Currency Row wrapper
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2
  },

  // Totals Section
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 30,
  },
  totalsContainer: {
    width: '45%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center'
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: colors.lightGold,
    paddingHorizontal: 10,
    marginTop: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 9,
    color: colors.lightText,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  finalTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  finalTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },

  // Amount In Words
  amountWordsSection: {
    marginTop: 0,
    marginBottom: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountWordsLabel: {
    fontSize: 8,
    color: colors.lightText,
    marginBottom: 3,
  },
  amountWordsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    marginTop: 'auto',
    borderTopWidth: 2,
    borderTopColor: colors.accent,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    width: '60%',
  },
  footerRight: {
    width: '35%',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 7,
    color: colors.lightText,
    marginBottom: 2,
  },
  signText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    borderTopWidth: 1,
    borderTopColor: colors.text,
    paddingTop: 5,
    width: '100%',
    textAlign: 'center',
  },
  thankYouMessage: {
    fontSize: 8,
    color: colors.accent,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  }

});

// --- HELPER FUNCTIONS ---

// SVG Rupee Symbol Component
const RupeeSymbol = ({ size = 9, color = '#1a1a1a' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3M9 13c6.668 0 6.668-10 0-10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const formatCurrency = (amount) => {
  // Format NUMBER only, NO symbol
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const numberToWords = (num) => {
  if (!num) return '';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = text => {
    const num = Number(text);
    if (num === 0) return '';
    if (num < 20) return a[num];
    const digit = num % 10;
    return b[Math.floor(num / 10)] + (digit ? '-' + a[digit] : ' ');
  };

  const convert = (num) => {
    if (num === 0) return 'Zero';

    let str = '';

    // Crore
    if (Math.floor(num / 10000000) > 0) {
      str += convert(Math.floor(num / 10000000)) + 'Crore ';
      num %= 10000000;
    }

    // Lakh
    if (Math.floor(num / 100000) > 0) {
      str += convert(Math.floor(num / 100000)) + 'Lakh ';
      num %= 100000;
    }

    // Thousand
    if (Math.floor(num / 1000) > 0) {
      str += convert(Math.floor(num / 1000)) + 'Thousand ';
      num %= 1000;
    }

    // Hundred
    if (Math.floor(num / 100) > 0) {
      str += convert(Math.floor(num / 100)) + 'Hundred ';
      num %= 100;
    }

    if (num > 0) {
      if (str !== '') str += 'and ';
      str += n(num);
    }

    return str.trim();
  };

  const parts = num.toString().split('.');
  const whole = Number(parts[0]);
  const decimal = parts[1] ? Number(parts[1].padEnd(2, '0').slice(0, 2)) : 0;

  let result = convert(whole) + ' Rupees';
  if (decimal > 0) {
    result += ' and ' + convert(decimal) + ' Paise';
  }

  return result + ' Only';
};

// --- MAIN COMPONENT ---

const InvoicePDF = ({ order, logoData }) => {
  // --- DATA PREPARATION ---
  const invoiceNo = order?.orderId ? `INV-${order.orderId.toString().slice(-6).toUpperCase()}` : 'DRAFT';
  const invoiceDate = order?.orderDate || new Date().toISOString();

  // Subscriber Details
  const customerName = order?.userName || order?.customerName || 'Valued Subscriber';
  const customerEmail = order?.userEmail || '';
  const customerGst = order?.userGst || '';

  // Calculations
  const totalAmount = Number(order?.totalAmount || order?.amount || 0);

  // Assuming totalAmount is Inclusive of 18% GST (Standard for B2C Digital Services in India)
  // Taxable Value = Total / 1.18
  const taxableValue = totalAmount / 1.18;
  const gstAmount = totalAmount - taxableValue;

  // Item Details
  let items = [];
  if (order?.subscriptions?.length > 0) {
    items = order.subscriptions.map(sub => ({
      desc: sub.product?.heading || 'Premium Subscription',
      period: sub.variant?.duration || '1 Month',
      price: Number(sub.price || sub.variant?.price || 0) // Ensure number
    }));
  } else if (order?.cartItems?.length > 0) {
    items = order.cartItems.map(item => ({
      desc: item.heading,
      period: item.duration,
      price: Number(item.price || 0)
    }));
  } else {
    items = [{
      desc: order?.product?.heading || 'Rupie Times Subscription',
      period: order?.variant?.duration || '1 Month',
      price: Number(order?.amount || order?.totalAmount || 0)
    }];
  }

  // Subtotal
  const subTotal = items.reduce((sum, item) => sum + item.price, 0);

  const discountAmount = Number(order?.discountAmount || 0);

  // Use the provided logo data or fallback to the public asset path
  const logoSrc = logoData || '/assets/logo.png';

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Image style={styles.logo} src={logoSrc} />
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.title}>Tax Invoice</Text>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceLabel}>Invoice No:</Text>
              <Text style={styles.invoiceValue}>{invoiceNo}</Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceLabel}>Date:</Text>
              <Text style={styles.invoiceValue}>{formatDate(invoiceDate)}</Text>
            </View>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceLabel}>Place of Supply:</Text>
              <Text style={styles.invoiceValue}>Maharashtra (27)</Text>
            </View>
          </View>
        </View>

        {/* BILLING INFO */}
        <View style={styles.billingSection}>
          <View style={styles.billFrom}>
            <Text style={styles.sectionTitle}>Billed By:</Text>
            <Text style={[styles.billText, { fontWeight: 'bold' }]}>Time Craft Publications</Text>
            <Text style={styles.billText}>123 Business Avenue, Tech Park</Text>
            <Text style={styles.billText}>Mumbai, Maharashtra 400001</Text>
            <Text style={styles.billText}>Email: support@rupietimes.com</Text>
            <View style={{ marginTop: 5 }}>
              <Text style={[styles.billLabel, { color: colors.primary, fontWeight: 'bold' }]}>GSTIN: 27AABCU9603R1ZM</Text>
              <Text style={styles.billLabel}>State Code: 27</Text>
            </View>
          </View>
          <View style={styles.billTo}>
            <Text style={styles.sectionTitle}>Billed To:</Text>
            {/* Ensure Name is always bold and visible */}
            <Text style={[styles.billText, { fontWeight: 'bold' }]}>
              {order?.userName || order?.customerName || 'Valued Subscriber'}
            </Text>

            {/* Explicit check for phone and email */}
            {order?.userPhone && (
              <Text style={styles.billText}>Mobile: {order.userPhone}</Text>
            )}
            {order?.userEmail && (
              <Text style={styles.billText}>Email: {order.userEmail}</Text>
            )}

            {/* GSTIN - Only show if registered */}
            {customerGst && customerGst.toLowerCase() !== 'unregistered' && (
              <View style={{ marginTop: 5 }}>
                <Text style={styles.billLabel}>GSTIN: {customerGst}</Text>
                {customerGst.startsWith('27') ? <Text style={styles.billLabel}>State Code: 27 (Maharashtra)</Text> : null}
              </View>
            )}
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.col1]}>SN</Text>
            <Text style={[styles.headerCell, styles.col2]}>DESCRIPTION OF SERVICES</Text>
            <Text style={[styles.headerCell, styles.col4]}>PERIOD</Text>
            <Text style={[styles.headerCell, styles.col5]}>PRODUCT PRICE</Text>
          </View>

          {items.map((item, index) => {
            // Per Item Calculations for display
            // const itemGst = item.price * 0.18;
            // const itemTotal = item.price + itemGst;

            return (
              <View key={index} style={[styles.tableRow, index % 2 !== 0 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.cellText, styles.col1]}>{index + 1}</Text>
                <View style={[styles.col2]}>
                  <Text style={styles.cellText}>{item.desc}</Text>
                </View>
                {/* Period */}
                <Text style={[styles.cellText, styles.col4]}>{item.period}</Text>

                {/* PRODUCT PRICE (Taxable Amount) */}
                <View style={[styles.col5, styles.currencyRow]}>
                  <RupeeSymbol size={9} color={colors.text} />
                  <Text style={styles.cellText}>{formatCurrency(item.price)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* TOTALS & WORDS */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '50%' }}>
            <View style={styles.amountWordsSection}>
              <Text style={styles.amountWordsLabel}>Amount in Words:</Text>
              <Text style={styles.amountWordsText}>{numberToWords(totalAmount)}</Text>
            </View>

            {/* BANK DETAILS (Optional / Static) */}
            <View>
              <Text style={[styles.sectionTitle, { fontSize: 8, marginBottom: 4 }]}>Bank Details:</Text>
              <Text style={styles.invoiceLabel}>Bank: HDFC Bank</Text>
              <Text style={styles.invoiceLabel}>A/C No: XXXXXXXXXX1234</Text>
              <Text style={styles.invoiceLabel}>IFSC: HDFC0000123</Text>
              <Text style={styles.invoiceLabel}>Branch: Mumbai Main</Text>
            </View>
          </View>

          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sub Total</Text>
              <View style={styles.currencyRow}>
                <RupeeSymbol size={9} color={colors.text} />
                <Text style={styles.totalValue}>{formatCurrency(subTotal)}</Text>
              </View>
            </View>

            {discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.success }]}>Discount</Text>
                <View style={styles.currencyRow}>
                  <Text style={[styles.totalValue, { color: colors.success, marginRight: 2 }]}>-</Text>
                  <RupeeSymbol size={9} color={colors.success} />
                  <Text style={[styles.totalValue, { color: colors.success }]}>{formatCurrency(discountAmount)}</Text>
                </View>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST (18%)</Text>
              <View style={styles.currencyRow}>
                <RupeeSymbol size={9} color={colors.text} />
                <Text style={styles.totalValue}>{formatCurrency(gstAmount)}</Text>
              </View>
            </View>

            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Grand Total</Text>
              <View style={styles.currencyRow}>
                <RupeeSymbol size={11} color={colors.primary} />
                <Text style={styles.finalTotalValue}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={[styles.sectionTitle, { fontSize: 8 }]}>Terms & Conditions:</Text>
            <Text style={styles.termsText}>1. This is a computer generated invoice.</Text>
            <Text style={styles.termsText}>2. Services once purchased cannot be cancelled or refunded.</Text>
            <Text style={styles.termsText}>3. All disputes subject to Mumbai Jurisdiction.</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={[styles.signText, { borderTopWidth: 0, marginBottom: 20 }]}>For Time Craft Publications</Text>
            <Text style={styles.signText}>Authorized Signatory</Text>
          </View>
        </View>

        <Text style={styles.thankYouMessage}>Thank you for subscribing to Rupie Times!</Text>

      </Page>
    </Document>
  );
};

export default InvoicePDF;