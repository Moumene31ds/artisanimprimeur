// ---------------------------------------------------------------------------
// loyalty-config.ts — قراءة إعدادات الولاء الحية من settings/loyalty مع
// دمج القيم الافتراضية عند غيابها (تُدار من لوحة الأدمن).
// ---------------------------------------------------------------------------

import { fsGet } from "@/lib/firestore-rest";
import { DEFAULT_LOYALTY_CONFIG, DEFAULT_LOYALTY_REWARDS, LoyaltyConfig, LoyaltyReward } from "@/lib/loyalty";

export interface LoyaltySettings {
  config: LoyaltyConfig;
  rewards: LoyaltyReward[];
}

export async function getLoyaltySettings(token: string): Promise<LoyaltySettings> {
  let remote: any = null;
  try {
    remote = await fsGet(token, "settings/loyalty");
  } catch {
    remote = null;
  }

  const config: LoyaltyConfig = { ...DEFAULT_LOYALTY_CONFIG };
  if (remote?.config && typeof remote.config === "object") {
    for (const key of Object.keys(config)) {
      if (typeof remote.config[key] === "number") config[key] = remote.config[key];
    }
  }

  let rewards: LoyaltyReward[] = DEFAULT_LOYALTY_REWARDS;
  if (Array.isArray(remote?.rewards) && remote.rewards.length > 0) {
    rewards = remote.rewards.map((r: any) => ({
      id: String(r.id || ""),
      points: Number(r.points) || 0,
      type: r.type === "percent" ? "percent" : "fixed",
      value: Number(r.value) || 0,
      title: {
        ar: r.title?.ar || r.title?.fr || "مكافأة",
        fr: r.title?.fr || r.title?.ar || "Récompense",
      },
      icon: r.icon || "Gift",
    }));
  }

  return { config, rewards };
}
