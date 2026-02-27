/**
 * Generate and download payment proof (bukti pembayaran) as PDF.
 * Layout sesuai template HTML: header gelap, section terstruktur, footer.
 */

import { jsPDF } from "jspdf";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (d: Date) =>
  d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export interface ProjectInfoReceipt {
  judul: string;
  clientName: string;
  vendorName?: string;
}

export interface TerminReceiptData {
  id: string;
  judul: string;
  baseAmount: number;
  type: string;
  feeClientAmount: number;
  totalWithFee: number;
  status: string;
  createdAt?: string | null;
}

export interface RetensiReceiptData {
  id: string;
  status: string;
  percent: number;
  days: number;
  value: number;
  startDate?: string | null;
  endDate?: string | null;
  logs?: { tipe: string; tanggal: string }[];
}

export interface MilestoneCompletionReceiptData {
  id: string;
  judul: string;
  persentase: number;
  price: number;
  status: string;
  completedAt?: string | null;
  vendorFeeAmount?: number;
  retentionPercent?: number;
  retentionAmount?: number;
  vendorNetAmount?: number;
}

// Layout constants - mirip template HTML
const PAGE_W = 210;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Colors dari template HTML (#2c3e50, #8898aa, #e74c3c, #eee)
const COLORS = {
  headerBg: [44, 62, 80] as [number, number, number],
  headerLight: [61, 82, 102],
  titleBg: [248, 249, 250],
  detailBg: [250, 251, 252],
  totalBg: [44, 62, 80],
  textDark: [44, 62, 80],
  textMuted: [136, 152, 170],
  feeRed: [231, 76, 60],
  border: [238, 238, 238],
};

function drawStyledHeader(doc: jsPDF, title: string): number {
  let y = 0;
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Adogalo", PAGE_W / 2, 16, { align: "center" });
  y = 28;

  doc.setFillColor(...COLORS.titleBg);
  doc.rect(0, y, PAGE_W, 28, "F");
  y += 10;
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, PAGE_W / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textMuted);
  doc.text("", PAGE_W / 2, y, { align: "center" });
  y += 14;
  return y;
}

function drawVendorClientRow(doc: jsPDF, vendor: string, client: string, y: number): number {
  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Vendor", MARGIN, y);
  doc.text("Client", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(vendor, MARGIN, y);
  doc.text(client, PAGE_W - MARGIN, y, { align: "right" });
  y += 12;
  return y;
}

function drawDetailSection(
  doc: jsPDF,
  y: number,
  title: string,
  rows: { label: string; value: string; isFee?: boolean; isTotal?: boolean }[]
): number {
  const totalRow = rows.find((r) => r.isTotal);
  const normalRows = rows.filter((r) => !r.isTotal);
  const rowHeight = 10;
  const boxH = 12 + normalRows.length * rowHeight + (totalRow ? 18 : 0);
  const boxTop = y;

  doc.setFillColor(...COLORS.detailBg);
  doc.roundedRect(MARGIN, boxTop, CONTENT_W, boxH, 3, 3, "F");
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(MARGIN, boxTop, CONTENT_W, boxH, 3, 3, "S");

  y += 8;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title.toUpperCase(), MARGIN + 6, y);
  y += 14;

  for (const r of normalRows) {
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGIN + 6, y - 2, PAGE_W - MARGIN - 6, y - 2);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (r.isFee) doc.setTextColor(...COLORS.feeRed);
    else doc.setTextColor(...COLORS.textDark);
    doc.text(r.label, MARGIN + 6, y + 4);
    doc.text(r.value, PAGE_W - MARGIN - 6, y + 4, { align: "right" });
    y += rowHeight;
  }

  if (totalRow) {
    y += 4;
    doc.setFillColor(...COLORS.totalBg);
    doc.roundedRect(MARGIN + 4, y, CONTENT_W - 8, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(totalRow.label, MARGIN + 10, y + 10);
    doc.text(totalRow.value, PAGE_W - MARGIN - 10, y + 10, { align: "right" });
    y += 20;
  } else {
    y += 6;
  }
  return y;
}

