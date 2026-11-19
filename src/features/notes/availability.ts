// Personal student notes must remain disabled until independent backups and
// a complete restore test are approved by the platform owner.
// This build-time switch controls discoverability; the private PHP backend has
// a separate server-side, fail-closed gate that cannot be bypassed by a browser.
export const NOTES_RELEASED = import.meta.env?.VITE_CSSV_PERSONAL_NOTES_ENABLED === 'true'
