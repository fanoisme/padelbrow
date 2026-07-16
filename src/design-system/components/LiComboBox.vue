<template>
  <div
    :class="[
      'li-combobox',
      {
        'li-combobox--error': error,
        'li-combobox--disabled': disabled,
        'li-combobox--open': isOpen,
      },
    ]"
    ref="comboRef"
  >
    <label v-if="label" class="li-combobox__label">{{ label }}</label>

    <div class="li-combobox__input-wrap">
      <!-- Left icon -->
      <span v-if="iconLeft" class="li-combobox__icon li-combobox__icon--left">
        <LiIcon :name="iconLeft" size="md" color="var(--color-gray-600, #B3B3B3)" />
      </span>

      <!-- Text input -->
      <input
        ref="inputRef"
        type="text"
        :value="query"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="label || placeholder || undefined"
        :aria-expanded="isOpen"
        aria-autocomplete="list"
        role="combobox"
        class="li-combobox__input"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />

      <!-- Chevron / clear -->
      <span class="li-combobox__icon li-combobox__icon--right">
        <LiIcon
          :name="isOpen ? 'expand_less' : 'expand_more'"
          size="md"
          color="var(--color-gray-600, #B3B3B3)"
        />
      </span>
    </div>

    <!-- Error text -->
    <div v-if="errorMessage" class="li-combobox__helper">
      <span class="li-combobox__error-text">{{ errorMessage }}</span>
    </div>

    <!-- Dropdown (teleported) -->
    <Teleport to="body">
      <Transition name="li-combobox-drop">
        <div
          v-show="isOpen"
          ref="dropdownRef"
          class="li-combobox__dropdown"
          :style="dropdownStyle"
          role="listbox"
        >
          <ul class="li-combobox__options">
            <li
              v-for="(option, idx) in filteredOptions"
              :key="option.value ?? option"
              :class="[
                'li-combobox__option',
                {
                  'li-combobox__option--highlighted': idx === highlightedIndex,
                  'li-combobox__option--selected': isSelected(option),
                },
              ]"
              role="option"
              :aria-selected="isSelected(option)"
              @mousedown.prevent
              @click="selectOption(option)"
              @mouseenter="highlightedIndex = idx"
            >
              <span class="li-combobox__option-text">{{ option.label ?? option.value ?? option }}</span>
              <span v-if="isSelected(option)" class="li-combobox__option-check">
                <LiIcon name="check" size="md" color="var(--color-orange-400, #FF6B00)" />
              </span>
            </li>

            <!-- Free-text option -->
            <li
              v-if="showFreeTextOption"
              :class="[
                'li-combobox__option',
                'li-combobox__option--free-text',
                {
                  'li-combobox__option--highlighted':
                    highlightedIndex === filteredOptions.length,
                },
              ]"
              role="option"
              :aria-selected="false"
              @mousedown.prevent
              @click="selectFreeText"
              @mouseenter="highlightedIndex = filteredOptions.length"
            >
              <span class="li-combobox__option-text">{{ freeTextLabel.replace('{text}', query) }}</span>
            </li>

            <!-- Empty state -->
            <li
              v-if="filteredOptions.length === 0 && !showFreeTextOption"
              class="li-combobox__option li-combobox__option--empty"
            >
              No results found
            </li>
          </ul>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import LiIcon from './LiIcon.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Search or type...' },
  allowFreeText: { type: Boolean, default: false },
  freeTextLabel: { type: String, default: 'Use "{text}"' },
  searchFields: { type: Array, default: () => ['label'] },
  iconLeft: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const isOpen = ref(false)
const query = ref('')
const highlightedIndex = ref(0)
const comboRef = ref(null)
const dropdownRef = ref(null)
const inputRef = ref(null)
const dropdownStyle = ref({})

const error = computed(() => !!props.errorMessage)

/* ─── Display helpers ─── */
function getDisplayText(val) {
  const option = props.options.find((o) => (o.value ?? o) === val)
  return option ? (option.label ?? option.value ?? option) : props.allowFreeText ? val : ''
}

watch(
  () => props.modelValue,
  (val) => {
    query.value = getDisplayText(val)
  },
  { immediate: true }
)

/* ─── Filtering ─── */
const filteredOptions = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  return props.options.filter((o) =>
    props.searchFields.some((field) =>
      String(o[field] ?? '').toLowerCase().includes(q)
    )
  )
})

const showFreeTextOption = computed(
  () => props.allowFreeText && !!query.value && filteredOptions.value.length === 0
)

const totalItems = computed(() => filteredOptions.value.length + (showFreeTextOption.value ? 1 : 0))

function isSelected(option) {
  return (option.value ?? option) === props.modelValue
}

/* ─── Selection ─── */
function selectOption(option) {
  const val = option.value ?? option
  emit('update:modelValue', val)
  emit('select', option)
  query.value = option.label ?? option.value ?? option
  close()
  nextTick(() => inputRef.value?.focus())
}

function selectFreeText() {
  emit('update:modelValue', query.value)
  close()
  nextTick(() => inputRef.value?.focus())
}

function close() {
  isOpen.value = false
}

/* ─── Input events ─── */
function onInput(e) {
  query.value = e.target.value
  if (!isOpen.value) isOpen.value = true
  highlightedIndex.value = 0
  updateDropdownPosition()
}

function onFocus() {
  if (props.disabled) return
  isOpen.value = true
  highlightedIndex.value = 0
  updateDropdownPosition()
}

