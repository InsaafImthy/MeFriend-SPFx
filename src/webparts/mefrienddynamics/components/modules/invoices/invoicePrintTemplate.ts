import mefriendLogo from '../../../assets/unnamed.png';
import type { IInvoiceDetail, IInvoiceLineItem } from '../../../models/invoices';
import { formatAmount, formatDate } from '../../../utils/formatUtils';

const companyName = 'MEFRIEND BUSINESS SOLUTIONS LLP';
const companyAddress = [
  '11/1414 | Madhyamam Head office',
  'Wayanad Road | Silver Hills',
  'Kozhikode | Kerala, India - 673012',
  'GSTIN : 32ABNFM8708M1ZQ   PAN : ABNFM8708M',
  'State Name :Kerala, State Code:32'
];

const bankDetails = [
  'A/C No:13000200020456',
  'A/C Name :Mefriend Business Solutions LLP',
  'Bank Name :Federal Bank',
  'Branch:Nadakkavu',
  'IFSC : FDRL0001300'
];

const escapeHtml = (value?: string | number): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatPrintDate = (value?: string): string => value ? formatDate(value, '') : '';
const formatMoney = (value?: number): string => typeof value === 'number' && Number.isFinite(value) ? formatAmount(value, '') : '';
const formatQty = (value: number): string => Number.isInteger(value) ? String(value) : formatAmount(value, String(value));

const numberWordsUnderThousand = (value: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];

  if (hundred) {
    parts.push(`${ones[hundred]} Hundred`);
  }

  if (rest) {
    parts.push(rest < 20 ? ones[rest] : `${tens[Math.floor(rest / 10)]}${rest % 10 ? ` ${ones[rest % 10]}` : ''}`);
  }

  return parts.join(' ');
};

const amountToWords = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return '';
  }

  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const groups = [
    { label: 'Crore', divisor: 10000000 },
    { label: 'Lakh', divisor: 100000 },
    { label: 'Thousand', divisor: 1000 },
    { label: '', divisor: 1 }
  ];
  let remaining = rupees;
  const words: string[] = amount < 0 ? ['Minus'] : [];

  groups.forEach(group => {
    const groupValue = Math.floor(remaining / group.divisor);

    if (groupValue) {
      words.push(`${numberWordsUnderThousand(groupValue)}${group.label ? ` ${group.label}` : ''}`);
      remaining %= group.divisor;
    }
  });

  const rupeeWords = words.length ? words.join(' ') : 'Zero';
  const paiseWords = paise ? ` and ${numberWordsUnderThousand(paise)} Paise` : '';

  return `${rupeeWords} Rupees${paiseWords} Only`;
};

const resolveAmountInWords = (invoice: IInvoiceDetail): string => invoice.amountInWords || amountToWords(invoice.totalAmount);

const renderAddressLines = (value?: string): string => {
  return escapeHtml(value).split(/\r?\n/).filter(Boolean).join('<br />');
};

const getQrMarkup = (invoice: IInvoiceDetail): string => {
  const qrCodeData = invoice.qrCodeData || '';

  if (!qrCodeData) {
    return '<div class="qrBox"></div>';
  }

  if (/^(data:image\/|https?:\/\/)/i.test(qrCodeData)) {
    return `<img class="qrImage" src="${escapeHtml(qrCodeData)}" alt="Invoice QR code" />`;
  }

  return `<div class="qrBox qrText" title="${escapeHtml(qrCodeData)}">${escapeHtml(qrCodeData)}</div>`;
};

const renderLine = (line: IInvoiceLineItem, index: number): string => `
  <tr class="itemRow">
    <td class="center">${index + 1}</td>
    <td>${escapeHtml(line.description)}</td>
    <td class="center">${escapeHtml(line.hsnCode)}</td>
    <td class="center">${escapeHtml(line.gstRate)}</td>
    <td class="center">${escapeHtml(formatQty(line.quantity))}</td>
    <td class="right numberCell">${escapeHtml(formatMoney(line.unitPrice))}</td>
    <td class="right numberCell">${escapeHtml(formatMoney(line.lineAmount))}</td>
  </tr>`;

