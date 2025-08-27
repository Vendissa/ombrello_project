"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Card, CardContent, IconButton,
  InputAdornment, Stack, TextField, Typography, Menu, MenuItem, Tooltip, Chip,
  ChipProps, Alert, CircularProgress, Autocomplete
} from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import api from "@/app/lib/api";

type UmbrellaStatus = "available" | "rented" | "maintenance" | "lost" | "retired";
type UmbrellaCondition = "good" | "worn" | "needs_repair" | "broken";

type Umbrella = {
  id: string;
  code: string;
  vendor_id: string | null;
  shop_name: string | null;
  status: UmbrellaStatus;
  condition: UmbrellaCondition;
  rented_date: string | null;
  created_at: string;
  updated_at: string;
};

type VendorOption = { id: string; label: string; shopName: string; meta?: string };

// Small debounce hook
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function UmbrellasPage() {
  // table data
  const [rows, setRows] = useState<Umbrella[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<UmbrellaStatus | "">("");

  // vendor search state (shared)
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);

  // Filter vendor state
  const [vendorFilterInput, setVendorFilterInput] = useState("");
  const debouncedVendorFilterInput = useDebounced(vendorFilterInput, 300);
  const [vendorFilterOpt, setVendorFilterOpt] = useState<VendorOption | null>(null);

  // Bulk vendor state
  const [bulkVendorInput, setBulkVendorInput] = useState("");
  const debouncedBulkVendorInput = useDebounced(bulkVendorInput, 300);
  const [bulkVendorOpt, setBulkVendorOpt] = useState<VendorOption | null>(null);

  // Keep selected items in options
  const mergedVendorOptions = useMemo(() => {
    const map = new Map(vendorOptions.map(o => [o.id, o]));
    if (vendorFilterOpt && !map.has(vendorFilterOpt.id)) map.set(vendorFilterOpt.id, vendorFilterOpt);
    if (bulkVendorOpt && !map.has(bulkVendorOpt.id)) map.set(bulkVendorOpt.id, bulkVendorOpt);
    return Array.from(map.values());
  }, [vendorOptions, vendorFilterOpt, bulkVendorOpt]);

  // bulk add
  const [bulkShopName, setBulkShopName] = useState("");
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [bulkMsg, setBulkMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // row menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<Umbrella | null>(null);
  const menuOpen = Boolean(anchorEl);

  const statuses: UmbrellaStatus[] = ["available", "rented", "maintenance", "lost", "retired"];

  // Server-side vendor search (only active vendors)
  useEffect(() => {
    let cancelled = false;
    const run = async (term: string) => {
      setVendorLoading(true);
      try {
        const res = await api.get("/admin/vendors", {
          params: {
            page: 1,
            page_size: 20,
            status: "active",
            sort: "shop_name",
            q: term || undefined,
          },
        });
        if (cancelled) return;
        const items = (res.data?.items || []).filter(Boolean);
        const opts: VendorOption[] = items.map((v: any) => ({
          id: v.id,
          label: v.shop_name || v.email || v.id,
          shopName: v.shop_name || "",
          meta: [v.shop_owner_name, v.email, v.business_reg_no].filter(Boolean).join(" • "),
        }));
        setVendorOptions(opts);
      } finally {
        if (!cancelled) setVendorLoading(false);
      }
    };
    const term = debouncedVendorFilterInput || debouncedBulkVendorInput || "";
    run(term);
    return () => { cancelled = true; };
  }, [debouncedVendorFilterInput, debouncedBulkVendorInput]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: page + 1,
        page_size: pageSize,
        sort: "-created_at",
      };
      if (q) params.q = q;
      if (status) params.status = status;
      if (vendorFilterOpt?.id) params.vendor_id = vendorFilterOpt.id;

      const res = await api.get("/admin/umbrellas", { params });
      const items = Array.isArray(res.data?.items) ? res.data.items.filter(Boolean) : [];

      setRows(items.map((x: any) => ({
        id: x.id,
        code: x.code ?? "",
        vendor_id: x.vendor_id ?? null,
        shop_name: x.shop_name ?? null,
        status: x.status ?? "available",
        condition: x.condition ?? "good",
        rented_date: x.rented_date ?? null,
        created_at: x.created_at,
        updated_at: x.updated_at,
      })));
      setTotal(res.data?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, status, vendorFilterOpt?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtDate = (s?: string | null) => (s ? new Date(String(s)).toLocaleString() : "—");

  const statusChip = (s: UmbrellaStatus) => {
    const color: ChipProps["color"] =
      s === "available" ? "success" :
      s === "rented" ? "info" :
      s === "maintenance" ? "warning" :
      "default";
    return <Chip label={s} color={color} size="small" />;
  };

  const conditionChip = (c: UmbrellaCondition) => {
    const color: ChipProps["color"] =
      c === "good" ? "success" : c === "worn" ? "warning" : c === "needs_repair" ? "error" : "default";
    return <Chip label={c} color={color} size="small" variant={c === "good" ? "filled" : "outlined"} />;
  };

  const setUmbrellaStatus = async (u: Umbrella, target: UmbrellaStatus) => {
    const prev = rows;
    setRows(prev => prev.map(r => r.id === u.id ? { ...r, status: target, rented_date: target === "rented" ? r.rented_date : null } : r));
    setAnchorEl(null);
    try {
      await api.patch(`/admin/umbrellas/${u.id}`, { status: target });
      fetchData();
    } catch {
      setRows(prev);
    }
  };

  const retireUmbrella = async (u: Umbrella) => {
    const prev = rows;
    setRows(prev => prev.map(r => r.id === u.id ? { ...r, status: "retired" } : r));
    setAnchorEl(null);
    try {
      await api.delete(`/admin/umbrellas/${u.id}`);
      fetchData();
    } catch {
      setRows(prev);
    }
  };

  const onSearchApply = () => {
    setPage(0);
    fetchData();
  };

  const onBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkMsg(null);
    try {
      if (!bulkVendorOpt?.id) throw new Error("Please select a vendor");
      const payload = {
        count: bulkCount,
        vendor_id: bulkVendorOpt.id,
        shop_name: bulkShopName || undefined,
      };
      const res = await api.post("/admin/umbrellas/bulk", payload);
      const created = res.data as Umbrella[];
      const codes = (created || []).map(u => u.code).join(", ");
      setBulkMsg({ type: "success", text: `Created ${created.length} umbrellas: ${codes}` });
      setPage(0);
      fetchData();
    } catch (err: any) {
      setBulkMsg({ type: "error", text: err?.message || "Bulk add failed" });
    }
  };

  return (
    <Stack spacing={2}>
      {/* Filters */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchApply()}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />

            <TextField
              select size="small" label="Status" value={status}
              onChange={(e) => { setStatus((e.target.value as UmbrellaStatus) || ""); setPage(0); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>

            {/* Vendor filter: searchable */}
            <Autocomplete
              sx={{ minWidth: 300 }}
              options={mergedVendorOptions}
              value={vendorFilterOpt}
              onChange={(_, val) => { setVendorFilterOpt(val); setPage(0); }}
              inputValue={vendorFilterInput}
              onInputChange={(_, val) => setVendorFilterInput(val)}
              getOptionLabel={(o) => o?.label ?? ""}
              filterOptions={(opts) => opts}
              loading={vendorLoading}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Vendor (filter)"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {vendorLoading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">{option.label}</Typography>
                    {option.meta && (
                      <Typography variant="caption" color="text.secondary">{option.meta}</Typography>
                    )}
                  </Box>
                </li>
              )}
            />

            <Button variant="outlined" onClick={onSearchApply}>Apply</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Bulk add */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Bulk add umbrellas to a shop</Typography>
          <Box component="form" onSubmit={onBulkAdd}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              {/* Vendor picker with search */}
              <Autocomplete
                sx={{ minWidth: 300 }}
                options={mergedVendorOptions}
                value={bulkVendorOpt}
                onChange={(_, val) => {
                  setBulkVendorOpt(val);
                  // Auto-fill shop name from vendor if empty
                  if (val && !bulkShopName) setBulkShopName(val.shopName || val.label);
                }}
                inputValue={bulkVendorInput}
                onInputChange={(_, val) => setBulkVendorInput(val)}
                getOptionLabel={(o) => o?.label ?? ""}
                filterOptions={(opts) => opts}
                loading={vendorLoading}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    size="small"
                    label="Vendor"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {vendorLoading ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body2">{option.label}</Typography>
                      {option.meta && (
                        <Typography variant="caption" color="text.secondary">{option.meta}</Typography>
                      )}
                    </Box>
                  </li>
                )}
              />

              <TextField
                label="Shop name"
                placeholder="Shop label for umbrellas"
                fullWidth
                value={bulkShopName}
                onChange={(e) => setBulkShopName(e.target.value)}
                size="small"
                required
              />

              <TextField
                label="Count"
                type="number"
                inputProps={{ min: 1, max: 1000 }}
                sx={{ width: { xs: "100%", md: 160 } }}
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value || 1))}
                required
                size="small"
              />

              <Button type="submit" variant="contained" sx={{ width: { xs: "100%", md: 200 } }}>
                Generate & Assign
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Generated umbrellas have <b>status=available</b>, <b>condition=good</b>, and <b>rented_date=null</b>.
          </Typography>
          {bulkMsg && (
            <Alert severity={bulkMsg.type} sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
              {bulkMsg.text}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Shop</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Condition</TableCell>
              <TableCell>Rented Date</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.code}</TableCell>
                <TableCell>{u.vendor_id || "—"}</TableCell>
                <TableCell>{u.shop_name || "—"}</TableCell>
                <TableCell>{statusChip(u.status)}</TableCell>
                <TableCell>{conditionChip(u.condition)}</TableCell>
                <TableCell>{fmtDate(u.rented_date)}</TableCell>
                <TableCell>{fmtDate(u.created_at)}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setMenuRow(u); }}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography p={2}>{loading ? "Loading…" : "No umbrellas found."}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      {/* Actions menu */}
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
        <MenuItem
          disabled={!menuRow || menuRow?.status === "available"}
          onClick={() => menuRow && setUmbrellaStatus(menuRow, "available")}
        >
          Mark as available
        </MenuItem>
        <MenuItem
          disabled={!menuRow || menuRow?.status === "maintenance"}
          onClick={() => menuRow && setUmbrellaStatus(menuRow, "maintenance")}
        >
          Mark maintenance
        </MenuItem>
        <MenuItem
          disabled={!menuRow || menuRow?.status === "lost"}
          onClick={() => menuRow && setUmbrellaStatus(menuRow, "lost")}
        >
          Mark lost
        </MenuItem>
        <MenuItem
          disabled={!menuRow || menuRow?.status === "retired"}
          onClick={() => menuRow && retireUmbrella(menuRow)}
        >
          Retire
        </MenuItem>
      </Menu>
    </Stack>
  );
}
