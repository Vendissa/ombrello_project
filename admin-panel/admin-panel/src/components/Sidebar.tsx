"use client";
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UmbrellaIcon from "@mui/icons-material/Umbrella";
import PeopleIcon from "@mui/icons-material/People";
import StoreIcon from "@mui/icons-material/Store";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/umbrellas", label: "Umbrellas", icon: <UmbrellaIcon /> },
  { href: "/users", label: "Users", icon: <PeopleIcon /> },
  { href: "/vendors", label: "Vendors", icon: <StoreIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const width = 240;
  return (
    <Drawer variant="permanent" PaperProps={{ style: { width } }}>
      <Toolbar />
      <List>
        {nav.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
            <ListItemButton selected={pathname?.startsWith(item.href)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </Link>
        ))}
      </List>
    </Drawer>
  );
}