const renderBlankLine = (className: string = 'blankLine'): string => `
  <tr class="${className}">
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>`;

const normalizePdfText = (value?: string | number): string => String(value ?? '')
  .replace(/\r?\n/g, ' ')
  .replace(/[^\x20-\x7E]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapePdfText = (value?: string | number): string => normalizePdfText(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const sanitizeFileName = (value: string): string => normalizePdfText(value)
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'invoice';

const wrapPdfText = (value: string | undefined, maxLength: number, maxLines: number = 2): string[] => {
  const words = normalizePdfText(value).split(' ').filter(Boolean);
  const lines: string[] = [];

  words.forEach(word => {
    const currentLine = lines[lines.length - 1];

    if (!currentLine) {
      lines.push(word);
      return;
    }

    if (`${currentLine} ${word}`.length <= maxLength) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
      return;
    }

    if (lines.length < maxLines) {
      lines.push(word);
    }
  });

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  return lines.length ? lines : [''];
};

const padPdfOffset = (value: number): string => {
  const offset = String(value);

  return `${'0000000000'.slice(offset.length)}${offset}`;
};

const buildInvoicePdfContent = (invoice: IInvoiceDetail): string => {
  const pageHeight = 841.89;
  const left = 56;
  const right = 539;
  const width = right - left;
  const commands: string[] = [];
  const text = (value: string | number | undefined, x: number, y: number, size: number = 7, bold: boolean = false): void => {
    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(value)}) Tj ET`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number): void => {
    commands.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  };
  const rect = (x: number, y: number, w: number, h: number, fill: boolean = false): void => {
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill ? 'f' : 'S'}`);
  };
  const fill = (gray: number): void => {
    commands.push(`${gray.toFixed(2)} g`);
  };
  const stroke = (gray: number): void => {
    commands.push(`${gray.toFixed(2)} G`);
  };

  stroke(0);
  text(companyName, left, pageHeight - 80, 12, true);
  companyAddress.forEach((addressLine, index) => text(addressLine, left, pageHeight - 96 - (index * 9), 7));
  text('mefriend', right - 76, pageHeight - 92, 13, true);
  text('Your Media & Events Partner', right - 84, pageHeight - 104, 5);
  text('TAX INVOICE', 255, pageHeight - 145, 13, true);
  line(254, pageHeight - 149, 340, pageHeight - 149);

  const metaTop = pageHeight - 168;
  const metaHeight = 150;
  const halfWidth = width / 2;
  rect(left, metaTop - metaHeight, width, metaHeight);
  line(left + halfWidth, metaTop, left + halfWidth, metaTop - metaHeight);
  line(left, metaTop - 22, right, metaTop - 22);
  line(left, metaTop - 42, right, metaTop - 42);
  line(left, metaTop - 114, right, metaTop - 114);
  fill(0.9);
  rect(left, metaTop - 42, width, 20, true);
  rect(left, metaTop - 150, width, 36, true);
  fill(0);
  text(`Invoice No : ${invoice.invoiceNumber}`, left + 8, metaTop - 14, 7, true);
  text(`Invoice Date : ${formatPrintDate(invoice.invoiceDate)}`, left + halfWidth + 8, metaTop - 14, 7, true);
  text('Bill To', left + 8, metaTop - 34, 7, true);
  text('Advertiser', left + halfWidth + 8, metaTop - 34, 7, true);

  const renderParty = (x: number, name?: string, address?: string, gst?: string, state?: string): void => {
    text('Name', x, metaTop - 58, 6);
    text(':', x + 52, metaTop - 58, 6);
    wrapPdfText(name, 42, 2).forEach((value, index) => text(value, x + 64, metaTop - 58 - (index * 8), 6));
    text('Address', x, metaTop - 82, 6);
    text(':', x + 52, metaTop - 82, 6);
    wrapPdfText(address, 42, 2).forEach((value, index) => text(value, x + 64, metaTop - 82 - (index * 8), 6));
    text('GSTIN', x, metaTop - 106, 6);
    text(':', x + 52, metaTop - 106, 6);
    text(gst, x + 64, metaTop - 106, 6);
    text('GST State', x, metaTop - 122, 6);
    text(':', x + 52, metaTop - 122, 6);
    text(state, x + 64, metaTop - 122, 6);
  };

  renderParty(left + 8, invoice.customerName, invoice.customerAddress, invoice.customerGSTNo, invoice.customerGSTState);
  renderParty(left + halfWidth + 8, invoice.clientName, invoice.clientAddress, invoice.clientGSTNo, invoice.clientGSTState);
  text('Sales Person', left + 8, metaTop - 136, 7, true);
  text(':', left + 86, metaTop - 136, 7);
  text(invoice.salesPerson, left + 100, metaTop - 136, 7, true);
  text('Booking Order No', left + halfWidth + 8, metaTop - 132, 7);
  text(':', left + halfWidth + 90, metaTop - 132, 7);
  text(invoice.salesOrderNumber, left + halfWidth + 104, metaTop - 132, 7);
  text('Booking Order Date', left + halfWidth + 8, metaTop - 144, 7);
  text(':', left + halfWidth + 90, metaTop - 144, 7);
  text(formatPrintDate(invoice.salesOrderDate), left + halfWidth + 104, metaTop - 144, 7);

  const tableTop = metaTop - metaHeight - 22;
  const columns = [0, 38, 200, 250, 300, 340, 402, width];
  const headers = ['Sl. No.', 'Description', 'HSN/SAC', 'GST Rate', 'Quantity', 'Rate', 'Amount(INR)'];
  rect(left, tableTop - 220, width, 220);
  columns.slice(1, -1).forEach(column => line(left + column, tableTop, left + column, tableTop - 220));
  line(left, tableTop - 22, right, tableTop - 22);
  headers.forEach((header, index) => text(header, left + columns[index] + 5, tableTop - 14, 6, true));

  const displayLines = invoice.lines.length ? invoice.lines.slice(0, 7) : [];
  displayLines.forEach((item, index) => {
    const rowY = tableTop - 44 - (index * 24);
    line(left, rowY + 12, right, rowY + 12);
    text(index + 1, left + 18, rowY, 6);
    wrapPdfText(item.description, 36, 2).forEach((value, lineIndex) => text(value, left + 44, rowY - (lineIndex * 8), 6));
    text(item.hsnCode, left + 205, rowY, 6);
    text(item.gstRate, left + 255, rowY, 6);
    text(formatQty(item.quantity), left + 316, rowY, 6);
    text(formatMoney(item.unitPrice), left + 350, rowY, 6);
    text(formatMoney(item.lineAmount), left + 430, rowY, 6);
  });

  const grossAmount = invoice.netAmount ?? invoice.lines.reduce((total, item) => total + item.lineAmount, 0);
  const invoiceDiscountAmount = invoice.invoiceDiscountAmountExclVat ?? invoice.tradeDiscount ?? 0;
  const subTotal = grossAmount - invoiceDiscountAmount;
  const summaryRows = [
    ['Gross Amount', formatMoney(grossAmount)],
    ['Invoice Discount', formatMoney(invoiceDiscountAmount)],
    ['Sub Total', formatMoney(subTotal)],
    ['SGST', formatMoney(invoice.sgst)],
    ['CGST', formatMoney(invoice.cgst)],
    ['IGST', formatMoney(invoice.igst)],
    ['Round Off', formatMoney(invoice.roundOffAmount)]
  ];
  const summaryTop = tableTop - 182;
  summaryRows.forEach((row, index) => {
    const rowY = summaryTop - (index * 14);
    line(left, rowY + 7, right, rowY + 7);
    text(row[0], left + 350, rowY, 6);
    text(row[1], left + 430, rowY, 6);
  });
  fill(0);
  rect(left, tableTop - 220, width, 16, true);
  fill(1);
  text('Grand Total', left + 350, tableTop - 214, 6, true);
  text(formatMoney(invoice.totalAmount), left + 430, tableTop - 214, 6, true);
  fill(0);

  const footerTop = tableTop - 238;
  fill(0.9);
  rect(left, footerTop - 16, 410, 16, true);
  fill(0);
  text(`Amount in Words: ${resolveAmountInWords(invoice)}`, left + 5, footerTop - 11, 6, true);
  text('Bank Account Details', left, footerTop - 56, 8, true);
  bankDetails.forEach((detail, index) => text(detail, left, footerTop - 68 - (index * 9), 7));
  text('IRN', left + 250, footerTop - 72, 7, true);
  text(':', left + 325, footerTop - 72, 7);
  text(invoice.irn, left + 340, footerTop - 72, 7);
  text('Ack No', left + 250, footerTop - 84, 7, true);
  text(':', left + 325, footerTop - 84, 7);
  text(invoice.acknowledgementNumber, left + 340, footerTop - 84, 7);
  text('Ack Date', left + 250, footerTop - 96, 7, true);
  text(':', left + 325, footerTop - 96, 7);
  text(formatPrintDate(invoice.acknowledgementDate), left + 340, footerTop - 96, 7);
  text('Payment Terms: All payments are to be made in favor of Mefriend Business Solutions LLP through Crossed', left, footerTop - 126, 7);
  text('Cheques/ Demand Drafts / Direct Bank Transfer.', left, footerTop - 136, 7);
  text('For Mefriend Business Solutions LLP', right - 168, footerTop - 162, 7, true);
  text('Authorised Signatory', right - 100, footerTop - 190, 7, true);

  return commands.join('\n');
};

