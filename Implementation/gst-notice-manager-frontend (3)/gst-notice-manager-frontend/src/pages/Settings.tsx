import { useEffect, useState } from "react";
import { Loader2, User as UserIcon, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { USE_MOCKS, API_URL } from "@/lib/api";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dueReminders, setDueReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  useEffect(() => {
    document.title = "Settings — GST Notice Manager";
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setFirmName(user.firmName || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await authService.updateProfile(user.id, { name, firmName, phone });
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, preferences, and account.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Profile</CardTitle>
          </div>
          <CardDescription>Update your personal and firm details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firm">Firm name</Label>
                <Input id="firm" value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Sharma Associates" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <CardDescription>Choose what we email you about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Email alerts"
            description="Get notified when a notice is parsed or status changes."
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
          <Separator />
          <ToggleRow
            label="Due-date reminders"
            description="Reminder 3 days before any notice response is due."
            checked={dueReminders}
            onChange={setDueReminders}
          />
          <Separator />
          <ToggleRow
            label="Weekly digest"
            description="Summary of all active cases every Monday morning."
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Role" value={user?.role === "admin" ? "Administrator" : "Chartered Accountant"} />
          <Row label="API endpoint" value={API_URL} mono />
          <Row label="Backend mode" value={USE_MOCKS ? "Mock (in-memory)" : "Live (your Node/Express server)"} />
        </CardContent>
      </Card>
    </div>
  );
};

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
  </div>
);

export default Settings;
