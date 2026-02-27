"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/components/ui/glass-card";
import { formatCurrency } from "@/lib/financial";
import { Loader2, TrendingUp, PieChart, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RevenueByMonth {
  month: string;
  label: string;
  feeClient: number;
  feeVendor: number;
  total: number;
}

interface ProjectsByMonth {
  month: string;
  label: string;
  created: number;
  completed: number;
}

interface ClientStatusItem {
  name: string;
  value: number;
  status: string;
}

const COLORS = ["#8B5CF6", "#FF9013", "#10B981", "#3B82F6", "#EF4444"];

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [financial, setFinancial] = useState<{
    revenueByMonth: RevenueByMonth[];
    summary: { totalRevenue: number; totalFeeClient: number; totalFeeVendor: number; avgMonthlyRevenue: number };
  } | null>(null);
  const [business, setBusiness] = useState<{
    projectsByMonth: ProjectsByMonth[];
    clientStatusDistribution: ClientStatusItem[];
  } | null>(null);
  const [months, setMonths] = useState(12);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [finRes, busRes] = await Promise.all([
        fetch(`/api/admin/analytics/financial?months=${months}`),
        fetch(`/api/admin/analytics/business?months=${months}`),
      ]);
      const finData = await finRes.json();
      const busData = await busRes.json();

      if (finData.success) setFinancial(finData);
      else toast({ title: "Error", description: finData.message || "Gagal memuat analitik keuangan", variant: "destructive" });

      if (busData.success) setBusiness(busData);
      else toast({ title: "Error", description: busData.message || "Gagal memuat analitik bisnis", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan saat memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [months]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Analitik</h1>
            <p className="text-slate-400 mt-1">Analitik keuangan dan bisnis</p>
          </div>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value, 10))}
            className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
          >
            <option value={6}>6 bulan terakhir</option>
            <option value={12}>12 bulan terakhir</option>
            <option value={18}>18 bulan terakhir</option>
            <option value={24}>24 bulan terakhir</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
          </div>
        ) : (
          <>
            {/* Analitik Keuangan */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Analitik Keuangan
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                {financial && financial.revenueByMonth.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-400">Total Pendapatan</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(financial.summary.totalRevenue)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-400">Fee Client</p>
                        <p className="text-lg font-bold text-[#FF9013]">{formatCurrency(financial.summary.totalFeeClient)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-400">Fee Vendor</p>
                        <p className="text-lg font-bold text-purple-400">{formatCurrency(financial.summary.totalFeeVendor)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-slate-400">Rata-rata / Bulan</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(financial.summary.avgMonthlyRevenue)}</p>
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={financial.revenueByMonth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                            labelStyle={{ color: "#94a3b8" }}
                            formatter={(value: number) => [formatCurrency(value), ""]}
                            labelFormatter={(label) => label}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="feeClient" name="Fee Client" stroke="#FF9013" strokeWidth={2} dot={{ fill: "#FF9013" }} />
                          <Line type="monotone" dataKey="feeVendor" name="Fee Vendor" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: "#8B5CF6" }} />
                          <Line type="monotone" dataKey="total" name="Total" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-center py-12">Belum ada data pendapatan untuk periode ini.</p>
                )}
              </GlassCardContent>
            </GlassCard>

            {/* Analitik Bisnis */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Proyek per Bulan
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                {business && business.projectsByMonth.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={business.projectsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                        />
                        <Legend />
                        <Bar dataKey="created" name="Dibuat" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completed" name="Selesai" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-12">Belum ada data proyek untuk periode ini.</p>
                )}
              </GlassCardContent>
            </GlassCard>

            {/* Distribusi Status Client */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-white">
                  <PieChart className="w-5 h-5 text-amber-500" />
                  Status Client (Siapa yang Menggunakan Web)
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                {business && business.clientStatusDistribution.some((c) => c.value > 0) ? (
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <div className="h-72 w-full lg:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie data={business.clientStatusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                          {business.clientStatusDistribution.map((entry, index) => (
                            <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                          ))}
                          <Tooltip
                            contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                            formatter={(value: number, name: string, props: { payload: ClientStatusItem }) => {
                              const total = business!.clientStatusDistribution.reduce((s, c) => s + c.value, 0);
                              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                              return [`${value} proyek (${pct}%)`, props.payload.name];
                            }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 lg:flex-col">
                      {business.clientStatusDistribution.map((entry, index) => (
                        <div key={entry.status} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-slate-300">{entry.name}:</span>
                          <span className="font-semibold text-white">{entry.value} proyek</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-12">Belum ada data status client. Buat proyek baru dengan pilihan Status Client.</p>
                )}
              </GlassCardContent>
            </GlassCard>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
