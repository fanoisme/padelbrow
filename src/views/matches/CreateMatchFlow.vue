<template>
  <section class="cmf">
    <!-- ───────── HERO (Create Room splash) ───────── -->
    <div v-if="screen === 'hero'" class="cmf__hero">
      <button type="button" class="cmf__x" aria-label="Close" @click="emit('close')">
        <LiIcon name="close" />
      </button>

      <div class="cmf__hero-art" aria-hidden="true">
        <div class="cmf__court">
          <span class="cmf__net"></span>
          <span class="cmf__ball"><LiIcon name="sports_tennis" /></span>
        </div>
      </div>

      <div class="cmf__hero-copy">
        <p class="cmf__eyebrow">Create Room</p>
        <h1 class="cmf__hero-title">Your room, your rules</h1>
        <p class="cmf__hero-sub">Start a sesh. Invite the gang, pick your mode, and play.</p>
      </div>

      <div class="cmf__hero-cta">
        <LiButton size="lg" data-testid="hero-create" @click="goCreate">Create Match</LiButton>
        <LiButton size="lg" variant="secondary" data-testid="hero-join" @click="screen = 'join'">Join Match</LiButton>
      </div>
    </div>

    <!-- ───────── JOIN (code entry) ───────── -->
    <div v-else-if="screen === 'join'" class="cmf__screen">
      <header class="cmf__topbar">
        <button type="button" class="cmf__x" aria-label="Back" @click="screen = 'hero'">
          <LiIcon name="arrow_back" />
        </button>
        <h2 class="cmf__topbar-title">Join Match</h2>
        <span class="cmf__topbar-spacer"></span>
      </header>

      <p class="cmf__section-label">Join Match</p>
      <p class="cmf__hint">Enter the match code to join an existing game:</p>

      <label class="cmf__field">
        <span class="cmf__field-label">Match Code</span>
        <input
          v-model="joinCode"
          class="cmf__input"
          type="text"
          inputmode="text"
          autocomplete="off"
          placeholder="AB12CD34"
          :disabled="joining"
        />
      </label>

      <footer class="cmf__footer">
        <button type="button" class="cmf__btn cmf__btn--outline" :disabled="joining" @click="screen = 'hero'">Cancel</button>
        <button type="button" class="cmf__btn cmf__btn--primary" :disabled="joining || !joinCode.trim()" @click="doJoin">
          {{ joining ? 'Joining…' : 'Join' }}
        </button>
      </footer>
    </div>

    <!-- ───────── WIZARD ───────── -->
    <div v-else class="cmf__screen">
      <header class="cmf__topbar">
        <button type="button" class="cmf__x" aria-label="Close" @click="emit('close')">
          <LiIcon name="close" />
        </button>
        <h2 class="cmf__topbar-title">Create Match</h2>
        <span class="cmf__topbar-spacer"></span>
      </header>

      <div class="cmf__progress">
        <span
          v-for="s in 4"
          :key="s"
          class="cmf__seg"
          :class="{ 'cmf__seg--on': s <= step }"
        ></span>
      </div>
      <p class="cmf__progress-caption">Step {{ step }} of 4</p>

      <!-- STEP 1 · game type -->
      <div v-if="step === 1" class="cmf__body">
        <h3 class="cmf__section-title">Choose your game type</h3>
        <button
          v-for="g in gameTypes"
          :key="g.value"
          type="button"
          class="cmf__card"
          :class="{ 'cmf__card--on': setup.format === g.value }"
          @click="setup.format = g.value"
        >
          <span class="cmf__card-icon"><LiIcon :name="g.icon" /></span>
          <span class="cmf__card-text">
            <span class="cmf__card-title">{{ g.label }}</span>
            <span class="cmf__card-desc">{{ g.desc }}</span>
          </span>
        </button>
      </div>

      <!-- STEP 2 · basics -->
      <div v-else-if="step === 2" class="cmf__body">
        <h3 class="cmf__section-title">Match basics</h3>
        <p v-if="!standalone" class="cmf__hint">Inherited from your meet.</p>

        <!-- standalone: editable fields -->
        <template v-if="standalone">
          <label class="cmf__field">
            <span class="cmf__field-label">Game Name *</span>
            <input class="cmf__input" type="text" v-model="basics.title" placeholder="Tuesday night social" />
          </label>
          <label class="cmf__field">
            <span class="cmf__field-label">Location</span>
            <input class="cmf__input" type="text" v-model="basics.venue_name" placeholder="Venue name" />
          </label>
          <label class="cmf__field">
            <span class="cmf__field-label">Date &amp; Time *</span>
            <input class="cmf__input" type="datetime-local" v-model="basics.starts_at" />
          </label>
          <div class="cmf__rule">
            <span class="cmf__rule-label">Duration</span>
            <div class="cmf__stepper">
              <button type="button" :disabled="basics.duration_hours <= 1" @click="basics.duration_hours--">−</button>
              <span>{{ durationLabel }}</span>
              <button type="button" :disabled="basics.duration_hours >= 8" @click="basics.duration_hours++">+</button>
            </div>
          </div>
        </template>

        <!-- in-meet: read-only from parent -->
        <template v-else>
          <label class="cmf__field">
            <span class="cmf__field-label">Game Name</span>
            <input class="cmf__input" type="text" :value="meet?.title || ''" readonly />
          </label>
          <label class="cmf__field">
            <span class="cmf__field-label">Location</span>
            <input class="cmf__input" type="text" :value="meet?.venue_name || 'Venue TBD'" readonly />
          </label>
          <label class="cmf__field">
            <span class="cmf__field-label">Date &amp; Time</span>
            <input class="cmf__input" type="text" :value="formatWhen(meet?.starts_at)" readonly />
          </label>
        </template>
      </div>

      <!-- STEP 3 · rules -->
      <div v-else-if="step === 3" class="cmf__body">
        <h3 class="cmf__section-title">Set the rules</h3>

        <div class="cmf__rule">
          <span class="cmf__rule-label">Number of Courts</span>
          <div class="cmf__stepper">
            <button type="button" :disabled="setup.num_courts <= 1" @click="setup.num_courts--">−</button>
            <span>{{ setup.num_courts }} Court{{ setup.num_courts === 1 ? '' : 's' }}</span>
            <button type="button" :disabled="setup.num_courts >= 8" @click="setup.num_courts++">+</button>
          </div>
        </div>

        <div class="cmf__rule">
          <span class="cmf__rule-label">Scoring Type <LiIcon name="info" size="sm" class="cmf__info" /></span>
          <div class="cmf__segmented">
            <button
              v-for="o in scoringTypes"
              :key="o.value"
              type="button"
              :class="{ 'is-on': setup.scoring_type === o.value }"
              @click="setScoring(o.value)"
            >{{ o.label }}</button>
          </div>
        </div>

        <button type="button" class="cmf__rule cmf__rule--row" @click="showPoints = true">
          <span class="cmf__rule-label">Points per Match <LiIcon name="info" size="sm" class="cmf__info" /></span>
          <span class="cmf__rule-value">{{ pointsLabel }} <LiIcon name="unfold_more" size="sm" /></span>
        </button>
      </div>

      <!-- STEP 4 · review -->
      <div v-else class="cmf__body">
        <h3 class="cmf__section-title">Review &amp; create</h3>
        <ul class="cmf__summary">
          <template v-if="standalone">
            <li><span>Game Name</span><strong>{{ basics.title || 'Untitled' }}</strong></li>
            <li><span>Location</span><strong>{{ basics.venue_name || 'Venue TBD' }}</strong></li>
            <li><span>Date &amp; Time</span><strong>{{ formatWhen(basics.starts_at) || '—' }}</strong></li>
            <li><span>Duration</span><strong>{{ durationLabel }}</strong></li>
          </template>
          <li><span>Game type</span><strong>{{ formatLabel }}</strong></li>
          <li><span>Courts</span><strong>{{ setup.num_courts }}</strong></li>
          <li><span>Scoring</span><strong>{{ scoringLabel }}</strong></li>
          <li><span>Points</span><strong>{{ pointsLabel }}</strong></li>
        </ul>
        <p class="cmf__hint">A shareable match code is generated when you create the room.</p>
      </div>

      <footer class="cmf__footer">
        <button type="button" class="cmf__btn cmf__btn--outline" @click="back">Back</button>
        <button
          v-if="step < 4"
          type="button"
          class="cmf__btn cmf__btn--primary"
          data-testid="wizard-next"
          :disabled="!canNext"
          @click="next"
        >Next</button>
        <button
          v-else
          type="button"
          class="cmf__btn cmf__btn--primary"
          :data-testid="standalone ? 'create-meet-btn' : 'create-session-btn'"
          :disabled="creating"
          @click="submit"
        >{{ creating ? 'Creating…' : (standalone ? 'Create meet' : 'Create match') }}</button>
      </footer>
    </div>

    <!-- ───────── Points per Match bottom sheet ───────── -->
    <LiBottomSheet v-model="showPoints" title="Select Points per Match">
      <div class="cmf__options">
        <button
          v-for="o in pointsOptions"
          :key="o.label"
          type="button"
          class="cmf__option"
          :class="{ 'is-on': setup.total_set_points === o.value }"
          @click="pickPoints(o.value)"
        >
          <span>{{ o.label }}</span>
          <LiIcon v-if="setup.total_set_points === o.value" name="check" size="sm" />
        </button>
      </div>
    </LiBottomSheet>
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { LiIcon, LiButton, LiBottomSheet, useToast } from '../../design-system/components/index.js'
import { useMatchSessions } from '../../composables/useMatchSessions.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'
import { useAuth } from '../../composables/useAuth.js'