const buildInvoicePdfBlob = (invoice: IInvoiceDetail): Blob => {
  const content = buildInvoicePdfContent(invoice);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${padPdfOffset(offset)} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

export const downloadInvoicePdf = (invoice: IInvoiceDetail): void => {
  const url = window.URL.createObjectURL(buildInvoicePdfBlob(invoice));
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeFileName(invoice.invoiceNumber)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

const buildStyles = (): string => `
  @page {
    margin: 0;
    size: A4 portrait;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html,
  body {
    background: #ffffff;
    margin: 0;
    min-height: 297mm;
  }

  body {
    color: #1b1b1b;
    font-family: "Anek Malayalam", Arial, Helvetica, sans-serif;
    font-size: 7.4pt;
    line-height: 1.16;
    min-width: 210mm;
  }

  .previewBar {
    align-items: center;
    background: #20242a;
    color: #ffffff;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    min-height: 46px;
    padding: 8px 18px;
  }

  .previewBar button {
    background: #ffffff;
    border: 1px solid #d7dce5;
    border-radius: 4px;
    color: #151515;
    cursor: pointer;
    font: 700 12px Arial, sans-serif;
    padding: 8px 14px;
  }

  .page {
    background: #ffffff;
    margin: 0 auto;
    min-height: 297mm;
    padding: 15mm 16.5mm 8mm;
    position: relative;
    width: 210mm;
  }

  .header {
    display: grid;
    grid-template-columns: 1fr 30mm;
    min-height: 31mm;
  }

  .companyName {
    font-size: 13.6pt;
    font-weight: 800;
    line-height: 1.05;
    margin-top: 1mm;
  }

  .companyAddress {
    font-size: 8.8pt;
    font-weight: 500;
    line-height: 1.08;
    margin-top: 3mm;
  }

  .brand {
    align-items: center;
    display: flex;
    flex-direction: column;
    margin-top: 4mm;
  }

  .brand img {
    height: 15mm;
    width: 15mm;
  }

  .brandName {
    color: #554293;
    font-size: 11.5pt;
    font-weight: 800;
    line-height: 1;
    margin-top: 1.5mm;
  }

  .brandCaption {
    font-size: 3.8pt;
    font-weight: 700;
    line-height: 1;
  }

  .title {
    border-bottom: 1px solid #222222;
    display: table;
    font-size: 13.5pt;
    font-weight: 800;
    line-height: 1;
    margin: 0 auto 5.5mm;
    padding-bottom: 0.8mm;
    text-align: center;
  }

  .continuedHeader {
    display: none;
  }

  .continuedHeaderRow {
    display: none;
  }

  .continuedHeaderRow th {
    background: #ffffff;
    font-size: 7.3pt;
    font-weight: 800;
    height: 5mm;
    padding: 1mm 2.2mm;
    text-align: right;
  }

  table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
  }

  .meta,
  .items {
    border: 0.6pt solid #747474;
  }

  .meta td,
  .items th,
  .items td {
    border: 0.6pt solid #747474;
  }

  .meta td {
    padding: 2.2mm 3mm;
    vertical-align: top;
  }

  .invoiceInfo td {
    font-size: 7.6pt;
    font-weight: 800;
    height: 8.5mm;
  }

  .sectionHead td {
    background: #e6e6e6;
    font-weight: 800;
    height: 7.2mm;
  }

  .party td {
    height: 32mm;
  }

  .partyLine {
    display: grid;
    grid-template-columns: 27mm 5mm minmax(0, 1fr);
    margin-bottom: 3.2mm;
  }

  .partyLine span,
  .salesPerson span,
  .bookingLine span,
  .irnLine span {
    min-width: 0;
  }

  .partyLine.address {
    min-height: 9.5mm;
  }

  .reference td {
    background: #e6e6e6;
    height: 11.2mm;
    padding-bottom: 1.8mm;
    padding-top: 1.8mm;
  }

  .salesPerson {
    display: grid;
    font-weight: 800;
    grid-template-columns: 29mm 5mm 1fr;
  }

  .bookingLine {
    display: grid;
    grid-template-columns: 33mm 5mm 1fr;
    margin-bottom: 1.7mm;
  }

  .items {
    margin-top: 4mm;
  }

  .items th {
    font-size: 7pt;
    font-weight: 800;
    height: 8mm;
    line-height: 1.1;
    padding: 1.7mm 1.2mm;
    text-align: left;
  }

  .items td {
    font-size: 7pt;
    height: 6.5mm;
    line-height: 1.15;
    padding: 1.55mm 1.2mm;
    vertical-align: top;
  }

  .items .lineBody td {
    height: auto;
    min-height: 6.5mm;
  }

  .items .blankLine td {
    height: 17mm;
  }

  .items .compactBlankLine td {
    height: 9mm;
  }

  .items .summaryLabel {
    font-size: 7pt;
    padding-right: 4.5mm;
    text-align: right;
  }

  .items .summaryValue {
    font-size: 7pt;
    text-align: right;
  }

  .items .grandTotal td {
    background: #151515;
    border-color: #151515 #747474;
    color: #ffffff;
    font-weight: 800;
    height: 7mm;
  }

  .itemRow {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .summaryRows {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .center {
    text-align: center;
  }

  .right {
    text-align: right;
  }

  .numberCell,
  .summaryValue {
    font-variant-numeric: tabular-nums;
    overflow-wrap: normal;
    white-space: nowrap;
  }

  .footerArea {
    break-inside: avoid;
    margin-top: 3mm;
    page-break-inside: avoid;
  }

  .amountQr {
    align-items: start;
    display: grid;
    gap: 4mm;
    grid-template-columns: 1fr 22mm;
  }

  .amountWords {
    background: #e6e6e6;
    font-size: 7.8pt;
    font-weight: 800;
    min-height: 6.6mm;
    padding: 1.7mm 2mm;
  }

  .amountText {
    font-weight: 600;
  }

  .qrBox,
  .qrImage {
    border: 0.6pt solid #d9d9d9;
    height: 22mm;
    width: 22mm;
  }

  .qrImage {
    display: block;
    object-fit: contain;
  }

  .qrText {
    align-items: center;
    color: #111111;
    display: flex;
    font-size: 4pt;
    line-height: 1;
    overflow: hidden;
    padding: 1mm;
    text-align: center;
    word-break: break-all;
  }

  .bankIrn {
    display: grid;
    grid-template-columns: 76mm 1fr;
    margin-top: 2.5mm;
  }

  .bankTitle {
    border-bottom: 1px solid #111111;
    display: inline-block;
    font-size: 8.7pt;
    font-weight: 800;
    margin-bottom: 0.8mm;
  }

  .bankLine {
    font-size: 8.3pt;
    line-height: 1.12;
  }

  .irnBlock {
    align-self: end;
    font-size: 8pt;
    font-weight: 800;
    margin-bottom: 1.4mm;
  }

  .irnLine {
    display: grid;
    grid-template-columns: 27mm 5mm 1fr;
    margin-top: 1.6mm;
  }

  .terms {
    font-size: 8pt;
    line-height: 1.13;
    margin: 4mm 0 0;
  }

  .terms strong {
    font-weight: 800;
  }

  .signatory {
    font-size: 8.2pt;
    font-weight: 800;
    margin-top: 5.5mm;
    text-align: right;
  }

  .signatoryName {
    margin-bottom: 8mm;
  }

  @media screen {
    html,
    body {
      min-width: 0;
      width: auto;
    }

    body {
      background: #f0f2f5;
      overflow-x: auto;
      padding: 0 16px;
    }

    .page {
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.22);
      margin: 16px auto 28px;
    }
  }

  @media print {
    html,
    body {
      height: auto;
      min-height: 0;
      width: 210mm;
    }

    .previewBar {
      display: none;
    }

    .page {
      box-shadow: none;
      margin: 0;
      min-height: 0;
      padding: 15mm 16.5mm 8mm;
      width: 210mm;
    }

    thead {
      display: table-header-group;
    }

    tfoot {
      display: table-row-group;
    }

    tr,
    .summaryRows,
    .footerArea {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .multiPage .continuedHeaderRow {
      display: table-row;
    }
  }
`;

export const buildInvoicePrintHtml = (invoice: IInvoiceDetail): string => {
  const lineRows = invoice.lines.length
    ? invoice.lines.map(renderLine).join('')
    : renderBlankLine();
  const blankRows = invoice.lines.length < 2 ? renderBlankLine() : '';
  const grossAmount = invoice.netAmount ?? invoice.lines.reduce((total, line) => total + line.lineAmount, 0);
  const invoiceDiscountAmount = invoice.invoiceDiscountAmountExclVat ?? invoice.tradeDiscount ?? 0;
  const subTotal = grossAmount - invoiceDiscountAmount;
  const pageModeClass = invoice.lines.length > 8 ? 'multiPage' : 'singlePage';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tax Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>${buildStyles()}</style>
  <script>
    (function () {
      var printStarted = false;

      function openSystemPrintDialog() {
        if (printStarted) {
          return;
        }

        printStarted = true;
        window.focus();
        window.print();
      }

      window.addEventListener('load', function () {
        window.setTimeout(openSystemPrintDialog, 300);
      });

      window.openSystemPrintDialog = openSystemPrintDialog;
    }());
  </script>
</head>
<body class="${pageModeClass}">
  <div class="previewBar">
    <button type="button" onclick="window.openSystemPrintDialog()">Print Invoice</button>
  </div>
  <main class="page">
    <header class="header">
      <div>
        <div class="companyName">${companyName}</div>
        <div class="companyAddress">${companyAddress.map(escapeHtml).join('<br />')}</div>
      </div>
      <div class="brand">
        <img src="${mefriendLogo}" alt="mefriend" />
        <div class="brandName">mefriend</div>
        <div class="brandCaption">Your Media &amp; Events Partner</div>
      </div>
    </header>
    <h1 class="title">TAX INVOICE</h1>
    <table class="meta" aria-label="Invoice header">
      <colgroup>
        <col style="width: 50%" />
        <col style="width: 50%" />
      </colgroup>
      <tbody>
        <tr class="invoiceInfo">
          <td>Invoice No : ${escapeHtml(invoice.invoiceNumber)}</td>
          <td>Invoice Date : ${escapeHtml(formatPrintDate(invoice.invoiceDate))}</td>
        </tr>
        <tr class="sectionHead">
          <td>Bill To</td>
          <td>Advertiser</td>
        </tr>
        <tr class="party">
          <td>
            <div class="partyLine"><span>Name</span><span>:</span><span>${escapeHtml(invoice.customerName)}</span></div>
            <div class="partyLine address"><span>Address</span><span>:</span><span>${renderAddressLines(invoice.customerAddress)}</span></div>
            <div class="partyLine"><span>GSTIN</span><span>:</span><span>${escapeHtml(invoice.customerGSTNo)}</span></div>
            <div class="partyLine"><span>GST State</span><span>:</span><span>${escapeHtml(invoice.customerGSTState)}</span></div>
          </td>
          <td>
            <div class="partyLine"><span>Name</span><span>:</span><span>${escapeHtml(invoice.clientName)}</span></div>
            <div class="partyLine address"><span>Address</span><span>:</span><span>${renderAddressLines(invoice.clientAddress)}</span></div>
            <div class="partyLine"><span>GSTIN</span><span>:</span><span>${escapeHtml(invoice.clientGSTNo)}</span></div>
            <div class="partyLine"><span>GST State</span><span>:</span><span>${escapeHtml(invoice.clientGSTState)}</span></div>
          </td>
        </tr>
        <tr class="reference">
          <td><div class="salesPerson"><span>Sales Person</span><span>:</span><span>${escapeHtml(invoice.salesPerson)}</span></div></td>
          <td>
            <div class="bookingLine"><span>Booking Order No</span><span>:</span><span>${escapeHtml(invoice.salesOrderNumber)}</span></div>
            <div class="bookingLine"><span>Booking Order Date</span><span>:</span><span>${escapeHtml(formatPrintDate(invoice.salesOrderDate))}</span></div>
          </td>
        </tr>
      </tbody>
    </table>
    <table class="items" aria-label="Invoice line items">
      <colgroup>
        <col style="width: 8%" />
        <col style="width: 34%" />
        <col style="width: 10%" />
        <col style="width: 10%" />
        <col style="width: 8%" />
        <col style="width: 13%" />
        <col style="width: 17%" />
      </colgroup>
      <thead>
        <tr class="continuedHeaderRow">
          <th colspan="7">TAX INVOICE &nbsp; ${escapeHtml(invoice.invoiceNumber)} &nbsp; ${escapeHtml(formatPrintDate(invoice.invoiceDate))}</th>
        </tr>
        <tr>
          <th class="center">Sl. No.</th>
          <th>Description</th>
          <th class="center">HSN/SAC</th>
          <th class="center">GST Rate</th>
          <th class="center">Quantity</th>
          <th class="center">Rate</th>
          <th class="right">Amount(INR)</th>
        </tr>
      </thead>
      <tbody class="lineBody">
        ${lineRows}
        ${blankRows}
      </tbody>
      <tbody class="summaryRows">
        <tr><td colspan="6" class="summaryLabel">Gross Amount</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(grossAmount))}</td></tr>
        <tr><td colspan="6" class="summaryLabel">Invoice Discount${invoice.invoiceDiscountPercent !== undefined ? ` (${escapeHtml(String(invoice.invoiceDiscountPercent))}%)` : ''}</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(invoiceDiscountAmount))}</td></tr>
        <tr><td colspan="6" class="summaryLabel">Sub Total</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(subTotal))}</td></tr>
        <tr><td colspan="6" class="summaryLabel">SGST</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(invoice.sgst))}</td></tr>
        <tr><td colspan="6" class="summaryLabel">CGST</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(invoice.cgst))}</td></tr>
        <tr><td colspan="6" class="summaryLabel">IGST</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(invoice.igst))}</td></tr>
        <tr><td colspan="6" class="summaryLabel">Round&nbsp; Off</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(invoice.roundOffAmount))}</td></tr>
        <tr class="grandTotal"><td colspan="6" class="summaryLabel">Grand Total</td><td class="summaryValue numberCell">${escapeHtml(formatMoney(invoice.totalAmount))}</td></tr>
      </tbody>
    </table>
    <section class="footerArea" aria-label="Invoice footer">
      <div class="amountQr">
        <div class="amountWords">Amount in Words: <span class="amountText">${escapeHtml(resolveAmountInWords(invoice))}</span></div>
        ${getQrMarkup(invoice)}
      </div>
      <div class="bankIrn">
        <div>
          <div class="bankTitle">Bank Account Details</div>
          ${bankDetails.map(detail => `<div class="bankLine">${escapeHtml(detail)}</div>`).join('')}
        </div>
        <div class="irnBlock">
          <div class="irnLine"><span>IRN</span><span>:</span><span>${escapeHtml(invoice.irn)}</span></div>
          <div class="irnLine"><span>Ack No</span><span>:</span><span>${escapeHtml(invoice.acknowledgementNumber)}</span></div>
          <div class="irnLine"><span>Ack Date</span><span>:</span><span>${escapeHtml(formatPrintDate(invoice.acknowledgementDate))}</span></div>
        </div>
      </div>
      <p class="terms"><strong>Payment Terms:</strong>All payments are to be made in favor of <strong>Mefriend Business Solutions LLP</strong> through Crossed<br />Cheques/ Demand Drafts / Direct Bank Transfer.</p>
      <div class="signatory">
        <div class="signatoryName">For Mefriend Business Solutions LLP</div>
        <div>Authorised Signatory</div>
      </div>
    </section>
  </main>
