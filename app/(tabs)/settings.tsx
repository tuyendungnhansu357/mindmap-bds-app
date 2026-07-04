// app/(tabs)/settings.tsx

import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettingsStore } from "../../src/store/settingsStore";
import { activateLicense } from "../../src/services/licenseService";
import { AIProvider } from "../../src/types/mindmap";

const PROVIDERS: { key: AIProvider; label: string; placeholder: string }[] = [
  { key: "claude", label: "Claude (Anthropic)", placeholder: "sk-ant-..." },
  { key: "gemini", label: "Gemini (Google)", placeholder: "AIza..." },
  { key: "openai", label: "OpenAI", placeholder: "sk-..." },
  { key: "openrouter", label: "OpenRouter", placeholder: "sk-or-..." },
];

export default function SettingsScreen() {
  const {
    theme,
    setTheme,
    activeProvider,
    setActiveProvider,
    setApiKey,
    getApiKey,
    plan,
    setPlan,
  } = useSettingsStore();

  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [licenseCode, setLicenseCode] = useState("");
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    PROVIDERS.forEach(async (p) => {
      const key = await getApiKey(p.key);
      if (key) {
        setApiKeyInputs((prev) => ({ ...prev, [p.key]: key }));
      }
    });
  }, []);

  const handleSaveKey = async (provider: AIProvider) => {
    const key = apiKeyInputs[provider]?.trim();
    if (!key) return;
    await setApiKey(provider, key);
    Alert.alert("Đã lưu", `API key ${provider} đã được lưu an toàn.`);
  };

  const handleActivateLicense = async () => {
    if (!licenseCode.trim()) return;
    setActivating(true);
    try {
      const ok = await activateLicense(licenseCode.trim());
      if (ok) {
        setPlan("pro");
        Alert.alert("✅ Kích hoạt thành công", "Bạn đã nâng cấp lên Pro!");
      } else {
        Alert.alert("❌ Mã không hợp lệ", "Vui lòng kiểm tra lại mã kích hoạt.");
      }
    } finally {
      setActivating(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Gói hiện tại */}
      <Section title="Gói dịch vụ">
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>
            {plan === "pro" ? "✨ Pro (Đã kích hoạt)" : "🆓 Free"}
          </Text>
        </View>
        {plan === "free" && (
          <View style={styles.field}>
            <Text style={styles.label}>Mã kích hoạt Pro</Text>
            <TextInput
              style={styles.input}
              placeholder="MMBDS-XXXX-XXXX-XXXX"
              placeholderTextColor="#6b7280"
              value={licenseCode}
              onChangeText={setLicenseCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.btn, activating && styles.btnDisabled]}
              onPress={handleActivateLicense}
              disabled={activating}
            >
              <Text style={styles.btnText}>
                {activating ? "Đang kiểm tra..." : "Kích hoạt"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Section>

      {/* Theme */}
      <Section title="Giao diện">
        <View style={styles.row}>
          <Text style={styles.label}>Dark mode</Text>
          <Switch
            value={theme === "dark"}
            onValueChange={(v) => setTheme(v ? "dark" : "light")}
            trackColor={{ false: "#374151", true: "#4f46e5" }}
            thumbColor="#e0e7ff"
          />
        </View>
      </Section>

      {/* AI Keys */}
      <Section title="API Key AI">
        <Text style={styles.hint}>
          Key lưu mã hoá trên máy, không gửi đến server nào ngoài API của từng nhà cung cấp.
        </Text>

        <Text style={styles.label}>Provider mặc định</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.providerChip,
                activeProvider === p.key && styles.providerChipActive,
              ]}
              onPress={() => setActiveProvider(p.key)}
            >
              <Text
                style={[
                  styles.providerChipText,
                  activeProvider === p.key && styles.providerChipTextActive,
                ]}
              >
                {p.key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {PROVIDERS.map((p) => (
          <View key={p.key} style={styles.field}>
            <Text style={styles.label}>{p.label}</Text>
            <TextInput
              style={styles.input}
              placeholder={p.placeholder}
              placeholderTextColor="#6b7280"
              value={apiKeyInputs[p.key] ?? ""}
              onChangeText={(v) => setApiKeyInputs((prev) => ({ ...prev, [p.key]: v }))}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => handleSaveKey(p.key)}
            >
              <Text style={styles.btnSecondaryText}>Lưu key</Text>
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      {/* Thông tin */}
      <Section title="Thông tin">
        <Text style={styles.info}>MindMap BĐS v1.0.0</Text>
        <Text style={styles.info}>Offline-first · React Native · Expo</Text>
        <Text style={styles.info}>© 2026 nguonnhachinhchu.net</Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1117" },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: "#1e1b4b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#312e81",
  },
  sectionTitle: {
    color: "#818cf8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  planRow: { flexDirection: "row", alignItems: "center" },
  planLabel: { color: "#e0e7ff", fontSize: 16, fontWeight: "700" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  field: { marginBottom: 12 },
  label: { color: "#c7d2fe", fontSize: 13, marginBottom: 6 },
  hint: { color: "#6b7280", fontSize: 12, marginBottom: 10, lineHeight: 18 },
  input: {
    backgroundColor: "#0f1117",
    color: "#e0e7ff",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#4f46e5",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  btn: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  btnSecondary: {
    borderWidth: 1,
    borderColor: "#4f46e5",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  btnSecondaryText: { color: "#818cf8", fontSize: 13 },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  providerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4f46e5",
    backgroundColor: "#0f1117",
  },
  providerChipActive: { backgroundColor: "#4f46e5" },
  providerChipText: { color: "#818cf8", fontSize: 13 },
  providerChipTextActive: { color: "#fff" },
  info: { color: "#6b7280", fontSize: 12, marginBottom: 4 },
});
