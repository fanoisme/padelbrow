<template>
  <section class="expenses-panel">
    <h3>Expenses</h3>

    <div v-if="isOrganizer" class="expenses-panel__form">
      <label class="expenses-panel__field">
        Label
        <input data-testid="expense-label" type="text" v-model="form.label" placeholder="Court fee" />
      </label>
      <label class="expenses-panel__field">
        Total
        <input data-testid="expense-total" type="number" min="0" v-model.number="form.totalAmount" />
      </label>
      <label class="expenses-panel__field">
        Split
        <select v-model="form.splitMethod">
          <option value="equal">Equal</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <div v-if="form.splitMethod === 'custom'" class="expenses-panel__custom">
        <label v-for="p in participants" :key="p.user_id">
          {{ p.profiles.full_name }}
          <input type="number" min="0" v-model.number="customAmounts[p.user_id]" />
        </label>
      </div>
      <LiButton data-testid="expense-submit" :loading="saving" @click="handleAdd">Add expense</LiButton>
    </div>

    <ul class="expenses-panel__list">
      <li v-for="e in expenses" :key="e.id" class="expenses-panel__expense">
        <div class="expenses-panel__expense-head">
          <strong>{{ e.label }}</strong>
          <span>Rp{{ Number(e.total_amount).toLocaleString('id-ID') }} ({{ e.split_method }})</span>
          <LiButton v-if="isOrganizer" size="sm" variant="ghost" @click="handleDelete(e.id)">Delete</LiButton>
        </div>
        <ul class="expenses-panel__shares">
          <li v-for="s in e.shares" :key="s.id || s.user_id">
            {{ s.user?.full_name }} — Rp{{ Number(s.amount_owed).toLocaleString('id-ID') }}
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { LiButton, useToast } from '../../design-system/components/index.js'
import { useExpenses } from '../../composables/useExpenses.js'
import { useMeetParticipants } from '../../composables/useMeetParticipants.js'

const props = defineProps({ meetId: { type: String, required: true }, isOrganizer: { type: Boolean, default: false } })
const toast = useToast()
const { addExpense, listExpensesWithShares, deleteExpense } = useExpenses()
const { listParticipants } = useMeetParticipants()

const expenses = ref([])
const participants = ref([])
const saving = ref(false)
const form = reactive({ label: '', totalAmount: 0, splitMethod: 'equal' })
const customAmounts = reactive({})

async function reload() {
  expenses.value = await listExpensesWithShares(props.meetId)
}

onMounted(async () => {
  try {
    await reload()
    if (props.isOrganizer) participants.value = await listParticipants(props.meetId)
  } catch (err) {
    toast.error(err.message || 'Could not load expenses.')
  }
})

async function handleAdd() {
  saving.value = true
  try {
    const payload = {
      label: form.label,
      totalAmount: Number(form.totalAmount) || 0,
      splitMethod: form.splitMethod,
      participantIds: participants.value.map((p) => p.user_id),
    }
    if (form.splitMethod === 'custom') {
      payload.customShares = participants.value
        .map((p) => ({ userId: p.user_id, amountOwed: Number(customAmounts[p.user_id]) || 0 }))
        .filter((s) => s.amountOwed > 0)
    }
    await addExpense(props.meetId, payload)
    form.label = ''
    form.totalAmount = 0
    await reload()
    toast.success('Expense added.')
  } catch (err) {
    toast.error(err.message || 'Could not add the expense.')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  try {
    await deleteExpense(id)
    await reload()
    toast.success('Expense deleted.')
  } catch (err) {
    toast.error(err.message || 'Could not delete the expense.')
  }
}
</script>

<style scoped>
.expenses-panel { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.expenses-panel__form { display: flex; flex-wrap: wrap; gap: var(--space-s, 8px); align-items: flex-end; }
.expenses-panel__field { display: flex; flex-direction: column; gap: var(--space-xs, 4px); font-size: 0.85rem; }
.expenses-panel__field input, .expenses-panel__field select { padding: var(--space-xs, 4px); border: 1px solid var(--color-gray-300, #CCC); border-radius: var(--radius-s, 6px); }
.expenses-panel__custom { display: flex; flex-direction: column; gap: var(--space-xs, 4px); }
.expenses-panel__list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.expenses-panel__expense-head { display: flex; gap: var(--space-s, 8px); align-items: center; }
.expenses-panel__shares { list-style: none; padding-left: var(--space-m, 16px); }
</style>
