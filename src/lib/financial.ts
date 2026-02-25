// Financial Constants
export const CLIENT_FEE_PERCENT = 1; // 1% from client
export const VENDOR_FEE_PERCENT = 2; // 2% from vendor
export const WARNING_BUFFER_PERCENT = 10; // 10% buffer for client funds warning

// Budget thresholds for termin generation
export const BUDGET_THRESHOLD_1_TERMIN = 15000000; // ≤ 15 juta: 1 termin
export const BUDGET_THRESHOLD_2_TERMIN = 50000000; // 15-50 juta: 2 termins

// Types
export interface FinancialBreakdown {
  grossAmount: number;       // Nilai kotor milestone
  clientFeeAmount: number;   // Fee 1% dari client (dibayar client di atas nilai kotor)
  totalWithClientFee: number; // Total yang dibayar client (gross + client fee)
  vendorFeeAmount: number;   // Fee 2% dari vendor (dipotong dari pembayaran)
  retentionPercent: number;  // Persentase retensi
  retentionAmount: number;   // Jumlah retensi yang ditahan
  vendorNetAmount: number;   // Jumlah bersih yang diterima vendor
}

export interface ProjectFinancialSummary {
  baseTotal: number;         // Nilai kontrak awal
  additionalWorksTotal: number; // Total pekerjaan tambahan
  reductionTotal: number;    // Total pengurangan pekerjaan
  currentTotal: number;      // Nilai proyek saat ini
  clientFunds: number;       // Dana yang sudah dibayar client
  vendorPaid: number;        // Dana yang sudah dibayar ke vendor
  retentionHeld: number;     // Retensi yang ditahan
  feeEarned: number;         // Fee yang diterima admin
  adminBalance: number;      // Saldo admin
}

export interface TerminConfig {
  terminNumber: number;
  percentage: number;
  baseAmount: number;
  clientFeeAmount: number;
  totalWithFee: number;
}

export interface BudgetDisplay {
  baseAmount: number;        // Nilai anggaran asli
  clientFeeAmount: number;   // Fee 1%
  totalWithFee: number;      // Total dengan fee
  displayAmount: number;     // Amount to display based on role
  label: string;
  showFee: boolean;          // Whether to show fee breakdown
}

/**
 * Generate default termin configurations based on budget
 * - ≤ 15 juta: 1 termin (100%)
 * - 15-50 juta: 2 termins (50% + 50%)
 * - > 50 juta: 3 termins (40% + 30% + 30%)
 */
export function generateDefaultTermins(budget: number): TerminConfig[] {
  const termins: TerminConfig[] = [];
  
  if (budget <= BUDGET_THRESHOLD_1_TERMIN) {
    // 1 termin: 100%
    const percentage = 100;
    const baseAmount = budget;
    const clientFeeAmount = baseAmount * (CLIENT_FEE_PERCENT / 100);
    
    termins.push({
      terminNumber: 1,
      percentage,
      baseAmount,
      clientFeeAmount,
      totalWithFee: baseAmount + clientFeeAmount,
    });
  } else if (budget <= BUDGET_THRESHOLD_2_TERMIN) {
    // 2 termins: 50% + 50%
    for (let i = 1; i <= 2; i++) {
      const percentage = 50;
      const baseAmount = budget * (percentage / 100);
      const clientFeeAmount = baseAmount * (CLIENT_FEE_PERCENT / 100);
      
      termins.push({
        terminNumber: i,
        percentage,
        baseAmount,
        clientFeeAmount,
        totalWithFee: baseAmount + clientFeeAmount,
      });
    }
  } else {
    // 3 termins: 40% + 30% + 30%
    const percentages = [40, 30, 30];
    for (let i = 0; i < 3; i++) {
      const percentage = percentages[i];
      const baseAmount = budget * (percentage / 100);
      const clientFeeAmount = baseAmount * (CLIENT_FEE_PERCENT / 100);
      
      termins.push({
        terminNumber: i + 1,
        percentage,
        baseAmount,
        clientFeeAmount,
        totalWithFee: baseAmount + clientFeeAmount,
      });
    }
  }
  
  return termins;
}

/**
 * Get budget display based on role
 * - Vendor: Shows base amount only (no fee)
 * - Client/Admin/Manager: Shows base amount + client fee
 */
export function getBudgetDisplay(
  budget: number,
  role: 'vendor' | 'client' | 'admin' | 'manager',
  clientFeePercent: number = CLIENT_FEE_PERCENT
): BudgetDisplay {
  const clientFeeAmount = budget * (clientFeePercent / 100);
  const totalWithFee = budget + clientFeeAmount;
  
  // Vendor tidak melihat fee
  if (role === 'vendor') {
    return {
      baseAmount: budget,
      clientFeeAmount: 0,
      totalWithFee: budget,
      displayAmount: budget,
      label: 'Anggaran Proyek',
      showFee: false,
    };
  }
  
  // Client, Admin, Manager melihat fee
  return {
    baseAmount: budget,
    clientFeeAmount,
    totalWithFee,
    displayAmount: totalWithFee,
    label: 'Total dengan Biaya Admin',
    showFee: true,
  };
}

/**
 * Calculate financial breakdown for a milestone payment
 */
