"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, IconButton,
  InputAdornment, Stack, TextField, Typography, Menu, MenuItem, Tooltip
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
import QrCode2Icon from "@mui/icons-material/QrCode2";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import api, { downloadBlob } from "@/app/lib/api";

type Umbrella = {
  id: string;
  umbrella_code: string;
  qr_code: string;
  qr_payload: string;
  status: "available" | "in_use" | "broken" | "lost";
  vendor_id?: string;
  city?: string;
};

export default function UmbrellasPage() {
  const [rows, setRows] = useState<Umbrella[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // QR modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUmbrella, setQrUmbrella] = useState<Umbrella | null>(null);

  // row menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUmbrella, setMenuUmbrella] = useState<Umbrella | null>(null);
  const menuOpen = Boolean(anchorEl);

  const fetchData = async () => {
    setLoading(true);
    const params: any = { page: page + 1, page_size: pageSize, sort: "-created_at" };
    if (q) params.q = q;
    if (status) params.status = status;
    const res = await api.get("/admin/umbrellas", { params });
    setRows(res.data.items);
    setTotal(res.data.total);
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [page, pageSize, status]);

  const openQr = (umb: Umbrella) => {
    setQrUmbrella(umb);
    setQrOpen(true);
  };

  const downloadSvg = async (umb: Umbrella) => {
    const res = await api.get(`/admin/umbrellas/${umb.id}/qr.svg`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${umb.umbrella_code}.svg`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadPng = async (umb: Umbrella) => {
    const res = await api.get(`/admin/umbrellas/${umb.id}/qr.png`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "image/png" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${umb.umbrella_code}.png`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const bulkExport = async (format: "pdf" | "zip") => {
    await downloadBlob("/admin/umbrellas/export-qr", format === "pdf" ? "umbrella_qrs.pdf" : "umbrella_qrs.zip");
  };

  const statuses = useMemo(() => ["available", "in_use", "broken", "lost"], []);

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search code or short code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(0), fetchData())}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <TextField
              select size="small" label="Status" value={status ?? ""}
              onChange={(e) => { setStatus(e.target.value || undefined); setPage(0); }}
              style={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <Button variant="outlined" onClick={() => { setPage(0); fetchData(); }}>Apply</Button>
            <Box flex={1} />
            <Tooltip title="Export PDF sheet">
              <Button variant="contained" onClick={() => bulkExport("pdf")} startIcon={<DownloadIcon />}>Export PDF</Button>
            </Tooltip>
            <Tooltip title="Export ZIP of PNGs">
              <Button variant="outlined" onClick={() => bulkExport("zip")} startIcon={<DownloadIcon />}>Export ZIP</Button>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Umbrella Code</TableCell>
              <TableCell>Short Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.umbrella_code}</TableCell>
                <TableCell>{r.qr_code}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.city || "-"}</TableCell>
                <TableCell>{r.vendor_id || "-"}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Preview QR">
                    <IconButton onClick={() => openQr(r)}><QrCode2Icon /></IconButton>
                  </Tooltip>
                  <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setMenuUmbrella(r); }}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6}><Typography p={2}>{loading ? "Loading…" : "No umbrellas found."}</Typography></TableCell></TableRow>
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

      {/* Row action menu */}
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { if (menuUmbrella) downloadSvg(menuUmbrella); setAnchorEl(null); }}>Download SVG</MenuItem>
        <MenuItem onClick={() => { if (menuUmbrella) downloadPng(menuUmbrella); setAnchorEl(null); }}>Download PNG</MenuItem>
      </Menu>

      {/* QR Preview */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>QR — {qrUmbrella?.umbrella_code}</DialogTitle>
        <DialogContent>
          {qrUmbrella && (
            <Box display="flex" justifyContent="center" my={2}>
              {/* Show the SVG directly from backend */}
              <img
                alt="QR"
                src={`${process.env.NEXT_PUBLIC_API_BASE}/admin/umbrellas/${qrUmbrella.id}/qr.svg`}
                style={{ width: 240, height: 240 }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
