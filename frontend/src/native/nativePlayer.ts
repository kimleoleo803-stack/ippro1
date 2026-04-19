import { registerPlugin, Capacitor } from "@capacitor/core";

export interface InstalledPlayer {
  packageName: string;
  label: string;
}

export interface OpenExternalResult {
  launched: boolean;
  via?: string;
  /** When launched=false: "not-installed" | "activity-not-found". */
  reason?: "not-installed" | "activity-not-found";
  /** When reason=not-installed, the package the caller forced. */
  package?: string;
}

export interface NativePlayerPlugin {
  /** Launches the in-app fullscreen player (ExoPlayer / AVPlayer). */
  play(options: {
    url: string;
    title?: string;
    userAgent?: string;
    headers?: Record<string, string>;
    isLive?: boolean;
  }): Promise<{ launched: boolean; via?: string }>;

  /**
   * Hands the stream URL off to an external video player.
   *
   * If you pass `package` and that app isn't installed, the native
   * side resolves with `{ launched: false, reason: "not-installed",
   * package }` — the UI can then prompt the user to install it.
   *
   * If no `package` is passed, the native side tries the preferred
   * list (VidoPlay → VLC → MX Player → Just Player → YTV Player) and
   * falls through to the system chooser + in-app ExoPlayer as a
   * last resort.
   */
  openExternal(options: {
    url: string;
    title?: string;
    userAgent?: string;
    headers?: Record<string, string>;
    /** Force a specific package, e.g. "org.videolan.vlc". */
    package?: string;
  }): Promise<OpenExternalResult>;

  /** Android: returns the list of apps that can handle m3u8 streams. */
  listInstalledPlayers(): Promise<{ players: InstalledPlayer[] }>;

  /** Android: is a specific package installed? */
  isInstalled(options: { package: string }): Promise<{ installed: boolean }>;

  /** Android: open the Play Store listing for a package. */
  openPlayStore(options: { package: string }): Promise<{ launched: boolean; via?: string }>;

  isAvailable(): Promise<{ available: boolean; engine: string }>;
}

export const NativePlayer = registerPlugin<NativePlayerPlugin>("NativePlayer");

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
export const nativePlatform = (): string => Capacitor.getPlatform();