</body>
</html>`;
};

export const openInvoicePrintPreviewWindow = (): Window => {
  const preview = window.open('', '_blank', 'width=900,height=1100');

  if (!preview) {
    throw new Error('Print preview was blocked by the browser. Allow pop-ups and try again.');
  }

  preview.opener = null;
  preview.document.open();
  preview.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Preparing invoice</title>
  <style>
    body {
      align-items: center;
      color: #1b1b1b;
      display: flex;
      font: 600 14px Arial, sans-serif;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
    }
  </style>
</head>
<body>Preparing invoice print preview...</body>
</html>`);
  preview.document.close();
  preview.focus();

  return preview;
};

export const writeInvoicePrintPreview = (preview: Window, invoice: IInvoiceDetail): void => {
  preview.document.open();
  preview.document.write(buildInvoicePrintHtml(invoice));
  preview.document.close();
  preview.focus();
};

export const writeInvoicePrintError = (preview: Window, message: string): void => {
  preview.document.open();
  preview.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice print unavailable</title>
  <style>
    body {
      align-items: center;
      color: #1b1b1b;
      display: flex;
      font: 600 14px Arial, sans-serif;
      justify-content: center;
      margin: 0;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
  </style>
</head>
<body>${escapeHtml(message)}</body>
</html>`);
  preview.document.close();
  preview.focus();
};
