import Foundation
import Capacitor
import AVKit
import AVFoundation
import UIKit

/**
 * Native iOS video player using AVPlayer / AVPlayerViewController,
 * plus external-app hand-off for VLC / Infuse / nPlayer.
 *
 * Add to ios/App/App/Info.plist so cleartext IPTV streams work AND
 * so we can detect external players:
 *
 *   <key>NSAppTransportSecurity</key>
 *   <dict><key>NSAllowsArbitraryLoads</key><true/></dict>
 *
 *   <key>LSApplicationQueriesSchemes</key>
 *   <array>
 *     <string>vlc</string>
 *     <string>vlc-x-callback</string>
 *     <string>infuse</string>
 *     <string>nplayer-http</string>
 *     <string>iina</string>
 *   </array>
 */
@objc(NativePlayerPlugin)
public class NativePlayerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePlayerPlugin"
    public let jsName = "NativePlayer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openExternal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise)
    ]

    private var playerViewController: AVPlayerViewController?
    private var player: AVPlayer?

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": true, "engine": "AVPlayer"])
    }

    @objc func play(_ call: CAPPluginCall) {
        guard let urlStr = call.getString("url"), let url = URL(string: urlStr) else {
            call.reject("'url' is required")
            return
        }
        let userAgent = call.getString("userAgent")
            ?? "IPTVSmartersPlayer/3.1.6 (iPhone; iOS) AVPlayer"
        var headers = call.getObject("headers") as? [String: String] ?? [:]
        headers["User-Agent"] = userAgent

        let options: [String: Any] = ["AVURLAssetHTTPHeaderFieldsKey": headers]
        let asset = AVURLAsset(url: url, options: options)
        let item = AVPlayerItem(asset: asset)
        let player = AVPlayer(playerItem: item)
        player.automaticallyWaitsToMinimizeStalling = true

        let vc = AVPlayerViewController()
        vc.player = player
        vc.allowsPictureInPicturePlayback = true
        vc.entersFullScreenWhenPlaybackBegins = true
        vc.exitsFullScreenWhenPlaybackEnds = false

        self.player = player
        self.playerViewController = vc

        DispatchQueue.main.async {
            if let root = self.bridge?.viewController {
                root.present(vc, animated: true) { player.play() }
            }
        }
        call.resolve(["launched": true])
    }

    /**
     * Hand the stream URL off to an installed external video app.
     * Tries VLC → Infuse → nPlayer → IINA, in that order.
     */
    @objc func openExternal(_ call: CAPPluginCall) {
        guard let urlStr = call.getString("url") else {
            call.reject("'url' is required")
            return
        }

        // Build an encoded copy of the stream URL for URL-scheme players.
        let encoded = urlStr.addingPercentEncoding(
            withAllowedCharacters: .urlQueryAllowed
        ) ?? urlStr

        let candidates: [(scheme: String, url: String)] = [
            ("vlc-x-callback",
             "vlc-x-callback://x-callback-url/stream?url=\(encoded)"),
            ("vlc", "vlc://\(urlStr)"),
            ("infuse", "infuse://x-callback-url/play?url=\(encoded)"),
            ("nplayer-http",
             urlStr.replacingOccurrences(of: "http://", with: "nplayer-http://")
                   .replacingOccurrences(of: "https://", with: "nplayer-https://")),
            ("iina", "iina://weblink?url=\(encoded)")
        ]

        DispatchQueue.main.async {
            for c in candidates {
                guard let u = URL(string: c.url) else { continue }
                if UIApplication.shared.canOpenURL(u) {
                    UIApplication.shared.open(u, options: [:]) { ok in
                        if ok {
                            call.resolve(["launched": true, "via": c.scheme])
                        } else {
                            call.reject("Could not open \(c.scheme)")
                        }
                    }
                    return
                }
            }
            // Nothing installed — fall back to in-app AVPlayer
            self.play(call)
        }
    }
}
