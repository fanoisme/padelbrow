<template>
  <!-- ══════════════════════════════════════════════════════════════
       DASHBOARD (logged-in)
       ══════════════════════════════════════════════════════════════ -->
  <div v-if="user" class="dash">
    <!-- WELCOME -->
    <section class="dash__welcome">
      <div class="dash__welcome-row">
        <div class="dash__avatar-ring">
          <LiAvatar :initials="avatarInitials" size="xl" badge="online" />
        </div>
        <div class="dash__welcome-text">
          <h2 class="dash__greeting">Welcome back, <span class="dash__greeting-name">{{ firstName }}</span></h2>
          <div class="dash__level-row">
            <span class="dash__level-badge" :class="`dash__level-badge--${levelTier}`">
              <LiIcon name="diamond" size="xs" />
              {{ levelBadge }}
            </span>
            <span class="dash__streak">{{ streak }} day streak 🔥</span>
          </div>
        </div>
      </div>
    </section>

    <!-- PROFILE STATS -->
    <section class="dash__stats-cards">
      <div class="dash__stat-card anim-border anim-border--brand" style="--card-hue: 38">
        <div class="dash__stat-inner">
          <div class="dash__stat-icon dash__stat-icon--brand">
            <LiIcon name="workspace_premium" />
          </div>
          <span class="dash__stat-label">Ranking</span>
          <span class="dash__stat-value">
            <template v-if="showRank">Elo <LiCountUp :end-val="eloNum" :duration="1200" /></template>
            <template v-else>••••</template>
          </span>
          <div class="dash__stat-bar">
            <div class="dash__stat-bar-fill dash__stat-bar-fill--brand" :style="{ width: rankProgress + '%' }"></div>
          </div>
          <button type="button" class="dash__stat-eye" :aria-label="showRank ? 'Hide' : 'Show'" @click="showRank = !showRank">
            <LiIcon :name="showRank ? 'visibility' : 'visibility_off'" size="xs" />
          </button>
        </div>
      </div>

      <div class="dash__stat-card anim-border anim-border--success" style="--card-hue: 160">
        <div class="dash__stat-inner">
          <div class="dash__stat-icon dash__stat-icon--success">
            <LiIcon name="bolt" />
          </div>
          <span class="dash__stat-label">Points</span>
          <span class="dash__stat-value"><LiCountUp :end-val="xpNum" :duration="1400" /> XP</span>
          <div class="dash__stat-bar">
            <div class="dash__stat-bar-fill dash__stat-bar-fill--success" :style="{ width: xpProgress + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="dash__stat-card anim-border anim-border--info" style="--card-hue: 220">
        <div class="dash__stat-inner">
          <div class="dash__stat-icon dash__stat-icon--info">
            <LiIcon name="trophy" />
          </div>
          <span class="dash__stat-label">Win Rate</span>
          <span class="dash__stat-value"><LiCountUp :end-val="winRate" :duration="1600" suffix="%" /></span>
          <div class="dash__stat-bar">
            <div class="dash__stat-bar-fill dash__stat-bar-fill--info" :style="{ width: winRate + '%' }"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- PROMO BANNER -->
    <section class="dash__promo">
      <div class="dash__promo-shimmer" aria-hidden="true"></div>
      <div class="dash__promo-glow" aria-hidden="true"></div>
      <div class="dash__promo-icon-wrap">
        <LiIcon name="emoji_events" size="xl" />
      </div>
      <div class="dash__promo-body">
        <p class="dash__promo-eyebrow">🏆 Sunday Open</p>
        <h3 class="dash__promo-title">Americano · 16 slots</h3>
        <p class="dash__promo-sub">Prize pool <strong>Rp1.000.000</strong></p>
      </div>
      <button type="button" class="dash__promo-cta" @click="go('/competitions')">
        Register
        <LiIcon name="arrow_forward" size="sm" />
      </button>
    </section>

    <!-- QUICK ACTIONS -->
    <section class="dash__actions-section">
      <h3 class="dash__section-title">Quick Actions</h3>
      <div class="dash__actions">
        <button
          v-for="a in actions"
          :key="a.to"
          type="button"
          class="dash__action"
          :style="`--action-gradient: ${a.gradient}; --action-glow: ${a.glow}`"
          @click="go(a.to)"
        >
          <span class="dash__action-icon">
            <LiIcon :name="a.icon" />
          </span>
          <span class="dash__action-label">{{ a.label }}</span>
          <span v-if="a.tag" class="dash__action-tag" :class="`dash__action-tag--${a.tagColor}`">{{ a.tag }}</span>
        </button>
      </div>
    </section>

    <!-- UPCOMING MATCHES -->
    <section class="dash__section">
      <div class="dash__section-head">
        <h3>Upcoming</h3>
        <router-link to="/meets" class="dash__section-link">See all →</router-link>
      </div>
      <div class="dash__upcoming-list">
        <div v-for="m in upcoming" :key="m.id" class="dash__upcoming-card anim-border" :style="{ '--card-hue': m.hue }">
          <div class="dash__upcoming-inner">
            <div class="dash__upcoming-date" :style="{ background: m.gradient }">
              <span class="dash__upcoming-day">{{ m.day }}</span>
              <span class="dash__upcoming-month">{{ m.month }}</span>
            </div>
            <div class="dash__upcoming-info">
              <h4 class="dash__upcoming-title">{{ m.title }}</h4>
              <p class="dash__upcoming-meta">
                <LiIcon name="group" size="xs" />
                {{ m.format }} · {{ m.slots }}
              </p>
            </div>
            <button type="button" class="dash__upcoming-join" @click="go('/meets')">Join</button>
          </div>
        </div>
      </div>
    </section>

    <!-- RECENT ACTIVITY -->
    <section class="dash__section">
      <div class="dash__section-head">
        <h3>Recent Activity</h3>
        <router-link to="/feed" class="dash__section-link">See all →</router-link>
      </div>
      <div class="dash__activity-card">
        <div v-for="r in recent" :key="r.id" class="dash__activity-item">
          <span class="dash__activity-icon" :style="{ background: r.gradient }">
            <LiIcon :name="r.icon" size="sm" />
          </span>
          <span class="dash__activity-text">
            <span class="dash__activity-title">{{ r.title }}</span>
            <span class="dash__activity-sub">{{ r.sub }}</span>
          </span>
          <span class="dash__activity-amount" :class="`dash__activity-amount--${r.tone}`">{{ r.amount }}</span>
        </div>
      </div>
    </section>
  </div>

  <!-- ══════════════════════════════════════════════════════════════
       LANDING PAGE (not logged in)
       ══════════════════════════════════════════════════════════════ -->
  <div v-else class="landing">
    <!-- HERO — uses LiHero with spotlight cursor tracking -->
    <LiHero
      variant="warm"
      intensity="vivid"
      eyebrow="Padel community · powered by Allo"
      title="PADEL BROW"
      subtitle="Book matches. Run tournaments. Climb the leaderboard. One modern padel community — built for players, clubs & organizers."
    >
      <template #actions>
        <LiMagneticButton variant="primary" size="lg" icon="arrow_forward" :pulse="true" @click="go('/signup')">
          Get started free
        </LiMagneticButton>
        <LiMagneticButton variant="secondary" size="lg" @click="go('/leaderboard')">
          See leaderboard
        </LiMagneticButton>
      </template>
      <div class="hero__chips">
        <span v-for="c in formatChips" :key="c" class="hero__chip">{{ c }}</span>
      </div>
    </LiHero>

    <!-- SCROLLING MARQUEE -->
    <div class="marquee-strip">
      <LiMarquee :speed="35" :gap="40" direction="left">
        <span v-for="f in marqueeItems" :key="f" class="marquee-item">
          <span class="marquee-dot"></span>{{ f }}
        </span>
      </LiMarquee>
    </div>

    <!-- STATS STRIP -->
    <section class="stats-strip">
      <div class="landing__inner">
        <div class="stats-grid">
          <div v-for="s in statsItems" :key="s.label" class="stat-item">
            <span class="stat-value">
              <LiCountUp :end-val="s.value" :duration="2000" :suffix="s.suffix" />
            </span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section id="features" class="section">
      <div class="landing__inner">
        <div class="section-header">
          <h2 class="section__title">Everything your padel scene needs</h2>
          <p class="section__sub">Nine modules. One app. No spreadsheets, no WhatsApp chaos.</p>
        </div>
        <div class="feature-grid">
          <div
            v-for="(f, i) in features"
            :key="f.title"
            class="feature-card anim-border"
            :class="{ 'feature-card--wide': i === 0 }"
            :style="`--card-hue: ${f.hue}; --icon-gradient: ${f.gradient}; --icon-glow: ${f.glow}`"
          >
            <div class="feature-card__inner">
              <span class="feature-card__icon">
                <LiIcon :name="f.icon" size="lg" />
              </span>
              <h3 class="feature-card__title">{{ f.title }}</h3>
              <p class="feature-card__body">{{ f.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how" class="section section--dark">
      <div class="landing__inner">
        <div class="section-header">
          <h2 class="section__title">How it works</h2>
          <p class="section__sub">From signup to champion in three steps.</p>
        </div>
        <div class="steps">
          <div v-for="step in steps" :key="step.num" class="step anim-border" :style="{ '--card-hue': step.hue }">
            <div class="step__inner">
              <div class="step__num-wrap">
                <span class="step__num">{{ step.num }}</span>
                <span class="step__num-glow" aria-hidden="true"></span>
              </div>
              <h3 class="step__title">{{ step.title }}</h3>
              <p class="step__desc">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="testimonials-section">
      <div class="landing__inner">
        <h2 class="section__title">What players say</h2>
      </div>
      <LiMarquee :speed="28" :gap="20" direction="right">
        <div v-for="t in testimonials" :key="t.name" class="testimonial-card">
          <p class="testimonial-text">"{{ t.text }}"</p>
          <span class="testimonial-name">— {{ t.name }}</span>
        </div>
      </LiMarquee>
    </section>

    <!-- CTA -->
    <section class="section">
      <div class="landing__inner">
        <div class="cta-panel anim-border" style="--card-hue: 38">
          <div class="cta-panel__inner">
            <LiSparkle :fire-on-mount="true" :count="8" :lifespan="1200">
              <h2 class="cta-panel__title">Ready to play?</h2>
            </LiSparkle>
            <p class="cta-panel__sub">Join PADEL BROW and run your padel life from one place.</p>
            <LiMagneticButton variant="primary" size="lg" icon="arrow_forward" :pulse="true" @click="go('/signup')">
              Create your account
            </LiMagneticButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  LiIcon, LiGradientText, LiRevealOnScroll,
  LiMarquee, LiCountUp, LiMeshBackground,
  LiSparkle, LiMagneticButton, LiAvatar,
  LiHero
} from '../design-system/components/index.js'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { user } = useAuth()
function go(path) { router.push(path) }

// ── Profile (ponytail: wire to profile + stats table later) ──
const showRank = ref(true)
const elo = ref('1.240')
const xp = ref('1.950')
const eloNum = computed(() => parseInt(elo.value.replace('.', ''), 10) || 1240)
const xpNum = computed(() => parseInt(xp.value.replace('.', ''), 10) || 1950)
const rankProgress = ref(72)
const xpProgress = ref(65)
const winRate = ref(68)
const streak = ref(12)
const levelTier = computed(() => {
  const e = eloNum.value
  if (e >= 2000) return 'diamond'
  if (e >= 1500) return 'gold'
  if (e >= 1200) return 'silver'
  return 'bronze'
})
const levelBadge = computed(() => {
  const t = levelTier.value
  return t.charAt(0).toUpperCase() + t.slice(1)
})

const displayName = computed(
  () => user.value?.user_metadata?.full_name || (user.value?.email ? user.value.email.split('@')[0] : 'Player')
)
const firstName = computed(() => displayName.value.split(' ')[0])
const avatarInitials = computed(() => {
  const n = displayName.value.split(' ')
  return n.length > 1 ? n[0][0] + n[1][0] : n[0][0]
})

const actions = [
  { to: '/meets', label: 'Meets', icon: 'sports_tennis', tag: 'LIVE', tagColor: 'red', gradient: 'linear-gradient(135deg, #FFAF03, #FF6B00)', glow: 'rgba(255,175,3,0.3)' },
  { to: '/competitions', label: 'Compete', icon: 'emoji_events', tag: 'NEW', tagColor: 'amber', gradient: 'linear-gradient(135deg, #F9C700, #FDDD00)', glow: 'rgba(249,199,0,0.3)' },
  { to: '/leaderboard', label: 'Ranking', icon: 'leaderboard', tag: 'ELO', tagColor: 'blue', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)', glow: 'rgba(59,130,246,0.3)' },
  { to: '/feed', label: 'Feed', icon: 'newspaper', tag: null, tagColor: null, gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)', glow: 'rgba(168,85,247,0.3)' },
  { to: '/clubs', label: 'Clubs', icon: 'groups', tag: null, tagColor: null, gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)', glow: 'rgba(20,184,166,0.3)' },
  { to: '/stats', label: 'Stats', icon: 'insights', tag: null, tagColor: null, gradient: 'linear-gradient(135deg, #10B981, #059669)', glow: 'rgba(16,185,129,0.3)' },
  { to: '/achievements', label: 'Awards', icon: 'military_tech', tag: null, tagColor: null, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.3)' },
  { to: '/network', label: 'Network', icon: 'diversity_3', tag: null, tagColor: null, gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)', glow: 'rgba(99,102,241,0.3)' },
]

const upcoming = [
  { id: 1, day: '19', month: 'Jul', title: 'Saturday Americano', format: 'Americano', slots: '4/8 joined', hue: '38', gradient: 'linear-gradient(135deg, #FFAF03, #FF6B00)' },
  { id: 2, day: '23', month: 'Jul', title: 'Midweek Singles', format: 'Singles', slots: '2/4 joined', hue: '220', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
]

const recent = [
  { id: 1, icon: 'sports_tennis', title: 'Match win · Americano', sub: 'with Andi, Rere, Joko', amount: '+18 Elo', tone: 'pos', gradient: 'linear-gradient(135deg, #FFAF03, #FF6B00)' },
  { id: 2, icon: 'payments', title: 'Meet entry paid', sub: 'Court 3 · Saturday', amount: 'Rp40.000', tone: 'neg', gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
  { id: 3, icon: 'military_tech', title: 'Achievement unlocked', sub: 'Five-match streak', amount: '+50 XP', tone: 'pos', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
]

// ── Landing ──
const formatChips = ['Americano', 'Mexicano', 'Singles', 'Teams', 'Elo ranking', 'Knockout']
const marqueeItems = [
  'Americano', 'Mexicano', 'Singles', 'Teams', 'Elo Ranking', 'Knockout',
  'Round Robin', 'Americanado', 'King of the Court', 'Golden Point'
]
const statsItems = [
  { value: 1200, suffix: '+', label: 'Players' },
  { value: 340, suffix: '+', label: 'Matches' },
  { value: 50, suffix: '+', label: 'Competitions' },
  { value: 25, suffix: '', label: 'Clubs' },
]

const features = [
  { icon: 'sports_tennis', title: 'Meets', body: 'Book social matches — Americano, Mexicano, teams or singles. Auto pairings handle the rest.', hue: '38', gradient: 'linear-gradient(135deg, #FFAF03, #FF6B00)', glow: 'rgba(255,175,3,0.25)' },
  { icon: 'gps_fixed', title: 'Match Engine', body: 'Live score entry, standings on the fly, Elo rating updates the moment a match closes.', hue: '38', gradient: 'linear-gradient(135deg, #FF8C00, #FF6B00)', glow: 'rgba(255,140,0,0.25)' },
  { icon: 'emoji_events', title: 'Competitions', body: 'Round-robin and knockout brackets. Real-time standings, organizer-scored matches.', hue: '48', gradient: 'linear-gradient(135deg, #F9C700, #FDDD00)', glow: 'rgba(249,199,0,0.25)' },
  { icon: 'credit_card', title: 'Payments', body: 'Split costs, upload proof of payment, organizer confirms. No gateway, no friction.', hue: '160', gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)', glow: 'rgba(20,184,166,0.25)' },
  { icon: 'newspaper', title: 'Feed', body: 'Share posts, photos and clips. Like, comment, follow players, build your network.', hue: '270', gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)', glow: 'rgba(168,85,247,0.25)' },
  { icon: 'leaderboard', title: 'Leaderboard', body: 'Global rankings with a podium top-3. Export the standings as a PNG and share.', hue: '220', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)', glow: 'rgba(59,130,246,0.25)' },
  { icon: 'insights', title: 'Stats', body: 'Personal win/loss, reliability score and full match history at a glance.', hue: '160', gradient: 'linear-gradient(135deg, #10B981, #059669)', glow: 'rgba(16,185,129,0.25)' },
  { icon: 'videogame_asset', title: 'Gamification', body: 'Earn XP, level up, unlock achievements and beat weekly & monthly challenges.', hue: '20', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.25)' },
  { icon: 'groups', title: 'Clubs', body: 'Create or join clubs. Membership tiers, organizers, club-only feed and events.', hue: '240', gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)', glow: 'rgba(99,102,241,0.25)' },
]

const steps = [
  { num: 1, title: 'Create', desc: 'Start a meet or competition in seconds. Pick format, set the stakes, invite players.', hue: '38' },
  { num: 2, title: 'Play', desc: 'Auto-paired rounds. Enter scores live. Elo ratings update the moment a match closes.', hue: '160' },
  { num: 3, title: 'Compete', desc: 'Track stats, earn XP, unlock achievements and climb the global leaderboard.', hue: '48' },
]

const testimonials = [
  { name: 'Andi S.', text: 'Finally no more WhatsApp chaos for organizing matches. Everything in one place.' },
  { name: 'Rere K.', text: 'The Elo system keeps me coming back. Seeing my rank climb is addictive!' },
  { name: 'Joko P.', text: 'Set up a 16-player Americano in 2 minutes. The auto-pairing is genius.' },
  { name: 'Dina M.', text: 'Our club went from 8 to 40 members after switching to Padel Brow.' },
]
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   ANIMATED GRADIENT BORDER SYSTEM
   Uses CSS @property for smooth conic-gradient rotation
   ══════════════════════════════════════════════════════════════ */
@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.anim-border {
  position: relative;
  border-radius: var(--radius-lg, 20px);
  isolation: isolate;
}
.anim-border::before {
  content: '';
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  padding: 1.5px;
  background: conic-gradient(
    from var(--border-angle),
    transparent 40%,
    hsl(var(--card-hue, 38) 90% 55%) 50%,
    hsl(var(--card-hue, 38) 90% 65%) 55%,
    transparent 65%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 1;
}
.anim-border:hover::before {
  opacity: 1;
  animation: border-spin 3s linear infinite;
}
@keyframes border-spin {
  to { --border-angle: 360deg; }
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════════════════════ */
.landing {
  margin: calc(-1 * var(--space-l, 24px));
  width: calc(100% + var(--space-l, 24px) * 2);
}
@media (max-width: 768px) {
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
@media (max-width: 768px) {
  .landing__inner { padding: 0 var(--space-l, 16px); }
}

/* ── Hero chips ── */
.hero__chips {
  display: flex;
  gap: var(--space-s, 8px);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-l, 16px);
}
.hero__chip {
  padding: 6px 16px;
  border-radius: var(--radius-pill, 999px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, #D4D4D4);
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, border-color 0.2s ease;
}
.hero__chip:hover {
  background: rgba(255, 175, 3, 0.1);
  border-color: rgba(255, 175, 3, 0.3);
}

/* ── Marquee strip ── */
.marquee-strip {
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.01);
}
.marquee-item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-on-surface-variant, #D4D4D4);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.marquee-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-brand, #FFAF03);
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(255, 175, 3, 0.4);
}

/* ── Stats strip ── */
.stats-strip {
  padding: var(--space-4xl, 64px) 0;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-xl, 24px);
  text-align: center;
}
@media (max-width: 600px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: var(--space-l, 16px); }
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-value {
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  background: var(--gradient-text-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 20px rgba(255, 175, 3, 0.15));
}
.stat-label {
  font-size: 0.88rem;
  color: var(--color-on-surface-variant, #D4D4D4);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ── Sections ── */
.section {
  padding: var(--space-5xl, 96px) 0;
}
@media (max-width: 768px) {
  .section { padding: var(--space-3xl, 48px) 0; }
}
.section--dark {
  background: var(--color-section-bg, #0A0A0A);
}
.section-header {
  text-align: center;
  margin-bottom: var(--space-3xl, 48px);
}
.section__title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 var(--space-s, 8px);
}
.section__sub {
  color: var(--color-on-surface-variant, #D4D4D4);
  font-size: 1.05rem;
  margin: 0;
  max-width: 560px;
  margin-inline: auto;
}

/* ── Feature grid ── */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-l, 16px);
}
@media (max-width: 768px) {
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .feature-grid { grid-template-columns: 1fr; }
}
.feature-card--wide {
  grid-column: span 2;
}
@media (max-width: 480px) {
  .feature-card--wide { grid-column: span 1; }
}
.feature-card {
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--glass-border);
  transition: transform 0.35s var(--ease-smooth), box-shadow 0.35s ease, border-color 0.3s ease;
  cursor: default;
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 30px var(--icon-glow, rgba(255,175,3,0.1));
  border-color: rgba(255, 255, 255, 0.12);
}
@media (hover: none) {
  .feature-card:hover { transform: none; box-shadow: none; }
}
.feature-card__inner {
  padding: var(--space-xl, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
}
.feature-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--icon-gradient, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: #FFFFFF;
  box-shadow: 0 4px 16px var(--icon-glow, rgba(255,175,3,0.2));
  transition: transform 0.3s var(--ease-spring), box-shadow 0.3s ease;
}
.feature-card:hover .feature-card__icon {
  transform: scale(1.08);
  box-shadow: 0 6px 24px var(--icon-glow, rgba(255,175,3,0.3));
}
.feature-card__title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
}
.feature-card__body {
  color: var(--color-on-surface-variant, #D4D4D4);
  line-height: 1.55;
  margin: 0;
  font-size: 0.9rem;
}

/* ── Steps ── */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xl, 24px);
}
@media (max-width: 768px) {
  .steps { grid-template-columns: 1fr; }
}
.step {
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--glass-border);
  transition: transform 0.35s var(--ease-smooth), box-shadow 0.35s ease;
}
.step:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}
@media (hover: none) {
  .step:hover { transform: none; box-shadow: none; }
}
.step__inner {
  padding: var(--space-2xl, 32px) var(--space-xl, 24px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-m, 12px);
}
.step__num-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step__num {
  position: relative;
  z-index: 1;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--gradient-brand);
  color: #1E1E1E;
  font-weight: 800;
  font-size: 1.3rem;
}
.step__num-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 175, 3, 0.2), transparent 70%);
  filter: blur(8px);
  animation: pulse-glow 3s ease-in-out infinite;
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
.step__title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
}
.step__desc {
  color: var(--color-on-surface-variant, #D4D4D4);
  line-height: 1.55;
  margin: 0;
  font-size: 0.92rem;
}

/* ── Testimonials ── */
.testimonials-section {
  padding: var(--space-3xl, 48px) 0;
  overflow: hidden;
}
.testimonials-section .section__title {
  text-align: center;
  margin-bottom: var(--space-2xl, 32px);
}
.testimonial-card {
  min-width: 280px;
  max-width: 360px;
  padding: var(--space-xl, 24px);
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg, 20px);
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
  flex-shrink: 0;
}
.testimonial-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--color-on-surface-variant, #D4D4D4);
  font-style: italic;
}
.testimonial-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-brand, #FFAF03);
}

