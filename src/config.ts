// ============================================================================================
// TEMPORARY PLAY-TEST SETTING.  SHOW_UNREVIEWED = true means the deployed build shows content that
// Eli has NOT approved yet, each item marked with a visible "UNREVIEWED" badge.
// Before real use set this to false: then only items whose review-ledger entry is `approved` or
// `approved-pending-book` with a matching content hash are included (the production gate).
// ============================================================================================
export const SHOW_UNREVIEWED = true;
export const BASE = '/understanding-motor-controls/';
export const SAVE_KEY = 'umc.save.v1';
