# Test Guide - Smart MES Platform

## 1. Test Strategy

Manual exploratory testing focused on:
- All 6 routes load correctly
- Splash -> Home redirect
- Process Showcase chapter navigation and auto-play logic
- Smart Factory Panorama video modal with STAR content
- i18n switching across 4 languages
- Voice intro play/cancel
- Spacebar toggle on Process Showcase
- Dashboard mock data simulation
- Monitor station grid + alert interactions
- Yield charts rendering

## 2. Test Cases

### 2.1 Splash Screen
- TC-SPL-01: Splash shows Zero.mp4 full-screen on first load
- TC-SPL-02: ENTER button navigates to Home
- TC-SPL-03: Voice plays "Smart MES platform" in current language (if voice ON)

### 2.2 Home Page
- TC-HOME-01: HeroSection renders with title, description, KPI counters
- TC-HOME-02: Counters animate from 0 to target
- TC-HOME-03: Smart Factory Panorama section shows 6 auto-playing videos
- TC-HOME-04: Videos are muted, loop, lazy-loaded on scroll

### 2.3 ArchDiagram Modal
- TC-ARCH-01: Click video opens modal with unmuted playback
- TC-ARCH-02: Modal shows video left (48vw) + STAR content right (36vw)
- TC-ARCH-03: STAR sections are color-coded: Situation (blue), Task (green), Action (gold), Result (orange)
- TC-ARCH-04: Module icon + title displays above STAR content
- TC-ARCH-05: Each video maps to correct module via videoToModule
- TC-ARCH-06: Close button (X) closes modal, pauses video
- TC-ARCH-07: Click outside modal also closes it

### 2.4 Process Showcase
- TC-VID-01: 9 chapters load with correct titles from i18n
- TC-VID-02: First video does NOT auto-play on page load
- TC-VID-03: After manual play, hasPlayed=true, subsequent videos auto-play
- TC-VID-04: Spacebar toggles play/pause of all visible videos
- TC-VID-05: Spacebar does NOT trigger when modal is open
- TC-VID-06: Chapter navigation updates video list
- TC-VID-07: Voice says video title on play (if voice ON)

### 2.5 i18n
- TC-I18N-01: 4 language options in navbar dropdown
- TC-I18N-02: Switching language updates all static text immediately
- TC-I18N-03: Video titles and descriptions change per language
- TC-I18N-04: Voice intro speaks in selected language

### 2.6 Voice
- TC-VOICE-01: Voice toggle icon switches between Volume2 and VolumeX
- TC-VOICE-02: Turning voice OFF cancels current speech immediately
- TC-VOICE-03: Voice ON plays intro on splash, video titles on play
- TC-VOICE-04: Uses Taiwanese female voice (prefers zh-TW)

### 2.7 Dashboard
- TC-DASH-01: Skill heatmap renders 23h x 60d grid
- TC-DASH-02: KPI cards show 4 metrics with delta indicators
- TC-DASH-03: Station grid shows 20 station cards
- TC-DASH-04: Data updates every tick (mock interval)

### 2.8 Process Showcase
- TC-MON-01: AlertPanel shows critical/warning/info badges
- TC-MON-02: EventLog scrolls with latest events
- TC-MON-03: StationGrid cards show status indicators

### 2.9 Yield Analysis
- TC-YIELD-01: 4 KPI cards render with correct values
- TC-YIELD-02: ProductionProgress shows bar
- TC-YIELD-03: DefectPareto + DefectPie render charts
- TC-YIELD-04: YieldTrend + TorqueTrend render line charts
- TC-YIELD-05: StationDefectRate renders bar chart

### 2.10 Guide Page
- TC-GUIDE-01: Pillar cards display with icons
- TC-GUIDE-02: Module explainers show problem/solution/benefits

### 2.11 Navbar
- TC-NAV-01: 6 primary links render (Home, Process Showcase, Dashboard, Monitor, Yield Analysis, Guide)
- TC-NAV-02: Active route highlights correctly
- TC-NAV-03: Dropdown work links open in new tabs
- TC-NAV-04: Lang selector works with flag icons
- TC-NAV-05: Logo renders via CSS background-image (no flash on lang switch)
- TC-NAV-06: Voice icon toggles on click

## 3. Regression Checklist

- [ ] All 6 routes render without console errors
- [ ] Splash transitions to Home on ENTER click
- [ ] ArchDiagram videos auto-play when scrolled into view
- [ ] STAR modal opens/closes for each video
- [ ] hasPlayed flag persists during session
- [ ] Spacebar toggles Process Showcase videos
- [ ] Voice cancel works on OFF toggle
- [ ] i18n switch updates all 4 languages without page reload
- [ ] DashboardProvider mock data continues updating
- [ ] Yield chart tooltips render correctly
- [ ] Responsive layout at 3 breakpoints (mobile/tablet/desktop)
- [ ] Logo renders on all pages after lang switch
- [ ] No broken image/video paths (0.mp4-8.mp4, 1.mp4-6.mp4, splash.mp4)
