import { SheetData } from '../types';

export interface SampleDoc {
  id: string;
  title: string;
  description: string;
  category: string;
  pageCount: number;
  badge: string;
  sampleSheets: SheetData[];
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: 'bank-statement',
    title: 'Chase Business Checking Statement',
    description: 'Multi-transaction monthly checking ledger with debits, credits, running balances, and categories.',
    category: 'Banking & Finance',
    pageCount: 2,
    badge: 'Popular',
    sampleSheets: [
      {
        id: 'sample-bank-p1',
        name: 'Statement - Page 1',
        pageNumber: 1,
        headers: ['Post Date', 'Description', 'Check/Ref #', 'Type', 'Amount ($)', 'Balance ($)'],
        rows: [
          ['10/01/2026', 'BEGINNING BALANCE', '-', 'Deposit', '', '14,850.20'],
          ['10/02/2026', 'Stripe Payments Payout 98214', 'STR-98214', 'Credit', '4,250.00', '19,100.20'],
          ['10/04/2026', 'Amazon Web Services Cloud Hosting', 'ACH-AWS99', 'Debit', '-482.19', '18,618.01'],
          ['10/05/2026', 'WeWork Office Space Lease Oct', 'ACH-WW012', 'Debit', '-1,850.00', '16,768.01'],
          ['10/08/2026', 'Google Workspace Apps GSuite', 'DEB-8372', 'Debit', '-72.00', '16,696.01'],
          ['10/12/2026', 'Client Wire Acme Corp Inv #1042', 'WIR-44910', 'Credit', '8,900.00', '25,596.01'],
          ['10/14/2026', 'Slack Technologies Pro Team', 'DEB-1102', 'Debit', '-150.00', '25,446.01'],
          ['10/15/2026', 'Gusto Payroll Tax & Salary Sweep', 'ACH-GST44', 'Debit', '-7,420.50', '18,025.51'],
          ['10/18/2026', 'GitHub Enterprise Subscriptions', 'DEB-9921', 'Debit', '-84.00', '17,941.51'],
          ['10/20/2026', 'HubSpot CRM Marketing Software', 'ACH-HB881', 'Debit', '-450.00', '17,491.51'],
        ],
        extractedAt: Date.now(),
      },
      {
        id: 'sample-bank-p2',
        name: 'Statement - Page 2',
        pageNumber: 2,
        headers: ['Post Date', 'Description', 'Check/Ref #', 'Type', 'Amount ($)', 'Balance ($)'],
        rows: [
          ['10/22/2026', 'Figma Design Team License', 'DEB-3912', 'Debit', '-180.00', '17,311.51'],
          ['10/25/2026', 'Customer Payment Vertex Dynamics', 'ACH-VTX22', 'Credit', '6,300.00', '23,611.51'],
          ['10/27/2026', 'Delta Airlines Flight Conf #DK928', 'CC-4902', 'Debit', '-540.20', '23,071.31'],
          ['10/28/2026', 'Marriott Hotel NY Conf #MH112', 'CC-4902', 'Debit', '-689.40', '22,381.91'],
          ['10/30/2026', 'Monthly Account Service Fee', 'FEE-001', 'Debit', '-15.00', '22,366.91'],
          ['10/31/2026', 'Interest Earned Business Yield', 'INT-OCT26', 'Credit', '42.80', '22,409.71'],
          ['10/31/2026', 'ENDING BALANCE TOTAL', '-', 'Summary', '', '22,409.71'],
        ],
        extractedAt: Date.now(),
      },
    ],
  },
  {
    id: 'sales-report',
    title: 'Enterprise Q4 Sales & Margin Breakdown',
    description: 'Multi-regional quarterly performance matrix with revenue, cost of goods, margins, and growth metrics.',
    category: 'Sales & Operations',
    pageCount: 1,
    badge: 'Detailed',
    sampleSheets: [
      {
        id: 'sample-sales-q4',
        name: 'Q4 Performance Matrix',
        pageNumber: 1,
        headers: ['Region', 'Product Line', 'Units Sold', 'Unit Price ($)', 'Total Revenue ($)', 'COGS ($)', 'Gross Profit ($)', 'Margin %', 'Target Status'],
        rows: [
          ['North America', 'Enterprise Cloud Tier', '1,420', '850.00', '1,207,000.00', '320,000.00', '887,000.00', '73.5%', 'Exceeded'],
          ['North America', 'Professional SaaS Suite', '3,850', '299.00', '1,151,150.00', '245,000.00', '906,150.00', '78.7%', 'Exceeded'],
          ['North America', 'Developer API Add-on', '5,600', '49.00', '274,400.00', '41,000.00', '233,400.00', '85.1%', 'Met'],
          ['EMEA - Europe', 'Enterprise Cloud Tier', '980', '850.00', '833,000.00', '228,000.00', '605,000.00', '72.6%', 'Met'],
          ['EMEA - Europe', 'Professional SaaS Suite', '2,100', '299.00', '627,900.00', '135,000.00', '492,900.00', '78.5%', 'Met'],
          ['EMEA - Europe', 'Developer API Add-on', '3,400', '49.00', '166,600.00', '25,500.00', '141,100.00', '84.7%', 'Below'],
          ['APAC - Asia', 'Enterprise Cloud Tier', '760', '850.00', '646,000.00', '175,000.00', '471,000.00', '72.9%', 'Exceeded'],
          ['APAC - Asia', 'Professional SaaS Suite', '1,890', '299.00', '565,110.00', '122,000.00', '443,110.00', '78.4%', 'Met'],
          ['APAC - Asia', 'Developer API Add-on', '4,200', '49.00', '205,800.00', '31,000.00', '174,800.00', '84.9%', 'Exceeded'],
          ['LATAM', 'Enterprise Cloud Tier', '310', '850.00', '263,500.00', '72,000.00', '191,500.00', '72.7%', 'Met'],
          ['LATAM', 'Professional SaaS Suite', '940', '299.00', '281,060.00', '60,500.00', '220,560.00', '78.5%', 'Met'],
        ],
        extractedAt: Date.now(),
      },
    ],
  },
  {
    id: 'inventory-logistics',
    title: 'Global Warehouse Inventory & Valuation Ledger',
    description: 'Stock keeping units (SKU), warehouse locations, reorder triggers, unit valuations, and total asset stock.',
    category: 'Supply Chain',
    pageCount: 1,
    badge: 'Inventory',
    sampleSheets: [
      {
        id: 'sample-inv-sheet',
        name: 'Warehouse Stock Ledger',
        pageNumber: 1,
        headers: ['SKU Code', 'Item Description', 'Warehouse', 'Aisle/Bin', 'Stock Qty', 'Min Reorder', 'Unit Cost ($)', 'Total Value ($)', 'Stock Status'],
        rows: [
          ['SKU-9021-BLK', 'Ergonomic Mesh Chair V2 - Onyx', 'WH-East (NJ)', 'A-12-04', '420', '100', '115.00', '48,300.00', 'Optimal'],
          ['SKU-9022-GRY', 'Ergonomic Mesh Chair V2 - Slate', 'WH-East (NJ)', 'A-12-05', '85', '100', '115.00', '9,775.00', 'Low Stock - Reorder'],
          ['SKU-4401-OAK', 'Dual Motor Standing Desk 60x30', 'WH-West (CA)', 'B-04-01', '310', '75', '240.00', '74,400.00', 'Optimal'],
          ['SKU-4402-WAL', 'Dual Motor Standing Desk Walnut', 'WH-West (CA)', 'B-04-02', '195', '75', '265.00', '51,675.00', 'Optimal'],
          ['SKU-1120-ALM', 'Monitor Arm Gas Spring Heavy Duty', 'WH-Central (TX)', 'C-08-11', '890', '200', '32.50', '28,925.00', 'Optimal'],
          ['SKU-7731-LED', 'Under-Desk Smart LED Ambiance Bar', 'WH-Central (TX)', 'C-09-02', '1,450', '300', '14.20', '20,590.00', 'Overstocked'],
          ['SKU-6604-MAT', 'Anti-Fatigue Standing Gel Mat 36x24', 'WH-East (NJ)', 'D-02-09', '620', '150', '22.00', '13,640.00', 'Optimal'],
          ['SKU-8829-HUB', 'Thunderbolt 4 Quad-Display Hub 100W', 'WH-West (CA)', 'E-01-03', '540', '120', '78.00', '42,120.00', 'Optimal'],
        ],
        extractedAt: Date.now(),
      },
    ],
  },
  {
    id: 'commercial-invoice',
    title: 'Consulting & Engineering Tax Invoice',
    description: 'Service itemization with billable hours, hourly rates, tax breakdown, and client metadata.',
    category: 'Invoicing & Tax',
    pageCount: 1,
    badge: 'Invoice',
    sampleSheets: [
      {
        id: 'sample-invoice-sheet',
        name: 'Invoice #INV-2026-8891',
        pageNumber: 1,
        headers: ['Line #', 'Service / Deliverable', 'Category', 'Hours / Qty', 'Rate ($)', 'Taxable', 'Total Amount ($)'],
        rows: [
          ['1', 'Full-Stack Architecture & Cloud Migration', 'Engineering', '80.0', '175.00', 'Yes', '14,000.00'],
          ['2', 'Security Audit & Penetration Testing', 'Compliance', '35.0', '195.00', 'Yes', '6,825.00'],
          ['3', 'UI/UX Design System Component Library', 'Design', '45.0', '140.00', 'Yes', '6,300.00'],
          ['4', 'Database Performance Index Tuning', 'DevOps', '20.0', '180.00', 'Yes', '3,600.00'],
          ['5', 'Dedicated SSL & Enterprise Load Balancers', 'Infrastructure', '1.0', '1,200.00', 'Yes', '1,200.00'],
          ['6', '24/7 SLA Priority Maintenance Support (Q4)', 'Support', '1.0', '2,500.00', 'No', '2,500.00'],
          ['SUBTOTAL', '-', '-', '-', '-', '-', '34,425.00'],
          ['SALES TAX (8.875%)', '-', '-', '-', '-', '-', '2,834.09'],
          ['TOTAL BALANCE DUE', '-', '-', '-', '-', '-', '$37,259.09'],
        ],
        extractedAt: Date.now(),
      },
    ],
  },
];

