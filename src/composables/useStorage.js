import { supabase } from '../lib/supabase.js'

export function useStorage() {
  async function uploadFeedMedia(file) {
    const ext = file.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('feed-media').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('feed-media').getPublicUrl(path)
    return data.publicUrl
  }
  return { uploadFeedMedia }
}
