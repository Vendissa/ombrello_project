import React from "react";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";
import { View, Alert } from "react-native";
import { router } from "expo-router"; // Import the router

export default function DrawerLayout() {
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: () => {
          // Clear any authentication tokens or user data here
          console.log("User logged out");
          router.replace("/auth/login"); // Redirect to the login screen
        },
      },
    ]);
  };

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: "#4285F4",
        drawerInactiveTintColor: "gray",
      }}
      drawerContent={(props) => (
        <DrawerContentScrollView {...props}>
          <DrawerItemList {...props} />
          <DrawerItem
            label="Logout"
            onPress={handleLogout}
            icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
          />
        </DrawerContentScrollView>
      )}
    >
      <Drawer.Screen
        name="map"
        options={{
          title: "Map",
          drawerIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="my-qr"
        options={{
          title: "My QR",
          drawerIcon: ({ color, size }) => <Ionicons name="qr-code" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="active-rentals"
        options={{
          title: "Active Rentals",
          drawerIcon: ({ color, size }) => (<Ionicons name="accessibility" size={size} color={color} />),
        }}
      />
    </Drawer>
  );
}
