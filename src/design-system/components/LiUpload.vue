<template>
  <div class="li-upload" :class="{ 'is-dragging': isDragging, 'is-disabled': disabled }">
    <label v-if="label" class="li-upload-label">{{ label }}</label>
    
    <div 
      class="li-upload-dropzone"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="triggerFileInput"
    >
      <input 
        type="file" 
        ref="fileInput" 
        class="sr-only" 
        :multiple="multiple" 
        :accept="accept"
        :disabled="disabled"
        @change="onFileChange" 
      />
      
      <div class="li-upload-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 16L12 11M12 11L17 16M12 11V21M3 8C3 6.67392 3.52678 5.40215 4.46447 4.46447C5.40215 3.52678 6.67392 3 8 3C9.53987 3 10.9708 3.75446 11.83 5.03C12.193 4.65481 12.637 4.36449 13.1311 4.18128C13.6253 3.99806 14.1578 3.92652 14.6918 3.97194C15.2257 4.01736 15.7486 4.17865 16.2255 4.44439C16.7023 4.71013 17.1223 5.07409 17.4578 5.51137C17.7933 5.94866 18.0366 6.44893 18.1721 6.97816C18.3075 7.50739 18.3318 8.05322 18.2435 8.5786C18.1551 9.10398 17.9562 9.59648 17.66 10.022C18.8929 10.2319 20.0076 10.8718 20.7854 11.8159C21.5631 12.76 21.9472 13.9398 21.8617 15.1154C21.7761 16.2911 21.228 17.3734 20.3297 18.1406C19.4313 18.9077 18.2514 19.2995 17.03 19.23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="li-upload-text">
        <span class="li-upload-highlight">Click to upload</span> or drag and drop
      </div>
      <div v-if="hint" class="li-upload-hint">{{ hint }}</div>
    </div>
    
    <div v-if="files.length > 0" class="li-upload-file-list">
      <div v-for="(file, index) in files" :key="index" class="li-upload-file-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="li-file-icon">
          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V16C4 16.5304 4.21071 17.0391 4.58579 17.4142C4.96086 17.7893 5.46957 18 6 18H14C14.5304 18 15.0391 17.7893 15.4142 17.4142C15.7893 17.0391 16 16.5304 16 16V5L13 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M13 2V5H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="li-file-name">{{ file.name }}</span>
        <button class="li-file-remove" @click.stop="removeFile(index)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  label: String,
  hint: String,
  accept: String,
  multiple: Boolean,
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue', 'change']);

const fileInput = ref(null);
const isDragging = ref(false);
const files = ref([...props.modelValue]);

const triggerFileInput = () => {
  if (!props.disabled) {
    fileInput.value.click();
  }
};

const handleFiles = (newFiles) => {
  const fileArray = Array.from(newFiles);
  if (props.multiple) {
    files.value = [...files.value, ...fileArray];
  } else {
    files.value = fileArray.slice(0, 1);
  }
  emit('update:modelValue', files.value);
  emit('change', files.value);
};

const onFileChange = (e) => {
  if (e.target.files.length > 0) {
    handleFiles(e.target.files);
  }
};

const onDragOver = () => {
  if (!props.disabled) isDragging.value = true;
};

const onDragLeave = () => {
  isDragging.value = false;
};

const onDrop = (e) => {
  isDragging.value = false;
  if (!props.disabled && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files);
  }
};

const removeFile = (index) => {
  files.value.splice(index, 1);
  emit('update:modelValue', files.value);
  emit('change', files.value);
};
</script>

<style scoped>
.li-upload {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 8px);
  width: 100%;
  font-family: var(--font-family, 'Inter', sans-serif);
}

.li-upload-label {
  font-size: var(--text-xs, 14px);
  font-weight: 500;
  color: var(--color-gray-800, #4D4D4D);
}

.li-upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl, 32px);
  border: 1.5px dashed var(--color-gray-300, #2A2A2A);
  border-radius: var(--radius-md, 8px);
  background-color: var(--color-gray-0, #FFFFFF);
  cursor: pointer;
  transition: all var(--dur-short, 200ms) var(--ease-out);
  gap: var(--space-s, 8px);
}

.li-upload-dropzone:hover:not(.is-disabled) {
  border-color: var(--color-orange-400, #FF6B00);
  background-color: var(--color-yellow-100, #FFF3D6); /* Using lightest yellow/orange for hover bg */
}

.li-upload.is-dragging .li-upload-dropzone {
  border-color: var(--color-orange-400, #FF6B00);
  background-color: var(--color-yellow-100, #FFF3D6);
}

.li-upload.is-disabled .li-upload-dropzone {
  background-color: var(--color-gray-100, #121212);
  cursor: not-allowed;
  opacity: 0.7;
}

.li-upload-icon {
  color: var(--color-gray-500, #999999);
}

.li-upload.is-dragging .li-upload-icon,
.li-upload-dropzone:hover:not(.is-disabled) .li-upload-icon {
  color: var(--color-orange-400, #FF6B00);
}

.li-upload-text {
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-700, #B3B3B3);
  text-align: center;
}

.li-upload-highlight {
  font-weight: 600;
  color: var(--color-orange-400, #FF6B00);
}

.li-upload-hint {
  font-size: var(--text-xs, 14px);
  color: var(--color-gray-500, #999999);
  text-align: center;
}

.li-upload-file-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 4px);
  margin-top: var(--space-s, 8px);
}

.li-upload-file-item {
  display: flex;
  align-items: center;
  padding: var(--space-s, 8px) var(--space-m, 12px);
  background-color: var(--color-gray-100, #121212);
  border-radius: var(--radius-sm, 4px);
  gap: var(--space-s, 8px);
}

.li-file-icon {
  color: var(--color-gray-500, #999999);
}

.li-file-name {
  flex: 1;
  font-size: var(--text-sm, 16px);
  color: var(--color-gray-900, #FFFFFF);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.li-file-remove {
  background: transparent;
  border: none;
  color: var(--color-gray-500, #999999);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  transition: all var(--dur-short, 200ms);
}

.li-file-remove:hover {
  background-color: var(--color-gray-200, #1A1A1A);
  color: var(--color-red-500, #A33129);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
