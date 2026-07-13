<template>
  <section class="payments-panel">
    <h3>Payments</h3>

    <!-- Participant: upload proof against the flat meet fee -->
    <div v-if="!isOrganizer && feeAmount > 0" class="payments-panel__upload">
      <p>You owe Rp{{ feeAmount.toLocaleString('id-ID') }} for this meet.</p>
      <input data-testid="proof-file" type="file" accept="image/*" ref="fileInput" />
      <LiButton data-testid="upload-proof" :loading="uploading" @click="handleUpload">Upload proof</LiButton>
    </div>

    <!-- Organizer: review pending payments -->
    <ul v-if="isOrganizer" class="payments-panel__list">
      <li v-for="p in payments" :key="p.id" class="payments-panel__row">
        <span>{{ p.user?.full_name }} — Rp{{ Number(p.amount).toLocaleString('id-ID') }}</span>
        <a v-if="p.proof_url" :href="p.proof_url" target="_blank" rel="noopener">proof</a>
        <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
        <template v-if="p.status === 'pending'">
          <LiButton data-testid="confirm-payment" size="sm" @click="handleConfirm(p.id)">Confirm</LiButton>
          <LiButton data-testid="reject-payment" size="sm" variant="ghost" @click="handleReject(p.id)">Reject</LiButton>
          <LiButton data-testid="remind-payment" size="sm" variant="ghost" @click="handleRemind(p.id)">Remind</LiButton>
        </template>
      </li>
      <li v-if="!payments.length" class="payments-panel__empty">No payments yet.</li>
    </ul>

    <!-- Participant: own payments -->
    <ul v-else class="payments-panel__list">
      <li v-for="p in myPayments" :key="p.id" class="payments-panel__row">
        <span>Rp{{ Number(p.amount).toLocaleString('id-ID') }}</span>
        <LiBadge :label="p.status" :variant="statusVariant(p.status)" />
      </li>
      <li v-if="!myPayments.length" class="payments-panel__empty">No payments yet.</li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { LiButton, LiBadge, useToast } from '../../design-system/components/index.js'
import { useAuth } from '../../composables/useAuth.js'
import { usePayments } from '../../composables/usePayments.js'
import { useStorage } from '../../composables/useStorage.js'

const props = defineProps({
  meetId: { type: String, required: true },
  isOrganizer: { type: Boolean, default: false },
  feeAmount: { type: Number, default: 0 },
})

const toast = useToast()
const { user } = useAuth()
const { createPayment, listPaymentsForMeet, confirmPayment, rejectPayment, remindUser } = usePayments()
const { uploadPaymentProof } = useStorage()

const payments = ref([])
const fileInput = ref(null)
const uploading = ref(false)

const myPayments = computed(() => payments.value.filter((p) => p.user_id === user.value?.id))

async function reload() {
  payments.value = await listPaymentsForMeet(props.meetId)
}

onMounted(async () => {
  try {
    await reload()
  } catch (err) {
    toast.error(err.message || 'Could not load payments.')
  }
})

async function handleUpload() {
  const file = fileInput.value?.files?.[0]
  if (!file) {
    toast.error('Pick a proof image first.')
    return
  }
  uploading.value = true
  try {
    const proofUrl = await uploadPaymentProof(file)
    await createPayment({ meetId: props.meetId, amount: props.feeAmount, proofUrl }, user.value.id)
    await reload()
    toast.success('Proof uploaded — pending organizer confirmation.')
  } catch (err) {
    toast.error(err.message || 'Could not upload the proof.')
  } finally {
    uploading.value = false
  }
}

async function handleConfirm(id) {
  try { await confirmPayment(id); await reload(); toast.success('Payment confirmed.') }
  catch (err) { toast.error(err.message || 'Could not confirm.') }
}
async function handleReject(id) {
  try { await rejectPayment(id); await reload(); toast.success('Payment rejected.') }
  catch (err) { toast.error(err.message || 'Could not reject.') }
}
async function handleRemind(id) {
  try { await remindUser(id); toast.success('Reminder sent.') }
  catch (err) { toast.error(err.message || 'Could not send reminder.') }
}

function statusVariant(status) {
  if (status === 'confirmed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}
</script>

<style scoped>
.payments-panel { display: flex; flex-direction: column; gap: var(--space-m, 16px); }
.payments-panel__upload { display: flex; flex-direction: column; gap: var(--space-s, 8px); align-items: flex-start; }
.payments-panel__list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: var(--space-s, 8px); }
.payments-panel__row { display: flex; align-items: center; gap: var(--space-s, 8px); flex-wrap: wrap; }
</style>