/**
 * Render a visual simulated PDF representation of a sample dataset onto a canvas
 */
export function renderSampleToCanvas(
  sample: SampleDoc,
  pageIndex: number,
  canvas: HTMLCanvasElement
) {
  const sheet = sample.sampleSheets[pageIndex] || sample.sampleSheets[0];
  if (!sheet) return;

  const width = 800;
  const height = 1050; // standard letter / A4 ratio
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Top header bar / branding
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, 40, width - 80, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(sample.title.toUpperCase(), 60, 72);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`DOCUMENT CATEGORY: ${sample.category.toUpperCase()} | PAGE ${sheet.pageNumber} OF ${sample.pageCount}`, 60, 115);

  // Divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 130);
  ctx.lineTo(width - 40, 130);
  ctx.stroke();

  // Draw Table
  const startX = 40;
  const startY = 160;
  const tableWidth = width - 80;
  const colCount = sheet.headers.length;
  const colWidth = tableWidth / colCount;
  const headerHeight = 32;
  const rowHeight = 28;

  // Table header background
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(startX, startY, tableWidth, headerHeight);

  // Table header border
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(startX, startY, tableWidth, headerHeight);

  // Table header text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px system-ui, sans-serif';

  sheet.headers.forEach((header, i) => {
    const x = startX + i * colWidth + 8;
    const y = startY + 20;
    ctx.fillText(header.length > 18 ? header.slice(0, 16) + '…' : header, x, y);

    // Vertical divider
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(startX + i * colWidth, startY);
      ctx.lineTo(startX + i * colWidth, startY + headerHeight);
      ctx.stroke();
    }
  });

  // Rows
  sheet.rows.forEach((row, rIdx) => {
    const y = startY + headerHeight + rIdx * rowHeight;
    const isEven = rIdx % 2 === 0;

    ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
    ctx.fillRect(startX, y, tableWidth, rowHeight);

    // Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(startX, y, tableWidth, rowHeight);

    ctx.fillStyle = '#334155';
    ctx.font = '11px system-ui, sans-serif';

    sheet.headers.forEach((_, cIdx) => {
      const cellText = String(row[cIdx] || '');
      const cellX = startX + cIdx * colWidth + 8;
      const cellY = y + 18;

      ctx.fillText(cellText.length > 22 ? cellText.slice(0, 20) + '…' : cellText, cellX, cellY);

      if (cIdx > 0) {
        ctx.beginPath();
        ctx.moveTo(startX + cIdx * colWidth, y);
        ctx.lineTo(startX + cIdx * colWidth, y + rowHeight);
        ctx.stroke();
      }
    });
  });

  // Footer note
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 11px system-ui, sans-serif';
  ctx.fillText('* Certified Electronic Data Export. Generated via TabulaPDF Smart Document Processor.', 40, height - 40);
}
