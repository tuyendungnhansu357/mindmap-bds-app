// src/store/settingsStore.ts
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AIProvider, AIProviderConfig, PlanType } from "../types/mindmap";

const SECURE_KEY_PREFIX = "mmbds_ai_key_";
const THEME_KEY = "mmbds_theme";
const LICENSE_KEY = "mmbds_license";

export type ThemeMode = "dark" | "light";

interface SettingsState {
  theme: ThemeMode;
  activeProvider: AIProvider;
  apiKeys: Partial<Record<AIProvider, string>>;
  selectedModels: Partial<Record<AIProvider, string>>;
  plan: PlanType;

  loadSettings: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setActiveProvider: (provider: AIProvider) => void;
  setApiKey: (provider: AIProvider, key: string) => Promise<void>;
  getApiKey: (provider: AIProvider) => Promise<string | null>;
  setSelectedModel: (provider: AIProvider, model: string) => void;
  setPlan: (plan: PlanType) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: "dark",
  activeProvider: "claude",
  apiKeys: {},
  selectedModels: {},
  plan: "free",

  loadSettings: async () => {
    const theme = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
    const license = await AsyncStorage.getItem(LICENSE_KEY);
    set({
      theme: theme ?? "dark",
      plan: license ? "pro" : "free",
    });
  },

  setTheme: async (theme) => {
    await AsyncStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },

  setActiveProvider: (provider) => set({ activeProvider: provider }),

  // API key lưu trong SecureStore (mã hoá), KHÔNG dùng AsyncStorage thường
  // theo đúng mục 4.4 / 4.10 spec.
  setApiKey: async (provider, key) => {
    await SecureStore.setItemAsync(SECURE_KEY_PREFIX + provider, key);
    set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } }));
  },

  getApiKey: async (provider) => {
    const cached = get().apiKeys[provider];
    if (cached) return cached;
    const stored = await SecureStore.getItemAsync(SECURE_KEY_PREFIX + provider);
    if (stored) {
      set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: stored } }));
    }
    return stored;
  },

  setSelectedModel: (provider, model) => {
    set((s) => ({ selectedModels: { ...s.selectedModels, [provider]: model } }));
  },

  setPlan: (plan) => set({ plan }),
}));

export async function getAIProviderConfig(
  provider: AIProvider
): Promise<AIProviderConfig | null> {
  const key = await useSettingsStore.getState().getApiKey(provider);
  if (!key) return null;
  return {
    provider,
    apiKey: key,
    model: useSettingsStore.getState().selectedModels[provider] ?? null,
  };
}
