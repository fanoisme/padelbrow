import { describe, it, expect, vi, beforeEach } from 'vitest'

const upload = vi.fn().mockResolvedValue({ data: { path: 'abc.png' }, error: null })
const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/feed-media/abc.png' } })
vi.mock('../lib/supabase.js', () => ({
  supabase: { storage: { from: vi.fn(() => ({ upload, getPublicUrl })) } },
}))

import { supabase } from '../lib/supabase.js'
import { useStorage } from './useStorage.js'

describe('useStorage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uploads a file to the feed-media bucket and returns the public URL', async () => {
    const { uploadFeedMedia } = useStorage()
    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    const url = await uploadFeedMedia(file)

    expect(supabase.storage.from).toHaveBeenCalledWith('feed-media')
    expect(upload).toHaveBeenCalledWith(expect.any(String), file, { upsert: false })
    expect(getPublicUrl).toHaveBeenCalledWith(expect.any(String))
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/feed-media/abc.png')
  })

  it('uploads a file to the payment-proofs bucket and returns the public URL', async () => {
    const { uploadPaymentProof } = useStorage()
    const file = new File(['x'], 'proof.png', { type: 'image/png' })
    const url = await uploadPaymentProof(file)

    expect(supabase.storage.from).toHaveBeenCalledWith('payment-proofs')
    expect(upload).toHaveBeenCalledWith(expect.any(String), file, { upsert: false })
    expect(getPublicUrl).toHaveBeenCalledWith(expect.any(String))
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/feed-media/abc.png')
  })
})
