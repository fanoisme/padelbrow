import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u1' }) })) }))

const uploadPaymentProof = vi.fn().mockResolvedValue('https://x/proof.png')
vi.mock('../../composables/useStorage.js', () => ({ useStorage: vi.fn(() => ({ uploadPaymentProof })) }))

const createPayment = vi.fn().mockResolvedValue({ id: 'pay1' })
const listPaymentsForMeet = vi.fn().mockResolvedValue([
  { id: 'pay1', user_id: 'u1', amount: 10, status: 'pending', proof_url: 'https://x/proof.png', user: { id: 'u1', full_name: 'Me' } },
])
const confirmPayment = vi.fn().mockResolvedValue(undefined)
const rejectPayment = vi.fn().mockResolvedValue(undefined)
const remindUser = vi.fn().mockResolvedValue(undefined)
vi.mock('../../composables/usePayments.js', () => ({
  usePayments: vi.fn(() => ({ createPayment, listPaymentsForMeet, confirmPayment, rejectPayment, remindUser })),
}))

import PaymentsPanel from './PaymentsPanel.vue'

describe('PaymentsPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('participant uploads proof + creates a pending payment', async () => {
    const wrapper = mount(PaymentsPanel, { props: { meetId: 'm1', isOrganizer: false, feeAmount: 10 } })
    await flushPromises()
    const input = wrapper.find('[data-testid="proof-file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [{ name: 'proof.png' }] })
    await wrapper.find('[data-testid="upload-proof"]').trigger('click')
    await flushPromises()
    expect(uploadPaymentProof).toHaveBeenCalled()
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ meetId: 'm1', amount: 10, proofUrl: 'https://x/proof.png' }),
      'u1',
    )
  })

  it('organizer sees confirm/reject/remind buttons for a pending payment', async () => {
    const wrapper = mount(PaymentsPanel, { props: { meetId: 'm1', isOrganizer: true, feeAmount: 10 } })
    await flushPromises()
    expect(wrapper.find('[data-testid="confirm-payment"]').exists()).toBe(true)
    await wrapper.find('[data-testid="confirm-payment"]').trigger('click')
    await flushPromises()
    expect(confirmPayment).toHaveBeenCalledWith('pay1')
  })

  it('organizer can reject + remind', async () => {
    const wrapper = mount(PaymentsPanel, { props: { meetId: 'm1', isOrganizer: true, feeAmount: 10 } })
    await flushPromises()
    await wrapper.find('[data-testid="reject-payment"]').trigger('click')
    await wrapper.find('[data-testid="remind-payment"]').trigger('click')
    await flushPromises()
    expect(rejectPayment).toHaveBeenCalledWith('pay1')
    expect(remindUser).toHaveBeenCalledWith('pay1')
  })
})
