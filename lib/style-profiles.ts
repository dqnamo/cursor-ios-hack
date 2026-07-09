import { id } from "@instantdb/admin";
import { getInstantAdminDb } from "@/lib/instant-admin";

export const INTRO_STEPS = ["selfie", "vibe_values", "budget", "done"] as const;

export type IntroStep = (typeof INTRO_STEPS)[number];

export type StyleProfileRecord = {
  id?: string;
  telegramId: string;
  vibe?: string;
  budget?: string;
  values?: string;
  preferredBrands?: string;
  avoidedBrands?: string;
  sizingNotes?: string;
  lifestyle?: string;
  notes?: string;
  introStep: IntroStep;
  onboardingComplete: boolean;
  createdAt: number;
  updatedAt: number;
};

export type StyleRefRecord = {
  id: string;
  telegramId: string;
  summary: string;
  source?: string;
  createdAt: number;
};

export type StyleProfileUpdateInput = {
  vibe?: string;
  budget?: string;
  values?: string;
  preferredBrands?: string;
  avoidedBrands?: string;
  sizingNotes?: string;
  lifestyle?: string;
  notes?: string;
  introStep?: IntroStep;
  onboardingComplete?: boolean;
};

export type StyleMemorySnapshot = {
  profile: StyleProfileRecord | null;
  recentRefs: StyleRefRecord[];
  isNew: boolean;
  introStep: IntroStep;
};