function drawFooter(doc: jsPDF, y: number) {
  doc.setFillColor(...COLORS.titleBg);
  doc.rect(0, y, PAGE_W, 20, "F");
  doc.setDrawColor(...COLORS.border);
  doc.line(0, y, PAGE_W, y);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Dokumen ini dicetak pada ${formatDate(new Date())} dari sistem Adogalo.`, PAGE_W / 2, y + 12, { align: "center" });
}

/** Generate and trigger download of termin payment proof (client → admin or refund). */
export function downloadTerminReceipt(
  termin: TerminReceiptData,
  project: ProjectInfoReceipt
): void {
  const doc = new jsPDF();
  const isRefund = termin.type === "reduction" || termin.status === "refunded";
  const title = isRefund ? "Bukti Pengembalian Dana (Refund)" : "Bukti Pembayaran Termin";

  let y = drawStyledHeader(doc, title);
  doc.text(project.judul, PAGE_W / 2, y - 6, { align: "center" });

  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.text("Client (Pembayar)", MARGIN, y);
  doc.text("Proyek", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(project.clientName, MARGIN, y);
  doc.text(project.judul, PAGE_W - MARGIN, y, { align: "right" });
  y += 14;

  const rows: { label: string; value: string; isFee?: boolean; isTotal?: boolean }[] = [
    { label: "Judul", value: termin.judul },
    {
      label: "Tipe",
      value: termin.type === "main" ? "Termin Utama" : termin.type === "additional" ? "Pekerjaan Tambahan" : "Pengurangan",
    },
  ];

  if (termin.feeClientAmount > 0 && !isRefund) {
    rows.push({ label: "Nilai Dasar", value: formatCurrency(termin.baseAmount) });
    rows.push({ label: "Biaya Admin (1%)", value: formatCurrency(termin.feeClientAmount), isFee: true });
  }

  rows.push({
    label: isRefund ? "Jumlah Dikembalikan" : "Total Dibayar",
    value: formatCurrency(Math.abs(termin.totalWithFee)),
    isTotal: true,
  });

  y = drawDetailSection(doc, y, "Detail Pembayaran", rows);

  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.text("Status", MARGIN, y);
  doc.text("Tanggal", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.text(
    termin.status === "paid" ? "Sudah Dibayar" : termin.status === "refunded" ? "Dikembalikan" : termin.status,
    MARGIN,
    y
  );
  doc.text(termin.createdAt ? formatDate(new Date(termin.createdAt)) : formatDate(new Date()), PAGE_W - MARGIN, y, {
    align: "right",
  });
  y += 20;

  drawFooter(doc, y);

  const safeName = termin.judul.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
  doc.save(`Bukti-Pembayaran-${safeName}.pdf`);
}

/** Generate and trigger download of retention release payment proof. */
export function downloadRetensiReceipt(
  retensi: RetensiReceiptData,
  project: ProjectInfoReceipt
): void {
  const doc = new jsPDF();
  let y = drawStyledHeader(doc, "Bukti Pembayaran Retensi");
  doc.text(project.judul, PAGE_W / 2, y - 6, { align: "center" });

  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.text("Vendor", MARGIN, y);
  doc.text("Client", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(project.vendorName || "-", MARGIN, y);
  doc.text(project.clientName, PAGE_W - MARGIN, y, { align: "right" });
  y += 14;

  const rows: { label: string; value: string; isFee?: boolean; isTotal?: boolean }[] = [
    { label: "Persentase Retensi", value: `${retensi.percent}%` },
    { label: "Durasi", value: `${retensi.days} hari` },
    { label: "Nilai yang Dicairkan", value: formatCurrency(retensi.value), isTotal: true },
  ];
  y = drawDetailSection(doc, y, "Detail Retensi", rows);

  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.text("Status", MARGIN, y);
  doc.text("Tanggal Cair", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.text("Sudah Dibayar", MARGIN, y);
  doc.text(retensi.endDate ? formatDate(new Date(retensi.endDate)) : formatDate(new Date()), PAGE_W - MARGIN, y, {
    align: "right",
  });
  y += 20;

  drawFooter(doc, y);
  doc.save("Bukti-Pembayaran-Retensi.pdf");
}

/** Generate and trigger download of milestone/work completion proof (bukti pelunasan progress/pekerjaan). */
export function downloadMilestoneCompletionReceipt(
  milestone: MilestoneCompletionReceiptData,
  project: ProjectInfoReceipt
): void {
  const doc = new jsPDF();
  let y = drawStyledHeader(doc, "Bukti Pelunasan Pekerjaan");
  doc.text(project.judul, PAGE_W / 2, y - 6, { align: "center" });

  y = drawVendorClientRow(doc, project.vendorName || "-", project.clientName, y);

  const hasBreakdown =
    typeof milestone.vendorFeeAmount === "number" && typeof milestone.vendorNetAmount === "number";

  const rows: { label: string; value: string; isFee?: boolean; isTotal?: boolean }[] = [
    { label: "Judul Pekerjaan", value: milestone.judul },
    { label: "Persentase", value: `${milestone.persentase}%` },
    { label: "Nilai Kotor (Base × Persentase)", value: formatCurrency(milestone.price) },
  ];

  if (hasBreakdown) {
    rows.push({
      label: "Fee Vendor (2%)",
      value: "-" + formatCurrency(milestone.vendorFeeAmount!),
      isFee: true,
    });
    rows.push({
      label: `Retensi (${milestone.retentionPercent ?? 0}%)`,
      value: "-" + formatCurrency(milestone.retentionAmount ?? 0),
      isFee: true,
    });
    rows.push({
      label: "Diterima Vendor",
      value: formatCurrency(milestone.vendorNetAmount!),
      isTotal: true,
    });
  } else {
    rows.push({
      label: "Nilai Pelunasan",
      value: formatCurrency(milestone.price),
      isTotal: true,
    });
  }

  y = drawDetailSection(doc, y, "Detail Pekerjaan", rows);

  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.text("Status", MARGIN, y);
  doc.text("Tanggal Selesai", PAGE_W - MARGIN, y, { align: "right" });
  y += 5;
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.text("Selesai", MARGIN, y);
  doc.text(
    milestone.completedAt ? formatDate(new Date(milestone.completedAt)) : formatDate(new Date()),
    PAGE_W - MARGIN,
    y,
    { align: "right" }
  );
  y += 20;

  drawFooter(doc, y);

  const safeName = milestone.judul.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
  doc.save(`Bukti-Pelunasan-${safeName}.pdf`);
}
