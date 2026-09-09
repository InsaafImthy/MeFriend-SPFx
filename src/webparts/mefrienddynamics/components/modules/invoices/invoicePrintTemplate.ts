import mefriendLogo from '../../../assets/unnamed.png';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';
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

interface IInvoicePrintWindow extends Window {
  openSystemPrintDialog?: () => void;
}

interface IInvoiceHtmlOptions {
  autoPrint?: boolean;
  showPreviewBar?: boolean;
}

let embeddedLogoSrcPromise: Promise<string> | undefined;

const escapeHtml = (value?: string | number): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatPrintDate = (value?: string): string => value ? formatDate(value, '') : '';
const formatMoney = (value?: number): string => typeof value === 'number' && Number.isFinite(value) ? formatAmount(value, '') : '';
const formatQty = (value: number): string => Number.isInteger(value) ? String(value) : formatAmount(value, String(value));

const resolveAbsoluteAssetUrl = (assetUrl: string): string => {
  try {
    return new URL(assetUrl, window.location.href).href;
  } catch {
    return assetUrl;
  }
};

const readBlobAsDataUri = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(reader.error || new Error('Unable to read invoice logo asset.'));
  reader.readAsDataURL(blob);
});

const resolveEmbeddedLogoSrc = async (): Promise<string> => {
  if (!embeddedLogoSrcPromise) {
    embeddedLogoSrcPromise = fetch(resolveAbsoluteAssetUrl(mefriendLogo))
      .then(response => {
        if (!response.ok) {
          throw new Error(`Unable to load invoice logo asset: ${response.status}`);
        }

        return response.blob();
      })
      .then(readBlobAsDataUri)
      .catch(() => mefriendLogo);
  }

  return embeddedLogoSrcPromise;
};

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

const resolvePageModeClass = (invoice: IInvoiceDetail): string => {
  const lineCount = invoice.lines.length;

  if (lineCount > 8) {
    return 'multiPage';
  }

  if (lineCount <= 2) {
    return 'singlePage compactPage';
  }

  return 'singlePage';
};

const waitForInvoiceAssetsScript = (): string => `
    function waitForInvoiceAssets() {
      var images = Array.prototype.slice.call(document.images || []);

      if (!images.length) {
        return Promise.resolve();
      }

      return Promise.all(images.map(function (image) {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise(function (resolve) {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));
    }
`;