/* ── CTA ── */
.cta-panel {
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--glass-border);
  overflow: hidden;
}
.cta-panel__inner {
  position: relative;
  text-align: center;
  padding: var(--space-4xl, 64px) var(--space-2xl, 32px);
  background: var(--gradient-mesh-warm);
}
@media (max-width: 600px) {
  .cta-panel__inner { padding: var(--space-2xl, 32px) var(--space-l, 16px); }
}
.cta-panel__title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 var(--space-s, 8px);
}
.cta-panel__sub {
  color: var(--color-on-surface-variant, #D4D4D4);
  font-size: 1.1rem;
  margin: 0 0 var(--space-2xl, 32px);
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD (logged-in)
   ══════════════════════════════════════════════════════════════ */
.dash {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl, 24px);
  max-width: 640px;
  margin: 0 auto;
  padding-bottom: var(--space-2xl, 32px);
}
@media (max-width: 480px) {
  .dash { gap: var(--space-l, 16px); }
}

/* ── Welcome ── */
.dash__welcome-row {
  display: flex;
  align-items: center;
  gap: var(--space-l, 16px);
}
.dash__avatar-ring {
  position: relative;
  flex-shrink: 0;
}
.dash__avatar-ring::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: var(--gradient-brand);
  opacity: 0.3;
  filter: blur(6px);
  animation: pulse-glow 3s ease-in-out infinite;
}
.dash__greeting {
  margin: 0;
  font-size: var(--text-xl, 20px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #FFFFFF;
}
@media (max-width: 480px) {
  .dash__greeting { font-size: 16px; }
  .dash__welcome-row { gap: var(--space-m, 12px); }
  .dash__avatar-ring :deep(.li-avatar) { width: 48px !important; height: 48px !important; font-size: 19px !important; }
}
.dash__greeting-name {
  background: var(--gradient-text-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.dash__level-row {
  display: flex;
  align-items: center;
  gap: var(--space-s, 8px);
  margin-top: 6px;
}
.dash__level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.dash__level-badge--bronze { background: rgba(205, 127, 50, 0.15); color: #CD7F32; }
.dash__level-badge--silver { background: rgba(192, 192, 192, 0.15); color: #C0C0C0; }
.dash__level-badge--gold { background: rgba(255, 215, 0, 0.15); color: #FFD700; }
.dash__level-badge--diamond { background: rgba(185, 242, 255, 0.15); color: #B9F2FF; }
.dash__streak {
  font-size: var(--text-xs, 13px);
  color: var(--color-on-surface-variant, #D4D4D4);
  font-weight: 600;
}

/* ── Stat cards ── */
.dash__stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-m, 12px);
}
@media (max-width: 480px) {
  .dash__stats-cards { grid-template-columns: repeat(3, 1fr); gap: var(--space-s, 8px); }
  .dash__stat-inner { padding: var(--space-m, 10px); gap: 6px; }
  .dash__stat-icon { width: 28px; height: 28px; border-radius: 8px; }
  .dash__stat-value { font-size: 15px; }
  .dash__stat-label { font-size: 10px; }
  .dash__stat-bar { height: 3px; }
}
.dash__stat-card {
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--glass-border);
}
.dash__stat-inner {
  padding: var(--space-l, 16px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
}
.dash__stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}
.dash__stat-icon--brand { background: linear-gradient(135deg, #FFAF03, #FF6B00); box-shadow: 0 4px 12px rgba(255,175,3,0.25); }
.dash__stat-icon--success { background: linear-gradient(135deg, #10B981, #059669); box-shadow: 0 4px 12px rgba(16,185,129,0.25); }
.dash__stat-icon--info { background: linear-gradient(135deg, #3B82F6, #2563EB); box-shadow: 0 4px 12px rgba(59,130,246,0.25); }
.dash__stat-label {
  font-size: 11px;
  color: var(--color-on-surface-muted, #9CA3AF);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.dash__stat-value {
  font-size: var(--text-xl, 22px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #FFFFFF;
}
.dash__stat-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.dash__stat-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 1.2s var(--ease-smooth);
}
.dash__stat-bar-fill--brand { background: linear-gradient(90deg, #FFAF03, #FF6B00); }
.dash__stat-bar-fill--success { background: linear-gradient(90deg, #10B981, #059669); }
.dash__stat-bar-fill--info { background: linear-gradient(90deg, #3B82F6, #2563EB); }
.dash__stat-eye {
  position: absolute;
  top: var(--space-l, 16px);
  right: var(--space-l, 16px);
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-on-surface-variant, #D4D4D4);
  cursor: pointer;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
}
.dash__stat-eye:hover { background: rgba(255, 255, 255, 0.12); color: #FFF; }

/* ── Promo ── */
.dash__promo {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: var(--space-l, 16px);
  padding: var(--space-xl, 20px);
  border-radius: var(--radius-xl, 20px);
  background: linear-gradient(135deg, #FDDD00 0%, #FFAF03 50%, #FF6B00 100%);
  color: #1A1A1A;
  box-shadow: 0 8px 32px rgba(255, 107, 0, 0.2);
}
.dash__promo-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: shimmer-sweep 3s ease-in-out infinite;
  pointer-events: none;
}
@keyframes shimmer-sweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.dash__promo-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 120% at 90% 10%, rgba(255, 255, 255, 0.4), transparent 55%);
  pointer-events: none;
}
.dash__promo-icon-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: #1A1A1A;
}
.dash__promo-body { position: relative; flex: 1; min-width: 0; }
.dash__promo-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
}
.dash__promo-title {
  margin: 3px 0;
  font-size: var(--text-md, 16px);
  font-weight: 800;
  color: #1A1A1A;
}
.dash__promo-sub {
  margin: 0;
  font-size: var(--text-xs, 13px);
  opacity: 0.8;
}
.dash__promo-cta {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  border: 2px solid rgba(26, 26, 26, 0.3);
  background: #1A1A1A;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.2s var(--ease-smooth), box-shadow 0.2s ease;
}
.dash__promo-cta:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.dash__promo-cta:active { transform: scale(0.97); }

/* ── Quick actions ── */
.dash__actions-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
}
.dash__section-title {
  margin: 0;
  font-size: var(--text-md, 15px);
  font-weight: 700;
  color: #FFFFFF;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.dash__actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-m, 12px);
}
@media (max-width: 480px) {
  .dash__actions { grid-template-columns: repeat(2, 1fr); gap: var(--space-s, 8px); }
  .dash__action { padding: var(--space-m, 12px) var(--space-s, 8px); }
  .dash__action-icon { width: 40px; height: 40px; border-radius: 12px; }
  .dash__action-label { font-size: 11px; }
  .dash__promo { padding: var(--space-m, 14px); gap: var(--space-m, 12px); flex-wrap: wrap; }
  .dash__promo-icon-wrap { width: 40px; height: 40px; }
  .dash__promo-title { font-size: 14px; }
  .dash__promo-sub { font-size: 12px; }
  .dash__promo-cta { padding: 8px 14px; font-size: 12px; width: 100%; justify-content: center; }
  .dash__upcoming-inner { padding: var(--space-m, 12px); gap: var(--space-m, 12px); }
  .dash__upcoming-date { width: 44px; height: 44px; border-radius: 12px; }
  .dash__upcoming-day { font-size: 15px; }
  .dash__upcoming-join { padding: 6px 14px; font-size: 12px; }
  .dash__section-head h3 { font-size: 14px; }
  .dash__activity-item { padding: var(--space-m, 12px) var(--space-l, 14px); }
  .dash__activity-icon { width: 32px; height: 32px; border-radius: 10px; }
  .dash__activity-title { font-size: 12px; }
  .dash__activity-sub { font-size: 11px; }
  .dash__activity-amount { font-size: 12px; }
}
.dash__action {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-s, 8px);
  padding: var(--space-l, 16px) var(--space-s, 8px);
  border: 1px solid var(--glass-border);
  background: var(--color-surface-bright, #141414);
  border-radius: var(--radius-lg, 16px);
  cursor: pointer;
  transition: transform 0.3s var(--ease-smooth), box-shadow 0.3s ease, border-color 0.3s ease;
}
.dash__action:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px var(--action-glow, rgba(255,175,3,0.1));
  border-color: rgba(255, 255, 255, 0.12);
}
.dash__action:active { transform: scale(0.96); }
@media (hover: none) {
  .dash__action:hover { transform: none; box-shadow: none; }
  .dash__action:active { transform: scale(0.96); }
}
.dash__action-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--action-gradient, linear-gradient(135deg, #FFAF03, #FF6B00));
  color: #FFFFFF;
  box-shadow: 0 4px 14px var(--action-glow, rgba(255,175,3,0.2));
  transition: transform 0.3s var(--ease-spring), box-shadow 0.3s ease;
}
.dash__action:hover .dash__action-icon {
  transform: scale(1.08);
  box-shadow: 0 6px 20px var(--action-glow, rgba(255,175,3,0.3));
}
.dash__action-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-on-surface, #FFFFFF);
}
.dash__action-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
}
.dash__action-tag--red { background: rgba(200, 62, 59, 0.2); color: #E57373; }
.dash__action-tag--amber { background: rgba(255, 175, 3, 0.15); color: #FFAF03; }
.dash__action-tag--blue { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }

/* ── Section ── */
.dash__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
}
.dash__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash__section-head h3 {
  margin: 0;
  font-size: var(--text-md, 16px);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #FFFFFF;
}
.dash__section-link {
  font-size: var(--text-xs, 13px);
  font-weight: 600;
  color: var(--color-brand, #FFAF03);
  text-decoration: none;
  transition: opacity 0.2s ease;
}
.dash__section-link:hover { opacity: 0.8; }

/* ── Upcoming ── */
.dash__upcoming-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 12px);
}
.dash__upcoming-card {
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--glass-border);
}
.dash__upcoming-inner {
  padding: var(--space-l, 16px);
  display: flex;
  align-items: center;
  gap: var(--space-l, 16px);
}
.dash__upcoming-date {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.dash__upcoming-day {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
  color: #FFFFFF;
}
.dash__upcoming-month {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}
.dash__upcoming-info { flex: 1; min-width: 0; }
.dash__upcoming-title {
  margin: 0;
  font-size: var(--text-sm, 14px);
  font-weight: 700;
  color: #FFFFFF;
}
.dash__upcoming-meta {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--color-on-surface-variant, #D4D4D4);
  display: flex;
  align-items: center;
  gap: 4px;
}
.dash__upcoming-join {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-brand, #FFAF03);
  background: transparent;
  color: var(--color-brand, #FFAF03);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s var(--ease-smooth);
}
.dash__upcoming-join:hover {
  background: var(--color-brand, #FFAF03);
  color: #1A1A1A;
}
.dash__upcoming-join:active { transform: scale(0.95); }

/* ── Activity ── */
.dash__activity-card {
  background: var(--color-surface-bright, #141414);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg, 20px);
  overflow: hidden;
}
.dash__activity-item {
  display: flex;
  align-items: center;
  gap: var(--space-m, 12px);
  padding: var(--space-l, 14px) var(--space-xl, 18px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.2s ease;
}
.dash__activity-item:last-child { border-bottom: none; }
.dash__activity-item:hover { background: rgba(255, 255, 255, 0.02); }
.dash__activity-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}
.dash__activity-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dash__activity-title {
  font-size: 13px;
  font-weight: 600;
  color: #FFFFFF;
}
.dash__activity-sub {
  font-size: 12px;
  color: var(--color-on-surface-variant, #D4D4D4);
}
.dash__activity-amount {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.dash__activity-amount--pos { color: var(--color-green-400, #10B981); }
.dash__activity-amount--neg { color: var(--color-on-surface-muted, #9CA3AF); }

@media (prefers-reduced-motion: reduce) {
  .anim-border::before { animation: none; opacity: 0; }
  .dash__promo-shimmer { animation: none; }
  .step__num-glow { animation: none; }
  .dash__avatar-ring::before { animation: none; }
}
</style>
