/**
 * Generate and download payment proof (bukti pembayaran) as PDF.
 * Used for: termin payments (client → admin), refunds, retention release.
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
  /** Tanggal selesai (dari log finish) atau tanggal cetak */
  completedAt?: string | null;
}

function drawReceiptHeader(doc: jsPDF, title: string) {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Adogalo", 20, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Sistem Manajemen Proyek Konstruksi", 20, 28);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 38);
  doc.setDrawColor(220, 220, 220);
  doc.line(20, 42, 190, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
}

/** Generate and trigger download of termin payment proof (client → admin or refund). */
export function downloadTerminReceipt(
  termin: TerminReceiptData,
  project: ProjectInfoReceipt
): void {
  const doc = new jsPDF();
  const isRefund = termin.type === "reduction" || termin.status === "refunded";
  const title = isRefund
    ? "Bukti Pengembalian Dana (Refund)"
    : "Bukti Pembayaran Termin";

  drawReceiptHeader(doc, title);

  let y = 52;
  const lineHeight = 7;
  const left = 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Proyek:", left, y);
  doc.text(project.judul, left + 45, y);
  y += lineHeight;

  doc.text("Client:", left, y);
  doc.text(project.clientName, left + 45, y);
  y += lineHeight + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Detail Pembayaran", left, y);
  y += lineHeight;
  doc.setFont("helvetica", "normal");

  doc.text("Judul:", left, y);
  doc.text(termin.judul, left + 45, y);
  y += lineHeight;

  doc.text("Tipe:", left, y);
  doc.text(
    termin.type === "main" ? "Termin Utama" : termin.type === "additional" ? "Pekerjaan Tambahan" : "Pengurangan",
    left + 45,
    y
  );
  y += lineHeight;

  if (termin.feeClientAmount > 0 && !isRefund) {
    doc.text("Nilai Dasar:", left, y);
    doc.text(formatCurrency(termin.baseAmount), left + 45, y);
    y += lineHeight;
    doc.text("Biaya Admin (1%):", left, y);
    doc.text(formatCurrency(termin.feeClientAmount), left + 45, y);
    y += lineHeight;
  }

  doc.setFont("helvetica", "bold");
  doc.text(isRefund ? "Jumlah Dikembalikan:" : "Total Dibayar:", left, y);
  doc.text(
    (isRefund ? "" : "") + formatCurrency(Math.abs(termin.totalWithFee)),
    left + 45,
    y
  );
  y += lineHeight + 2;
  doc.setFont("helvetica", "normal");

  doc.text("Status:", left, y);
  doc.text(
    termin.status === "paid"
      ? "Sudah Dibayar"
      : termin.status === "refunded"
        ? "Dikembalikan"
        : termin.status,
    left + 45,
    y
  );
  y += lineHeight;

  if (termin.createdAt) {
    doc.text("Tanggal:", left, y);
    doc.text(formatDate(new Date(termin.createdAt)), left + 45, y);
    y += lineHeight;
  }

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Dokumen ini dicetak pada ${formatDate(new Date())} dari sistem Adogalo.`,
    left,
    y
  );

  const safeName = termin.judul.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
  doc.save(`Bukti-Pembayaran-${safeName}.pdf`);
}

/** Generate and trigger download of retention release payment proof. */
export function downloadRetensiReceipt(
  retensi: RetensiReceiptData,
  project: ProjectInfoReceipt
): void {
  const doc = new jsPDF();
  drawReceiptHeader(doc, "Bukti Pembayaran Retensi");

  let y = 52;
  const lineHeight = 7;
  const left = 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Proyek:", left, y);
  doc.text(project.judul, left + 45, y);
  y += lineHeight;

  doc.text("Penerima (Vendor):", left, y);
  doc.text(project.vendorName || "-", left + 45, y);
  y += lineHeight;

  doc.text("Client:", left, y);
  doc.text(project.clientName, left + 45, y);
  y += lineHeight + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Detail Retensi", left, y);
  y += lineHeight;
  doc.setFont("helvetica", "normal");

  doc.text("Persentase Retensi:", left, y);
  doc.text(`${retensi.percent}%`, left + 45, y);
  y += lineHeight;

  doc.text("Durasi:", left, y);
  doc.text(`${retensi.days} hari`, left + 45, y);
  y += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text("Nilai yang Dicairkan:", left, y);
  doc.text(formatCurrency(retensi.value), left + 45, y);
  y += lineHeight + 2;
  doc.setFont("helvetica", "normal");

  doc.text("Status:", left, y);
  doc.text("Sudah Dibayar", left + 45, y);
  y += lineHeight;

  if (retensi.endDate) {
    doc.text("Tanggal Cair:", left, y);
    doc.text(formatDate(new Date(retensi.endDate)), left + 45, y);
    y += lineHeight;
  }

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Dokumen ini dicetak pada ${formatDate(new Date())} dari sistem Adogalo.`,
    left,
    y
  );

  doc.save("Bukti-Pembayaran-Retensi.pdf");
}

/** Generate and trigger download of milestone/work completion proof (bukti pelunasan progress/pekerjaan). */
export function downloadMilestoneCompletionReceipt(
  milestone: MilestoneCompletionReceiptData,
  project: ProjectInfoReceipt
): void {
  const doc = new jsPDF();
  drawReceiptHeader(doc, "Bukti Pelunasan Pekerjaan");

  let y = 52;
  const lineHeight = 7;
  const left = 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Proyek:", left, y);
  doc.text(project.judul, left + 45, y);
  y += lineHeight;

  doc.text("Client:", left, y);
  doc.text(project.clientName, left + 45, y);
  y += lineHeight;

  doc.text("Vendor:", left, y);
  doc.text(project.vendorName || "-", left + 45, y);
  y += lineHeight + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Detail Pekerjaan", left, y);
  y += lineHeight;
  doc.setFont("helvetica", "normal");

  doc.text("Judul Pekerjaan:", left, y);
  doc.text(milestone.judul, left + 45, y);
  y += lineHeight;

  doc.text("Persentase:", left, y);
  doc.text(`${milestone.persentase}%`, left + 45, y);
  y += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text("Nilai Pelunasan:", left, y);
  doc.text(formatCurrency(milestone.price), left + 45, y);
  y += lineHeight + 2;
  doc.setFont("helvetica", "normal");

  doc.text("Status:", left, y);
  doc.text("Selesai", left + 45, y);
  y += lineHeight;

  if (milestone.completedAt) {
    doc.text("Tanggal Selesai:", left, y);
    doc.text(formatDate(new Date(milestone.completedAt)), left + 45, y);
    y += lineHeight;
  }

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Dokumen ini dicetak pada ${formatDate(new Date())} dari sistem Adogalo.`,
    left,
    y
  );

  const safeName = milestone.judul.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
  doc.save(`Bukti-Pelunasan-${safeName}.pdf`);
}
