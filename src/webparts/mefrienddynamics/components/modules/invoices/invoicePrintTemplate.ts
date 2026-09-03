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

interface IInvoicePrintWindow extends Window {
  openSystemPrintDialog?: () => void;
}

interface IInvoiceHtmlOptions {
  autoPrint?: boolean;
  showPreviewBar?: boolean;
}

interface IPdfImage {
  data: Uint8Array;
  height: number;
  width: number;
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

const encodeText = (value: string): Uint8Array => new TextEncoder().encode(value);

const dataUriToBytes = (dataUri: string): Uint8Array => {
  const separatorIndex = dataUri.indexOf(',');

  if (separatorIndex === -1) {
    throw new Error('Unable to encode the invoice PDF image.');
  }

  const binary = window.atob(dataUri.substr(separatorIndex + 1));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const buildPdfBlob = (images: readonly IPdfImage[]): Blob => {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const objectCount = 2 + (images.length * 3);
  const offsets = new Array<number>(objectCount + 1).fill(0);
  const parts: Uint8Array[] = [encodeText('%PDF-1.4\n')];
  let byteOffset = parts[0].length;

  const appendObject = (objectId: number, objectParts: readonly Uint8Array[]): void => {
    offsets[objectId] = byteOffset;
    const prefix = encodeText(`${objectId} 0 obj\n`);
    const suffix = encodeText('\nendobj\n');
    parts.push(prefix, ...objectParts, suffix);
    byteOffset += prefix.length + objectParts.reduce((total, part) => total + part.length, 0) + suffix.length;
  };

  appendObject(1, [encodeText('<< /Type /Catalog /Pages 2 0 R >>')]);
  const pageReferences = images.map((_, index) => `${3 + (index * 3)} 0 R`).join(' ');
  appendObject(2, [encodeText(`<< /Type /Pages /Kids [${pageReferences}] /Count ${images.length} >>`)]);

  images.forEach((image, index) => {
    const pageObjectId = 3 + (index * 3);
    const contentObjectId = pageObjectId + 1;
    const imageObjectId = pageObjectId + 2;
    const imageName = `InvoicePage${index + 1}`;
    const content = encodeText(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/${imageName} Do\nQ`);

    appendObject(pageObjectId, [encodeText(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /XObject << /${imageName} ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    )]);
    appendObject(contentObjectId, [
      encodeText(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encodeText('\nendstream')
    ]);
    appendObject(imageObjectId, [
      encodeText(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`
      ),
      image.data,
      encodeText('\nendstream')
    ]);
  });

  const xrefOffset = byteOffset;
  const xrefRows = offsets.slice(1).map(offset => {
    const paddedOffset = `0000000000${offset}`.slice(-10);
    return `${paddedOffset} 00000 n \n`;
  }).join('');
  parts.push(encodeText(
    `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n${xrefRows}` +
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  ));

  return new Blob(parts, { type: 'application/pdf' });
};

const waitForFrameAssets = async (frameDocument: Document): Promise<void> => {
  const images = Array.prototype.slice.call(frameDocument.images) as HTMLImageElement[];

  await Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
    const timeoutId = window.setTimeout(resolve, 10000);
    const finish = (): void => {
      window.clearTimeout(timeoutId);
      resolve();
    };

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
  })));
  await new Promise<void>(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
};

const loadSvgImage = (source: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  const timeoutId = window.setTimeout(() => reject(new Error('Invoice PDF rendering timed out.')), 10000);

  image.onload = () => {
    window.clearTimeout(timeoutId);
    resolve(image);
  };
  image.onerror = () => {
    window.clearTimeout(timeoutId);
    reject(new Error('Unable to render the invoice for PDF download.'));
  };
  image.src = source;
});

const renderInvoiceCanvas = async (invoice: IInvoiceDetail): Promise<HTMLCanvasElement> => {
  const logoSrc = await resolveEmbeddedLogoSrc();
  const frame = document.createElement('iframe');

  frame.setAttribute('aria-hidden', 'true');
  frame.style.height = '1123px';
  frame.style.left = '-10000px';
  frame.style.position = 'fixed';
  frame.style.top = '0';
  frame.style.visibility = 'hidden';
  frame.style.width = '794px';
  document.body.appendChild(frame);

  try {
    const frameDocument = frame.contentDocument;

    if (!frameDocument) {
      throw new Error('Unable to prepare the invoice PDF.');
    }

    frameDocument.open();
    frameDocument.write(buildInvoicePrintHtml(invoice, logoSrc, { autoPrint: false, showPreviewBar: false }));
    frameDocument.close();
    await waitForFrameAssets(frameDocument);

    const page = frameDocument.querySelector('.page') as HTMLElement | null;

    if (!page) {
      throw new Error('Unable to find the invoice document for PDF download.');
    }

    page.style.boxShadow = 'none';
    page.style.margin = '0';
    const width = Math.max(1, Math.ceil(page.scrollWidth));
    const height = Math.max(1, Math.ceil(page.scrollHeight));
    const pageMarkup = new XMLSerializer().serializeToString(page);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">` +
      `<style>${buildStyles()}</style>${pageMarkup}</div></foreignObject></svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

    try {
      const image = await loadSvgImage(svgUrl);
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas rendering is unavailable for invoice PDF download.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  } finally {
    frame.remove();
  }
};

const splitCanvasIntoPdfImages = (canvas: HTMLCanvasElement): readonly IPdfImage[] => {
  const a4HeightRatio = 841.89 / 595.28;
  const pageHeight = Math.max(1, Math.round(canvas.width * a4HeightRatio));
  const images: IPdfImage[] = [];

  for (let sourceY = 0; sourceY < canvas.height; sourceY += pageHeight) {
    const sourceHeight = Math.min(pageHeight, canvas.height - sourceY);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeight;
    const context = pageCanvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas rendering is unavailable for invoice PDF download.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
    images.push({
      data: dataUriToBytes(pageCanvas.toDataURL('image/jpeg', 0.92)),
      height: pageCanvas.height,
      width: pageCanvas.width
    });
  }

  return images;
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
  const canvas = await renderInvoiceCanvas(invoice);
  const images = splitCanvasIntoPdfImages(canvas);

  if (!images.length) {
    throw new Error('Unable to render any invoice pages for PDF download.');
  }

  saveBlob(buildPdfBlob(images), getInvoicePdfFileName(invoice));
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
