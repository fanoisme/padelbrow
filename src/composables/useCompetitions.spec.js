import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))
// Stub the pure generators so this test stays about the composable's DB wiring.
vi.mock('../lib/tournamentGenerators.js', () => ({
  generateRoundRobin: vi.fn(() => [{ round_name: 'Round 1', bracket_position: 0, team_a_id: 't1', team_b_id: 't2' }]),
  generateSingleElimination: vi.fn(() => [{ round_name: 'Final', bracket_position: 0, team_a_id: null, team_b_id: null }]),
}))

import { supabase } from '../lib/supabase.js'
import { generateRoundRobin, generateSingleElimination } from '../lib/tournamentGenerators.js'
import { useCompetitions } from './useCompetitions.js'

describe('useCompetitions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('listCompetitions orders by created_at desc', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'co1', name: 'Cup' }], error: null })
    const select = vi.fn(() => ({ order }))
    supabase.from.mockReturnValue({ select })

    const { listCompetitions } = useCompetitions()
    const result = await listCompetitions()

    expect(supabase.from).toHaveBeenCalledWith('competitions')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toEqual([{ id: 'co1', name: 'Cup' }])
  })

  it('createCompetition merges club_id + status draft and returns the row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'co1', status: 'draft' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    supabase.from.mockReturnValue({ insert })

    const { createCompetition } = useCompetitions()
    const result = await createCompetition({ name: 'Cup', format: 'round_robin' }, 'club1')

    expect(insert).toHaveBeenCalledWith({ name: 'Cup', format: 'round_robin', club_id: 'club1', status: 'draft' })
    expect(result).toEqual({ id: 'co1', status: 'draft' })
  })

  it('generateMatches runs round-robin for that format, persists, and starts the competition', async () => {
    const insertMatches = vi.fn().mockResolvedValue({ data: [{ id: 'cm1' }], error: null })
    const matchesTable = { insert: insertMatches }
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))
    const compTable = { update }
    supabase.from.mockImplementation((table) => (table === 'competition_matches' ? matchesTable : compTable))

    const { generateMatches } = useCompetitions()
    const result = await generateMatches({ id: 'co1', format: 'round_robin' }, [{ id: 't1' }, { id: 't2' }])

    expect(generateRoundRobin).toHaveBeenCalledWith(['t1', 't2'])
    expect(insertMatches).toHaveBeenCalledWith([
      { round_name: 'Round 1', bracket_position: 0, team_a_id: 't1', team_b_id: 't2', competition_id: 'co1' },
    ])
    expect(update).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(result).toEqual([{ id: 'cm1' }])
  })

  it('generateMatches throws for an unsupported format', async () => {
    const { generateMatches } = useCompetitions()
    await expect(generateMatches({ id: 'co1', format: 'groups' }, [])).rejects.toThrow(/unsupported format/)
  })
})
