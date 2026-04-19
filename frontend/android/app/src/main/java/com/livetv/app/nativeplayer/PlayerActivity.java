package com.livetv.app.nativeplayer;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.hls.HlsMediaSource;
import androidx.media3.ui.PlayerView;

import com.livetv.app.R;

import java.util.HashMap;
import java.util.Map;

/**
 * Full-screen native video player activity using Media3 ExoPlayer.
 * Plays HLS / MPEG-TS / MP4 / MKV and sends a custom User-Agent so IPTV
 * backends respond the same way they do for IPTV Smarters-style apps.
 */
public class PlayerActivity extends Activity {

    public static final String EXTRA_URL = "url";
    public static final String EXTRA_USER_AGENT = "user_agent";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_IS_LIVE = "is_live";
    public static final String EXTRA_HEADER_KEYS = "header_keys";
    public static final String EXTRA_HEADER_VALS = "header_vals";

    private ExoPlayer player;
    private PlayerView playerView;
    private TextView errorView;

    @OptIn(markerClass = UnstableApi.class)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Fullscreen, landscape, keep-screen-on
        requestWindowFeature(android.view.Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);

        setContentView(R.layout.activity_player);
        playerView = findViewById(R.id.player_view);
        errorView = findViewById(R.id.error_view);

        String url = getIntent().getStringExtra(EXTRA_URL);
        String userAgent = getIntent().getStringExtra(EXTRA_USER_AGENT);
        boolean isLive = getIntent().getBooleanExtra(EXTRA_IS_LIVE, true);
        String[] hk = getIntent().getStringArrayExtra(EXTRA_HEADER_KEYS);
        String[] hv = getIntent().getStringArrayExtra(EXTRA_HEADER_VALS);

        if (url == null || url.isEmpty()) {
            showError("No URL provided");
            return;
        }
        if (userAgent == null || userAgent.isEmpty()) {
            userAgent = "IPTVSmartersPlayer/3.1.6 (Linux; Android) ExoPlayerLib/2.19.1";
        }

        Map<String, String> extraHeaders = new HashMap<>();
        if (hk != null && hv != null) {
            for (int i = 0; i < hk.length && i < hv.length; i++) {
                if (hk[i] != null && hv[i] != null) {
                    extraHeaders.put(hk[i], hv[i]);
                }
            }
        }

        DefaultHttpDataSource.Factory httpFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent(userAgent)
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(20000);
        if (!extraHeaders.isEmpty()) {
            httpFactory.setDefaultRequestProperties(extraHeaders);
        }

        // Generous buffer for live TV: ~8s to start, up to 60s buffered.
        DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                        15000,     // minBufferMs
                        60000,     // maxBufferMs
                        2500,      // bufferForPlaybackMs (start faster)
                        8000       // bufferForPlaybackAfterRebufferMs (recover)
                )
                .setPrioritizeTimeOverSizeThresholds(true)
                .build();

        DefaultMediaSourceFactory msFactory = new DefaultMediaSourceFactory(this)
                .setDataSourceFactory(httpFactory)
                .setLiveTargetOffsetMs(8000);

        player = new ExoPlayer.Builder(this)
                .setLoadControl(loadControl)
                .setMediaSourceFactory(msFactory)
                .build();
        playerView.setPlayer(player);
        playerView.setKeepScreenOn(true);
        playerView.setUseController(true);

        MediaItem.Builder mib = new MediaItem.Builder().setUri(Uri.parse(url));
        if (url.toLowerCase().contains(".m3u8")) {
            mib.setMimeType(MimeTypes.APPLICATION_M3U8);
        } else if (url.toLowerCase().endsWith(".ts")) {
            mib.setMimeType(MimeTypes.APPLICATION_MPEGTS);
        } else if (url.toLowerCase().endsWith(".mp4")) {
            mib.setMimeType(MimeTypes.APPLICATION_MP4);
        }
        if (isLive) {
            mib.setLiveConfiguration(
                    new MediaItem.LiveConfiguration.Builder()
                            .setTargetOffsetMs(8000)
                            .build()
            );
        }
        MediaItem item = mib.build();

        player.setMediaItem(item);
        player.setPlayWhenReady(true);
        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                showError("Playback error: " + error.getErrorCodeName() + "\n" +
                        (error.getMessage() == null ? "" : error.getMessage()));
            }
        });
        player.prepare();
    }

    private void showError(String msg) {
        if (errorView != null) {
            errorView.setVisibility(View.VISIBLE);
            errorView.setText(msg);
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (player != null) {
            player.release();
            player = null;
        }
        if (Build.VERSION.SDK_INT >= 24) {
            // Activity will be destroyed soon; nothing else to do.
        }
    }
}
