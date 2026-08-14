import { createClient } from 'npm:@supabase/supabase-js@2'

const headers = { 'Content-Type': 'application/json' }
const IMAGE_RETENTION_DAYS = 14
const LOG_RETENTION_DAYS = 30
const BATCH_SIZE = 100

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers })

const isMasterAdmin = async (admin: ReturnType<typeof createClient>, token: string) => {
  const { data: userResult, error: userError } = await admin.auth.getUser(token)
  if (userError || !userResult.user) return false
  const { data: role } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userResult.user.id)
    .eq('role', 'admin')
    .maybeSingle()
  return Boolean(role)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return reply({ error: 'Function environment is incomplete' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  let body: { manual?: boolean } = {}
  try { body = await request.json() } catch { /* scheduled jobs always send JSON, direct calls may not */ }

  // Only an administrator may request an on-demand run. The scheduled daily run can only delete data
  // that has already reached the fixed retention threshold.
  if (body.manual) {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token || !(await isMasterAdmin(admin, token))) return reply({ error: 'เฉพาะ Master Admin เท่านั้นที่สั่งล้างข้อมูลได้' }, 403)
  }

  try {
    const now = Date.now()
    const imageCutoff = new Date(now - IMAGE_RETENTION_DAYS * 86_400_000).toISOString()
    const logCutoff = new Date(now - LOG_RETENTION_DAYS * 86_400_000).toISOString()

    // Phase 1: remove only evidence files linked to error reports older than 14 days via Storage API.
    // No storage.objects SQL deletion is used, preventing orphaned objects.
    const { data: evidenceRows, error: evidenceError } = await admin
      .from('error_reports')
      .select('id,evidence_path')
      .not('evidence_path', 'is', null)
      .lt('created_at', imageCutoff)
      .limit(BATCH_SIZE)
    if (evidenceError) throw evidenceError
    const evidence = (evidenceRows || []).filter((row) => typeof row.evidence_path === 'string' && row.evidence_path.length > 0)
    if (evidence.length) {
      const { error: removeError } = await admin.storage.from('error-evidence').remove(evidence.map((row) => row.evidence_path as string))
      if (removeError) throw removeError
      const { error: detachError } = await admin.from('error_reports').update({ evidence_path: null }).in('id', evidence.map((row) => row.id))
      if (detachError) throw detachError
    }

    // Phase 2: delete only expired technical logs. Customer, order, payment, wallet, store, and rider tables are never queried or modified.
    const { data: expiredRows, error: expiredError } = await admin
      .from('error_reports')
      .select('id')
      .lt('created_at', logCutoff)
      .limit(BATCH_SIZE)
    if (expiredError) throw expiredError
    const expiredIds = (expiredRows || []).map((row) => row.id)
    if (expiredIds.length) {
      const { error: deleteError } = await admin.from('error_reports').delete().in('id', expiredIds)
      if (deleteError) throw deleteError
    }

    return reply({ ok: true, policy: { image_days: IMAGE_RETENTION_DAYS, log_days: LOG_RETENTION_DAYS, max_images_per_case: 1, max_file_bytes: 1000000 }, evidence_removed: evidence.length, logs_deleted: expiredIds.length, estimated_max_bytes_released: evidence.length * 1000000 })
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'Cleanup failed' }, 500)
  }
})
