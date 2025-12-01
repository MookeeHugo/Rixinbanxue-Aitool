# 事件与状态机（M1 草案）

## 统一事件字典
- join, leave
- recording_started, recording_ended
- network_quality { rtt, packetLoss, bitrate }
- track_muted, track_unmuted
- error { code, reason }

## 状态机
- Session: pending → live → ended | failed
- Recording: pending → running → succeeded | failed（可重试）
- Attendee: joining → joined → reconnecting → left

## 持久化（表名建议）
- live_sessions, live_recordings, live_attendees, live_events

