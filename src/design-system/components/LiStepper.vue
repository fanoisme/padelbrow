<template>
  <nav class="li-stepper" :aria-label="ariaLabel || 'Progress'">
    <ol :class="['li-stepper__list', `li-stepper__list--${direction}`]">
      <li
        v-for="(step, i) in steps"
        :key="i"
        :class="['li-stepper__step', {
          'li-stepper__step--completed': i < currentStep,
          'li-stepper__step--active': i === currentStep,
          'li-stepper__step--disabled': step.disabled,
        }]"
      >
        <!-- Connector line (between steps) -->
        <div
          v-if="i > 0"
          :class="['li-stepper__connector', {
            'li-stepper__connector--completed': i <= currentStep,
          }]"
        />

        <!-- Step indicator -->
        <button
          v-if="step.clickable !== false"
          class="li-stepper__indicator"
          :aria-current="i === currentStep ? 'step' : undefined"
          :disabled="step.disabled"
          @click="$emit('step-click', i)"
        >
          <LiIcon v-if="i < currentStep" name="check" size="xxs" filled />
          <span v-else class="li-stepper__number">{{ i + 1 }}</span>
        </button>
        <div v-else class="li-stepper__indicator li-stepper__indicator--static">
          <LiIcon v-if="i < currentStep" name="check" size="xxs" filled />
          <span v-else class="li-stepper__number">{{ i + 1 }}</span>
        </div>

        <!-- Step label -->
        <div class="li-stepper__content">
          <span class="li-stepper__label">{{ step.label }}</span>
          <span v-if="step.caption" class="li-stepper__caption">{{ step.caption }}</span>
        </div>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import LiIcon from './LiIcon.vue'

defineProps({
  steps: {
    type: Array,
    required: true,
    /* shape: { label: string, caption?: string, disabled?: boolean, clickable?: boolean } */
  },
  currentStep: { type: Number, default: 0 },
  direction: { type: String, default: 'horizontal', validator: v => ['horizontal', 'vertical'].includes(v) },
  ariaLabel: { type: String, default: '' },
})

defineEmits(['step-click'])
</script>

<style scoped>
.li-stepper {
  font-family: 'Inter', system-ui, sans-serif;
}

.li-stepper__list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.li-stepper__list--horizontal {
  flex-direction: row;
  align-items: flex-start;
}

.li-stepper__list--vertical {
  flex-direction: column;
}

/* Step */
.li-stepper__step {
  display: flex;
  align-items: center;
  position: relative;
  flex: 1;
}

.li-stepper__list--horizontal .li-stepper__step {
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.li-stepper__list--vertical .li-stepper__step {
  flex-direction: row;
  gap: 12px;
  min-height: 56px;
}

/* Connector */
.li-stepper__connector {
  flex-shrink: 0;
  background: var(--color-gray-200, #1A1A1A);
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.li-stepper__list--horizontal .li-stepper__connector {
  position: absolute;
  top: 14px;
  left: calc(-50% + 14px);
  right: calc(50% + 14px);
  height: 2px;
}

.li-stepper__list--vertical .li-stepper__connector {
  position: absolute;
  left: 13px;
  top: 28px;
  bottom: -28px;
  width: 2px;
}

.li-stepper__connector--completed {
  background: var(--color-orange-400, #FF6B00);
}

/* Indicator circle */
.li-stepper__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-gray-300, #2A2A2A);
  background: var(--color-surface-bright, #141414);
  color: var(--color-gray-500, #999999);
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.li-stepper__indicator--static {
  cursor: default;
}

.li-stepper__indicator:focus-visible {
  outline: 2px solid var(--color-orange-400, #FF6B00);
  outline-offset: 2px;
}

.li-stepper__number {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

/* Completed step */
.li-stepper__step--completed .li-stepper__indicator {
  background: var(--color-orange-400, #FF6B00);
  border-color: var(--color-orange-400, #FF6B00);
  color: var(--color-gray-0, #FFFFFF);
}

/* Active step */
.li-stepper__step--active .li-stepper__indicator {
  border-color: var(--color-orange-400, #FF6B00);
  color: var(--color-orange-400, #FF6B00);
}

.li-stepper__step--active .li-stepper__number {
  color: var(--color-orange-400, #FF6B00);
}

/* Disabled step */
.li-stepper__step--disabled {
  opacity: 0.4;
}

.li-stepper__step--disabled .li-stepper__indicator {
  cursor: not-allowed;
}

/* Content */
.li-stepper__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.li-stepper__list--horizontal .li-stepper__content {
  max-width: 120px;
}

.li-stepper__label {
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  color: var(--color-gray-700, #B3B3B3);
}

.li-stepper__step--active .li-stepper__label {
  color: var(--color-gray-900, #FFFFFF);
  font-weight: 600;
}

.li-stepper__step--completed .li-stepper__label {
  color: var(--color-gray-500, #999999);
}

.li-stepper__caption {
  font-size: 11px;
  font-weight: 400;
  line-height: 16px;
  color: var(--color-gray-400, #B3B3B3);
}

/* Vertical spacing */
.li-stepper__list--vertical .li-stepper__step:last-child .li-stepper__connector {
  display: none;
}
</style>
