<template>
  <div class="li-tabs" :class="[ `li-tabs-${variant}` ]">
    <div class="li-tabs-list" role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        ref="tabRefs"
        role="tab"
        :aria-selected="modelValue === index"
        class="li-tab-button"
        :class="{ 'is-active': modelValue === index, 'is-disabled': tab.disabled }"
        :disabled="tab.disabled"
        @click="selectTab(index, $event)"
      >
        <span v-if="tab.icon" class="li-tab-icon">
          <component :is="tab.icon" />
        </span>
        <span class="li-tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="li-tab-badge">{{ tab.badge }}</span>
      </button>
      <div class="li-tabs-indicator" :style="indicatorStyle"></div>
    </div>
    <div class="li-tabs-panels">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  },
  tabs: {
    type: Array,
    required: true,
    // [{ label: 'Tab 1', icon: IconComponent, badge: '3', disabled: false }]
  },
  variant: {
    type: String,
    default: 'fill', // 'fill' (equal width) or 'fixed' (content width)
    validator: (v) => ['fill', 'fixed'].includes(v)
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const tabRefs = ref([]);
const indicatorStyle = ref({});

const updateIndicator = async () => {
  await nextTick();
  const activeTab = tabRefs.value[props.modelValue];
  if (activeTab) {
    indicatorStyle.value = {
      left: `${activeTab.offsetLeft}px`,
      width: `${activeTab.offsetWidth}px`
    };
  }
};

watch(() => props.modelValue, () => {
  updateIndicator();
});

onMounted(() => {
  updateIndicator();
  window.addEventListener('resize', updateIndicator);
});

const selectTab = (index, event) => {
  if (props.tabs[index].disabled) return;
  emit('update:modelValue', index);
  emit('change', index);
};
</script>

<style scoped>
.li-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
  font-family: var(--font-family, 'Inter', sans-serif);
}

.li-tabs-list {
  display: flex;
  position: relative;
  border-bottom: 1px solid var(--color-gray-200, #1A1A1A);
  background: var(--color-surface-bright, #141414);
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
}
.li-tabs-list::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

.li-tabs-fill .li-tab-button {
  flex: 1;
}

.li-tab-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-s, 8px);
  padding: 12px 16px;
  background: transparent;
  border: none;
  font-size: var(--text-sm, 16px);
  font-weight: 500;
  color: var(--color-gray-600, #808080);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--dur-short, 200ms) var(--ease-out);
  outline: none;
}

.li-tab-button:focus-visible {
  background-color: var(--color-gray-100, #121212);
  border-radius: var(--radius-sm, 4px) var(--radius-sm, 4px) 0 0;
}

.li-tab-button.is-active {
  color: var(--color-orange-400, #FF6B00);
  font-weight: 600;
}

.li-tab-button.is-disabled {
  color: var(--color-gray-400, #B3B3B3);
  cursor: not-allowed;
}

.li-tab-icon {
  display: flex;
  align-items: center;
}
.li-tab-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.li-tab-badge {
  background-color: var(--color-red-400, #C83E3B);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 99px;
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.li-tabs-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background-color: var(--color-orange-400, #FF6B00);
  transition: all var(--dur-short, 200ms) var(--ease-out);
  border-radius: 2px 2px 0 0;
}

.li-tabs-panels {
  padding-top: var(--space-l, 16px);
}
</style>
