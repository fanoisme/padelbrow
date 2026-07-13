import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useAuth.js', () => ({ useAuth: vi.fn(() => ({ user: ref({ id: 'u-org' }) })) }))

const addExpense = vi.fn().mockResolvedValue({ id: 'e1' })
const listExpensesWithShares = vi.fn().mockResolvedValue([
  { id: 'e1', label: 'Court', total_amount: 30, split_method: 'equal', shares: [{ user_id: 'u1', amount_owed: 10, user: { full_name: 'A' } }] },
])
const deleteExpense = vi.fn().mockResolvedValue(undefined)
vi.mock('../../composables/useExpenses.js', () => ({ useExpenses: vi.fn(() => ({ addExpense, listExpensesWithShares, deleteExpense })) }))

const listParticipants = vi.fn().mockResolvedValue([{ user_id: 'u1', profiles: { full_name: 'A' } }, { user_id: 'u2', profiles: { full_name: 'B' } }])
vi.mock('../../composables/useMeetParticipants.js', () => ({ useMeetParticipants: vi.fn(() => ({ listParticipants })) }))

vi.mock('../../composables/useStorage.js', () => ({ useStorage: vi.fn(() => ({ uploadPaymentProof: vi.fn() })) }))

import ExpensesPanel from './ExpensesPanel.vue'

describe('ExpensesPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads expenses + participants on mount and lists a share', async () => {
    const wrapper = mount(ExpensesPanel, { props: { meetId: 'm1', isOrganizer: true } })
    await flushPromises()
    expect(listExpensesWithShares).toHaveBeenCalledWith('m1')
    expect(wrapper.text()).toContain('Court')
    expect(wrapper.text()).toContain('A')
  })

  it('submits an equal-split expense from the form', async () => {
    const wrapper = mount(ExpensesPanel, { props: { meetId: 'm1', isOrganizer: true } })
    await flushPromises()
    await wrapper.find('[data-testid="expense-label"]').setValue('Balls')
    await wrapper.find('[data-testid="expense-total"]').setValue('20')
    await wrapper.find('[data-testid="expense-submit"]').trigger('click')
    await flushPromises()
    expect(addExpense).toHaveBeenCalled()
    const args = addExpense.mock.calls[0]
    expect(args[0]).toBe('m1')
    expect(args[1].label).toBe('Balls')
    expect(args[1].totalAmount).toBe(20)
    expect(args[1].splitMethod).toBe('equal')
    expect(args[1].participantIds).toEqual(['u1', 'u2'])
  })

  it('hides the form for non-organizers', async () => {
    const wrapper = mount(ExpensesPanel, { props: { meetId: 'm1', isOrganizer: false } })
    await flushPromises()
    expect(wrapper.find('[data-testid="expense-submit"]').exists()).toBe(false)
  })
})
