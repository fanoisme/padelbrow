<template>
  <div v-if="user" class="dash">
    <section class="dash__profile">
      <div class="dash__who">
        <h2 class="dash__name">{{ displayName }}</h2>
        <p class="dash__contact"><LiIcon name="call" size="sm" /> {{ displayContact }}</p>
      </div>
      <div class="dash__split">
        <div class="dash__stat">
          <div class="dash__stat-top">
            <span class="dash__stat-label">Ranking</span>
            <div class="dash__stat-actions">
              <button type="button" class="dash__icon-btn" :aria-label="showRank ? 'Hide ranking' : 'Show ranking'" @click="showRank = !showRank">
                <LiIcon :name="showRank ? 'visibility' : 'visibility_off'" size="sm" />
              </button>
              <button type="button" class="dash__icon-btn" aria-label="Open leaderboard" @click="go('/leaderboard')">
                <LiIcon name="chevron_right" size="sm" />
              </button>
            </div>
          </div>
          <span class="dash__stat-value">Elo {{ showRank ? elo : '••••' }}</span>
        </div>
        <span class="dash__divider" aria-hidden="true"></span>
        <div class="dash__stat">
          <div class="dash__stat-top">
            <span class="dash__stat-label">Points</span>
            <button type="button" class="dash__icon-btn" aria-label="Open stats" @click="go('/stats')">
              <LiIcon name="chevron_right" size="sm" />
            </button>
          </div>
          <span class="dash__stat-value">{{ xp }} XP</span>
        </div>
      </div>
    </section>

    <section class="dash__promo">
      <div class="dash__promo-glow" aria-hidden="true"></div>
      <span class="dash__promo-icon"><LiIcon name="emoji_events" size="lg" color="#1A1A1A" /></span>
      <div class="dash__promo-body">
        <p class="dash__promo-eyebrow">Sunday Open</p>
        <h3 class="dash__promo-title">Americano · 16 slots</h3>
        <p class="dash__promo-sub">Prize pool <strong>Rp1.000.000</strong></p>
      </div>
      <button type="button" class="dash__promo-cta" @click="go('/competitions')">Register</button>
    </section>

    <section class="dash__actions" aria-label="Quick actions">
      <button v-for="a in actions" :key="a.to" type="button" class="dash__action" @click="go(a.to)">
        <span class="dash__action-icon"><LiIcon :name="a.icon" /></span>
        <span class="dash__action-label">{{ a.label }}</span>
        <span v-if="a.tag" class="dash__action-tag">{{ a.tag }}</span>
      </button>
    </section>

    <section class="dash__hl">
      <div class="dash__hl-head">
        <h3>Recent activity</h3>
        <router-link to="/feed" class="dash__hl-more">See all</router-link>
      </div>
      <ul class="dash__hl-list">
        <li v-for="r in recent" :key="r.id">
          <span class="dash__hl-icon"><LiIcon :name="r.icon" size="sm" /></span>
          <span class="dash__hl-text">
            <span class="dash__hl-title">{{ r.title }}</span>
            <span class="dash__hl-sub">{{ r.sub }}</span>
          </span>
          <span class="dash__hl-amount" :class="r.tone">{{ r.amount }}</span>
        </li>
      </ul>
    </section>
  </div>

  <div v-else class="landing">
    <!-- HERO -->
    <section class="hero">
      <div class="landing__inner hero__inner">
        <LiRevealOnScroll variant="fade-down" :duration="600">
          <span class="hero__eyebrow">Padel community · powered by Allo</span>
        </LiRevealOnScroll>
        <LiRevealOnScroll variant="fade-up" :delay="80" :duration="700">
          <h1 class="hero__title">
            <LiGradientText :animated="true">PADEL BROW</LiGradientText>
          </h1>
        </LiRevealOnScroll>
        <LiRevealOnScroll variant="fade-up" :delay="160" :duration="700">
          <p class="hero__tagline">
            Book matches. Run tournaments. Climb the leaderboard.<br />
            One modern padel community — built for players, clubs & organizers.
          </p>
        </LiRevealOnScroll>
        <LiRevealOnScroll variant="fade-up" :delay="240" :duration="700">
          <div class="hero__cta">
            <LiButton size="lg" variant="primary" @click="go('/signup')">Get started free</LiButton>
            <LiButton size="lg" variant="secondary" @click="go('/leaderboard')">See leaderboard</LiButton>
          </div>
        </LiRevealOnScroll>
        <LiRevealOnScroll variant="scale-in" :delay="320" :duration="800">
          <div class="hero__chips">
            <span class="chip">Americano</span>
            <span class="chip">Mexicano</span>
            <span class="chip">Singles</span>
            <span class="chip">Teams</span>
            <span class="chip">Elo ranking</span>
            <span class="chip">Knockout</span>
          </div>
        </LiRevealOnScroll>
      </div>
      <div class="hero__orbs" aria-hidden="true">
        <span class="hero__orb hero__orb--1"></span>
        <span class="hero__orb hero__orb--2"></span>
      </div>
    </section>

    <!-- FEATURES -->
    <section id="features" class="section">
      <div class="landing__inner">
        <LiRevealOnScroll variant="fade-up">
          <h2 class="section__title">Everything your padel scene needs</h2>
          <p class="section__sub">Nine modules. One app. No spreadsheets, no WhatsApp chaos.</p>
        </LiRevealOnScroll>
        <LiRevealOnScroll variant="fade-up" stagger :stagger-delay="70" :duration="600">
          <div class="feature-grid">
            <div v-for="f in features" :key="f.title" class="feature-card">
              <span class="feature-card__icon">{{ f.icon }}</span>
              <h3 class="feature-card__title">{{ f.title }}</h3>
              <p class="feature-card__body">{{ f.body }}</p>
            </div>
          </div>
        </LiRevealOnScroll>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how" class="section section--tinted">
      <div class="landing__inner">
        <LiRevealOnScroll variant="fade-up">
          <h2 class="section__title">How it works</h2>
          <p class="section__sub">From signup to champion in three steps.</p>
        </LiRevealOnScroll>
        <LiRevealOnScroll variant="fade-up" stagger :stagger-delay="120" :duration="600">
          <ol class="steps">
            <li class="step">
              <span class="step__num">1</span>
              <h3 class="step__title">Create</h3>
              <p>Start a meet or competition in seconds. Pick format, set the stakes, invite players.</p>
            </li>
            <li class="step">
              <span class="step__num">2</span>
              <h3 class="step__title">Play</h3>
              <p>Auto-paired rounds. Enter scores live. Elo ratings update the moment a match closes.</p>
            </li>
            <li class="step">
              <span class="step__num">3</span>
              <h3 class="step__title">Compete</h3>
              <p>Track stats, earn XP, unlock achievements and climb the global leaderboard.</p>
            </li>
          </ol>
        </LiRevealOnScroll>
      </div>
    </section>

    <!-- CTA -->
    <section class="section">
      <div class="landing__inner">
        <LiRevealOnScroll variant="scale-in" :duration="700">
          <div class="cta-panel">
            <div class="cta-panel__shine" aria-hidden="true"></div>
            <h2 class="cta-panel__title">Ready to play?</h2>
            <p class="cta-panel__sub">Join PADEL BROW and run your padel life from one place.</p>
            <LiButton size="lg" variant="primary" @click="go('/signup')">Create your account</LiButton>
          </div>
        </LiRevealOnScroll>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { LiButton, LiIcon, LiGradientText, LiRevealOnScroll } from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { user } = useAuth()
