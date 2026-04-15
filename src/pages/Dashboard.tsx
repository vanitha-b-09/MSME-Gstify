import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, FileText, Clock, CheckCircle, AlertTriangle, Shield, PieChart as PieChartIcon, TrendingUp, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientCard } from "@/components/ClientCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockClients, mockInvoices, mockFraudAlerts, monthlyData } from "@/data/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = mockClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const gstReady = mockInvoices.filter((i) => i.classification === "gst-ready").length;
  const needsReview = mockInvoices.filter((i) => i.classification === "needs-review").length;
  const nonGst = mockInvoices.filter((i) => i.classification === "non-gst").length;

  const pieData = [
    { name: "GST-ready", value: gstReady, color: "hsl(142, 71%, 45%)" },
    { name: "Needs Review", value: needsReview, color: "hsl(38, 92%, 50%)" },
    { name: "Non-GST", value: nonGst, color: "hsl(0, 72%, 51%)" },
  ];

  const stats = [
    { label: "Total Invoices", value: mockInvoices.length, icon: FileText, color: "text-primary" },
    { label: "GST-ready", value: gstReady, icon: CheckCircle, color: "text-success" },
    { label: "Needs Review", value: needsReview, icon: Clock, color: "text-warning" },
    { label: "Non-GST", value: nonGst, icon: AlertTriangle, color: "text-destructive" },
  ];

  const notifications = [
    { icon: Bell, text: "GSTR-3B filing due in 5 days", type: "warning" as const },
    { icon: AlertTriangle, text: "3 invoices missing for Patel Trading Co.", type: "error" as const },
    { icon: Clock, text: "2 late invoice uploads detected", type: "warning" as const },
    { icon: Shield, text: "Duplicate invoice alert for Steel Corp India", type: "error" as const },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">AI-powered invoice intelligence overview</p>
            </div>
            <Button className="gradient-primary text-primary-foreground gap-2 font-semibold" onClick={() => navigate("/clients")}>
              <Users className="w-4 h-4" /> View Clients
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <Card key={stat.label} className="animate-fade-in-up border-border/60" style={{ animationDelay: `${i * 80}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-muted`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Pie Chart */}
            <Card className="animate-fade-in-up border-border/60" style={{ animationDelay: "200ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-primary" /> Invoice Classification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="lg:col-span-2 animate-fade-in-up border-border/60" style={{ animationDelay: "300ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Monthly Invoice Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="invoices" fill="hsl(239, 84%, 67%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Notifications & Fraud Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="animate-fade-in-up border-border/60" style={{ animationDelay: "400ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-warning" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.map((n, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${n.type === "error" ? "bg-destructive/5 border border-destructive/10" : "bg-warning/5 border border-warning/10"}`}>
                    <n.icon className={`w-4 h-4 mt-0.5 ${n.type === "error" ? "text-destructive" : "text-warning"}`} />
                    <p className="text-sm">{n.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="animate-fade-in-up border-border/60" style={{ animationDelay: "500ms" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" /> Fraud Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockFraudAlerts.map((alert) => (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.severity === "high" ? "bg-destructive/5 border-destructive/10" : alert.severity === "medium" ? "bg-warning/5 border-warning/10" : "bg-muted border-border/60"}`}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === "high" ? "text-destructive" : alert.severity === "medium" ? "text-warning" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm">{alert.message}</p>
                      <span className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded-full ${alert.severity === "high" ? "bg-destructive/10 text-destructive" : alert.severity === "medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Clients Section */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Clients</h2>
            <Button size="sm" className="gradient-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Add Client
            </Button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." className="pl-10 max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((client, i) => (
              <ClientCard key={client.id} client={client} index={i} onSelect={(id) => navigate(`/client/${id}`)} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