const props = defineProps({
  meet: { type: Object, default: null },
  meetId: { type: String, default: '' },
  standalone: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'close', 'create'])

const toast = useToast()
const { createSession, getSessionByCode } = useMatchSessions()
const { joinMeet } = useMeetParticipants()
const { user } = useAuth()

const screen = ref(props.standalone ? 'wizard' : 'hero') // 'hero' | 'join' | 'wizard'
const step = ref(1)
const creating = ref(false)
const joining = ref(false)
const joinCode = ref('')
const showPoints = ref(false)

const setup = reactive({
  format: 'americano',
  ranking_criteria: 'matches_won',
  num_courts: 1,
  total_set_points: 21,
  prioritize_least_matches: true,
  scoring_type: 'normal', // 'normal' (fixed total) | 'point' (first-to / total-of)
})

const basics = reactive({
  title: '',
  venue_name: '',
  starts_at: '',
  duration_hours: 1,
})

const gameTypes = [
  { value: 'americano', label: 'Americano', desc: 'Switch partners every round — perfect for socializing!', icon: 'sync_alt' },
  { value: 'mexicano', label: 'Mexicano', desc: 'Dynamic teams based on your skills — stay on your toes!', icon: 'shuffle' },
  { value: 'team_americano', label: 'Team Americano', desc: 'Stick with your partner through all rounds', icon: 'groups' },
  { value: 'team_mexicano', label: 'Team Mexicano', desc: 'Partner up and take on everyone else', icon: 'handshake' },
]
const scoringTypes = [
  { value: 'normal', label: 'Normal Scoring' },
  { value: 'point', label: 'Point Scoring' },
]
const pointsOptions = computed(() =>
  setup.scoring_type === 'normal'
    ? [
        { label: '16 Points', value: 16 },
        { label: '21 Points', value: 21 },
        { label: '24 Points', value: 24 },
        { label: '32 Points', value: 32 },
      ]
    : [
        { label: 'First to 4', value: 4 },
        { label: 'First to 5', value: 5 },
        { label: 'First to 6', value: 6 },
        { label: 'First to 7', value: 7 },
        { label: 'Total of 3', value: 3 },
        { label: 'Total of 4', value: 4 },
      ]
)
const pointsLabel = computed(() => {
  const o = pointsOptions.value.find((p) => p.value === setup.total_set_points)
  return o ? o.label : `${setup.total_set_points}`
})
const formatLabel = computed(() => gameTypes.find((g) => g.value === setup.format)?.label || setup.format)
const scoringLabel = computed(() => (setup.scoring_type === 'normal' ? 'Normal' : 'Point'))
const durationLabel = computed(() => `${basics.duration_hours} hour${basics.duration_hours === 1 ? '' : 's'}`)
const formatWhen = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
}

