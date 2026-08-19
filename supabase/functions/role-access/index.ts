import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Role = 'rider' | 'store_owner'
type ManagedRole = Role | 'customer' | 'admin'
type RoleProfile = { user_id: string; email: string; login_id: string | null }
type RiderEntity = { id: string; name: string; emoji?: string; phone?: string; vehicle?: string; status?: string; lastLocation?: unknown }
type StoreEntity = { id: string; name: string; emoji?: string; desc?: string; rating?: number; eta?: string; phone?: string; location?: unknown; active?: boolean }
type LocalOrder = {
  id?: unknown; storeId?: unknown; storeName?: unknown; serviceType?: unknown; status?: unknown; riderId?: unknown; riderName?: unknown;
  customerEmail?: unknown; name?: unknown; total?: unknown; creditUsed?: unknown; payable?: unknown; deliveryFee?: unknown;
  pickupAddress?: unknown; pickupLocation?: unknown; deliveryAddress?: unknown; address?: unknown; deliveryLocation?: unknown;
  distanceKm?: unknown; note?: unknown; orderedAt?: unknown; acceptedAt?: unknown; deliveryStartedAt?: unknown; completedAt?: unknown;
  items?: unknown[]
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })
const isRole = (value: unknown): value is Role => value === 'rider' || value === 'store_owner'
const isManagedRole = (value: unknown): value is ManagedRole => value === 'customer' || value === 'rider' || value === 'store_owner' || value === 'admin'
const normalizedId = (value: unknown) => String(value || '').trim().toLowerCase()
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const loginIdIsValid = (value: string) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value)
const text = (value: unknown, fallback = '') => String(value ?? fallback).trim()
const number = (value: unknown) => Math.max(0, Number(value) || 0)
const validDate = (value: unknown) => { const date = new Date(String(value || '')); return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString() }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'Function environment is incomplete' }, 500)
    const body = await request.json() as Record<string, unknown>
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

    if (body.action === 'login') {
      const role = body.role, identifier = normalizedId(body.identifier), password = String(body.password || '')
      if (!isRole(role) || !identifier || !password) return json({ error: 'กรุณากรอกข้อมูลเข้าสู่ระบบให้ครบถ้วน' }, 400)
      const profileResult = looksLikeEmail(identifier)
        ? await admin.from('user_profiles').select('user_id,email,login_id').eq('email', identifier).maybeSingle()
        : await admin.from('user_profiles').select('user_id,email,login_id').ilike('login_id', identifier).maybeSingle()
      if (profileResult.error || !profileResult.data) return json({ error: 'ไม่พบบัญชีหรือรหัส ID นี้' }, 401)
      const profile = profileResult.data as RoleProfile
      const { data: roleRow } = await admin.from('user_roles').select('role').eq('user_id', profile.user_id).eq('role', role).maybeSingle()
      if (!roleRow) return json({ error: 'บัญชีนี้ไม่มีสิทธิ์ใช้งานแอปที่เลือก' }, 403)
      const { data: accountControl } = await admin.from('account_controls').select('status,suspension_reason').eq('user_id', profile.user_id).maybeSingle()
      if (accountControl?.status === 'suspended') return json({ error: `บัญชีนี้ถูกระงับ${accountControl.suspension_reason ? `: ${accountControl.suspension_reason}` : ''}` }, 403)
      const entityResult = role === 'rider' ? await admin.from('riders').select('id').eq('user_id', profile.user_id).maybeSingle() : await admin.from('stores').select('id').eq('owner_id', profile.user_id).maybeSingle()
      if (entityResult.error || !entityResult.data) return json({ error: 'บัญชีนี้ยังไม่ได้ผูกกับข้อมูลการทำงาน โปรดติดต่อผู้ดูแล' }, 403)
      const auth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email: profile.email, password })
      if (signInError || !signedIn.session) return json({ error: 'อีเมล/รหัส ID หรือรหัสผ่านไม่ถูกต้อง' }, 401)
      return json({ session: signedIn.session, user: signedIn.user, role, entity_id: entityResult.data.id, login_id: profile.login_id })
    }

    const accessToken = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!accessToken) return json({ error: 'ต้องเข้าสู่ระบบผู้ดูแลก่อนจัดการบัญชีหรือซิงก์ออร์เดอร์' }, 401)
    const { data: callerResult, error: callerError } = await admin.auth.getUser(accessToken)
    const caller = callerResult.user
    if (callerError || !caller) return json({ error: 'ไม่สามารถยืนยันผู้ดูแลระบบได้' }, 401)
    const { data: adminRole } = await admin.from('user_roles').select('role').eq('user_id', caller.id).eq('role', 'admin').maybeSingle()
    if (!adminRole) return json({ error: 'เฉพาะผู้ดูแลระบบที่มีสิทธิ์ใน Supabase เท่านั้นที่ดำเนินการได้' }, 403)
    const callerDb = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } })

    if (body.action === 'migrate_orders') {
      const source = Array.isArray(body.orders) ? body.orders.slice(0, 100) as LocalOrder[] : []
      if (!source.length) return json({ imported: 0 })
      const riderIds = [...new Set(source.map(order => text(order.riderId)).filter(Boolean))]
      const storeIds = [...new Set(source.map(order => text(order.storeId)).filter(Boolean))]
      const [{ data: riders, error: ridersError }, { data: stores, error: storesError }] = await Promise.all([
        riderIds.length ? admin.from('riders').select('id').in('id', riderIds) : Promise.resolve({ data: [], error: null }),
        storeIds.length ? admin.from('stores').select('id').in('id', storeIds) : Promise.resolve({ data: [], error: null }),
      ])
      if (ridersError || storesError) return json({ error: ridersError?.message || storesError?.message || 'ไม่สามารถตรวจสอบข้อมูลอ้างอิงของออร์เดอร์' }, 400)
      const riderSet = new Set((riders || []).map(row => row.id)), storeSet = new Set((stores || []).map(row => row.id))
      const orders = source.map(order => {
        const id = text(order.id)
        if (!id) throw new Error('พบออร์เดอร์ที่ไม่มีรหัสอ้างอิง')
        const riderId = text(order.riderId)
        return {
          id, customer_id: null, customer_email: text(order.customerEmail), customer_name: text(order.name, 'ลูกค้า AP Service'),
          store_id: storeSet.has(text(order.storeId)) ? text(order.storeId) : null, store_name: text(order.storeName, 'บริการจัดส่ง'),
          rider_id: riderSet.has(riderId) ? riderId : null, rider_name: riderSet.has(riderId) ? text(order.riderName) : null,
          service_type: text(order.serviceType, 'food'), status: text(order.status, 'กำลังดำเนินการ'), total: number(order.total),
          credit_used: number(order.creditUsed), payable: number(order.payable ?? order.total), delivery_fee: number(order.deliveryFee),
          pickup_address: text(order.pickupAddress), pickup_location: order.pickupLocation || null, delivery_address: text(order.deliveryAddress ?? order.address),
          delivery_location: order.deliveryLocation || null, distance_km: Number.isFinite(Number(order.distanceKm)) ? Number(order.distanceKm) : null,
          note: text(order.note), ordered_at: validDate(order.orderedAt), accepted_at: order.acceptedAt ? validDate(order.acceptedAt) : null,
          delivery_started_at: order.deliveryStartedAt ? validDate(order.deliveryStartedAt) : null, completed_at: order.completedAt ? validDate(order.completedAt) : null,
          updated_at: new Date().toISOString(),
        }
      })
      const { error: orderError } = await admin.from('delivery_orders').upsert(orders, { onConflict: 'id' })
      if (orderError) return json({ error: orderError.message }, 400)
      const items = source.flatMap(order => (Array.isArray(order.items) ? order.items : []).map((item: Record<string, unknown>) => ({
        order_id: text(order.id), item_id: text(item.foodId ?? item.id) || null, name: text(item.name, 'สินค้า'), emoji: text(item.emoji, '🍜'), unit_price: number(item.price), quantity: Math.max(1, Math.trunc(Number(item.qty) || 1)), options: item.options || {},
      }))).filter(item => item.order_id)
      const orderIds = orders.map(order => order.id)
      if (items.length) { await admin.from('delivery_order_items').delete().in('order_id', orderIds); const { error: itemsError } = await admin.from('delivery_order_items').insert(items); if (itemsError) return json({ error: itemsError.message }, 400) }
      return json({ imported: orders.length, item_count: items.length })
    }

    if (body.action === 'list_store_accounts') {
      const { data: stores, error: storesError } = await admin.from('stores').select('id,owner_id,owner_email,name,emoji,description,rating,eta,phone,location,active,image_url,background_url,open_time,close_time,order_cutoff_minutes,emergency_closed,emergency_note,category_id,moderation_status,moderation_reason,moderation_changed_at').order('name', { ascending: true }).limit(500)
      if (storesError) return json({ error: storesError.message }, 400)
      const ownerIds = (stores || []).map(store => store.owner_id).filter(Boolean)
      const { data: profiles, error: profilesError } = ownerIds.length ? await admin.from('user_profiles').select('user_id,email,login_id,phone').in('user_id', ownerIds) : { data: [], error: null }
      if (profilesError) return json({ error: profilesError.message }, 400)
      const profileByUser = new Map((profiles || []).map(profile => [profile.user_id, profile]))
      return json({ ok: true, stores: (stores || []).map(store => ({ ...store, account: store.owner_id ? profileByUser.get(store.owner_id) || null : null })) })
    }

    if (body.action === 'moderate_store') {
      const entityId = text(body.entity_id), action = text(body.moderation_action), reason = text(body.reason)
      if (!entityId || !['active', 'suspended', 'archived'].includes(action)) return json({ error: 'กรุณาเลือกร้านค้าและคำสั่งจัดการที่ถูกต้อง' }, 400)
      if (action !== 'active' && reason.length < 3) return json({ error: 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษรเพื่อบันทึกประวัติ' }, 400)
      const { data: store, error: storeError } = await admin.from('stores').select('id,name').eq('id', entityId).maybeSingle()
      if (storeError) return json({ error: storeError.message }, 400)
      if (!store) return json({ error: 'ไม่พบร้านค้าที่ต้องการจัดการ' }, 404)
      const now = new Date().toISOString()
      const { error: updateError } = await admin.from('stores').update({ active: action === 'active', moderation_status: action, moderation_reason: reason || null, moderation_changed_at: now, moderation_changed_by: caller.id, updated_at: now }).eq('id', entityId)
      if (updateError) return json({ error: updateError.message }, 400)
      const { error: eventError } = await admin.from('store_moderation_events').insert({ store_id: entityId, action, reason, performed_by: caller.id })
      if (eventError) return json({ error: eventError.message }, 400)
      return json({ ok: true, entity_id: entityId, action, reason, store_name: store.name })
    }

    if (body.action === 'update_store_section') {
      const entityId = text(body.entity_id)
      const section = text(body.section)
      const input = (body.data && typeof body.data === 'object' ? body.data : {}) as Record<string, unknown>
      if (!entityId || !['general', 'appearance', 'operations'].includes(section)) return json({ error: 'กรุณาระบุร้านค้าและหมวดข้อมูลที่ต้องการบันทึก' }, 400)
      const { data: existing, error: existingError } = await admin.from('stores').select('id,name').eq('id', entityId).maybeSingle()
      if (existingError) return json({ error: existingError.message }, 400)
      if (!existing) return json({ error: 'ไม่พบร้านค้าที่ต้องการแก้ไข' }, 404)
      const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key)
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

      if (section === 'general') {
        if (has('name')) { const name = text(input.name); if (!name) return json({ error: 'ชื่อร้านค้าห้ามว่าง' }, 400); updates.name = name }
        if (has('description')) updates.description = text(input.description)
        if (has('eta')) updates.eta = text(input.eta)
        if (has('rating')) updates.rating = Math.min(5, number(input.rating))
        if (has('settlement_gp_percent')) { const gp = number(input.settlement_gp_percent); if (!Number.isFinite(gp) || gp < 0 || gp > 100) return json({ error: 'GP ร้านค้าต้องอยู่ระหว่าง 0 ถึง 100' }, 400); updates.settlement_gp_percent = gp }
        if (has('phone')) { const phone = text(input.phone); if (!/^\+?[0-9][0-9\-\s()]{7,18}$/.test(phone)) return json({ error: 'รูปแบบเบอร์โทรติดต่อร้านไม่ถูกต้อง' }, 400); updates.phone = phone }
        if (has('category_id')) updates.category_id = text(input.category_id) || null
      }

      if (section === 'appearance') {
        if (has('emoji')) updates.emoji = text(input.emoji, '🍽️') || '🍽️'
        if (has('image_url')) updates.image_url = text(input.image_url) || null
        if (has('background_url')) updates.background_url = text(input.background_url) || null
      }

      if (section === 'operations') {
        if (has('open_time')) { const open = text(input.open_time); if (!/^\d{2}:\d{2}$/.test(open)) return json({ error: 'เวลาเปิดร้านไม่ถูกต้อง' }, 400); updates.open_time = open }
        if (has('close_time')) { const close = text(input.close_time); if (!/^\d{2}:\d{2}$/.test(close)) return json({ error: 'เวลาปิดร้านไม่ถูกต้อง' }, 400); updates.close_time = close }
        if (has('order_cutoff_minutes')) updates.order_cutoff_minutes = Math.min(240, Math.trunc(number(input.order_cutoff_minutes)))
        if (has('emergency_closed')) updates.emergency_closed = Boolean(input.emergency_closed)
        if (has('emergency_note')) updates.emergency_note = text(input.emergency_note) || null
        if (has('location')) updates.location = input.location || null
      }

      if (Object.keys(updates).length === 1) return json({ error: 'ไม่พบข้อมูลที่แก้ไขในหมวดนี้' }, 400)
      const { data: updated, error: updateError } = await admin.from('stores').update(updates).eq('id', entityId).select('id,name,emoji,description,rating,eta,phone,location,image_url,background_url,open_time,close_time,order_cutoff_minutes,emergency_closed,emergency_note,category_id,active,moderation_status,moderation_reason,moderation_changed_at').single()
      if (updateError) return json({ error: updateError.message }, 400)
      return json({ ok: true, entity_id: entityId, section, store: updated })
    }

    if (body.action === 'reset_store_password') {
      const entityId = text(body.entity_id), password = String(body.password || '')
      if (!entityId || password.length < 8) return json({ error: 'รหัสผ่านชั่วคราวต้องมีอย่างน้อย 8 ตัวอักษร' }, 400)
      const { data: store, error: storeError } = await admin.from('stores').select('id,owner_id').eq('id', entityId).maybeSingle()
      if (storeError) return json({ error: storeError.message }, 400)
      if (!store?.owner_id) return json({ error: 'ร้านนี้ยังไม่ผูกบัญชี Store App' }, 409)
      const { error: passwordError } = await admin.auth.admin.updateUserById(store.owner_id, { password })
      if (passwordError) return json({ error: passwordError.message }, 400)
      return json({ ok: true, entity_id: entityId })
    }

    if (body.action === 'get_store_moderation_events') {
      const entityId = text(body.entity_id)
      if (!entityId) return json({ error: 'กรุณาระบุร้านค้าที่ต้องการดูประวัติ' }, 400)
      const { data: events, error: eventsError } = await admin.from('store_moderation_events').select('id,action,reason,performed_by,created_at').eq('store_id', entityId).order('created_at', { ascending: false }).limit(30)
      if (eventsError) return json({ error: eventsError.message }, 400)
      return json({ ok: true, events: events || [] })
    }

    if (body.action === 'get_entity_account') {
      const role = body.role, entityId = text(body.entity_id)
      if (!isRole(role) || !entityId) return json({ error: 'กรุณาระบุประเภทบัญชีและรหัสข้อมูลที่ต้องการตรวจสอบ' }, 400)
      if (role === 'store_owner') {
        const { data: store, error: storeError } = await admin.from('stores').select('id,name,owner_id,owner_email,phone').eq('id', entityId).maybeSingle()
        if (storeError) return json({ error: storeError.message }, 400)
        if (!store) return json({ error: 'ไม่พบร้านค้าที่ต้องการตรวจสอบ' }, 404)
        const { data: profile, error: profileError } = store.owner_id ? await admin.from('user_profiles').select('email,login_id,phone,display_name').eq('user_id', store.owner_id).maybeSingle() : { data: null, error: null }
        if (profileError) return json({ error: profileError.message }, 400)
        return json({ ok: true, role, entity_id: store.id, email: profile?.email || store.owner_email || '', login_id: profile?.login_id || '', phone: profile?.phone || store.phone || '', display_name: profile?.display_name || store.name || '' })
      }
      const { data: rider, error: riderError } = await admin.from('riders').select('id,name,user_id,phone').eq('id', entityId).maybeSingle()
      if (riderError) return json({ error: riderError.message }, 400)
      if (!rider) return json({ error: 'ไม่พบ Rider ที่ต้องการตรวจสอบ' }, 404)
      const { data: profile, error: profileError } = rider.user_id ? await admin.from('user_profiles').select('email,login_id,phone,display_name').eq('user_id', rider.user_id).maybeSingle() : { data: null, error: null }
      if (profileError) return json({ error: profileError.message }, 400)
      return json({ ok: true, role, entity_id: rider.id, email: profile?.email || '', login_id: profile?.login_id || '', phone: profile?.phone || rider.phone || '', display_name: profile?.display_name || rider.name || '' })
    }

    if (body.action === 'list_user_control_plane') {
      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }, { data: controls, error: controlsError }, { data: wallets, error: walletsError }] = await Promise.all([
        admin.from('user_profiles').select('user_id,email,display_name,phone,address,login_id,created_at,updated_at').order('created_at', { ascending: false }).limit(1000),
        admin.from('user_roles').select('user_id,role').limit(4000),
        admin.from('account_controls').select('user_id,status,suspension_reason,feature_overrides,updated_at').limit(1000),
        admin.from('wallet_transactions').select('customer_id,amount,created_at').order('created_at', { ascending: false }).limit(5000),
      ])
      if (profilesError || rolesError || controlsError || walletsError) return json({ error: profilesError?.message || rolesError?.message || controlsError?.message || walletsError?.message || 'ไม่สามารถอ่านข้อมูลบัญชีได้' }, 400)
      const rolesByUser = new Map<string, string[]>(); (roles || []).forEach(row => rolesByUser.set(row.user_id, [...(rolesByUser.get(row.user_id) || []), row.role]))
      const controlsByUser = new Map((controls || []).map(row => [row.user_id, row]))
      const walletByUser = new Map<string, number>(); (wallets || []).forEach(row => walletByUser.set(row.customer_id, Number(walletByUser.get(row.customer_id) || 0) + Number(row.amount || 0)))
      return json({ ok: true, users: (profiles || []).map(profile => ({ ...profile, roles: rolesByUser.get(profile.user_id) || [], control: controlsByUser.get(profile.user_id) || { status: 'active', suspension_reason: '', feature_overrides: {} }, wallet_balance: walletByUser.get(profile.user_id) || 0 })) })
    }

    if (body.action === 'update_user_profile_section') {
      const userId = text(body.user_id), section = text(body.section), input = (body.data && typeof body.data === 'object' ? body.data : {}) as Record<string, unknown>
      if (!userId || !['identity', 'contact', 'auth'].includes(section)) return json({ error: 'กรุณาระบุบัญชีและหมวดข้อมูลที่ต้องการบันทึก' }, 400)
      const { data: existing, error: existingError } = await admin.from('user_profiles').select('user_id,email,display_name,phone,address,login_id').eq('user_id', userId).maybeSingle()
      if (existingError || !existing) return json({ error: existingError?.message || 'ไม่พบบัญชีผู้ใช้' }, 404)
      const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key), updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (section === 'identity') {
        if (has('display_name')) { const value = text(input.display_name); if (!value) return json({ error: 'ชื่อต้องไม่ว่าง' }, 400); updates.display_name = value }
        if (has('login_id')) { const value = normalizedId(input.login_id); if (!loginIdIsValid(value)) return json({ error: 'Login ID ไม่ถูกต้อง' }, 400); const { data: duplicate } = await admin.from('user_profiles').select('user_id').eq('login_id', value).neq('user_id', userId).maybeSingle(); if (duplicate) return json({ error: 'Login ID นี้ถูกใช้งานแล้ว' }, 409); updates.login_id = value }
      }
      if (section === 'contact') { if (has('phone')) updates.phone = text(input.phone); if (has('address')) updates.address = text(input.address) }
      if (Object.keys(updates).length > 1) { const { error: updateError } = await admin.from('user_profiles').update(updates).eq('user_id', userId); if (updateError) return json({ error: updateError.message }, 400) }
      if (section === 'auth') {
        const authUpdates: { email?: string; password?: string } = {}
        if (has('email')) { const email = normalizedId(input.email); if (!looksLikeEmail(email)) return json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, 400); authUpdates.email = email }
        if (has('password') && String(input.password || '')) { const password = String(input.password); if (password.length < 8) return json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' }, 400); authUpdates.password = password }
        if (!Object.keys(authUpdates).length) return json({ error: 'ไม่พบข้อมูลยืนยันตัวตนที่ต้องการแก้ไข' }, 400)
        const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdates); if (authError) return json({ error: authError.message }, 400)
        if (authUpdates.email) { const { error: profileEmailError } = await admin.from('user_profiles').update({ email: authUpdates.email, updated_at: new Date().toISOString() }).eq('user_id', userId); if (profileEmailError) return json({ error: profileEmailError.message }, 400) }
      }
      const { data: refreshed } = await admin.from('user_profiles').select('user_id,email,display_name,phone,address,login_id,updated_at').eq('user_id', userId).single()
      await admin.from('admin_action_audit').insert({ actor_id: caller.id, target_user_id: userId, action: `user_profile_${section}_updated`, before_state: existing, after_state: refreshed || {} })
      return json({ ok: true, user: refreshed })
    }

    if (body.action === 'set_account_control') {
      const { data, error } = await callerDb.rpc('admin_set_account_control', { p_user_id: text(body.user_id), p_status: text(body.status, 'active'), p_feature_overrides: body.feature_overrides && typeof body.feature_overrides === 'object' ? body.feature_overrides : {}, p_reason: text(body.reason) })
      if (error) return json({ error: error.message }, 400); return json({ ok: true, control: data })
    }

    if (body.action === 'set_user_roles') {
      const roles = Array.isArray(body.roles) ? body.roles : []
      if (!roles.length || roles.some(role => !isManagedRole(role))) return json({ error: 'กรุณาเลือกบทบาทที่ระบบรองรับอย่างน้อยหนึ่งรายการ' }, 400)
      const { data, error } = await callerDb.rpc('admin_set_user_roles', { p_user_id: text(body.user_id), p_roles: roles, p_reason: text(body.reason) })
      if (error) return json({ error: error.message }, 400); return json({ ok: true, roles: data?.roles || [] })
    }

    if (body.action === 'adjust_customer_wallet') {
      const { data, error } = await callerDb.rpc('admin_adjust_customer_wallet', { p_customer_id: text(body.user_id), p_direction: text(body.direction), p_amount: Number(body.amount), p_reason: text(body.reason) })
      if (error) return json({ error: error.message }, 400); return json({ ok: true, wallet: data })
    }

    if (body.action === 'create_managed_account') {
      const role = body.role, email = normalizedId(body.email), loginId = normalizedId(body.login_id), displayName = text(body.display_name), password = String(body.password || ''), phone = text(body.phone)
      if (!isManagedRole(role) || !looksLikeEmail(email) || !loginIdIsValid(loginId) || !displayName || password.length < 8) return json({ error: 'กรุณาระบุบทบาท อีเมล Login ID ชื่อ และรหัสผ่านอย่างน้อย 8 ตัวอักษรให้ครบถ้วน' }, 400)
      const { data: duplicate } = await admin.from('user_profiles').select('user_id').or(`email.eq.${email},login_id.eq.${loginId}`).maybeSingle(); if (duplicate) return json({ error: 'อีเมลหรือ Login ID นี้ถูกใช้งานแล้ว' }, 409)
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { login_id: loginId, app_role: role, display_name: displayName } })
      if (createError || !created.user) return json({ error: createError?.message || 'ไม่สามารถสร้างบัญชีได้' }, 400)
      const userId = created.user.id
      const { error: profileError } = await admin.from('user_profiles').upsert({ user_id: userId, email, display_name: displayName, login_id: loginId, phone }); if (profileError) return json({ error: profileError.message }, 400)
      const { error: roleError } = await admin.from('user_roles').insert({ user_id: userId, role }); if (roleError) return json({ error: roleError.message }, 400)
      await admin.from('admin_action_audit').insert({ actor_id: caller.id, target_user_id: userId, action: 'managed_account_created', after_state: { role, email, login_id: loginId } })
      return json({ ok: true, user_id: userId, role, email, login_id: loginId })
    }

    if (body.action === 'update_store_account_section') {
      const entityId = text(body.entity_id), input = (body.data && typeof body.data === 'object' ? body.data : {}) as Record<string, unknown>
      if (!entityId) return json({ error: 'กรุณาระบุร้านค้าที่ต้องการจัดการบัญชี' }, 400)
      const { data: store, error: storeError } = await admin.from('stores').select('id,owner_id').eq('id', entityId).maybeSingle(); if (storeError || !store?.owner_id) return json({ error: storeError?.message || 'ร้านนี้ยังไม่ผูกบัญชี Merchant' }, 409)
      const userId = store.owner_id, has = (key: string) => Object.prototype.hasOwnProperty.call(input, key), authUpdates: { email?: string; password?: string } = {}, profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (has('email')) { const email = normalizedId(input.email); if (!looksLikeEmail(email)) return json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, 400); authUpdates.email = email; profileUpdates.email = email }
      if (has('login_id')) { const loginId = normalizedId(input.login_id); if (!loginIdIsValid(loginId)) return json({ error: 'Login ID ไม่ถูกต้อง' }, 400); const { data: duplicate } = await admin.from('user_profiles').select('user_id').eq('login_id', loginId).neq('user_id', userId).maybeSingle(); if (duplicate) return json({ error: 'Login ID นี้ถูกใช้งานแล้ว' }, 409); profileUpdates.login_id = loginId }
      if (has('display_name')) { const displayName = text(input.display_name); if (!displayName) return json({ error: 'ชื่อเจ้าของร้านห้ามว่าง' }, 400); profileUpdates.display_name = displayName }
      if (has('phone')) profileUpdates.phone = text(input.phone)
      if (has('password') && String(input.password || '')) { const password = String(input.password); if (password.length < 8) return json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' }, 400); authUpdates.password = password }
      if (!Object.keys(authUpdates).length && Object.keys(profileUpdates).length === 1) return json({ error: 'ไม่พบข้อมูลบัญชีที่แก้ไข' }, 400)
      if (Object.keys(authUpdates).length) { const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdates); if (authError) return json({ error: authError.message }, 400) }
      if (Object.keys(profileUpdates).length > 1) { const { error: profileError } = await admin.from('user_profiles').update(profileUpdates).eq('user_id', userId); if (profileError) return json({ error: profileError.message }, 400) }
      if (authUpdates.email) await admin.from('stores').update({ owner_email: authUpdates.email, updated_at: new Date().toISOString() }).eq('id', entityId)
      await admin.from('admin_action_audit').insert({ actor_id: caller.id, target_user_id: userId, action: 'store_account_updated', after_state: { store_id: entityId, fields: Object.keys(input) } })
      return json({ ok: true, entity_id: entityId })
    }

    if (body.action !== 'provision') return json({ error: 'Unsupported action' }, 400)
    const role = body.role, entityId = text(body.entity_id), email = normalizedId(body.email), loginId = normalizedId(body.login_id), displayName = text(body.display_name), password = String(body.password || ''), entity = (body.entity || {}) as RiderEntity | StoreEntity, phone = text(body.phone || (body.entity as Record<string, unknown> | undefined)?.phone)
    const missing = [
      !isRole(role) ? 'ประเภทบัญชี' : '',
      !entityId ? 'รหัสข้อมูลร้านค้า/Rider' : '',
      !looksLikeEmail(email) ? 'อีเมลที่ถูกต้อง' : '',
      !loginIdIsValid(loginId) ? 'Login ID (ภาษาอังกฤษ/ตัวเลข/จุด/ขีด ความยาว 3–32 ตัว และขึ้นต้นด้วยตัวอักษรหรือตัวเลข)' : '',
      !displayName ? 'ชื่อร้านค้าหรือชื่อ Rider' : '',
      role === 'store_owner' && !/^\+?[0-9][0-9\-\s()]{7,18}$/.test(phone) ? 'เบอร์โทรติดต่อร้านค้า' : '',
    ].filter(Boolean)
    if (missing.length) return json({ error: `กรุณาตรวจข้อมูลบัญชี: ${missing.join(', ')}` }, 400)
    const payloadEntityId = normalizedId(entity?.id)
    if (payloadEntityId && payloadEntityId !== normalizedId(entityId)) return json({ error: 'รหัสข้อมูลร้านค้า/Rider ไม่ตรงกับข้อมูลที่ส่งมา' }, 400)
    const reuseCallerAsStoreOwner = role === 'store_owner' && email === normalizedId(caller.email)
    if (email === normalizedId(caller.email) && !reuseCallerAsStoreOwner) return json({ error: 'ห้ามใช้อีเมลบัญชีแอดมินซ้ำเป็นบัญชี Rider กรุณาใช้อีเมลของผู้ปฏิบัติงานแต่ละคน' }, 400)
    const entityResult = role === 'rider' ? await admin.from('riders').select('id,user_id').eq('id', entityId).maybeSingle() : await admin.from('stores').select('id,owner_id').eq('id', entityId).maybeSingle()
    if (entityResult.error) return json({ error: entityResult.error.message }, 400)
    let userId = role === 'rider' ? entityResult.data?.user_id : entityResult.data?.owner_id
    if (reuseCallerAsStoreOwner && userId && userId !== caller.id) return json({ error: 'ร้านนี้ผูกกับบัญชีเจ้าของร้านอื่นอยู่แล้ว จึงไม่สามารถเปลี่ยนมาใช้บัญชีผู้ดูแลนี้ได้' }, 409)
    if (reuseCallerAsStoreOwner && !userId) userId = caller.id
    if (userId && !reuseCallerAsStoreOwner) {
      const updates: { email?: string; password?: string; user_metadata?: Record<string, string> } = { email, user_metadata: { login_id: loginId, app_role: role, display_name: displayName } }
      if (password) { if (password.length < 8) return json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, 400); updates.password = password }
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, updates); if (updateError) return json({ error: updateError.message }, 400)
    } else {
      if (password.length < 8) return json({ error: 'กำหนดรหัสผ่านอย่างน้อย 8 ตัวอักษรสำหรับบัญชีใหม่' }, 400)
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { login_id: loginId, app_role: role, display_name: displayName } })
      if (createError || !created.user) return json({ error: createError?.message || 'ไม่สามารถสร้างบัญชีได้' }, 400); userId = created.user.id
    }
    const profilePayload = reuseCallerAsStoreOwner ? { user_id: userId, email } : { user_id: userId, email, display_name: displayName, login_id: loginId, ...(phone ? { phone } : {}) }
    const { error: profileError } = await admin.from('user_profiles').upsert(profilePayload, { onConflict: 'user_id' }); if (profileError) return json({ error: profileError.message }, 400)
    const { error: roleError } = await admin.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id,role' }); if (roleError) return json({ error: roleError.message }, 400)
    if (role === 'rider') {
      const rider = entity as RiderEntity; if (!rider.name?.trim()) return json({ error: 'กรุณาระบุชื่อ Rider' }, 400)
      const { error: riderError } = await admin.from('riders').upsert({ id: entityId, user_id: userId, name: rider.name.trim(), emoji: rider.emoji || '🛵', phone: rider.phone || '', vehicle: rider.vehicle || 'มอเตอร์ไซค์', status: rider.status || 'พร้อมรับงาน', last_location: rider.lastLocation || null }, { onConflict: 'id' }); if (riderError) return json({ error: riderError.message }, 400)
    } else {
      const store = entity as StoreEntity; if (!store.name?.trim()) return json({ error: 'กรุณาระบุชื่อร้านค้า' }, 400)
      const { error: storeError } = await admin.from('stores').upsert({ id: entityId, owner_id: userId, name: store.name.trim(), emoji: store.emoji || '🍽️', description: store.desc || '', rating: Number(store.rating || 0), eta: store.eta || '', phone: store.phone || phone, location: store.location || null, active: store.active !== false }, { onConflict: 'id' }); if (storeError) return json({ error: storeError.message }, 400)
    }
    return json({ ok: true, user_id: userId, email, login_id: loginId, entity_id: entityId, role })
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500) }
})
