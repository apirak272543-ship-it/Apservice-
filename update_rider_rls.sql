-- Run this SQL in your Supabase SQL Editor to fix Rider UPDATE permissions completely:
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow rider and admin update delivery_orders" ON delivery_orders;
CREATE POLICY "Allow rider and admin update delivery_orders" 
ON delivery_orders 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all select delivery_orders" ON delivery_orders;
CREATE POLICY "Allow all select delivery_orders" ON delivery_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all insert delivery_orders" ON delivery_orders;
CREATE POLICY "Allow all insert delivery_orders" ON delivery_orders FOR INSERT WITH CHECK (true);