const canNext = computed(() => {
  if (step.value === 1) return !!setup.format
  if (step.value === 2 && props.standalone) return !!basics.title.trim() && !!basics.starts_at
  return true
})

function setScoring(value) {
  setup.scoring_type = value
  // cross-family point values don't always exist; reset to the family default
  setup.total_set_points = pointsOptions.value[0].value
}
function pickPoints(value) {
  setup.total_set_points = value
  showPoints.value = false
}

function goCreate() {
  step.value = 1
  screen.value = 'wizard'
}
function next() {
  if (!canNext.value) return
  step.value = Math.min(4, step.value + 1)
}
function back() {
  if (step.value > 1) step.value -= 1
  else if (!props.standalone) screen.value = 'hero'
  else emit('close')
}

async function submit() {
  creating.value = true
  try {
    if (props.standalone) {
      emit('create', {
        basics: { ...basics },
        format: setup.format,
        ranking_criteria: setup.ranking_criteria,
        num_courts: setup.num_courts,
        total_set_points: setup.total_set_points,
        prioritize_least_matches: setup.prioritize_least_matches,
      })
    } else {
      const session = await createSession(setup, props.meetId)
      emit('open', session)
    }
  } catch (err) {
    toast.error(err.message || 'Could not create the match.')
  } finally {
    creating.value = false
  }
}