const buildStyles = (): string => `
  @page {
    margin: 15mm 16.5mm 8mm;
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
    min-height: 28mm;
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
    margin-top: 2.5mm;
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
    margin: 0 auto 4.5mm;
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
    padding: 1.8mm 3mm;
    vertical-align: top;
  }

  .invoiceInfo td {
    font-size: 7.6pt;
    font-weight: 800;
    height: 7.6mm;
  }

  .sectionHead td {
    background: #e6e6e6;
    font-weight: 800;
    height: 6.6mm;
  }

  .party td {
    height: 28mm;
  }

  .partyLine {
    display: grid;
    grid-template-columns: 27mm 5mm minmax(0, 1fr);
    margin-bottom: 2.4mm;
  }

  .partyLine span,
  .salesPerson span,
  .bookingLine span,
  .irnLine span {
    min-width: 0;
  }

  .partyLine.address {
    min-height: 8mm;
  }

  .reference td {
    background: #e6e6e6;
    height: 9.5mm;
    padding-bottom: 1.4mm;
    padding-top: 1.4mm;
  }

  .salesPerson {
    display: grid;
    font-weight: 800;
    grid-template-columns: 29mm 5mm 1fr;
  }

  .bookingLine {
    display: grid;
    grid-template-columns: 33mm 5mm 1fr;
    margin-bottom: 1.1mm;
  }

  .items {
    margin-top: 3.3mm;
  }

  .items th {
    font-size: 7pt;
    font-weight: 800;
    height: 7.2mm;
    line-height: 1.1;
    padding: 1.35mm 1.2mm;
    text-align: left;
  }

  .items td {
    font-size: 7pt;
    height: 5.8mm;
    line-height: 1.15;
    padding: 1.25mm 1.2mm;
    vertical-align: top;
  }

  .items .lineBody td {
    height: auto;
    min-height: 5.8mm;
  }

  .items .blankLine td {
    height: clamp(8mm, 5.8mm + 5vh, 14mm);
  }

  .items .compactBlankLine td {
    height: 7mm;
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
    height: 6.4mm;
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
    margin-top: 2.6mm;
    page-break-inside: avoid;
  }

  .amountQr {
    align-items: start;
    display: grid;
    gap: 3.2mm;
    grid-template-columns: 1fr 22mm;
  }

  .amountWords {
    background: #e6e6e6;
    font-size: 7.8pt;
    font-weight: 800;
    min-height: 5.8mm;
    padding: 1.35mm 2mm;
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
    margin-top: 2mm;
  }

  .bankTitle {
    border-bottom: 1px solid #111111;
    display: inline-block;
    font-size: 8.7pt;
    font-weight: 800;
    margin-bottom: 0.5mm;
  }

  .bankLine {
    font-size: 8.3pt;
    line-height: 1.12;
  }

  .irnBlock {
    align-self: end;
    font-size: 8pt;
    font-weight: 800;
    margin-bottom: 1mm;
  }

  .irnLine {
    display: grid;
    grid-template-columns: 27mm 5mm 1fr;
    margin-top: 1.2mm;
  }

  .terms {
    font-size: 8pt;
    line-height: 1.13;
    margin: 3mm 0 0;
  }

  .terms strong {
    font-weight: 800;
  }

  .signatory {
    font-size: 8.2pt;
    font-weight: 800;
    margin-top: 4.2mm;
    text-align: right;
  }

  .signatoryName {
    margin-bottom: 6.5mm;
  }

  .compactPage .header {
    min-height: 26mm;
  }

  .compactPage .items .blankLine td {
    height: 8mm;
  }

  .compactPage .party td {
    height: 26mm;
  }

  .compactPage .footerArea {
    margin-top: 2mm;
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
      width: auto;
    }

    .previewBar {
      display: none;
    }

    .page {
      box-shadow: none;
      margin: 0;
      min-height: 0;
      padding: 0;
      width: auto;
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

export const buildInvoicePrintHtml = (
  invoice: IInvoiceDetail,
  logoSrc: string = mefriendLogo,
  options: IInvoiceHtmlOptions = {}
): string => {
  const lineRows = invoice.lines.length
    ? invoice.lines.map(renderLine).join('')
    : renderBlankLine();
  const blankRows = invoice.lines.length < 2 ? renderBlankLine() : '';
  const grossAmount = invoice.netAmount ?? invoice.lines.reduce((total, line) => total + line.lineAmount, 0);
  const invoiceDiscountAmount = invoice.invoiceDiscountAmountExclVat ?? invoice.tradeDiscount ?? 0;
  const subTotal = grossAmount - invoiceDiscountAmount;
  const pageModeClass = resolvePageModeClass(invoice);
  const autoPrint = options.autoPrint !== false;
  const showPreviewBar = options.showPreviewBar !== false;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tax Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>${buildStyles()}</style>
  ${autoPrint ? `<script>
    (function () {
      var printStarted = false;
${waitForInvoiceAssetsScript()}

      function openSystemPrintDialog() {
        if (printStarted) {
          return;
        }

        printStarted = true;
        waitForInvoiceAssets().then(function () {
          window.focus();
          window.print();
        });
      }

      window.addEventListener('load', function () {
        window.setTimeout(openSystemPrintDialog, 300);
      });

      window.openSystemPrintDialog = openSystemPrintDialog;
    }());
  </script>` : ''}
</head>
<body class="${pageModeClass}">
  ${showPreviewBar ? `<div class="previewBar">
    <button type="button" onclick="window.openSystemPrintDialog()">Print Invoice</button>
  </div>` : ''}
  <main class="page">
    <header class="header">
      <div>
        <div class="companyName">${companyName}</div>
        <div class="companyAddress">${companyAddress.map(escapeHtml).join('<br />')}</div>
      </div>
      <div class="brand">
        <img src="${escapeHtml(logoSrc)}" alt="mefriend" />
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
          <td>Ship To</td>
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

const normalizeFileName = (value?: string | number): string => String(value ?? '')
  .replace(/\r?\n/g, ' ')
  .replace(/[^\x20-\x7E]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const sanitizeFileName = (value: string): string => normalizeFileName(value)
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'invoice';

const getInvoicePdfFileName = (invoice: IInvoiceDetail): string => `Invoice_${sanitizeFileName(invoice.invoiceNumber)}.pdf`;

interface IPdfSourceImage {
  bytes: Uint8Array;
  mimeType: 'image/jpeg' | 'image/png';
}

const toPdfText = (value?: string | number): string => String(value ?? '')
  .replace(/[^\x20-\x7E\r\n]/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

const wrapPdfText = (font: PDFFont, value: string, size: number, maxWidth: number): string[] => {
  const paragraphs = toPdfText(value).split(/\r?\n/);
  const lines: string[] = [];

  paragraphs.forEach(paragraph => {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push('');
      return;
    }

    let line = '';
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        return;
      }

      if (line) {
        lines.push(line);
        line = '';
      }

      let fragment = '';
      Array.prototype.forEach.call(word, (character: string) => {
        const nextFragment = `${fragment}${character}`;

        if (fragment && font.widthOfTextAtSize(nextFragment, size) > maxWidth) {
          lines.push(fragment);
          fragment = character;
        } else {
          fragment = nextFragment;
        }
      });
      line = fragment;
    });

    if (line) {
      lines.push(line);
    }
  });

  return lines.length ? lines : [''];
};

const readPdfSourceImage = async (source?: string): Promise<IPdfSourceImage | undefined> => {
  const normalizedSource = String(source || '').trim();

  if (!normalizedSource) {
    return undefined;
  }

  const dataMatch = /^data:(image\/(?:png|jpe?g));base64,(.+)$/i.exec(normalizedSource);

  if (dataMatch) {
    const binary = window.atob(dataMatch[2]);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return {
      bytes,
      mimeType: dataMatch[1].toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg'
    };
  }

  if (/^data:/i.test(normalizedSource)) {
    return undefined;
  }

  try {
    const response = await fetch(resolveAbsoluteAssetUrl(normalizedSource), { credentials: 'same-origin' });

    if (!response.ok) {
      return undefined;
    }

    const blob = await response.blob();
    const mimeType = blob.type.toLowerCase();

    if (mimeType !== 'image/png' && mimeType !== 'image/jpeg' && mimeType !== 'image/jpg') {
      return undefined;
    }

    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mimeType: mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
    };
  } catch {
    return undefined;
  }
};

const embedPdfImage = async (pdfDocument: PDFDocument, source?: string): Promise<PDFImage | undefined> => {
  const image = await readPdfSourceImage(source);

  if (!image) {
    return undefined;
  }

  try {
    return image.mimeType === 'image/png'
      ? await pdfDocument.embedPng(image.bytes)
      : await pdfDocument.embedJpg(image.bytes);
  } catch {
    return undefined;
  }
};

const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.download = fileName;
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const buildInvoicePdf = async (invoice: IInvoiceDetail): Promise<Uint8Array> => {
  const pdfDocument = await PDFDocument.create();
  pdfDocument.setTitle(getInvoicePdfFileName(invoice));
  pdfDocument.setCreator(companyName);
  pdfDocument.setProducer('MeFriend Invoice Portal');
  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await embedPdfImage(pdfDocument, mefriendLogo);
  const qrCodeData = invoice.qrCodeData || '';
  const qrImage = /^(data:image\/|https?:\/\/)/i.test(qrCodeData)
    ? await embedPdfImage(pdfDocument, qrCodeData)
    : undefined;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 42;
  const contentWidth = pageWidth - (margin * 2);
  const borderColor = rgb(0.45, 0.45, 0.45);
  const grayFill = rgb(0.9, 0.9, 0.9);
  const black = rgb(0.09, 0.09, 0.09);
  let page!: PDFPage;
  let y = pageHeight - margin;

  const drawText = (
    value: string | number | undefined,
    x: number,
    top: number,
    options: { bold?: boolean; color?: ReturnType<typeof rgb>; maxWidth?: number; size?: number } = {}
  ): number => {
    const font = options.bold ? boldFont : regularFont;
    const size = options.size || 8;
    const lineHeight = size * 1.22;
    const lines = options.maxWidth
      ? wrapPdfText(font, String(value ?? ''), size, options.maxWidth)
      : [toPdfText(value)];

    lines.forEach((line, index) => {
      page.drawText(line, {
        color: options.color || black,
        font,
        size,
        x,
        y: top - size - (index * lineHeight)
      });
    });

    return lines.length * lineHeight;
  };

  const drawRow = (
    values: readonly string[],
    widths: readonly number[],
    height: number,
    options: { alignRight?: readonly number[]; bold?: boolean; fill?: ReturnType<typeof rgb>; size?: number; textColor?: ReturnType<typeof rgb> } = {}
  ): void => {
    let x = margin;
    const rowBottom = y - height;

    values.forEach((value, index) => {
      const width = widths[index];
      page.drawRectangle({
        borderColor,
        borderWidth: 0.6,
        color: options.fill,
        height,
        width,
        x,
        y: rowBottom
      });
      const font = options.bold ? boldFont : regularFont;
      const size = options.size || 7;
      const padding = 4;
      const maxWidth = width - (padding * 2);
      const maxLines = Math.max(1, Math.floor((height - (padding * 2)) / (size * 1.18)));
      const wrapped = wrapPdfText(font, value, size, maxWidth).slice(0, maxLines);

      if (wrapped.length === maxLines && wrapped.join(' ') !== toPdfText(value)) {
        const lastIndex = wrapped.length - 1;
        let shortened = wrapped[lastIndex];
        while (shortened && font.widthOfTextAtSize(`${shortened}...`, size) > maxWidth) {
          shortened = shortened.slice(0, -1);
        }
        wrapped[lastIndex] = `${shortened}...`;
      }

      wrapped.forEach((line, lineIndex) => {
        const rightAligned = options.alignRight?.indexOf(index) !== -1;
        const textWidth = font.widthOfTextAtSize(line, size);
        page.drawText(line, {
          color: options.textColor || black,
          font,
          size,
          x: rightAligned ? x + width - padding - textWidth : x + padding,
          y: y - padding - size - (lineIndex * size * 1.18)
        });
      });
      x += width;
    });
    y = rowBottom;
  };

  const drawPageHeading = (continued: boolean): void => {
    page = pdfDocument.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    drawText(companyName, margin, y, { bold: true, size: 12 });
    y -= 18;
    companyAddress.forEach(line => {
      drawText(line, margin, y, { size: 7.5 });
      y -= 10;
    });

    if (logoImage) {
      const logoSize = logoImage.scaleToFit(44, 44);
      page.drawImage(logoImage, {
        height: logoSize.height,
        width: logoSize.width,
        x: pageWidth - margin - logoSize.width,
        y: pageHeight - margin - logoSize.height
      });
    }
    drawText('mefriend', pageWidth - margin - 70, pageHeight - margin - 49, { bold: true, color: rgb(0.33, 0.26, 0.58), size: 10 });
    y -= 16;
    const title = continued ? `TAX INVOICE - CONTINUED (${invoice.invoiceNumber})` : 'TAX INVOICE';
    const titleWidth = boldFont.widthOfTextAtSize(title, 13);
    drawText(title, (pageWidth - titleWidth) / 2, y, { bold: true, size: 13 });
    y -= 24;
  };

  const lineWidths = [30, 165, 55, 55, 45, 75, 86];
  const drawLineHeader = (): void => {
    drawRow(
      ['Sl. No.', 'Description', 'HSN/SAC', 'GST Rate', 'Quantity', 'Rate', 'Amount (INR)'],
      lineWidths,
      27,
      { bold: true, size: 6.7 }
    );
  };

  drawPageHeading(false);
  drawRow(
    [`Invoice No : ${invoice.invoiceNumber}`, `Invoice Date : ${formatPrintDate(invoice.invoiceDate)}`],
    [contentWidth / 2, contentWidth / 2],
    24,
    { bold: true, size: 7.5 }
  );
  drawRow(['Bill To', 'Ship To'], [contentWidth / 2, contentWidth / 2], 21, { bold: true, fill: grayFill, size: 8 });
  drawRow([
    `Name : ${invoice.customerName || ''}\nAddress : ${invoice.customerAddress || ''}\nGSTIN : ${invoice.customerGSTNo || ''}\nGST State : ${invoice.customerGSTState || ''}`,
    `Name : ${invoice.clientName || ''}\nAddress : ${invoice.clientAddress || ''}\nGSTIN : ${invoice.clientGSTNo || ''}\nGST State : ${invoice.clientGSTState || ''}`
  ], [contentWidth / 2, contentWidth / 2], 74, { size: 7.2 });
  drawRow([
    `Sales Person : ${invoice.salesPerson || ''}`,
    `Booking Order No : ${invoice.salesOrderNumber || ''}\nBooking Order Date : ${formatPrintDate(invoice.salesOrderDate)}`
  ], [contentWidth / 2, contentWidth / 2], 34, { bold: true, fill: grayFill, size: 7.2 });
  y -= 10;
  drawLineHeader();

  invoice.lines.forEach((line, index) => {
    const descriptionLines = wrapPdfText(regularFont, line.description, 7, lineWidths[1] - 8).length;
    const rowHeight = Math.min(180, Math.max(22, 9 + (descriptionLines * 8.3)));

    if (y - rowHeight < 62) {
      drawPageHeading(true);
      drawLineHeader();
    }

    drawRow([
      String(index + 1),
      line.description,
      line.hsnCode || '',
      line.gstRate || '',
      formatQty(line.quantity),
      formatMoney(line.unitPrice),
      formatMoney(line.lineAmount)
    ], lineWidths, rowHeight, { alignRight: [5, 6], size: 7 });
  });

  const grossAmount = invoice.netAmount ?? invoice.lines.reduce((total, line) => total + line.lineAmount, 0);
  const invoiceDiscountAmount = invoice.invoiceDiscountAmountExclVat ?? invoice.tradeDiscount ?? 0;
  const summaryRows: Array<[string, string]> = [
    ['Gross Amount', formatMoney(grossAmount)],
    [`Invoice Discount${invoice.invoiceDiscountPercent !== undefined ? ` (${invoice.invoiceDiscountPercent}%)` : ''}`, formatMoney(invoiceDiscountAmount)],
    ['Sub Total', formatMoney(grossAmount - invoiceDiscountAmount)],
    ['SGST', formatMoney(invoice.sgst)],
    ['CGST', formatMoney(invoice.cgst)],
    ['IGST', formatMoney(invoice.igst)],
    ['Round Off', formatMoney(invoice.roundOffAmount)],
    ['Grand Total', formatMoney(invoice.totalAmount)]
  ];

  if (y < 420) {
    drawPageHeading(true);
  }

  summaryRows.forEach(([label, value], index) => {
    const isGrandTotal = index === summaryRows.length - 1;
    drawRow([label, value], [contentWidth - 86, 86], 18, {
      alignRight: [0, 1],
      bold: isGrandTotal,
      fill: isGrandTotal ? black : undefined,
      size: 7,
      textColor: isGrandTotal ? rgb(1, 1, 1) : black
    });
  });

  y -= 10;
  const qrSize = 64;
  const amountBoxWidth = contentWidth - qrSize - 10;
  page.drawRectangle({ color: grayFill, height: qrSize, width: amountBoxWidth, x: margin, y: y - qrSize });
  drawText(`Amount in Words: ${resolveAmountInWords(invoice)}`, margin + 6, y - 6, { bold: true, maxWidth: amountBoxWidth - 12, size: 7.5 });

  if (qrImage) {
    const scaledQr = qrImage.scaleToFit(qrSize, qrSize);
    page.drawImage(qrImage, {
      height: scaledQr.height,
      width: scaledQr.width,
      x: pageWidth - margin - scaledQr.width,
      y: y - scaledQr.height
    });
  } else if (qrCodeData && !/^(data:image\/|https?:\/\/)/i.test(qrCodeData)) {
    page.drawRectangle({ borderColor, borderWidth: 0.6, height: qrSize, width: qrSize, x: pageWidth - margin - qrSize, y: y - qrSize });
    drawText(qrCodeData, pageWidth - margin - qrSize + 4, y - 5, { maxWidth: qrSize - 8, size: 5 });
  }

  y -= qrSize + 12;
  drawText('Bank Account Details', margin, y, { bold: true, size: 8.5 });
  drawText(`IRN : ${invoice.irn || ''}`, margin + 250, y, { bold: true, maxWidth: contentWidth - 250, size: 7 });
  y -= 13;
  bankDetails.forEach((detail, index) => {
    drawText(detail, margin, y - (index * 10), { size: 7.5 });
  });
  drawText(`Ack No : ${invoice.acknowledgementNumber || ''}`, margin + 250, y, { bold: true, maxWidth: contentWidth - 250, size: 7 });
  drawText(`Ack Date : ${formatPrintDate(invoice.acknowledgementDate)}`, margin + 250, y - 14, { bold: true, maxWidth: contentWidth - 250, size: 7 });
  y -= 58;
  drawText('Payment Terms: All payments are to be made in favor of Mefriend Business Solutions LLP through Crossed Cheques / Demand Drafts / Direct Bank Transfer.', margin, y, { maxWidth: contentWidth, size: 7.2 });
  y -= 34;
  const signatory = 'For Mefriend Business Solutions LLP';
  drawText(signatory, pageWidth - margin - boldFont.widthOfTextAtSize(signatory, 8), y, { bold: true, size: 8 });
  drawText('Authorised Signatory', pageWidth - margin - boldFont.widthOfTextAtSize('Authorised Signatory', 8), y - 30, { bold: true, size: 8 });

  pdfDocument.getPages().forEach((pdfPage, index, pages) => {
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    pdfPage.drawText(pageLabel, {
      color: borderColor,
      font: regularFont,
      size: 7,
      x: pageWidth - margin - regularFont.widthOfTextAtSize(pageLabel, 7),
      y: 20
    });
  });

  return pdfDocument.save();
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

export const writeInvoicePrintPreview = async (preview: Window, invoice: IInvoiceDetail): Promise<void> => {
  const logoSrc = await resolveEmbeddedLogoSrc();

  preview.document.open();
  preview.document.write(buildInvoicePrintHtml(invoice, logoSrc));
  preview.document.close();
  preview.focus();
};

export const printInvoice = async (invoice: IInvoiceDetail, preview?: Window): Promise<void> => {
  const printWindow = preview || openInvoicePrintPreviewWindow();

  if (!preview) {
    await writeInvoicePrintPreview(printWindow, invoice);
  }

  printWindow.document.title = getInvoicePdfFileName(invoice);
  const openSystemPrintDialog = (printWindow as IInvoicePrintWindow).openSystemPrintDialog;

  if (typeof openSystemPrintDialog === 'function') {
    openSystemPrintDialog.call(printWindow);
    return;
  }

  printWindow.focus();
  printWindow.print();
};

export const downloadInvoicePdf = async (invoice: IInvoiceDetail): Promise<void> => {
  const pdfBytes = await buildInvoicePdf(invoice);
  saveBlob(new Blob([pdfBytes], { type: 'application/pdf' }), getInvoicePdfFileName(invoice));
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
