import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockInvoices, mockVendors, monthlyData } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Users, FileText } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function Analytics() {
  const totalAmount = mockInvoices.reduce((a, i) => a + i.totalAmount, 0);
  const totalTax = mockInvoices.reduce((a, i) => a + i.taxAmount, 0);
  const topVendors = [...mockVendors].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);

  const taxByRate = [
    { rate: "5%", amount: mockInvoices.filter((i) => i.taxRate === 5).reduce((a, i) => a + i.taxAmount, 0) },
    { rate: "12%", amount: mockInvoices.filter((i) => i.taxRate === 12).reduce((a, i) => a + i.taxAmount, 0) },
    { rate: "18%", amount: mockInvoices.filter((i) => i.taxRate === 18).reduce((a, i) => a + i.taxAmount, 0) },
  ];

  const pieColors = ["hsl(239, 84%, 67%)", "hsl(263, 70%, 58%)", "hsl(142, 71%, 45%)"];

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalAmount), icon: DollarSign },
    { label: "GST Payable", value: formatCurrency(totalTax), icon: TrendingUp },
    { label: "Total Vendors", value: mockVendors.length, icon: Users },
    { label: "Invoice Volume", value: mockInvoices.length, icon: FileText },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold">Advanced Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Insights across all clients and invoices</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
              <Card key={s.label} className="animate-fade-in-up border-border/60" style={{ animationDelay: `${i * 80}ms` }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-muted"><s.icon className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Expense Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,20%,90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(239,84%,67%)" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">GST Payable by Rate</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={taxByRate} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="amount" nameKey="rate">
                      {taxByRate.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {taxByRate.map((d, i) => (
                    <div key={d.rate} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                      <span className="text-muted-foreground">{d.rate}: {formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Volume */}
          <Card className="mb-8 border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Invoice Volume by Month</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,20%,90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="invoices" fill="hsl(263,70%,58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Vendors */}
          <Card className="border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Vendors by Amount</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topVendors.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.invoiceCount} invoices</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(v.totalAmount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
