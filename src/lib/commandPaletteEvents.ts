export const COMMAND_PALETTE_OPEN_EVENT = 'lifegiver:open-command-palette';

/** Lets any component (e.g. Header's search button) open the Command Palette without prop-drilling. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_OPEN_EVENT));
}