const PROFILE_FIELDS = [
  "vibe",
  "budget",
  "values",
  "preferredBrands",
  "avoidedBrands",
  "sizingNotes",
  "lifestyle",
  "notes",
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

export async function getStyleMemory(
  telegramId: string,
): Promise<StyleMemorySnapshot> {
  const database = getInstantAdminDb();
  const result = await database.query({
    styleProfiles: {
      $: { where: { telegramId } },
    },
    styleRefs: {
      $: {
        where: { telegramId },
        order: { createdAt: "desc" },
        limit: 8,
      },
    },
  });

  const profileRow = result.styleProfiles[0];
  const profile = profileRow
    ? toStyleProfile({
        id: profileRow.id,
        telegramId: String(profileRow.telegramId),
        vibe: optionalString(profileRow.vibe),
        budget: optionalString(profileRow.budget),
        values: optionalString(profileRow.values),
        preferredBrands: optionalString(profileRow.preferredBrands),
        avoidedBrands: optionalString(profileRow.avoidedBrands),
        sizingNotes: optionalString(profileRow.sizingNotes),
        lifestyle: optionalString(profileRow.lifestyle),
        notes: optionalString(profileRow.notes),
        introStep: normalizeIntroStep(profileRow.introStep),
        onboardingComplete: Boolean(profileRow.onboardingComplete),
        createdAt: toEpoch(profileRow.createdAt as number | Date),
        updatedAt: toEpoch(profileRow.updatedAt as number | Date),
      })
    : null;

  return {
    profile,
    recentRefs: result.styleRefs.map((row) =>
      toStyleRef({
        id: row.id,
        telegramId: String(row.telegramId),
        summary: String(row.summary),
        source: optionalString(row.source),
        createdAt: toEpoch(row.createdAt as number | Date),
      }),
    ),
    isNew: !profile,
    introStep: profile?.introStep ?? "selfie",
  };
}

export async function updateStyleProfile(
  telegramId: string,
  input: StyleProfileUpdateInput,
) {
  const database = getInstantAdminDb();
  const now = Date.now();
  const existing = await database.query({
    styleProfiles: { $: { where: { telegramId } } },
  });
  const existingProfile = existing.styleProfiles[0];
  const patch = pickDefined(input);
  const nextIntroStep =
    patch.introStep ??
    normalizeIntroStep(existingProfile?.introStep) ??
    "selfie";
  const nextOnboardingComplete =
    patch.onboardingComplete ??
    (nextIntroStep === "done" || Boolean(existingProfile?.onboardingComplete));

  await database.transact(
    database.tx.styleProfiles.lookup("telegramId", telegramId).update({
      telegramId,
      vibe: patch.vibe ?? optionalString(existingProfile?.vibe),
      budget: patch.budget ?? optionalString(existingProfile?.budget),
      values: patch.values ?? optionalString(existingProfile?.values),
      preferredBrands:
        patch.preferredBrands ??
        optionalString(existingProfile?.preferredBrands),
      avoidedBrands:
        patch.avoidedBrands ?? optionalString(existingProfile?.avoidedBrands),
      sizingNotes:
        patch.sizingNotes ?? optionalString(existingProfile?.sizingNotes),
      lifestyle: patch.lifestyle ?? optionalString(existingProfile?.lifestyle),
      notes: patch.notes ?? optionalString(existingProfile?.notes),
      introStep: nextIntroStep,
      onboardingComplete: nextOnboardingComplete,
      createdAt: existingProfile
        ? toEpoch(existingProfile.createdAt as number | Date)
        : now,
      updatedAt: now,
    }),
  );

  const telegramUser = await database.query({
    telegramUsers: { $: { where: { telegramId } } },
  });
  const telegramUserId = telegramUser.telegramUsers[0]?.id;

  if (telegramUserId) {
    await database.transact(
      database.tx.styleProfiles
        .lookup("telegramId", telegramId)
        .link({ telegramUser: telegramUserId }),
    );
  }

  const refreshed = await getStyleMemory(telegramId);

  return {
    created: !existingProfile,
    profile: refreshed.profile,
    introStep: refreshed.introStep,
  };
}

export async function appendStyleNote(
  telegramId: string,
  note: string,
  source: "photo" | "text" | "other" = "text",
) {
  const database = getInstantAdminDb();
  const now = Date.now();
  const trimmed = note.trim();

  if (!trimmed) {
    throw new Error("Style note cannot be empty.");
  }

  const memory = await getStyleMemory(telegramId);
  const existingNotes = memory.profile?.notes?.trim();
  const mergedNotes = existingNotes
    ? `${existingNotes}\n- ${trimmed}`
    : `- ${trimmed}`;

  await updateStyleProfile(telegramId, { notes: mergedNotes });

  const refId = id();
  const transactions = [
    database.tx.styleRefs[refId].update({
      telegramId,
      summary: trimmed,
      source,
      createdAt: now,
    }),
  ];

  const telegramUser = await database.query({
    telegramUsers: { $: { where: { telegramId } } },
  });
  const telegramUserId = telegramUser.telegramUsers[0]?.id;

  if (telegramUserId) {
    transactions.push(
      database.tx.styleRefs[refId].link({ telegramUser: telegramUserId }),
    );
  }

  await database.transact(transactions);

  return getStyleMemory(telegramId);
}

export function getNextIntroStep(step: IntroStep): IntroStep {
  switch (step) {
    case "selfie":
      return "vibe_values";
    case "vibe_values":
      return "budget";
    case "budget":
      return "done";
    default:
      return "done";
  }
}

export function formatIntroGuidance(step: IntroStep) {
  switch (step) {
    case "selfie":
      return `INTRO — step selfie
Text like a real person. One short message. No lists. No report format.
Ask for a photo of an outfit they wear. That's it.
Example: "hey! send me a pic of an outfit you actually wear?"
If they already sent a photo:
- one short reaction about the clothes/style (not their looks)
- remember_style_note (source: photo)
- update_style_profile introStep: "vibe_values"
- then ask about vibe next, still short`;
    case "vibe_values":
      return `INTRO — step vibe_values
Still short and human. No report format.
Ask what vibe they're going for. Mention voice note or text is fine.
Example: "what's the vibe you're going for? voice note or text works"
If they already shared vibe/values:
- update_style_profile with what you learned, introStep: "budget"
- short ack, then ask budget`;
    case "budget":
      return `INTRO — step budget
One short ask. No pressure. No report format.
Example: "and what's your budget roughly?"
If they already shared budget:
- update_style_profile with budget, introStep: "done", onboardingComplete: true
- short "perfect, i'm set" and offer to help`;
    default:
      return `INTRO — done
Use normal stylist format now.
Respect vibe, budget, values, brands.
Save new prefs with tools when they come up.
Stay human: short, warm, never creepy.`;
  }
}

export function formatStyleMemoryForPrompt(memory: StyleMemorySnapshot) {
  const intro = formatIntroGuidance(memory.introStep);
  if (!memory.profile && memory.recentRefs.length === 0) {
    return `${intro}

No saved style profile yet.`;
  }

  const profile = memory.profile;
  const lines: string[] = [intro, "", "Saved profile:"];

  if (profile) {
    lines.push(`Intro step: ${profile.introStep}`);
    for (const field of PROFILE_FIELDS) {
      const value = profile[field]?.trim();
      if (value) {
        lines.push(`${labelForField(field)}: ${value}`);
      }
    }
    lines.push(
      `Onboarding complete: ${profile.onboardingComplete ? "yes" : "no"}`,
    );
  }

  if (memory.recentRefs.length > 0) {
    lines.push("Recent style references:");
    for (const ref of memory.recentRefs) {
      lines.push(`- (${ref.source ?? "note"}) ${ref.summary}`);
    }
  }

  return lines.join("\n");
}

export function resolveTelegramIdFromAuth(
  auth:
    | {
        principalId?: string | null;
        attributes?: Readonly<
          Record<string, string | readonly string[]>
        > | null;
      }
    | null
    | undefined,
) {
  if (!auth) {
    return null;
  }

  const attributeUserId = auth.attributes?.user_id;
  if (typeof attributeUserId === "string" && attributeUserId.length > 0) {
    return attributeUserId;
  }
  if (Array.isArray(attributeUserId) && attributeUserId[0]) {
    return attributeUserId[0];
  }

  const principalId = auth.principalId;
  if (!principalId) {
    return null;
  }

  const privateMatch = /^telegram:(\d+)$/u.exec(principalId);
  if (privateMatch) {
    return privateMatch[1];
  }

  const groupMatch = /^telegram:-?\d+:(\d+)$/u.exec(principalId);
  if (groupMatch) {
    return groupMatch[1];
  }

  return null;
}

function pickDefined(input: StyleProfileUpdateInput) {
  const patch: StyleProfileUpdateInput = {};

  for (const field of [...PROFILE_FIELDS, "onboardingComplete" as const]) {
    const value = input[field];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[field] = value;
    }
  }

  if (input.introStep !== undefined) {
    patch.introStep = input.introStep;
  }

  return patch;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeIntroStep(value: unknown): IntroStep {
  if (
    value === "selfie" ||
    value === "vibe_values" ||
    value === "budget" ||
    value === "done"
  ) {
    return value;
  }

  return "selfie";
}

function labelForField(field: ProfileField) {
  switch (field) {
    case "preferredBrands":
      return "Preferred brands";
    case "avoidedBrands":
      return "Avoided brands";
    case "sizingNotes":
      return "Sizing notes";
    default:
      return field.charAt(0).toUpperCase() + field.slice(1);
  }
}

function toStyleProfile(row: {
  id?: string;
  telegramId: string;
  vibe?: string;
  budget?: string;
  values?: string;
  preferredBrands?: string;
  avoidedBrands?: string;
  sizingNotes?: string;
  lifestyle?: string;
  notes?: string;
  introStep?: IntroStep;
  onboardingComplete?: boolean;
  createdAt: number | Date;
  updatedAt: number | Date;
}): StyleProfileRecord {
  return {
    id: row.id,
    telegramId: row.telegramId,
    vibe: row.vibe,
    budget: row.budget,
    values: row.values,
    preferredBrands: row.preferredBrands,
    avoidedBrands: row.avoidedBrands,
    sizingNotes: row.sizingNotes,
    lifestyle: row.lifestyle,
    notes: row.notes,
    introStep: row.introStep ?? "selfie",
    onboardingComplete: row.onboardingComplete ?? false,
    createdAt: toEpoch(row.createdAt),
    updatedAt: toEpoch(row.updatedAt),
  };
}

function toStyleRef(row: {
  id: string;
  telegramId: string;
  summary: string;
  source?: string;
  createdAt: number | Date;
}): StyleRefRecord {
  return {
    id: row.id,
    telegramId: row.telegramId,
    summary: row.summary,
    source: row.source,
    createdAt: toEpoch(row.createdAt),
  };
}

function toEpoch(value: number | Date) {
  return typeof value === "number" ? value : value.getTime();
}
