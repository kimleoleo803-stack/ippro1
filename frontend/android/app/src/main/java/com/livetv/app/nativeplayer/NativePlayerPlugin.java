package com.livetv.app.nativeplayer;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {

    /** Preferred IPTV / video player packages, in priority order. */
    private static final List<String> PREFERRED_PACKAGES = Arrays.asList(
        "com.vidoplay.player",               // VidoPlay (default / recommended)
        "org.videolan.vlc",                  // VLC for Android
        "com.mxtech.videoplayer.pro",        // MX Player Pro
        "com.mxtech.videoplayer.ad",         // MX Player (free)
        "com.brouken.player",                // Just Player
        "com.ytv.player",                    // YTV Player
        "com.ytvplayer.app",
        "com.xtremeiptv.xtreamplayeriptv",
        "com.nst.iptvsmarterstvbox",
        "com.nst.iptvsmarters",
        "net.gtvbox.videoplayer"
    );

    // ─────────────────────────────────────────────────────────────
    //  play  — in-app ExoPlayer
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("'url' is required");
            return;
        }

        String userAgent = call.getString(
            "userAgent",
            "IPTVSmartersPlayer/3.1.6 (Linux; Android) ExoPlayerLib/2.19.1"
        );
        String title = call.getString("title", "");
        boolean isLive = Boolean.TRUE.equals(call.getBoolean("isLive", true));

        JSObject headersObj = call.getObject("headers");
        String[] headerKeys = new String[0];
        String[] headerVals = new String[0];
        if (headersObj != null) {
            try {
                java.util.List<String> ks = new java.util.ArrayList<>();
                java.util.List<String> vs = new java.util.ArrayList<>();
                Iterator<String> it = headersObj.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    Object v = headersObj.get(k);
                    if (v != null) {
                        ks.add(k);
                        vs.add(String.valueOf(v));
                    }
                }
                headerKeys = ks.toArray(new String[0]);
                headerVals = vs.toArray(new String[0]);
            } catch (JSONException e) {
                // ignore
            }
        }

        Intent intent = new Intent(getContext(), PlayerActivity.class);
        intent.putExtra(PlayerActivity.EXTRA_URL, url);
        intent.putExtra(PlayerActivity.EXTRA_USER_AGENT, userAgent);
        intent.putExtra(PlayerActivity.EXTRA_TITLE, title);
        intent.putExtra(PlayerActivity.EXTRA_IS_LIVE, isLive);
        intent.putExtra(PlayerActivity.EXTRA_HEADER_KEYS, headerKeys);
        intent.putExtra(PlayerActivity.EXTRA_HEADER_VALS, headerVals);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);

        JSObject ret = new JSObject();
        ret.put("launched", true);
        ret.put("via", "exoplayer");
        call.resolve(ret);
    }

    // ─────────────────────────────────────────────────────────────
    //  openExternal  — hand off to YTV / MX / VLC / chooser
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("'url' is required");
            return;
        }
        String userAgent = call.getString(
            "userAgent",
            "IPTVSmartersPlayer/3.1.6 (Linux; Android) ExoPlayerLib/2.19.1"
        );
        String title = call.getString("title", "");
        String forcePackage = call.getString("package", null);

        String mime = guessMime(url);
        Intent base = buildVideoIntent(url, mime, userAgent, title);
        PackageManager pm = getContext().getPackageManager();

        // 1) If caller forced a specific package (e.g. "org.videolan.vlc") → use it.
        if (forcePackage != null && !forcePackage.isEmpty()) {
            Intent direct = new Intent(base);
            direct.setPackage(forcePackage);
            if (direct.resolveActivity(pm) != null) {
                getContext().startActivity(direct);
                resolveOk(call, "package:" + forcePackage);
                return;
            }
            call.reject("Requested app '" + forcePackage + "' is not installed");
            return;
        }

        // 2) Try the preferred-package list: launch the first one installed.
        for (String pkg : PREFERRED_PACKAGES) {
            Intent direct = new Intent(base);
            direct.setPackage(pkg);
            if (direct.resolveActivity(pm) != null) {
                try {
                    getContext().startActivity(direct);
                    resolveOk(call, "package:" + pkg);
                    return;
                } catch (Exception ignored) {
                    // try next
                }
            }
        }

        // 3) Fall back to the system chooser ("Open with…")
        List<ResolveInfo> resolvers = pm.queryIntentActivities(base, 0);
        if (resolvers != null && !resolvers.isEmpty()) {
            Intent chooser = Intent.createChooser(base, "Open stream with…");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            resolveOk(call, "chooser");
            return;
        }

        // 4) Absolutely nothing installed → fall back to in-app ExoPlayer so
        //    the user always gets video, never a dead-end.
        play(call);
    }

    // ─────────────────────────────────────────────────────────────
    //  listInstalledPlayers  — debug / UI hint
    // ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void listInstalledPlayers(PluginCall call) {
        JSObject ret = new JSObject();
        org.json.JSONArray arr = new org.json.JSONArray();
        PackageManager pm = getContext().getPackageManager();
        Intent probe = new Intent(Intent.ACTION_VIEW);
        probe.setDataAndType(Uri.parse("http://example.com/stream.m3u8"),
                "application/x-mpegURL");
        for (ResolveInfo r : pm.queryIntentActivities(probe, 0)) {
            JSObject item = new JSObject();
            item.put("packageName", r.activityInfo.packageName);
            item.put("label", String.valueOf(r.loadLabel(pm)));
            arr.put(item);
        }
        ret.put("players", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("engine", "ExoPlayer");
        call.resolve(ret);
    }

    // ─────────────────────────────────────────────────────────────
    //  helpers
    // ─────────────────────────────────────────────────────────────
    private Intent buildVideoIntent(String url, String mime,
                                    String userAgent, String title) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.parse(url), mime);
        intent.putExtra("title", title);
        intent.putExtra("User-Agent", userAgent);
        intent.putExtra("headers", new String[] { "User-Agent", userAgent });
        intent.putExtra("secure_uri", true);
        intent.putExtra("decode_mode", 1);       // MX Player: hardware+
        intent.putExtra("return_result", false);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    private String guessMime(String url) {
        String l = url.toLowerCase();
        if (l.contains(".m3u8")) return "application/x-mpegURL";
        if (l.endsWith(".ts") || l.contains(".ts?")) return "video/mp2t";
        if (l.endsWith(".mp4")) return "video/mp4";
        if (l.endsWith(".mkv")) return "video/x-matroska";
        return "video/*";
    }

    private void resolveOk(PluginCall call, String via) {
        JSObject ret = new JSObject();
        ret.put("launched", true);
        ret.put("via", via);
        call.resolve(ret);
    }
}
