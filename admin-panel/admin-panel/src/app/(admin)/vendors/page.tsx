"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Card, CardContent, IconButton,
  InputAdornment, Stack, TextField, Typography, Menu, MenuItem, Tooltip, ChipProps, Chip
} from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import api, { downloadBlob } from "@/app/lib/api";

type VendorStatus = "active" | "suspended" | "pending";
type Vendor = {
  id: string;
  shop_name: string;
  shop_owner_name: string;
  email: string;
  business_reg_no: string;
  telephone?: string;
  status?: VendorStatus; // may be missing for older docs
};

export default function VendorsPage() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [q, setQ] = useState("");
  const [status, setStatusFilter] = useState<VendorStatus | "">("");
  const [businessRegNo, setBusinessRegNo] = useState("");
  const [loading, setLoading] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<Vendor | null>(null);
  const menuOpen = Boolean(anchorEl);

  const statuses = useMemo<VendorStatus[]>(() => ["active", "suspended", "pending"], []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = {
      page: page + 1,
      page_size: pageSize,
      sort: "-created_at",
    };
    if (q) params.q = q;               // search by shop name / owner / email
    if (status) params.status = status;
    if (businessRegNo) params.business_reg_no = businessRegNo;

    const res = await api.get("/admin/vendors", { params });
    setRows(res.data.items);
    setTotal(res.data.total);
    setLoading(false);
  }, [page, pageSize, q, status, businessRegNo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const badge = (s?: VendorStatus) => {
    if (!s) return <Chip label="unset" size="small" variant="outlined" />;
    const color: ChipProps["color"] =
      s === "active" ? "success" : s === "pending" ? "info" : "warning";
    return <Chip label={s} color={color} size="small" />;
  };

  const exportCsv = async () => {
    await downloadBlob("/admin/vendors/export", "vendors.csv");
  };

  // --- NEW: generic status setter with optimistic update ---
  const setStatus = async (v: Vendor, target: VendorStatus) => {
    // optimistic UI
    const prev = rows;
    setRows(prev => prev.map(r => r.id === v.id ? { ...r, status: target } : r));
    setAnchorEl(null);

    try {
      await api.patch(`/admin/vendors/${v.id}/status`, { status: target });
      // Optionally refresh to keep pagination/filters exact
      fetchData();
    } catch {
      // rollback on error
      setRows(prev);
    }
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search shop, owner, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(0), fetchData())}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <TextField
              select size="small" label="Status" value={status}
              onChange={(e) => { setStatusFilter((e.target.value as VendorStatus) || ""); setPage(0); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField
              size="small" label="Business Reg. No." value={businessRegNo}
              onChange={(e) => { setBusinessRegNo(e.target.value); setPage(0); }}
            />
            <Button variant="outlined" onClick={() => { setPage(0); fetchData(); }}>Apply</Button>
            <Box flex={1} />
            <Tooltip title="Export CSV">
              <Button variant="contained" onClick={exportCsv} startIcon={<DownloadIcon />}>Export CSV</Button>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Shop</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telephone</TableCell>
              <TableCell>Business Reg. No.</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>{v.shop_name}</TableCell>
                <TableCell>{v.shop_owner_name}</TableCell>
                <TableCell>{v.email}</TableCell>
                <TableCell>{v.telephone || "—"}</TableCell>
                <TableCell>{v.business_reg_no || "—"}</TableCell>
                <TableCell>{badge(v.status)}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setMenuRow(v); }}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={9}><Typography p={2}>{loading ? "Loading…" : "No vendors found."}</Typography></TableCell></TableRow>
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

      {/* NEW: richer Actions menu */}
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
        <MenuItem
          disabled={!menuRow || menuRow?.status === "active"}
          onClick={() => menuRow && setStatus(menuRow, "active")}
        >
          Activate
        </MenuItem>
        <MenuItem
          disabled={!menuRow || menuRow?.status === "suspended"}
          onClick={() => menuRow && setStatus(menuRow, "suspended")}
        >
          Suspend
        </MenuItem>
        <MenuItem
          disabled={!menuRow || menuRow?.status === "pending"}
          onClick={() => menuRow && setStatus(menuRow, "pending")}
        >
          Mark as pending
        </MenuItem>
      </Menu>
    </Stack>
  );
}
