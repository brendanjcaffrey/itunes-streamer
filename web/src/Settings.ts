import { atom } from "jotai";

const KEEP_MODE_KEY = "keepMode";
const SHUFFLE_KEY = "shuffle";
const REPEAT_KEY = "repeat";
const SHOW_ARTWORK_KEY = "showArtwork";
const VOLUME_KEY = "volume";
const OPENED_FOLDERS_KEY = "openedFolders";

export const DEFAULT_VOLUME = 50;

function GetPersistedKeepMode(): boolean {
  const value = localStorage.getItem(KEEP_MODE_KEY);
  if (value === null) {
    return false;
  } else {
    return value === "true";
  }
}

export function SetPersistedKeepMode(value: boolean) {
  localStorage.setItem(KEEP_MODE_KEY, value.toString());
}

function GetPersistedShuffle(): boolean {
  return localStorage.getItem(SHUFFLE_KEY) === "true";
}

export function SetPersistedShuffle(value: boolean) {
  localStorage.setItem(SHUFFLE_KEY, value.toString());
}

function GetPersistedRepeat(): boolean {
  return localStorage.getItem(REPEAT_KEY) === "true";
}

export function SetPersistedRepeat(value: boolean) {
  localStorage.setItem(REPEAT_KEY, value.toString());
}

function GetPersistedShowArtwork(): boolean {
  return localStorage.getItem(SHOW_ARTWORK_KEY) === "true";
}

export function SetPersistedShowArtwork(value: boolean) {
  localStorage.setItem(SHOW_ARTWORK_KEY, value.toString());
}

function GetPersistedVolume(): number {
  try {
    return Number(localStorage.getItem(VOLUME_KEY));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function SetPersistedVolume(value: number) {
  localStorage.setItem(VOLUME_KEY, value.toString());
}

function GetPersistedOpenedFolders(): Set<string> {
  return new Set((localStorage.getItem(OPENED_FOLDERS_KEY) || "").split(","));
}

export function SetPersistedOpenedFolders(value: Set<string>) {
  localStorage.setItem(OPENED_FOLDERS_KEY, Array.from(value).join(","));
}

export const keepModeAtom = atom(GetPersistedKeepMode());
export const shuffleAtom = atom(GetPersistedShuffle());
export const repeatAtom = atom(GetPersistedRepeat());
export const showArtworkAtom = atom(GetPersistedShowArtwork());
export const volumeAtom = atom(GetPersistedVolume());
export const openedFoldersAtom = atom(GetPersistedOpenedFolders());
