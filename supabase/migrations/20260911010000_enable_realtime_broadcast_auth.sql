/*
# Realtime Broadcast Authorization for Live Remote Control

1. Purpose
- Live Presentation Mode's Projector/Stage windows sync via the browser's
  BroadcastChannel API (same computer only). Remote Control (a phone or
  tablet on a different device) needs a network transport instead —
  Supabase Realtime's private Broadcast channels, gated by RLS on
  `realtime.messages` ("Realtime Authorization").

2. Security
- Any authenticated church member may send/receive on any live-control
  channel. This matches the app's existing trust model: `presentations`
  already has a `presentations_select_all` policy letting any
  authenticated user read any presentation, and the live-control channel
  topic is just that presentation's UUID — this policy doesn't expose
  anything not already readable, it just extends the same "any signed-in
  staff member" boundary to the live-control transport.
*/

DROP POLICY IF EXISTS "authenticated_can_use_live_channels" ON "realtime"."messages";
CREATE POLICY "authenticated_can_use_live_channels"
  ON "realtime"."messages" FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
