<template>
  <Teleport to="body">
    <Transition name="palette-fade">
      <div v-if="modelValue" class="li-command-palette-overlay" @click.self="close">
        <div class="li-command-palette">
          <div class="li-command-palette-search">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="li-search-icon">
              <path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <input 
              ref="searchInput"
              v-model="searchQuery"
              type="text" 
              placeholder="Type a command or search..." 
              class="li-command-palette-input"
              @keydown.down.prevent="navigateCommand(1)"
              @keydown.up.prevent="navigateCommand(-1)"
              @keydown.enter.prevent="executeCommand"
              @keydown.esc="close"
            />
            <button class="li-command-palette-esc" @click="close">ESC</button>
          </div>
          
          <div class="li-command-palette-content">
            <template v-if="filteredGroups.length > 0">
              <div v-for="(group, groupIdx) in filteredGroups" :key="groupIdx" class="li-command-group">
                <div v-if="group.label" class="li-command-group-label">{{ group.label }}</div>
                <div 
                  v-for="command in group.items" 
                  :key="command.id"
                  class="li-command-item"
                  :class="{ 'is-selected': isSelected(command.id) }"
                  @mouseenter="selectCommand(command.id)"
                  @click="executeSelected(command)"
                >
                  <span v-if="command.icon" class="li-command-item-icon">
                    <component :is="command.icon" />
                  </span>
                  <span class="li-command-item-label">{{ command.label }}</span>
                  <span v-if="command.shortcut" class="li-command-item-shortcut">
                    <kbd v-for="(key, i) in command.shortcut" :key="i">{{ key }}</kbd>
                  </span>
                </div>
              </div>
            </template>
            <div v-else class="li-command-palette-empty">
              No results found.
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  commands: {
    type: Array,
    required: true,
    // [ { label: 'Group', items: [ { id: '1', label: 'Command', shortcut: ['⌘', 'K'] } ] } ]
  }
});

const emit = defineEmits(['update:modelValue', 'execute']);

const searchQuery = ref('');
const searchInput = ref(null);
const selectedId = ref(null);

const filteredGroups = computed(() => {
  if (!searchQuery.value) return props.commands;
  const q = searchQuery.value.toLowerCase();
  
  return props.commands.map(group => {
    const items = group.items.filter(item => item.label.toLowerCase().includes(q));
    return items.length > 0 ? { ...group, items } : null;
  }).filter(Boolean);
});

const allFilteredItems = computed(() => {
  return filteredGroups.value.flatMap(group => group.items);
});

watch(allFilteredItems, (items) => {
  if (items.length > 0) {
    if (!selectedId.value || !items.find(i => i.id === selectedId.value)) {
      selectedId.value = items[0].id;
    }
  } else {
    selectedId.value = null;
  }
});

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    searchQuery.value = '';
    document.body.style.overflow = 'hidden';
    await nextTick();
    if (searchInput.value) searchInput.value.focus();
    if (allFilteredItems.value.length > 0) {
      selectedId.value = allFilteredItems.value[0].id;
    }
  } else {
    document.body.style.overflow = '';
  }
});

const close = () => {
  emit('update:modelValue', false);
};

const handleGlobalKeydown = (e) => {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    emit('update:modelValue', !props.modelValue);
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});

const selectCommand = (id) => {
  selectedId.value = id;
};

const isSelected = (id) => {
  return selectedId.value === id;
};

const navigateCommand = (dir) => {
  const items = allFilteredItems.value;
  if (items.length === 0) return;
  
  const currentIndex = items.findIndex(item => item.id === selectedId.value);
  let nextIndex = currentIndex + dir;
  
  if (nextIndex < 0) nextIndex = items.length - 1;
  if (nextIndex >= items.length) nextIndex = 0;
  
  selectedId.value = items[nextIndex].id;
  
  // Basic scroll into view logic could be added here
};

const executeCommand = () => {
  if (!selectedId.value) return;
  const command = allFilteredItems.value.find(item => item.id === selectedId.value);
  if (command) {
    executeSelected(command);
  }
};

const executeSelected = (command) => {
  emit('execute', command);
  close();
};
</script>

<style scoped>
.li-command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-overlay, rgba(34, 34, 51, 0.4));
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 2000;
}

.li-command-palette {
  width: 100%;
  max-width: 600px;
  background-color: var(--color-gray-0, #FFFFFF);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-modal, 0 16px 48px rgba(0, 0, 0, 0.15));
  font-family: var(--font-family, 'Inter', sans-serif);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0 var(--space-l, 16px);
}

.li-command-palette-search {
  display: flex;
  align-items: center;
  padding: 0 var(--space-l, 16px);
  border-bottom: 1px solid var(--color-gray-200, #E6E6E6);
}

.li-search-icon {
  color: var(--color-gray-500, #999999);
  flex-shrink: 0;
}

.li-command-palette-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: var(--space-l, 16px);
  font-size: var(--text-md, 20px);
  color: var(--color-gray-900, #333333);
  outline: none;
}

.li-command-palette-input::placeholder {
  color: var(--color-gray-400, #B3B3B3);
}

.li-command-palette-esc {
  font-size: var(--text-tiny, 10px);
  font-weight: 700;
  color: var(--color-gray-500, #999999);
  background: var(--color-gray-100, #F2F2F2);
  border: 1px solid var(--color-gray-200, #E6E6E6);
  padding: 4px 6px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
}

.li-command-palette-content {
  max-height: 400px;
  overflow-y: auto;
  padding: var(--space-s, 8px);
}

.li-command-group-label {
  padding: var(--space-s, 8px) var(--space-m, 12px);
  font-size: var(--text-xs, 14px);
  font-weight: 600;
  color: var(--color-gray-500, #999999);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.li-command-item {
  display: flex;
  align-items: center;
  padding: var(--space-m, 12px);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  gap: var(--space-m, 12px);
  transition: background-color var(--dur-micro, 120ms);
}

.li-command-item.is-selected {
  background-color: var(--color-gray-100, #F2F2F2);
}

.li-command-item-icon {
  color: var(--color-gray-600, #808080);
  display: flex;
  align-items: center;
}

.li-command-item.is-selected .li-command-item-icon {
  color: var(--color-orange-400, #FF6B00);
}

.li-command-item-label {
  flex: 1;
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #333333);
}

.li-command-item.is-selected .li-command-item-label {
  font-weight: 500;
}

.li-command-item-shortcut {
  display: flex;
  gap: 4px;
}

.li-command-item-shortcut kbd {
  font-family: inherit;
  font-size: var(--text-xs, 14px);
  color: var(--color-gray-500, #999999);
  background: var(--color-gray-0, #FFFFFF);
  border: 1px solid var(--color-gray-200, #E6E6E6);
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
  box-shadow: 0 1px 1px rgba(0,0,0,0.05);
}

.li-command-palette-empty {
  padding: var(--space-2xl, 32px);
  text-align: center;
  color: var(--color-gray-500, #999999);
  font-size: var(--text-sm, 16px);
}

/* Transitions */
.palette-fade-enter-active,
.palette-fade-leave-active {
  transition: opacity var(--dur-short, 200ms) var(--ease-out);
}
.palette-fade-enter-active .li-command-palette,
.palette-fade-leave-active .li-command-palette {
  transition: transform var(--dur-short, 200ms) var(--ease-out);
}
.palette-fade-enter-from,
.palette-fade-leave-to {
  opacity: 0;
}
.palette-fade-enter-from .li-command-palette,
.palette-fade-leave-to .li-command-palette {
  transform: scale(0.98) translateY(-10px);
}
</style>