export function calculateMilestonePayment(
  grossAmount: number,
  retentionPercent: number = 0,
  clientFeePercent: number = CLIENT_FEE_PERCENT,
  vendorFeePercent: number = VENDOR_FEE_PERCENT
): FinancialBreakdown {
  const clientFeeAmount = grossAmount * (clientFeePercent / 100);
  const totalWithClientFee = grossAmount + clientFeeAmount;
  const vendorFeeAmount = grossAmount * (vendorFeePercent / 100);
  const retentionAmount = grossAmount * (retentionPercent / 100);
  const vendorNetAmount = grossAmount - vendorFeeAmount - retentionAmount;

  return {
    grossAmount,
    clientFeeAmount,
    totalWithClientFee,
    vendorFeeAmount,
    retentionPercent,
    retentionAmount,
    vendorNetAmount,
  };
}

/**
 * Calculate termin amounts for client
 * Termin = baseAmount + client fee
 */
export function calculateTerminAmount(baseAmount: number, clientFeePercent: number = CLIENT_FEE_PERCENT): {
  baseAmount: number;
  clientFeeAmount: number;
  totalWithFee: number;
} {
  const clientFeeAmount = baseAmount * (clientFeePercent / 100);
  const totalWithFee = baseAmount + clientFeeAmount;

  return {
    baseAmount,
    clientFeeAmount,
    totalWithFee,
  };
}

/**
 * Check if client has sufficient funds for next milestone
 * Rule: clientFunds should be >= 110% of milestone price
 */
export function checkClientFundsSufficient(
  clientFunds: number,
  milestonePrice: number
): {
  isSufficient: boolean;
  requiredFunds: number;
  shortage: number;
  warningMessage: string | null;
} {
  const requiredFunds = milestonePrice * (1 + WARNING_BUFFER_PERCENT / 100);
  const isSufficient = clientFunds >= requiredFunds;
  const shortage = isSufficient ? 0 : requiredFunds - clientFunds;

  let warningMessage: string | null = null;
  if (!isSufficient) {
    warningMessage = `Dana client tidak mencukupi. Dibutuhkan minimal ${formatCurrency(requiredFunds)} (110% dari nilai pekerjaan), kekurangan ${formatCurrency(shortage)}`;
  }

  return {
    isSufficient,
    requiredFunds,
    shortage,
    warningMessage,
  };
}

/**
 * Get display amount based on role
 * - Vendor: Harga bersih (setelah fee & retensi)
 * - Client: Harga kotor
 * - Admin: Harga kotor + breakdown fee & retensi
 */
export function getDisplayAmount(
  grossAmount: number,
  retentionPercent: number,
  role: 'vendor' | 'client' | 'admin' | 'manager',
  clientFeePercent: number = CLIENT_FEE_PERCENT,
  vendorFeePercent: number = VENDOR_FEE_PERCENT
): {
  displayAmount: number;
  label: string;
  breakdown?: FinancialBreakdown;
} {
  const breakdown = calculateMilestonePayment(grossAmount, retentionPercent, clientFeePercent, vendorFeePercent);

  switch (role) {
    case 'vendor':
      return {
        displayAmount: breakdown.vendorNetAmount,
        label: 'Nilai Bersih',
        breakdown,
      };
    case 'client':
      return {
        displayAmount: breakdown.grossAmount,
        label: 'Nilai Pekerjaan',
      };
    case 'admin':
    case 'manager':
      return {
        displayAmount: breakdown.grossAmount,
        label: 'Nilai Kotor',
        breakdown,
      };
    default:
      return {
        displayAmount: breakdown.grossAmount,
        label: 'Nilai',
      };
  }
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate project progress statistics
 */
export function calculateProjectStatistics(
  milestones: Array<{
    price: number;
    status: string;
    persentase: number;
  }>,
  termins: Array<{
    totalWithFee: number;
    status: string;
    type: string;
  }>,
  adminData: {
    clientFunds: number;
    vendorPaid: number;
    retentionHeld: number;
    feeEarned: number;
  } | null
): {
  totalMilestones: number;
  completedMilestones: number;
  activeMilestones: number;
  pendingMilestones: number;
  totalValue: number;
  completedValue: number;
  progress: number;
  valueProgress: number;
  totalTerminValue: number;
  paidTerminValue: number;
  terminProgress: number;
  totalPaid: number;
} {
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const activeMilestones = milestones.filter(m => m.status === 'active').length;
  const pendingMilestones = milestones.filter(m => m.status === 'pending').length;

  const totalValue = milestones.reduce((sum, m) => sum + m.price, 0);
  const completedValue = milestones
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + m.price, 0);

  const progress = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0;

  const valueProgress = totalValue > 0
    ? Math.round((completedValue / totalValue) * 100)
    : 0;

  // Termin statistics
  const totalTerminValue = termins
    .filter(t => t.type !== 'reduction')
    .reduce((sum, t) => sum + t.totalWithFee, 0);

  const paidTerminValue = termins
    .filter(t => t.status === 'paid' && t.type !== 'reduction')
    .reduce((sum, t) => sum + t.totalWithFee, 0);

  const terminProgress = totalTerminValue > 0
    ? Math.round((paidTerminValue / totalTerminValue) * 100)
    : 0;

  const totalPaid = adminData?.vendorPaid || 0;

  return {
    totalMilestones,
    completedMilestones,
    activeMilestones,
    pendingMilestones,
    totalValue,
    completedValue,
    progress,
    valueProgress,
    totalTerminValue,
    paidTerminValue,
    terminProgress,
    totalPaid,
  };
}
