import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUser } from "@/lib/auth";

export default function Debug() {
  const { user, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Manager");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    try {
      setError(null);
      setResult(null);
      await signUp(email, password, name, role as any);
      setResult("Signup successful!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      setResult(null);
      await signIn(email, password);
      setResult("Signin successful!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      setResult(null);
      await signOut();
      setResult("Signout successful!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const checkStorage = () => {
    const currentUser = getCurrentUser();
    const token = localStorage.getItem("sl_token");
    setResult({
      currentUser,
      token: token ? "Present" : "Missing",
      localStorage: {
        sl_session: localStorage.getItem("sl_session"),
        sl_token: token ? "Present" : "Missing"
      }
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current User:</Label>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Test User"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Manager"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSignUp}>Sign Up</Button>
            <Button onClick={handleSignIn}>Sign In</Button>
            <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
            <Button onClick={checkStorage} variant="secondary">Check Storage</Button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong>Result:</strong>
              <pre className="mt-2 text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
