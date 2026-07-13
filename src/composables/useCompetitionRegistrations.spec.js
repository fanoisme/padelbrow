import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase.js'
import { useCompetitionRegistrations } from './useCompetitionRegistrations.js'

describe('useCompetitionRegistrations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listRegistrations returns registrations joined with team info', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ team_id: 't1', status: 'confirmed', seed: 1, competition_teams: { id: 't1', name: 'Eagles' } }],
      error: null,
    })
    const select = vi.fn(() => ({ eq }))
    supabase.from.mockReturnValue({ select })

    const { listRegistrations } = useCompetitionRegistrations()
    const result = await listRegistrations('co1')

    expect(supabase.from).toHaveBeenCalledWith('competition_registrations')
    expect(eq).toHaveBeenCalledWith('competition_id', 'co1')
    expect(result[0].competition_teams.name).toBe('Eagles')
  })

  it('registerTeam inserts the team then a pending registration keyed off the returned team id', async () => {
    const teamSingle = vi.fn().mockResolvedValue({ data: { id: 't1', name: 'Eagles' }, error: null })
    const teamSelect = vi.fn(() => ({ single: teamSingle }))
    const teamInsert = vi.fn(() => ({ select: teamSelect }))

    const regEq = vi.fn().mockResolvedValue({ error: null })
    const regInsert = vi.fn(() => ({ eq: regEq }))

    supabase.from.mockImplementation((table) => {
      if (table === 'competition_teams') return { insert: teamInsert }
      if (table === 'competition_registrations') return { insert: regInsert }
      throw new Error(`unexpected table ${table}`)
    })

    const { registerTeam } = useCompetitionRegistrations()
    const result = await registerTeam('co1', { name: 'Eagles', playerIds: ['u1', 'u2'] })

    expect(teamInsert).toHaveBeenCalledWith({ competition_id: 'co1', name: 'Eagles', player_ids: ['u1', 'u2'] })
    expect(regInsert).toHaveBeenCalledWith({ competition_id: 'co1', team_id: 't1', status: 'pending' })
    expect(result).toEqual({ id: 't1', name: 'Eagles' })
  })

  it('confirmRegistration sets seed + confirmed status', async () => {
    const single = vi.fn().mockResolvedValue({ data: { team_id: 't1', status: 'confirmed', seed: 2 }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq2 = vi.fn(() => ({ select }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const update = vi.fn(() => ({ eq: eq1 }))
    supabase.from.mockReturnValue({ update })

    const { confirmRegistration } = useCompetitionRegistrations()
    const result = await confirmRegistration('co1', 't1', 2)

    expect(update).toHaveBeenCalledWith({ seed: 2, status: 'confirmed' })
    expect(eq1).toHaveBeenCalledWith('competition_id', 'co1')
    expect(eq2).toHaveBeenCalledWith('team_id', 't1')
    expect(result).toEqual({ team_id: 't1', status: 'confirmed', seed: 2 })
  })
})