async function doJoin() {
  const code = joinCode.value.trim()
  if (!code) return
  joining.value = true
  try {
    const session = await getSessionByCode(code)
    if (!session) {
      toast.error('No match found for that code.')
      return
    }
    try {
      await joinMeet(session.meet, user.value?.id)
    } catch (err) {
      // 23505 = already a participant — fine, they can still open the match.
      if (err?.code !== '23505') throw err
    }
    emit('open', session)
  } catch (err) {
    toast.error(err.message || 'Could not join the match.')
  } finally {
    joining.value = false
  }
}

// formatWhen defined above (used in both standalone + in-meet step 2)
</script>

<style scoped>
.cmf {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  background: #121212;
  color: #FFFFFF;
  border-radius: var(--radius-lg, 24px);
  display: flex;
  flex-direction: column;
  padding: var(--space-xl, 24px) var(--space-l, 16px) var(--space-xl, 24px);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 640px) {
  .cmf {
    max-width: 100%;
    width: calc(100% + 2 * var(--space-m, 16px));
    margin-left: calc(-1 * var(--space-m, 16px));
    margin-right: calc(-1 * var(--space-m, 16px));
    border-radius: 0;
    padding: var(--space-l, 16px);
    padding-bottom: calc(var(--space-l, 16px) + env(safe-area-inset-bottom, 0px));
  }
  .cmf__body { overflow: visible; flex: 0 1 auto; }
  .cmf__footer { padding-bottom: env(safe-area-inset-bottom, 8px); }
}

/* 2-col game-type cards on wider viewports */
@media (min-width: 520px) {
  .cmf__body:has(.cmf__card) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-m, 12px);
  }
  .cmf__body:has(.cmf__card) .cmf__section-title {
    grid-column: 1 / -1;
  }
}

