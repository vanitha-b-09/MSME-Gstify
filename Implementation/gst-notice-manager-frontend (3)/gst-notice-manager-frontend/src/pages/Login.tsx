import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Scale, Loader2 } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { USE_MOCKS } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Sign in — GST Notice Manager";
  }, []);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ variant: "destructive", title: "Invalid input", description: parsed.error.issues[0].message });
      return;
    }
    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      const to = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/dashboard";
      navigate(to, { replace: true });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Unable to sign in",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)]">
            <Scale className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">GST Notice Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">Respond to GST notices, faster.</p>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@firm.in"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Create an account
                </Link>
              </p>
            </form>

            {USE_MOCKS && (
              <div className="mt-6 rounded-md border border-dashed bg-muted/40 p-3 text-xs">
                <p className="mb-1 font-semibold text-foreground">Demo accounts (mock mode)</p>
                <p className="text-muted-foreground">CA: <code>ca@demo.in</code> / <code>ca12345</code></p>
                <p className="text-muted-foreground">Admin: <code>admin@demo.in</code> / <code>admin123</code></p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
