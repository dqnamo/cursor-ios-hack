import type { InstantRules } from "@instantdb/react";

const rules = {
  todos: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  telegramUsers: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  styleProfiles: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  styleRefs: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  wardrobeItems: {
    allow: {
      view: "true",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  $files: {
    allow: {
      view: "true",
      create: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