function go(path) {
  router.push(path)
}

// ponytail: profile/rank placeholders — wire to a profile + stats table later.
const showRank = ref(true)
const elo = ref('1.240')
const xp = ref('1.950')
const displayName = computed(
  () => user.value?.user_metadata?.full_name || (user.value?.email ? user.value.email.split('@')[0] : 'Player')
)
const displayContact = computed(() => {
  const phone = user.value?.user_metadata?.phone
  if (phone) return `+62 ${phone}`
  return user.value?.email || '—'
})

const actions = [
  { to: '/meets', label: 'Meets', icon: 'sports_tennis', tag: 'LIVE' },
  { to: '/competitions', label: 'Compete', icon: 'emoji_events', tag: 'NEW' },
  { to: '/leaderboard', label: 'Ranking', icon: 'leaderboard', tag: 'ELO' },
  { to: '/feed', label: 'Feed', icon: 'newspaper' },
  { to: '/clubs', label: 'Clubs', icon: 'groups' },
  { to: '/stats', label: 'Stats', icon: 'insights' },
  { to: '/achievements', label: 'Awards', icon: 'military_tech' },
  { to: '/network', label: 'Network', icon: 'diversity_3' },
]

const recent = [
  { id: 1, icon: 'sports_tennis', title: 'Match win · Americano', sub: 'with Andi, Rere, Joko', amount: '+18 Elo', tone: 'pos' },
  { id: 2, icon: 'payments', title: 'Meet entry paid', sub: 'Court 3 · Saturday', amount: 'Rp40.000', tone: 'neg' },
  { id: 3, icon: 'military_tech', title: 'Achievement unlocked', sub: 'Five-match streak', amount: '+50 XP', tone: 'pos' },
]

