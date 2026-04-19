#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Fix two bugs in the jp65 IPTV web/app:
    1. External player not launching from the web app (Live TV + Movies
       external mode) — "nothing happens" when tapping open-in-external
       even with VidoPlay installed on the phone.
    2. Live TV streaming does not play in the web browser (though Movies
       do). Works inside native app, broken on browser.

backend:
  - task: "Local IPTV proxy endpoint implementation"
    implemented: true
    working: true
    file: "routes/iptv_proxy.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Added local IPTV proxy endpoint to FastAPI backend that mirrors 
            the Supabase edge function. Implemented at /app/backend/routes/iptv_proxy.py
            and registered in server.py. Exposes GET/POST/OPTIONS /api/iptv-proxy
            endpoints with URL validation, private host blocking, HLS manifest
            rewriting, and User-Agent forwarding. Needs comprehensive testing
            of all endpoint behaviors including error cases, CORS, and stream
            proxying functionality.
        - working: true
          agent: "testing"
          comment: |
            ✅ COMPREHENSIVE TESTING COMPLETED - ALL 11 TESTS PASSED
            
            Tested all scenarios from review request against preview URL:
            https://a13556e0-52e1-47d5-8a80-6dbde9017493.preview.emergentagent.com
            
            ✅ URL Validation:
            - Missing URL parameter → 400 "Missing 'url' query parameter"
            - Invalid URL → 400 "Invalid or blocked URL"
            - Private hosts (127.0.0.1, 192.168.1.1, localhost) → 400 blocked
            - Non-HTTP schemes (file://, ftp://) → 400 blocked
            
            ✅ Proxy Functionality:
            - Valid URL passthrough → 200, x-proxy-kind: passthrough
            - M3U8 rewriting → 200, x-proxy-kind: m3u8, URLs rewritten correctly
            - POST JSON → 200, x-proxy-kind: json-passthrough
            - POST text with custom UA → 200, User-Agent forwarded correctly
            - Binary stream → 200, x-proxy-kind: passthrough, 4096 bytes preserved
            - Fake M3U8 (binary) → 200, x-proxy-kind: passthrough (not rewritten)
            
            ✅ CORS:
            - OPTIONS → 204, Access-Control-Allow-Origin: *, proper methods
            
            All endpoint behaviors match specification exactly. Implementation
            is production-ready and working correctly.

frontend:
  - task: "External player launch (browser, Android+iOS+desktop)"
    implemented: true
    working: "NA"
    file: "src/lib/externalLauncher.ts, src/pages/LiveTV.tsx, src/components/VideoPlayer.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Replaced iframe-based intent hack with a proper intent:// URL:
              action=android.intent.action.VIEW, type=<MIME guess from URL>,
              package=<user's chosen app>, S.browser_fallback_url=<stream URL>.
            Fires via `window.location.href = intent://…` on user gesture.
            Added iOS vlc-x-callback:// support, and a visible "Open in
            {App}" button in LiveTV external mode so desktop/iOS users can
            launch manually. Added MIME guessing helper (m3u8 / ts / mpd /
            mp4 / mkv / webm / avi / mov). Visible button also wired into
            the player shell.

  - task: "Live TV streaming on browser (Supabase iptv-proxy + HLS fallback)"
    implemented: true
    working: "NA"
    file: "supabase/functions/iptv-proxy/index.ts, src/lib/streamProxy.ts, src/lib/proxy.ts, src/components/VideoPlayer.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Root cause: Xtream `/live/<u>/<p>/<id>.m3u8` often 302-redirects
            to raw MPEG-TS (`video/mp2t`). The edge function was detecting
            m3u8 by URL path only and tried to rewrite the binary TS as a
            manifest, corrupting the stream and breaking live TV on the
            browser.
            Fixes:
              • iptv-proxy: detect real m3u8 by body magic `#EXTM3U` + actual
                upstream content-type. TS streams now pass through as
                binary. Accepts a `ua` query/POST param + `x-upstream-ua`
                header, forwards it to the upstream server and preserves it
                inside rewritten m3u8 segment URLs.
              • streamProxy.ts / proxy.ts: forward the user's chosen
                User-Agent (from Account → Player Identity) to the proxy so
                IPTV providers that gate on UA accept the request.
              • VideoPlayer.tsx: on HLS.js fatal
                manifestLoadError/manifestParsingError/manifestLoadTimeOut,
                fall through to mpegts.js so redirected TS live streams play.
            ⚠️ Requires redeploy:
                cd frontend && supabase functions deploy iptv-proxy

  - task: "Native Android plugin (ExoPlayer + external app)"
    implemented: true
    working: "NA"
    file: "android/app/src/main/java/com/livetv/app/nativeplayer/NativePlayerPlugin.java, src/native/nativePlayer.ts"
    stuck_count: 0
    priority: "medium"

backend:
  - task: "Local IPTV proxy (/api/iptv-proxy) — drop-in for Supabase edge function"
    implemented: true
    working: true
    file: "backend/routes/iptv_proxy.py, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: |
            Added a pure-FastAPI clone of the Supabase iptv-proxy edge
            function so the app runs without Supabase (preview + self-host).
            Mirrors the edge function exactly: private-host blocking,
            #EXTM3U body-magic detection, HLS playlist rewriting (incl.
            URI="..." inside tags), UA forwarding, binary streaming,
            x-proxy-kind debug headers.
        - working: true
          agent: "testing"
          comment: |
            All 11 tests passed: URL validation, private-host blocking,
            scheme blocking, passthrough, m3u8 rewriting, POST json/text,
            UA forwarding verified via httpbin.org/headers, binary
            4096-byte pass-through, fake-m3u8 binary detection, and CORS
            preflight. Production-ready.

  - task: "Frontend proxy endpoint resolver (Supabase ↔ local fallback)"
    implemented: true
    working: "NA"
    file: "frontend/src/lib/proxyEndpoint.ts, frontend/src/lib/streamProxy.ts, frontend/src/lib/proxy.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            proxyEndpoint() picks Supabase when VITE_SUPABASE_URL is set
            to a real *.supabase.co host, otherwise falls back to
            ${REACT_APP_BACKEND_URL}/api/iptv-proxy, otherwise same-origin
            /api/iptv-proxy. Supabase auth headers are only sent when
            actually talking to Supabase — keeps production Supabase
            deployments working while unlocking self-host + preview.

    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Forced-package path no longer silently falls through to another

  - task: "External launcher MIME + fallback fix (ERR_UNEXPECTED_PROXY_AUTH)"
    implemented: true
    working: "NA"
    file: "frontend/src/lib/externalLauncher.ts, android/.../NativePlayerPlugin.java, frontend/src/pages/LiveTV.tsx, frontend/src/components/VideoPlayer.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Root cause of user's video: tapping Live TV → "Open in VLC"
            on phone browser landed on Chrome's ERR_UNEXPECTED_PROXY_AUTH.
            Two bugs:
              1. Intent MIME was `application/x-mpegURL` — many players'
                 manifests (incl. some VLC / VidoPlay builds) don't match
                 that narrow MIME, so the intent fell through.
              2. `S.browser_fallback_url` was set to the raw stream URL
                 — so on a fall-through, Chrome tried to play the m3u8
                 itself, IPTV server returned 407, Chrome showed
                 ERR_UNEXPECTED_PROXY_AUTH.
            Fixes:
              * Switched MIME to `video/*` for ALL video intents (VLC's
                own docs recommend this, and every major player declares
                `video/*` in its intent filter). Applied in both the
                browser intent:// URL and the native Android plugin's
                setDataAndType(), so `resolveActivity()` now succeeds.
              * REMOVED `S.browser_fallback_url` entirely. Chrome / the
                Median WebView now auto-redirect to the Play Store when
                the chosen app isn't installed instead of trying to play
                the raw stream.
              * User-Agent now flows from Account → Player Identity into
                the intent extra `S.User-Agent`, so VLC / MX Player hit
                the upstream with IPTVSmarters UA.
              * Added visibility-based "intent didn't launch" detection:
                if document doesn't go hidden within 1.6s after firing,
                we fire `onNotInstalled(pkg)` so the UI shows a sonner
                toast with a one-tap "Install" → market:// Play Store.
              * Added `isMedianWebView()` + `openPlayStore()` helpers,
                wired into LiveTV + VideoPlayer external paths.

  - task: "Diagnose the APK (Median.co WebView, not Capacitor)"
    implemented: true
    working: true
    file: "frontend/src/lib/externalLauncher.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: |
            User's APK is a Median.co (GoNative) WebView wrapper, not a
            Capacitor build — the Capacitor `NativePlayerPlugin.java` is
            NOT present in the APK. The APK's `initialUrl` points at our
            preview URL, so every frontend fix applies to the APK
            immediately (no rebuild). Median's `regexInternalExternal`
            default rule `^(?!https?://).*` routes `intent://`, `vlc://`,
            `market://` etc. to the OS, so all our launcher schemes are
            supported.

            app if VidoPlay isn't installed. Instead it resolves with
            { launched:false, reason:"not-installed", package } so the UI
            can offer an "Install" toast action. Added two plugin methods:
            isInstalled(package) and openPlayStore(package). TypeScript
            plugin wrapper typed accordingly and LiveTV + VideoPlayer
            surface the install action via a sonner toast.

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Local IPTV proxy endpoint implementation"
    - "External player launch (browser, Android+iOS+desktop)"
    - "Live TV streaming on browser (Supabase iptv-proxy + HLS fallback)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Bug fixes landed for jp65 external-player + live-TV-browser issues.
      Client side builds cleanly (yarn build ✓, tsc --noEmit ✓). Need the
      user to redeploy the Supabase edge function (`supabase functions
      deploy iptv-proxy`) for the live-TV fix to take effect on the web.
      Then please test:
        a) Open Live TV in phone browser → tap a channel → should play
           inline in the HLS.js player even when the server redirects
           .m3u8 to raw .ts.
        b) Switch Account → Playback Mode = External → tap a channel in
           Live TV → Chrome should hand off to VidoPlay (or fallback app).
        c) Inside the built APK, when VidoPlay is the chosen external
           app but not installed, you should see a toast with an
           "Install" action that opens the Play Store.
  - agent: "testing"
    message: |
      Starting comprehensive testing of the new local IPTV proxy endpoint
      at /api/iptv-proxy. Will test all GET/POST/OPTIONS endpoints with
      various URL validation scenarios, private host blocking, HLS manifest
      rewriting, User-Agent forwarding, CORS functionality, and stream
      proxying as specified in the review request.
  - agent: "testing"
    message: |
      🎉 IPTV PROXY TESTING COMPLETE - ALL TESTS PASSED (11/11)
      
      Comprehensive testing completed for the local IPTV proxy endpoint.
      All behaviors specified in the review request are working correctly:
      
      ✅ URL validation and security (private host blocking, scheme validation)
      ✅ Proxy functionality (passthrough, M3U8 rewriting, binary streams)
      ✅ User-Agent forwarding working correctly
      ✅ CORS preflight handling working
      ✅ All response headers (x-proxy-kind) set correctly
      
      The implementation is production-ready and matches the Supabase edge
      function behavior exactly. No issues found during testing.
