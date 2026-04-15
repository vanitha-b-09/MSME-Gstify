import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bell, Link2, Save, CheckCircle, Upload } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "Rajesh Kumar",
    email: "rajesh@caoffice.in",
    firm: "Kumar & Associates",
    phone: "+91 98765 43210",
    gstin: "29AABCU9603R1ZM",
  });

  const [notifications, setNotifications] = useState({
    emailOnExtraction: true,
    emailOnExport: true,
    emailOnError: true,
    browserNotifications: false,
    weeklyDigest: true,
    clientUpdates: false,
  });

  const [tally, setTally] = useState({
    exportPath: "C:\\Tally\\Data\\Import",
    version: "Tally Prime",
    companyName: "Kumar & Associates",
    autoMap: true,
    includeNarration: true,
    defaultVoucherType: "Purchase",
  });

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved");
  };

  const handleSaveTally = () => {
    toast.success("Tally configuration saved");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your account, notifications, and integrations
            </p>
          </div>

          <Tabs defaultValue="profile" className="animate-fade-in-up">
            <TabsList className="mb-6">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="tally" className="gap-2">
                <Link2 className="w-4 h-4" />
                Tally Integration
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                  <CardDescription>Update your personal and firm details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                        {profile.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Change Photo
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firm">Firm Name</Label>
                      <Input
                        id="firm"
                        value={profile.firm}
                        onChange={(e) => setProfile({ ...profile, firm: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="gstin">Firm GSTIN</Label>
                      <Input
                        id="gstin"
                        value={profile.gstin}
                        onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} className="gradient-primary text-primary-foreground gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  <CardDescription>Choose how and when you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: "emailOnExtraction" as const, label: "AI Extraction Complete", desc: "Get notified when invoice data extraction finishes" },
                    { key: "emailOnExport" as const, label: "Tally Export Ready", desc: "Receive an email when your Tally file is ready to download" },
                    { key: "emailOnError" as const, label: "Error Alerts", desc: "Be alerted when extraction or validation errors occur" },
                    { key: "browserNotifications" as const, label: "Browser Notifications", desc: "Show desktop push notifications in your browser" },
                    { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "Receive a weekly summary of all client activity" },
                    { key: "clientUpdates" as const, label: "Client Updates", desc: "Get notified when clients upload new invoices" },
                  ].map((item, i) => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifications[item.key]}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, [item.key]: checked })
                          }
                        />
                      </div>
                      {i < 5 && <Separator className="mt-4" />}
                    </div>
                  ))}

                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveNotifications} className="gradient-primary text-primary-foreground gap-2">
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tally Integration Tab */}
            <TabsContent value="tally">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tally Integration</CardTitle>
                  <CardDescription>Configure how invoices are exported to Tally</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-medium">Tally Connected</p>
                      <p className="text-xs text-muted-foreground">Export path is configured and ready</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tallyVersion">Tally Version</Label>
                      <Input
                        id="tallyVersion"
                        value={tally.version}
                        onChange={(e) => setTally({ ...tally, version: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name (in Tally)</Label>
                      <Input
                        id="companyName"
                        value={tally.companyName}
                        onChange={(e) => setTally({ ...tally, companyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="exportPath">Export File Path</Label>
                      <Input
                        id="exportPath"
                        value={tally.exportPath}
                        onChange={(e) => setTally({ ...tally, exportPath: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Local directory where Tally XML files will be saved
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucherType">Default Voucher Type</Label>
                      <Input
                        id="voucherType"
                        value={tally.defaultVoucherType}
                        onChange={(e) => setTally({ ...tally, defaultVoucherType: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto-map Ledger Names</p>
                        <p className="text-xs text-muted-foreground">Automatically match supplier names to Tally ledgers</p>
                      </div>
                      <Switch
                        checked={tally.autoMap}
                        onCheckedChange={(checked) => setTally({ ...tally, autoMap: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Include Narration</p>
                        <p className="text-xs text-muted-foreground">Add invoice details as narration in Tally vouchers</p>
                      </div>
                      <Switch
                        checked={tally.includeNarration}
                        onCheckedChange={(checked) => setTally({ ...tally, includeNarration: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveTally} className="gradient-primary text-primary-foreground gap-2">
                      <Save className="w-4 h-4" />
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