const features = [
  { icon: '🎾', title: 'Meets', body: 'Book social matches — Americano, Mexicano, teams or singles. Auto pairings handle the rest.' },
  { icon: '🎯', title: 'Match Engine', body: 'Live score entry, standings on the fly, Elo rating updates the moment a match closes.' },
  { icon: '🏆', title: 'Competitions', body: 'Round-robin and knockout brackets. Real-time standings, organizer-scored matches.' },
  { icon: '💳', title: 'Payments', body: 'Split costs, upload proof of payment, organizer confirms. No gateway, no friction.' },
  { icon: '📰', title: 'Feed', body: 'Share posts, photos and clips. Like, comment, follow players, build your network.' },
  { icon: '📊', title: 'Leaderboard', body: 'Global rankings with a podium top-3. Export the standings as a PNG and share.' },
  { icon: '📈', title: 'Stats', body: 'Personal win/loss, reliability score and full match history at a glance.' },
  { icon: '🎮', title: 'Gamification', body: 'Earn XP, level up, unlock achievements and beat weekly & monthly challenges.' },
  { icon: '🏛️', title: 'Clubs', body: 'Create or join clubs. Membership tiers, organizers, club-only feed and events.' },
]
</script>

<style scoped>
.landing {
  margin: calc(-1 * var(--space-l, 24px));
  width: calc(100% + var(--space-l, 24px) * 2);
}
@media (max-width: 720px) {
  .landing {
    margin: calc(-1 * var(--space-m, 16px));
    width: calc(100% + var(--space-m, 16px) * 2);
  }
}

.landing__inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 var(--space-2xl, 32px);
}

/* ── HERO ── */
.hero {
  position: relative;
  overflow: hidden;
  padding: var(--space-5xl, 96px) 0 var(--space-4xl, 64px);
  background: var(--gradient-mesh-warm),
              radial-gradient(ellipse at 50% 0%, rgba(255, 188, 37, 0.08) 0%, transparent 60%);
}
.hero__inner {
  position: relative;
  z-index: var(--z-content, 10);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-l, 16px);
}
.hero__eyebrow {
  display: inline-block;
  padding: 6px 14px;
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light, rgba(10,10,10,0.8));
  backdrop-filter: var(--glass-blur-light, blur(12px));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, #D4D4D4);
  letter-spacing: 0.02em;
}
.hero__title {
  font-size: clamp(3rem, 9vw, 6rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  margin: 0;
}
.hero__tagline {
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  color: var(--color-on-surface-variant, #D4D4D4);
  line-height: 1.5;
  max-width: 640px;
  margin: 0;
}
.hero__cta {
  display: flex;
  gap: var(--space-m, 12px);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-s, 8px);
}
.hero__chips {
  display: flex;
  gap: var(--space-s, 8px);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-s, 8px);
}
.chip {
  padding: 6px 14px;
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg-light-soft, rgba(255,255,255,0.35));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.12));
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, #D4D4D4);
}
.hero__orbs { position: absolute; inset: 0; pointer-events: none; }
.hero__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  animation: lith-orb-drift-1 var(--drift-duration, 25s) ease-in-out infinite;
}
.hero__orb--1 {
  width: 340px; height: 340px;
  top: -80px; left: -60px;
  background: radial-gradient(circle, rgba(255,175,3,0.45), transparent 70%);
}
.hero__orb--2 {
  width: 300px; height: 300px;
  bottom: -100px; right: -40px;
  background: radial-gradient(circle, rgba(255,107,0,0.35), transparent 70%);
  animation-name: lith-orb-drift-2;
}

