import { registerPlugin, Capacitor } from "@capacitor/core";

export interface InstalledPlayer {
  packageName: string;
  label: string;
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
   * Tries YTV Player → MX Player Pro → MX Player → Just Player → VLC → chooser,
   * unless you pass `package` to force a specific app.
   */
  openExternal(options: {
    url: string;
    title?: string;
    userAgent?: string;
    headers?: Record<string, string>;
    /** Force a specific package, e.g. "org.videolan.vlc" */
    package?: string;
  }): Promise<{ launched: boolean; via?: string }>;

  /** Android: returns the list of apps that can handle m3u8 streams. */
  listInstalledPlayers(): Promise<{ players: InstalledPlayer[] }>;

  isAvailable(): Promise<{ available: boolean; engine: string }>;
}

export const NativePlayer = registerPlugin<NativePlayerPlugin>("NativePlayer");

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
export const nativePlatform = (): string => Capacitor.getPlatform();
