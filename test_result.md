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
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Forced-package path no longer silently falls through to another
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
