import jsPDF from 'jspdf';

export interface InvoiceData {
  id: string;
  date: string;
  amount: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  plan?: string;
  billingPeriod?: string;
}

export const generateInvoicePDF = (invoice: InvoiceData) => {
  const doc = new jsPDF();

  // Company/Brand Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Qualifyr.AI', 20, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CV Parsing & Scoring API', 20, 28);

  // Invoice Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 150, 20);

  // Invoice Details (Right Side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoice.id}`, 150, 28);
  doc.text(`Date: ${invoice.date}`, 150, 35);
  doc.text(`Status: ${invoice.status}`, 150, 42);

  // Divider Line
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // Bill To Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 60);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customerName || 'Customer Name', 20, 68);
  doc.text(invoice.customerEmail || 'customer@example.com', 20, 75);

  // Invoice Items Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(20, 90, 170, 8, 'F');

  doc.text('Description', 25, 95);
  doc.text('Period', 110, 95);
  doc.text('Amount', 165, 95);

  // Invoice Items
  doc.setFont('helvetica', 'normal');
  const planName = invoice.plan || 'Professional Plan';
  const period = invoice.billingPeriod || 'Monthly Subscription';

  doc.text(planName, 25, 105);
  doc.text(period, 110, 105);
  doc.text(invoice.amount, 165, 105);

  // Subtotal and Total
  doc.setLineWidth(0.2);
  doc.line(20, 115, 190, 115);

  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 140, 125);
  doc.text(invoice.amount, 165, 125);

  doc.text('Tax:', 140, 132);
  doc.text('$0.00', 165, 132);

  doc.setFontSize(12);
  doc.text('Total:', 140, 142);
  doc.text(invoice.amount, 165, 142);

  // Divider Line
  doc.setLineWidth(0.5);
  doc.line(20, 150, 190, 150);

  // Payment Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 20, 165);

  doc.setFont('helvetica', 'normal');
  doc.text('Card ending in ••••', 20, 172);
  doc.text(`Paid on ${invoice.date}`, 20, 179);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your business!', 20, 260);
  doc.text('Qualifyr.AI - Automated CV Parsing & Scoring', 20, 267);
  doc.text('For questions, contact: support@qualifyr.ai', 20, 274);

  // Generate filename
  const filename = `invoice-${invoice.id}.pdf`;

  // Download the PDF
  doc.save(filename);
};
