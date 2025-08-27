"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box, Button, Card, CardContent, IconButton,
  InputAdornment, Stack, TextField, Typography, Menu, MenuItem, Tooltip, Chip,
  ChipProps
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

type UserStatus = "active" | "suspended" | "deleted";
type User = {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  telephone?: string;
  status: UserStatus;
};

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [loading, setLoading] = useState(false);

  // row menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<User | null>(null);
  const menuOpen = Boolean(anchorEl);

  const statuses = useMemo<UserStatus[]>(() => ["active", "suspended", "deleted"], []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = {
      page: page + 1,
      page_size: pageSize,
      sort: "-created_at",
    };
    if (q) params.q = q;
    if (status) params.status = status;

    const res = await api.get("/admin/users", { params });
    setRows(res.data.items);
    setTotal(res.data.total);
    setLoading(false);
  }, [page, pageSize, q, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fullName = (u: User) =>
    [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";

  const badge = (s: UserStatus) => {
    const color: ChipProps["color"] = s === "active" ? "success" : s === "suspended" ? "warning" : "default";
    return <Chip label={s} color={color} size="small" />;
  };

  const exportCsv = async () => {
    await downloadBlob("/admin/users/export", "users.csv");
  };

  const toggleStatus = async (u: User) => {
    const target = u.status === "active" ? "suspended" : "active";
    await api.patch(`/admin/users/${u.id}/status`, { status: target });
    setAnchorEl(null);
    fetchData();
  };

  const resetPassword = async (u: User) => {
    await api.post(`/admin/users/${u.id}/reset-password`);
    setAnchorEl(null);
  };

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search name, email, telephone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(0), fetchData())}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <TextField
              select size="small" label="Status" value={status}
              onChange={(e) => { setStatus((e.target.value as UserStatus) || ""); setPage(0); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
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
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telephone</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{fullName(u)}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.telephone || "—"}</TableCell>
                <TableCell>{badge(u.status)}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setMenuRow(u); }}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8}><Typography p={2}>{loading ? "Loading…" : "No users found."}</Typography></TableCell></TableRow>
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

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { if (menuRow) toggleStatus(menuRow); }}>
          {menuRow?.status === "active" ? "Suspend" : "Activate"}
        </MenuItem>
        <MenuItem onClick={() => { if (menuRow) resetPassword(menuRow); }}>
          Reset password
        </MenuItem>
      </Menu>
    </Stack>
  );
}
