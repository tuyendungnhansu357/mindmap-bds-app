// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0f1117",
          borderTopColor: "#1e1b4b",
        },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#6b7280",
        headerStyle: { backgroundColor: "#0f1117" },
        headerTintColor: "#e0e7ff",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "MindMap",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: "Template",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
