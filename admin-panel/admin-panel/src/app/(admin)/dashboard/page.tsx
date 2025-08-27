"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography, Button } from "@mui/material";
import Grid from "@mui/material/Grid"; 
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";

// ----- Types -----
type SummaryResponse = {
  active_rentals: number;
  umbrellas_available: number;
  revenue: number; 
};

// ----- Helpers -----
const fmtNumber = (n: number) => new Intl.NumberFormat().format(n);
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(n);

// Maps quick range to [from, to] (YYYY-MM-DD)
function rangeToDates(range: "7d" | "30d" | "90d"): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  from.setDate(to.getDate() - (days - 1));
  const pad = (x: number) => String(x).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: iso(from), to: iso(to) };
}

// ----- KPI Card -----
function KpiCard({
  title,
  value,
  loading,
  onClick,
  emphasize = false,
}: {
  title: string;
  value: string;
  loading?: boolean;
  onClick?: () => void;
  emphasize?: boolean;
}) {
  return (
    <Card
      sx={{
        cursor: onClick ? "pointer" : "default",
        borderWidth: emphasize ? 2 : 1,
        borderStyle: "solid",
        borderColor: emphasize ? "primary.main" : "divider",
      }}
      onClick={onClick}
    >
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, minHeight: 40 }}>
          {loading ? "…" : value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ----- Page -----
export default function DashboardPage() {
  const router = useRouter();
  const [quickRange, setQuickRange] = useState<"7d" | "30d" | "90d">("7d");
  const { from, to } = useMemo(() => rangeToDates(quickRange), [quickRange]);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { date_from: from, date_to: to };
    const res = await api.get("/admin/metrics/summary", { params });
    setSummary(res.data as SummaryResponse);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const revenueNoRefunds =
    summary ? Math.max(0, (summary.revenue || 0) ) : 0;

  return (
    <Stack spacing={3}>
      {/* Header / range control */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Dashboard
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={quickRange}
          onChange={(_, v) => v && setQuickRange(v)}
        >
          <ToggleButton value="7d">Last 7d</ToggleButton>
          <ToggleButton value="30d">Last 30d</ToggleButton>
          <ToggleButton value="90d">Last 90d</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {from} → {to}
        </Typography>
      </Box>

      {/* KPI row */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            title="Active Rentals"
            value={fmtNumber(summary?.active_rentals ?? 0)}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            title="Umbrellas Available"
            value={fmtNumber(summary?.umbrellas_available ?? 0)}
            loading={loading}
            onClick={() => router.push("/umbrellas?status=available")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <KpiCard
            title="Revenue"
            value={fmtCurrency(revenueNoRefunds)}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={() => router.push(`/umbrellas?date_from=${from}&date_to=${to}`)}>
          View Umbrellas
        </Button>
        <Button variant="outlined" onClick={() => router.push(`/users?date_from=${from}&date_to=${to}`)}>
          View Users
        </Button>
        <Button variant="outlined" onClick={() => router.push(`/vendors?date_from=${from}&date_to=${to}`)}>
          View Vendors
        </Button>
      </Box>
    </Stack>
  );
}