/* ── SECTION ── */
.section {
  padding: var(--space-4xl, 64px) 0;
}
.section--tinted {
  background: var(--color-section-bg, #F5F7FA);
}
.section__title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 var(--space-s, 8px);
  text-align: center;
}
.section__sub {
  text-align: center;
  color: var(--color-on-surface-variant, #D4D4D4);
  font-size: 1.05rem;
  margin: 0 0 var(--space-3xl, 48px);
}

/* ── FEATURE GRID ── */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-l, 16px);
}
.feature-card {
  position: relative;
  padding: var(--space-2xl, 32px) var(--space-xl, 24px);
  border-radius: var(--radius-lg, 24px);
  background: var(--glass-bg-light, rgba(255,255,255,0.5));
  backdrop-filter: var(--glass-blur-light, blur(12px));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.12));
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04));
  transition: transform var(--dur-short, 200ms) var(--ease-smooth, cubic-bezier(0.16,1,0.3,1)),
              box-shadow var(--dur-short, 200ms) var(--ease-out, ease),
              border-color var(--dur-short, 200ms) var(--ease-out, ease);
  overflow: hidden;
}
.feature-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--gradient-card-hover, linear-gradient(135deg, rgba(255,255,255,0.08), transparent));
  opacity: 0;
  transition: opacity var(--dur-short, 200ms) var(--ease-out, ease);
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.08));
  border-color: var(--glass-border-hover, rgba(255,255,255,0.2));
}
.feature-card:hover::before { opacity: 1; }
.feature-card__icon {
  font-size: 2rem;
  display: block;
  margin-bottom: var(--space-m, 12px);
}
.feature-card__title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 var(--space-xs, 4px);
}
.feature-card__body {
  color: var(--color-on-surface-variant, #D4D4D4);
  line-height: 1.5;
  margin: 0;
  font-size: 0.95rem;
}

/* ── STEPS ── */
.steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-xl, 24px);
}
.step {
  text-align: center;
  padding: var(--space-2xl, 32px) var(--space-xl, 24px);
}
.step__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--gradient-brand, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: #1E1E1E;
  font-weight: 800;
  font-size: 1.2rem;
  margin-bottom: var(--space-m, 12px);
  box-shadow: var(--shadow-glow-subtle, 0 0 16px rgba(255,188,37,0.12));
}
.step__title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 var(--space-s, 8px);
}
.step p {
  color: var(--color-on-surface-variant, #D4D4D4);
  line-height: 1.5;
  margin: 0;
}

/* ── CTA PANEL ── */
.cta-panel {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: var(--space-4xl, 64px) var(--space-2xl, 32px);
  border-radius: var(--radius-xl, 32px);
  background: var(--bg-dark, #212324);
  color: #F0F0F0;
  box-shadow: var(--shadow-xl, 0 16px 48px rgba(0,0,0,0.1));
}
.cta-panel__shine {
  position: absolute;
  inset: 0;
  background: var(--gradient-mesh-warm);
  opacity: 0.6;
  pointer-events: none;
}
.cta-panel__title {
  position: relative;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 var(--space-s, 8px);
}
.cta-panel__sub {
  position: relative;
  color: rgba(240, 240, 240, 0.75);
  font-size: 1.1rem;
  margin: 0 0 var(--space-2xl, 32px);
}
.cta-panel :deep(.li-btn) { position: relative; }

@media (prefers-reduced-motion: reduce) {
  .hero__orb { animation: none; }
}

/* ── DASHBOARD (logged-in) ── */
.dash {
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 16px);
  max-width: 640px;
  margin: 0 auto;
  padding-bottom: var(--space-2xl, 32px);
}

.dash__profile {
  background: var(--color-bg-dark, #212324);
  color: #FFFFFF;
  border-radius: var(--radius-xl, 20px);
  padding: var(--space-l, 20px);
  display: flex;
  flex-direction: column;
  gap: var(--space-l, 18px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.12));
}
.dash__name {
  margin: 0;
  font-size: var(--text-lg, 18px);
  font-weight: 800;
  letter-spacing: -0.01em;
}
.dash__contact {
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs, 14px);
  color: rgba(255, 255, 255, 0.7);
}
.dash__split {
  display: flex;
  align-items: stretch;
  gap: var(--space-m, 16px);
}
.dash__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dash__stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash__stat-label {
  font-size: var(--text-xs, 14px);
  color: rgba(255, 255, 255, 0.7);
}
.dash__stat-actions {
  display: inline-flex;
  gap: 2px;
}
.dash__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  border-radius: 50%;
  transition: background var(--dur-short, 200ms) var(--ease-out, ease), color var(--dur-short, 200ms) var(--ease-out, ease);
}
.dash__icon-btn:hover { background: rgba(255, 255, 255, 0.1); color: #FFFFFF; }
.dash__stat-value {
  font-size: var(--text-lg, 20px);
  font-weight: 800;
  letter-spacing: -0.01em;
}
.dash__divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.dash__promo {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: var(--space-m, 14px);
  padding: var(--space-l, 18px);
  border-radius: var(--radius-xl, 20px);
  background: linear-gradient(135deg, var(--color-yellow-300, #FDDD00) 0%, var(--color-brand, #FFAF03) 60%, var(--color-orange-400, #FF6B00) 100%);
  color: var(--color-gray-900, #1A1A1A);
  box-shadow: var(--shadow-md, 0 4px 16px rgba(255, 107, 0, 0.18));
}
.dash__promo-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 90% 10%, rgba(255, 255, 255, 0.5), transparent 55%);
  pointer-events: none;
}
.dash__promo-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}
.dash__promo-body { position: relative; flex: 1; min-width: 0; }
.dash__promo-eyebrow {
  margin: 0;
  font-size: var(--text-xxs, 12px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.dash__promo-title {
  margin: 2px 0;
  font-size: var(--text-md, 16px);
  font-weight: 800;
}
.dash__promo-sub {
  margin: 0;
  font-size: var(--text-xs, 13px);
  opacity: 0.85;
}
.dash__promo-cta {
  position: relative;
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: var(--radius-pill, 999px);
  border: 1.5px solid var(--color-gray-300, #2A2A2A);
  background: var(--color-gray-100, #121212);
  color: var(--color-gray-900, #FFFFFF);
  font-weight: 700;
  font-size: var(--text-xs, 14px);
  cursor: pointer;
  transition: transform var(--dur-short, 200ms) var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1));
}
.dash__promo-cta:active { transform: scale(0.97); }

.dash__actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-m, 16px) var(--space-s, 8px);
}
.dash__action {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--space-s, 8px) 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-gray-900, #FFFFFF);
  transition: transform var(--dur-short, 200ms) var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1));
}
.dash__action:active { transform: scale(0.95); }
.dash__action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md, 16px);
  background: var(--color-gray-100, #121212);
  color: var(--color-brand, #FFAF03);
}
.dash__action-label {
  font-size: var(--text-xs, 13px);
  font-weight: 600;
  text-align: center;
}
.dash__action-tag {
  position: absolute;
  top: -2px;
  right: 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--color-red-400, #C83E3B);
}
@media (max-width: 360px) {
  .dash__action-icon { width: 48px; height: 48px; }
}

.dash__hl {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 12px);
}
.dash__hl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash__hl-head h3 {
  margin: 0;
  font-size: var(--text-md, 16px);
  font-weight: 800;
  color: var(--color-gray-900, #FFFFFF);
}
.dash__hl-more {
  font-size: var(--text-xs, 14px);
  font-weight: 600;
  color: var(--color-brand, #FFAF03);
  text-decoration: none;
}
.dash__hl-more:hover { text-decoration: underline; }
.dash__hl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-gray-100, #121212);
  border-radius: var(--radius-lg, 16px);
}
.dash__hl-list li {
  display: flex;
  align-items: center;
  gap: var(--space-m, 12px);
  padding: var(--space-m, 14px) var(--space-l, 16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.dash__hl-list li:last-child { border-bottom: none; }
.dash__hl-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-gray-0, #FFFFFF);
  color: var(--color-brand, #FFAF03);
  flex-shrink: 0;
}
.dash__hl-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.dash__hl-title {
  font-size: var(--text-xs, 14px);
  font-weight: 600;
  color: var(--color-gray-900, #FFFFFF);
}
.dash__hl-sub {
  font-size: var(--text-xxs, 12px);
  color: var(--color-on-surface-variant, #D4D4D4);
}
.dash__hl-amount {
  font-size: var(--text-xs, 14px);
  font-weight: 700;
  white-space: nowrap;
}
.dash__hl-amount.pos { color: var(--color-green-500, #4CAF50); }
.dash__hl-amount.neg { color: var(--color-gray-900, #FFFFFF); }

@media (prefers-reduced-motion: reduce) {
  .dash__action:active, .dash__promo-cta:active { transform: none; }
}
</style>
