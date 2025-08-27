"use client";
import Sidebar from "@/components/Sidebar";
import { AppBar, Box, Toolbar, Typography, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { clearToken, decodeJwt, getToken } from "@/app/lib/auth";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const drawerWidth = 240;
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    const payload = decodeJwt(t);
    if (!payload || payload.role !== "admin" || payload.type !== "access") {
      clearToken();
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null; // avoid flash before redirect

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>Ombrello Admin</Typography>
          <Button
            color="inherit"
            onClick={() => { clearToken(); router.replace("/login"); }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: `${drawerWidth}px` }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
