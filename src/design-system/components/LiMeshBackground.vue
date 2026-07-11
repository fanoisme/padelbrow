<template>
  <!--
    LiMeshBackground · Animated mesh gradient background
    variant: warm (gold/yellow) | cool (blue/gray) | dark (dark base + gold orbs)
    motion: CSS-only orb float · GPU-safe (transform + opacity only)
    a11y: prefers-reduced-motion → static gradient
  -->
  <div
    class="li-mesh"
    :class="[`li-mesh--${variant}`, `li-mesh--${intensity}`]"
    aria-hidden="true"
  >
    <div
      v-for="n in orbCount"
      :key="n"
      class="li-mesh__orb"
      :class="`li-mesh__orb--${n}`"
    ></div>
  </div>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'warm',
    validator: (v) => ['warm', 'cool', 'dark'].includes(v),
  },
  orbCount: {
    type: Number,
    default: 3,
    validator: (v) => v >= 1 && v <= 5,
  },
  intensity: {
    type: String,
    default: 'medium',
    validator: (v) => ['subtle', 'medium', 'vivid'].includes(v),
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   LiMeshBackground · Animated mesh gradient
   GPU-safe: transform + opacity only · CSS-only animation
   ═══════════════════════════════════════════════════════════ */

.li-mesh {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

/* ── Orb base ── */
.li-mesh__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  will-change: transform;
  animation: mesh-float 25s ease-in-out infinite;
}

/* ── Intensity opacity ── */
.li-mesh--subtle .li-mesh__orb  { opacity: 0.2; }
.li-mesh--medium .li-mesh__orb { opacity: 0.35; }
.li-mesh--vivid  .li-mesh__orb { opacity: 0.5; }

/* ═══════════════════════════════════════════════════════════
   WARM variant — gold / yellow orbs
   ═══════════════════════════════════════════════════════════ */
.li-mesh--warm .li-mesh__orb--1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255, 175, 3, 0.35), transparent 70%);
  top: -10%;
  left: -10%;
  animation-delay: 0s;
}

.li-mesh--warm .li-mesh__orb--2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(249, 199, 0, 0.3), transparent 70%);
  bottom: -15%;
  right: -5%;
  animation-delay: -8s;
}

.li-mesh--warm .li-mesh__orb--3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 188, 37, 0.25), transparent 70%);
  top: 40%;
  right: 30%;
  animation-delay: -16s;
}

.li-mesh--warm .li-mesh__orb--4 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(244, 166, 0, 0.2), transparent 70%);
  top: 20%;
  left: 50%;
  animation-delay: -12s;
}

.li-mesh--warm .li-mesh__orb--5 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(253, 221, 0, 0.2), transparent 70%);
  bottom: 10%;
  left: 20%;
  animation-delay: -20s;
}

/* ═══════════════════════════════════════════════════════════
   COOL variant — blue / gray orbs
   ═══════════════════════════════════════════════════════════ */
.li-mesh--cool .li-mesh__orb--1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.25), transparent 70%);
  top: -10%;
  right: -10%;
  animation-delay: 0s;
}

.li-mesh--cool .li-mesh__orb--2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.2), transparent 70%);
  bottom: -15%;
  left: -5%;
  animation-delay: -8s;
}

.li-mesh--cool .li-mesh__orb--3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%);
  top: 40%;
  left: 30%;
  animation-delay: -16s;
}

.li-mesh--cool .li-mesh__orb--4 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(0, 71, 178, 0.15), transparent 70%);
  top: 20%;
  right: 50%;
  animation-delay: -12s;
}

.li-mesh--cool .li-mesh__orb--5 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.15), transparent 70%);
  bottom: 10%;
  right: 20%;
  animation-delay: -20s;
}

/* ═══════════════════════════════════════════════════════════
   DARK variant — dark base + gold orbs
   ═══════════════════════════════════════════════════════════ */
.li-mesh--dark {
  background: var(--color-gray-900, #333333);
}

.li-mesh--dark .li-mesh__orb--1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255, 175, 3, 0.4), transparent 70%);
  top: -20%;
  left: 10%;
}

.li-mesh--dark .li-mesh__orb--2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(249, 199, 0, 0.3), transparent 70%);
  bottom: -15%;
  right: 15%;
  animation-delay: -15s;
}

.li-mesh--dark .li-mesh__orb--3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 188, 37, 0.25), transparent 70%);
  top: 50%;
  left: 40%;
  animation-delay: -10s;
}

.li-mesh--dark .li-mesh__orb--4 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(244, 166, 0, 0.2), transparent 70%);
  top: 10%;
  right: 20%;
  animation-delay: -5s;
}

.li-mesh--dark .li-mesh__orb--5 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(253, 221, 0, 0.2), transparent 70%);
  bottom: 20%;
  left: 60%;
  animation-delay: -18s;
}

/* ═══════════════════════════════════════════════════════════
   ANIMATION — GPU-safe float (transform only)
   ═══════════════════════════════════════════════════════════ */
@keyframes mesh-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(40px, -30px) scale(1.08); }
  50%      { transform: translate(-20px, 20px) scale(0.95); }
  75%      { transform: translate(25px, 15px) scale(1.04); }
}

/* ═══════════════════════════════════════════════════════════
   REDUCED MOTION — static gradient, no animation
   ═══════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .li-mesh__orb {
    animation: none;
  }
}
</style>