/* hero */
.cmf__hero { display: flex; flex-direction: column; gap: var(--space-xl, 24px); min-height: calc(100dvh - 2 * var(--space-xl, 24px)); }
.cmf__hero-art { display: flex; justify-content: center; padding: var(--space-xl, 24px) 0; }
.cmf__court {
  --c: 220px;
  position: relative;
  width: var(--c);
  height: calc(var(--c) * 0.66);
  border-radius: 18px;
  background: linear-gradient(135deg, #1a3a5c 0%, #0f2640 100%);
  border: 2px solid rgba(255,255,255,0.18);
  box-shadow: var(--shadow-glow-subtle);
  transform: perspective(600px) rotateX(22deg);
}
.cmf__court::after {
  content: '';
  position: absolute; inset: 14px;
  border: 1.5px solid rgba(255,255,255,0.35);
  border-radius: 12px;
}
.cmf__net {
  position: absolute; top: 50%; left: 8px; right: 8px; height: 3px;
  transform: translateY(-50%);
  background: var(--color-brand);
  box-shadow: 0 0 12px rgba(255,175,3,0.6);
}
.cmf__ball {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  color: var(--color-brand);
}
.cmf__ball :deep(.li-icon) { font-size: 38px; width: 38px; height: 38px; }
.cmf__hero-copy { text-align: center; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.cmf__eyebrow { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-brand); }
.cmf__hero-title { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
.cmf__hero-sub { margin: 0; color: #A3A3A3; font-size: 15px; line-height: 1.5; }
.cmf__hero-cta { margin-top: auto; display: flex; flex-direction: column; gap: var(--space-m, 12px); }

/* screens */
.cmf__screen { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.cmf__topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-l, 16px); }
.cmf__topbar-title { margin: 0; font-size: 18px; font-weight: 700; }
.cmf__topbar-spacer { width: 28px; }
.cmf__x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; background: transparent;
  color: #FFFFFF; cursor: pointer; border-radius: 50%;
}
.cmf__x:hover { background: rgba(255,255,255,0.08); }

.cmf__progress { display: flex; gap: 6px; }
.cmf__seg { flex: 1; height: 4px; border-radius: 2px; background: #2A2A2A; transition: background var(--dur-short) var(--ease-out); }
.cmf__seg--on { background: var(--color-brand); }
.cmf__progress-caption { margin: 8px 0 0; font-size: 13px; color: #A3A3A3; }

.cmf__body { display: flex; flex-direction: column; gap: var(--space-l, 16px); flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding-top: var(--space-l, 16px); padding-bottom: var(--space-m, 12px); }
.cmf__section-title { margin: 0; font-size: 18px; font-weight: 700; }
.cmf__section-label { margin: 0 0 4px; font-size: 18px; font-weight: 700; }
.cmf__hint { margin: 0; color: #A3A3A3; font-size: 14px; line-height: 1.5; }

/* selectable cards */
.cmf__card {
  display: flex; align-items: center; gap: var(--space-m, 12px); width: 100%;
  padding: var(--space-m, 12px); text-align: left;
  background: #1E1E1E; border: 2px solid transparent; border-radius: 14px;
  cursor: pointer; color: #FFFFFF; transition: border-color var(--dur-short) var(--ease-out);
}
.cmf__card--on { border-color: var(--color-brand); }
.cmf__card-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: #FFFFFF; color: #FFFFFF;
}
.cmf__card--on .cmf__card-icon { background: var(--color-brand); color: #1A1A1A; }
.cmf__card-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cmf__card-title { font-weight: 700; font-size: 16px; }
.cmf__card-desc { font-size: 13px; color: #A3A3A3; line-height: 1.4; }

/* fields */
.cmf__field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.cmf__field-label { font-size: 14px; color: rgba(255,255,255,0.85); }
.cmf__input {
  width: 100%; max-width: 100%; box-sizing: border-box; padding: 12px 14px; font: inherit; color: #FFFFFF;
  background: #1E1E1E; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px;
  transition: border-color var(--dur-short) var(--ease-out);
}
.cmf__input:focus { outline: none; border-color: var(--color-brand); }
.cmf__input[readonly] { color: #DDD; }
.cmf__input::placeholder { color: #A3A3A3; }

/* rules */
.cmf__rule { display: flex; flex-direction: column; gap: 8px; }
.cmf__rule--row { flex-direction: row; align-items: center; justify-content: space-between; text-align: left; background: #1E1E1E; border: none; border-radius: 12px; padding: 14px; cursor: pointer; color: #FFFFFF; width: 100%; }
.cmf__rule-label { font-size: 14px; display: inline-flex; align-items: center; gap: 6px; }
.cmf__rule-value { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: var(--color-brand); }
.cmf__info { color: #A3A3A3; }
.cmf__stepper {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 4px;
  background: #1E1E1E; border-radius: 999px; padding: 4px;
}
.cmf__stepper button { width: 36px; height: 36px; border: none; background: transparent; color: #FFFFFF; font-size: 20px; border-radius: 50%; cursor: pointer; }
.cmf__stepper button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
.cmf__stepper button:disabled { opacity: 0.3; cursor: not-allowed; }
.cmf__stepper span { padding: 0 12px; font-weight: 600; min-width: 96px; text-align: center; }
.cmf__segmented { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cmf__segmented button {
  padding: 12px; border: 2px solid transparent; border-radius: 10px;
  background: #1E1E1E; color: #A3A3A3; font-weight: 600; cursor: pointer;
}
.cmf__segmented button.is-on { border-color: var(--color-brand); color: #FFFFFF; }

/* review */
.cmf__summary { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; background: #1E1E1E; border-radius: 12px; overflow: hidden; }
.cmf__summary li { display: flex; align-items: center; justify-content: space-between; padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.cmf__summary li:last-child { border-bottom: none; }
.cmf__summary span { color: #A3A3A3; font-size: 14px; }
.cmf__summary strong { font-weight: 700; }

/* footer */
.cmf__footer { display: flex; gap: var(--space-m, 12px); padding-top: var(--space-l, 16px); }
.cmf__btn {
  flex: 1; padding: 14px; border-radius: 12px; font: inherit; font-weight: 700; font-size: 15px;
  cursor: pointer; transition: filter var(--dur-short) var(--ease-out), opacity var(--dur-short) var(--ease-out);
}
.cmf__btn--primary { background: var(--color-brand); color: #1A1A1A; border: none; }
.cmf__btn--primary:hover:not(:disabled) { filter: brightness(1.05); }
.cmf__btn--outline { background: transparent; color: #FFFFFF; border: 1.5px solid #A3A3A3; }
.cmf__btn--outline:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
.cmf__btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* bottom-sheet options — the sheet itself is light-themed, so dark text */
.cmf__options { display: flex; flex-direction: column; }
.cmf__option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 4px; border: none; background: transparent; cursor: pointer;
  font: inherit; font-weight: 600; color: var(--color-gray-900, #FFFFFF);
  border-bottom: 1px solid var(--color-gray-200, #1A1A1A);
}
.cmf__option:last-child { border-bottom: none; }
.cmf__option.is-on { color: var(--color-brand, #FFAF03); }

/* LiButton in hero CTA: stretch full-width + stack secondary as outline */
.cmf__hero-cta :deep(.li-btn) { width: 100%; }
.cmf__hero-cta :deep(.li-btn-secondary) {
  background: transparent; color: #FFFFFF; border: 1.5px solid rgba(255,255,255,0.3);
}
.cmf__hero-cta :deep(.li-btn-secondary:hover:not(:disabled)) { background: rgba(255,255,255,0.08); }

</style>