function onBlur() {
  // Delay so a click on a dropdown item wins the race
  setTimeout(() => {
    const clickingDropdown = dropdownRef.value?.contains(document.activeElement)
    if (!clickingDropdown) {
      isOpen.value = false
      if (props.allowFreeText) {
        const exact = props.options.find(
          (o) =>
            String(o.value ?? o).toLowerCase() === query.value.toLowerCase() ||
            String(o.label ?? o.value ?? o).toLowerCase() === query.value.toLowerCase()
        )
        if (!exact && query.value !== props.modelValue) {
          emit('update:modelValue', query.value)
        }
      } else {
        query.value = getDisplayText(props.modelValue)
      }
    }
  }, 150)
}

/* ─── Keyboard ─── */
function onKeydown(e) {
  if (props.disabled) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (!isOpen.value) {
        isOpen.value = true
        highlightedIndex.value = 0
        updateDropdownPosition()
      } else {
        highlightedIndex.value = Math.min(highlightedIndex.value + 1, totalItems.value - 1)
      }
      break

    case 'ArrowUp':
      e.preventDefault()
      if (isOpen.value) {
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      }
      break

    case 'Enter':
      e.preventDefault()
      if (!isOpen.value) {
        isOpen.value = true
        highlightedIndex.value = 0
        updateDropdownPosition()
        return
      }
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      } else if (showFreeTextOption.value && highlightedIndex.value === filteredOptions.value.length) {
        selectFreeText()
      }
      break

    case 'Escape':
      e.preventDefault()
      close()
      query.value = getDisplayText(props.modelValue)
      break
  }
}

/* ─── Positioning ─── */
function updateDropdownPosition() {
  nextTick(() => {
    if (!comboRef.value) return
    const rect = comboRef.value.getBoundingClientRect()
    dropdownStyle.value = {
      position: 'fixed',
      top: rect.bottom + 4 + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      zIndex: 10001,
    }
  })
}

watch(isOpen, (open) => {
  if (open) updateDropdownPosition()
})

/* ─── Click outside ─── */
function handleClickOutside(e) {
  if (
    comboRef.value &&
    !comboRef.value.contains(e.target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(e.target)
  ) {
    close()
    if (!props.allowFreeText) {
      query.value = getDisplayText(props.modelValue)
    }
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.li-combobox {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  position: relative;
}

.li-combobox__label {
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  color: var(--color-gray-900, #FFFFFF);
}

.li-combobox__input-wrap {
  display: flex;
  align-items: center;
  background: var(--color-gray-0, #ffffff);
  border: 1px solid var(--color-gray-300, #d1d5db);
  border-radius: var(--radius-md, 8px);
  min-height: 44px;
  padding: 0 12px;
  gap: 8px;
  transition: border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.li-combobox__input-wrap:focus-within {
  border-color: var(--color-orange-400, #FF6B00);
  box-shadow: 0 0 0 4px rgba(255, 107, 0, 0.12);
}

.li-combobox--error .li-combobox__input-wrap {
  border-color: var(--color-red-400, #ef4444);
}

.li-combobox--disabled .li-combobox__input-wrap {
  background: var(--color-gray-100, #f3f4f6);
  cursor: not-allowed;
}

.li-combobox--disabled .li-combobox__input {
  color: var(--color-gray-500, #A3A3A3888);
  cursor: not-allowed;
}

.li-combobox__input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 16px;
  line-height: 24px;
  color: var(--color-gray-900, #FFFFFF);
  outline: none;
  min-width: 0;
}

.li-combobox__input::placeholder {
  color: var(--color-gray-400, #9ca3af);
}

.li-combobox__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.li-combobox__icon--left {
  padding-right: 0;
}

.li-combobox__icon--right {
  padding-left: 0;
}

.li-combobox__helper {
  display: flex;
  align-items: center;
  min-height: 16px;
}

.li-combobox__error-text {
  font-size: 12px;
  line-height: 16px;
  color: var(--color-red-400, #ef4444);
}

/* Dropdown (teleported) */
.li-combobox__dropdown {
  background: var(--color-surface-bright, #ffffff);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-dropdown, 0 8px 24px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06));
  max-height: 240px;
  overflow-y: auto;
  z-index: 9999;
}

.li-combobox__options {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.li-combobox__option {
  padding: 10px 16px;
  font-size: 14px;
  line-height: 24px;
  color: var(--color-gray-900, #FFFFFF);
  cursor: pointer;
  transition: background 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.li-combobox__option-text {
  flex: 1;
}

.li-combobox__option--highlighted {
  background: var(--color-surface, #f3f4f6);
}

.li-combobox__option--selected {
  color: var(--color-orange-400, #FF6B00);
  font-weight: 600;
}

.li-combobox__option--free-text {
  font-style: italic;
  color: var(--color-blue-400, #2563eb);
  border-top: 1px solid var(--color-gray-200, #e5e7eb);
}

.li-combobox__option--empty {
  color: var(--color-gray-400, #9ca3af);
  cursor: default;
}

.li-combobox__option-check {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Transition */
.li-combobox-drop-enter-active,
.li-combobox-drop-leave-active {
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.li-combobox-drop-enter-from,
.li-combobox-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .li-combobox-drop-enter-active,
  .li-combobox-drop-leave-active {
    transition-duration: 0.01ms !important;
  }
}
</style>
