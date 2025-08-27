"use client";
import { useState } from "react";
import { Box, Button, Card, CardContent, Stack, TextField, Typography, Alert } from "@mui/material";
import api from "@/app/lib/api";
import { setToken } from "@/app/lib/auth";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const res = await api.post("/auth/admin/login", { email, password });
      setToken(res.data.access_token);
      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" minHeight="100vh" alignItems="center" justifyContent="center" p={2}>
      <Card sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Ombrello Admin Login</Typography>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              <TextField label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
