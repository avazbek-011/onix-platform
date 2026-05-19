"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api, setToken, setStoredUser, type LoginResponse } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/api/auth/login", { username, password });
      setToken(res.access_token);
      setStoredUser(res.user);
      toast.success(`Xush kelibsiz, ${res.user.full_name || res.user.username}!`);
      router.push(res.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center glow-primary mb-4">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Onix Platform</h1>
          <p className="text-muted-foreground mt-1">Tizimga kirish</p>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl p-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Login</Label>
            <Input
              id="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="login"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Kirish
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Boshliq: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">admin</code> /{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">admin123</code>
          </p>
        </form>
      </div>
    </div>
  );
}
