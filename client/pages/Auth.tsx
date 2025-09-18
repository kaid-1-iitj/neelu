import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { UserRole } from "../../shared/api";
import { onboardSociety } from "@/lib/api";

export default function AuthPage() {
  return (
    <div className="container py-12 md:py-16 grid place-items-center">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Society Ledgers</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          await signIn(email, password);
          navigate("/dashboard");
        } catch (err: any) {
          setError(err?.message || "Login failed");
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-background/60"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="bg-background/60"
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" disabled={loading} className="bg-primary">
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Manager");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addSociety, setAddSociety] = useState<boolean>(false);
  const [societyName, setSocietyName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [societyEmail, setSocietyEmail] = useState("");
  const [societyPhone, setSocietyPhone] = useState("");
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  const roles: UserRole[] = ["Manager", "Treasurer", "Secretary", "President"];

  const handleSendOTP = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { sendOTP } = await import("../lib/api");
      await sendOTP({ email });
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp(email, password, name, role, otp);
      if (addSociety) {
        try {
          const res = await onboardSociety({
            name: societyName,
            address: { street, city, state, zip },
            contactInfo: { email: societyEmail || undefined, phone: societyPhone || undefined },
          });
          setPendingMsg(
            `Your society approval is pending from admin. Please contact administrator at email: noreply@societyledgers.com. (Request ID: ${res.id})`
          );
        } catch (err: any) {
          setError(err?.message || "Failed to submit society for approval");
        } finally {
          setLoading(false);
        }
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      if (!addSociety) setLoading(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSignup}>
      {pendingMsg ? (
        <div className="text-sm text-foreground bg-background/60 border border-border/60 rounded p-3">{pendingMsg}</div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="bg-background/60"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-background/60"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="bg-background/60"
        />
      </div>
      <div className="grid gap-2">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger className="bg-background/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* OTP Section */}
      <div className="grid gap-2">
        <Label htmlFor="otp">Verification Code</Label>
        <div className="flex gap-2">
          <Input
            id="otp"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            className="bg-background/60"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSendOTP}
            disabled={loading || otpSent}
            className="whitespace-nowrap"
          >
            {otpSent ? "Sent" : "Send OTP"}
          </Button>
        </div>
        {otpSent && (
          <p className="text-sm text-green-600">OTP sent to your email. Check your inbox.</p>
        )}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {/* Society Details Opt-in */}
      <div className="mt-2 space-y-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={addSociety} onChange={(e) => setAddSociety(e.target.checked)} />
          Provide society details now (send for admin approval)
        </label>
        {addSociety ? (
          <div className="grid gap-3 border border-border/60 rounded-md p-3 bg-background/40">
            <div className="grid gap-2">
              <Label>Society Name</Label>
              <Input value={societyName} onChange={(e) => setSocietyName(e.target.value)} required className="bg-background/60" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Street</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} required className="bg-background/60" />
              </div>
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} required className="bg-background/60" />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} required className="bg-background/60" />
              </div>
              <div className="grid gap-2">
                <Label>Zip</Label>
                <Input value={zip} onChange={(e) => setZip(e.target.value)} required className="bg-background/60" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Contact Email</Label>
                <Input type="email" value={societyEmail} onChange={(e) => setSocietyEmail(e.target.value)} className="bg-background/60" />
              </div>
              <div className="grid gap-2">
                <Label>Contact Phone</Label>
                <Input value={societyPhone} onChange={(e) => setSocietyPhone(e.target.value)} className="bg-background/60" />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Button type="submit" disabled={loading || !otpSent || !otp} className="bg-accent">
        {loading ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
