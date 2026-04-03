-- ============================================================
-- SmartMall AI Camera — Full Database Schema
-- Stack: Supabase + PostgreSQL
-- Author: AI-generated based on feature spec v2.0
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin', 'it_admin', 'director', 'security',
  'marketing', 'operations', 'parking'
);

CREATE TYPE camera_status AS ENUM ('online', 'offline', 'tampered', 'degraded');

CREATE TYPE zone_type AS ENUM (
  'store', 'corridor', 'entrance', 'food_court', 'parking', 'emergency_exit'
);

CREATE TYPE gate_type AS ENUM ('entry_only', 'exit_only', 'bidirectional');

CREATE TYPE density_level AS ENUM ('normal', 'warning', 'alert', 'critical');

CREATE TYPE footfall_direction AS ENUM ('in', 'out');

CREATE TYPE consent_status AS ENUM ('active', 'revoked', 'expired');

CREATE TYPE consent_method AS ENUM ('kiosk', 'mobile_app', 'paper_form', 'staff_assisted');

CREATE TYPE customer_segment AS ENUM ('new', 'occasional', 'regular', 'vip');

CREATE TYPE age_group AS ENUM ('child', 'teen', 'young_adult', 'adult', 'senior');

CREATE TYPE gender_estimate AS ENUM ('male', 'female', 'unknown');

CREATE TYPE group_type AS ENUM (
  'individual', 'couple', 'family_with_child', 'group_friends', 'other'
);

CREATE TYPE heatmap_snapshot_type AS ENUM ('hourly', 'daily', 'custom');

CREATE TYPE alert_type AS ENUM (
  'loitering', 'crowd', 'camera_tamper', 'left_object',
  'intrusion', 'fight', 'fall_detection'
);

CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE alert_response_state AS ENUM (
  'new', 'acknowledged', 'investigating', 'false_positive', 'resolved'
);

CREATE TYPE incident_type AS ENUM (
  'theft', 'fight', 'fire', 'medical', 'loitering',
  'vandalism', 'crowd', 'other'
);

CREATE TYPE incident_status AS ENUM ('new', 'in_progress', 'resolved', 'closed');

CREATE TYPE attachment_type AS ENUM ('video_clip', 'image', 'document');

CREATE TYPE watchlist_priority AS ENUM ('low', 'normal', 'high', 'critical');

CREATE TYPE watchlist_status AS ENUM ('active', 'expired', 'disabled');

CREATE TYPE vehicle_direction AS ENUM ('entry', 'exit');

CREATE TYPE vehicle_type AS ENUM ('car', 'motorbike', 'truck', 'other');

CREATE TYPE vehicle_list_type AS ENUM ('whitelist', 'blacklist');

CREATE TYPE slot_status AS ENUM ('available', 'occupied', 'reserved', 'unknown');

CREATE TYPE slot_type AS ENUM ('standard', 'vip', 'disabled', 'ev_charging', 'reserved');

CREATE TYPE violation_type AS ENUM (
  'wrong_lane', 'wrong_parking', 'blocking_emergency_exit', 'speeding', 'other'
);

CREATE TYPE violation_status AS ENUM ('open', 'notified', 'resolved');

CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv');

CREATE TYPE report_time_range AS ENUM ('daily', 'weekly', 'monthly', 'custom');

CREATE TYPE report_run_status AS ENUM ('pending', 'running', 'success', 'failed');

CREATE TYPE erp_sync_type AS ENUM (
  'footfall_to_erp', 'demographics_to_erp', 'store_list_from_erp'
);

CREATE TYPE erp_sync_status AS ENUM ('pending', 'running', 'success', 'failed', 'buffered');

-- ============================================================
-- MODULE 1: AUTH & RBAC
-- ============================================================

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                VARCHAR(255) NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,
  full_name            VARCHAR(255) NOT NULL,
  role                 user_role NOT NULL,
  phone                VARCHAR(20),
  avatar_url           TEXT,
  mfa_enabled          BOOLEAN NOT NULL DEFAULT false,
  mfa_secret           TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  last_login_at        TIMESTAMPTZ,
  password_changed_at  TIMESTAMPTZ,
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;

COMMENT ON TABLE users IS 'Tài khoản người dùng hệ thống SmartMall';
COMMENT ON COLUMN users.role IS 'Role chính xác định quyền truy cập module';
COMMENT ON COLUMN users.mfa_secret IS 'TOTP secret - phải encrypt ở tầng application';

-- ----

CREATE TABLE user_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT,
  ip_address          INET,
  user_agent          TEXT,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;

-- ----

CREATE TABLE audit_logs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID REFERENCES users(id),
  action         VARCHAR(100) NOT NULL,
  resource_type  VARCHAR(100),
  resource_id    TEXT,
  old_value      JSONB,
  new_value      JSONB,
  ip_address     INET,
  user_agent     TEXT,
  meta           JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

COMMENT ON TABLE audit_logs IS 'Audit trail bất biến - không cho xóa/sửa ở tầng DB (RLS)';

-- ============================================================
-- MODULE 2: CAMERA & INFRASTRUCTURE
-- ============================================================

CREATE TABLE camera_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  floor_level  SMALLINT,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE camera_groups IS 'Nhóm camera theo tầng/khu vực';

-- ----

CREATE TABLE cameras (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_code           VARCHAR(50) NOT NULL UNIQUE,
  name                  VARCHAR(255) NOT NULL,
  group_id              UUID REFERENCES camera_groups(id),
  -- zone_id will be added after zones table is created (ALTER TABLE below)
  rtsp_url              TEXT,
  hls_url               TEXT,
  manufacturer          VARCHAR(100),
  model                 VARCHAR(100),
  ip_address            INET,
  mac_address           MACADDR,
  location_description  TEXT,
  latitude              DECIMAL(10, 7),
  longitude             DECIMAL(10, 7),
  resolution            VARCHAR(20),
  fps                   SMALLINT,
  ai_features           JSONB DEFAULT '[]'::jsonb,
  status                camera_status NOT NULL DEFAULT 'online',
  is_sensitive_area     BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cameras_group ON cameras(group_id);
CREATE INDEX idx_cameras_status ON cameras(status) WHERE is_active = true;
CREATE INDEX idx_cameras_code ON cameras(camera_code);

COMMENT ON TABLE cameras IS 'Cấu hình master toàn bộ camera. rtsp_url nên encrypt at rest.';

-- ----

CREATE TABLE camera_health_logs (
  id            BIGSERIAL PRIMARY KEY,
  camera_id     UUID NOT NULL REFERENCES cameras(id),
  status        camera_status NOT NULL,
  latency_ms    INTEGER,
  error_code    VARCHAR(50),
  error_message TEXT,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_camera_health_camera ON camera_health_logs(camera_id);
CREATE INDEX idx_camera_health_checked ON camera_health_logs(checked_at DESC);

-- ============================================================
-- MODULE 3: FLOORPLAN & ZONES
-- ============================================================

CREATE TABLE floorplans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_level SMALLINT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  name        VARCHAR(100) NOT NULL,
  image_url   TEXT,
  width_px    INTEGER,
  height_px   INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  valid_from  TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (floor_level, version)
);

COMMENT ON TABLE floorplans IS 'Sơ đồ mặt bằng có versioning để tránh sai lịch sử khi layout thay đổi';

-- ----

CREATE TABLE zones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id    UUID NOT NULL REFERENCES floorplans(id),
  code            VARCHAR(50) UNIQUE,
  name            VARCHAR(255) NOT NULL,
  zone_type       zone_type NOT NULL,
  polygon_coords  JSONB,
  area_sqm        DECIMAL(10, 2),
  tenant_name     VARCHAR(255),
  store_category  VARCHAR(100),
  is_dwell_zone   BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zones_floorplan ON zones(floorplan_id);
CREATE INDEX idx_zones_type ON zones(zone_type) WHERE is_active = true;

COMMENT ON TABLE zones IS 'Khu vực logic: cửa hàng, lối đi, khu ăn uống...';

-- ----

CREATE TABLE zone_configs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id                   UUID NOT NULL REFERENCES zones(id),
  day_of_week               SMALLINT[],
  hour_from                 SMALLINT,
  hour_to                   SMALLINT,
  dwell_threshold_seconds   INTEGER NOT NULL DEFAULT 30,
  max_capacity              INTEGER,
  crowd_warning_pct         SMALLINT NOT NULL DEFAULT 70,
  crowd_critical_pct        SMALLINT NOT NULL DEFAULT 90,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_hour_range CHECK (hour_from >= 0 AND hour_to <= 23 AND hour_from < hour_to),
  CONSTRAINT chk_pct_range CHECK (crowd_warning_pct < crowd_critical_pct)
);

-- Add zone_id FK to cameras after zones table exists
ALTER TABLE cameras ADD COLUMN zone_id UUID REFERENCES zones(id);

-- ============================================================
-- MODULE 4: FOOTFALL ANALYTICS
-- ============================================================

CREATE TABLE gates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  camera_id   UUID REFERENCES cameras(id),
  zone_id     UUID REFERENCES zones(id),
  gate_type   gate_type NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE gates IS 'Cổng vào/ra tòa nhà hoặc khu vực parking';

-- ----

CREATE TABLE gate_thresholds (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id                       UUID NOT NULL REFERENCES gates(id),
  day_of_week                   SMALLINT,
  people_per_minute_warning     INTEGER NOT NULL,
  people_per_minute_alert       INTEGER NOT NULL,
  people_per_minute_critical    INTEGER NOT NULL,
  CONSTRAINT chk_threshold_order CHECK (
    people_per_minute_warning < people_per_minute_alert
    AND people_per_minute_alert < people_per_minute_critical
  )
);

-- ----

-- High-volume: partition by day recommended in production
CREATE TABLE footfall_raw_events (
  id           BIGSERIAL PRIMARY KEY,
  camera_id    UUID NOT NULL REFERENCES cameras(id),
  gate_id      UUID REFERENCES gates(id),
  direction    footfall_direction NOT NULL,
  track_id     VARCHAR(100),
  confidence   DECIMAL(4, 3),
  is_staff     BOOLEAN NOT NULL DEFAULT false,
  detected_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_footfall_raw_gate_time ON footfall_raw_events(gate_id, detected_at DESC);
CREATE INDEX idx_footfall_raw_camera ON footfall_raw_events(camera_id, detected_at DESC);

COMMENT ON TABLE footfall_raw_events IS 'Event thô từ AI line-crossing. Partition theo ngày, giữ 30 ngày.';

-- ----

CREATE TABLE footfall_minutely (
  id             BIGSERIAL PRIMARY KEY,
  gate_id        UUID NOT NULL REFERENCES gates(id),
  bucket         TIMESTAMPTZ NOT NULL,
  in_count       INTEGER NOT NULL DEFAULT 0,
  out_count      INTEGER NOT NULL DEFAULT 0,
  running_count  INTEGER,
  density_level  density_level,
  UNIQUE (gate_id, bucket)
);

CREATE INDEX idx_footfall_min_gate_bucket ON footfall_minutely(gate_id, bucket DESC);

COMMENT ON TABLE footfall_minutely IS 'Aggregate mỗi phút, UPSERT từ pipeline. Dùng cho dashboard realtime.';

-- ----

CREATE TABLE footfall_hourly (
  id                     BIGSERIAL PRIMARY KEY,
  gate_id                UUID NOT NULL REFERENCES gates(id),
  bucket                 TIMESTAMPTZ NOT NULL,
  in_count               INTEGER NOT NULL DEFAULT 0,
  out_count              INTEGER NOT NULL DEFAULT 0,
  peak_running_count     INTEGER,
  avg_people_per_minute  DECIMAL(8, 2),
  UNIQUE (gate_id, bucket)
);

CREATE INDEX idx_footfall_hourly_gate_bucket ON footfall_hourly(gate_id, bucket DESC);

-- ----

CREATE TABLE footfall_forecasts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id             UUID REFERENCES gates(id),
  forecast_date       DATE NOT NULL,
  forecast_hour       SMALLINT NOT NULL CHECK (forecast_hour >= 0 AND forecast_hour <= 23),
  predicted_in_count  INTEGER,
  predicted_peak      INTEGER,
  confidence_low      INTEGER,
  confidence_high     INTEGER,
  model_version       VARCHAR(50),
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gate_id, forecast_date, forecast_hour)
);

-- ============================================================
-- MODULE 5: CUSTOMER PROFILE (CONSENT)
-- ============================================================

CREATE TABLE consent_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID,  -- FK added after customers table
  consent_method        consent_method NOT NULL,
  consent_text_version  VARCHAR(20) NOT NULL,
  status                consent_status NOT NULL DEFAULT 'active',
  consented_at          TIMESTAMPTZ NOT NULL,
  expires_at            TIMESTAMPTZ,
  revoked_at            TIMESTAMPTZ,
  revoke_reason         TEXT,
  ip_address            INET,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_status ON consent_records(status);
CREATE INDEX idx_consent_expires ON consent_records(expires_at) WHERE status = 'active';

COMMENT ON TABLE consent_records IS 'Bảng pháp lý - không xóa, chỉ thêm trạng thái';

-- ----

CREATE TABLE customers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id                UUID NOT NULL UNIQUE REFERENCES consent_records(id),
  customer_code             VARCHAR(50) UNIQUE,
  segment                   customer_segment NOT NULL DEFAULT 'new',
  total_visits              INTEGER NOT NULL DEFAULT 0,
  first_visit_at            TIMESTAMPTZ,
  last_visit_at             TIMESTAMPTZ,
  favorite_gate_id          UUID REFERENCES gates(id),
  favorite_time_slot        SMALLINT,
  avg_stay_duration_minutes INTEGER,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_customers_segment ON customers(segment) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_consent ON customers(consent_id);

-- Add FK back to consent_records
ALTER TABLE consent_records ADD CONSTRAINT fk_consent_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id);

-- ----

CREATE TABLE face_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  embedding     vector(512),
  model_version VARCHAR(50) NOT NULL,
  quality_score DECIMAL(4, 3),
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pgvector index for similarity search
CREATE INDEX idx_face_embedding_hnsw ON face_embeddings
  USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE face_embeddings IS 'Face vector mã hóa. Không lưu ảnh gốc mặc định.';

-- ----

CREATE TABLE customer_visits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  entry_gate_id         UUID REFERENCES gates(id),
  exit_gate_id          UUID REFERENCES gates(id),
  entry_camera_id       UUID REFERENCES cameras(id),
  entered_at            TIMESTAMPTZ NOT NULL,
  exited_at             TIMESTAMPTZ,
  stay_duration_minutes INTEGER,
  zones_visited         UUID[],
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_visits_customer ON customer_visits(customer_id);
CREATE INDEX idx_customer_visits_entered ON customer_visits(entered_at DESC);

-- ============================================================
-- MODULE 6: MARKETING DEMOGRAPHICS (ANONYMOUS)
-- ============================================================

CREATE TABLE demographic_detections (
  id               BIGSERIAL PRIMARY KEY,
  camera_id        UUID NOT NULL REFERENCES cameras(id),
  zone_id          UUID REFERENCES zones(id),
  age_group        age_group NOT NULL,
  gender_estimate  gender_estimate,
  group_type       group_type NOT NULL,
  group_size       SMALLINT NOT NULL DEFAULT 1,
  confidence       DECIMAL(4, 3),
  detected_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_demo_detect_zone_time ON demographic_detections(zone_id, detected_at DESC);
CREATE INDEX idx_demo_detect_time ON demographic_detections(detected_at DESC);

COMMENT ON TABLE demographic_detections IS 'Hoàn toàn ẩn danh, không liên kết customer. Giữ max 90 ngày.';

-- ----

CREATE TABLE demographic_aggregates (
  id               BIGSERIAL PRIMARY KEY,
  zone_id          UUID REFERENCES zones(id),
  bucket           TIMESTAMPTZ NOT NULL,
  age_group        age_group NOT NULL,
  gender_estimate  gender_estimate NOT NULL,
  group_type       group_type NOT NULL,
  sample_count     INTEGER NOT NULL DEFAULT 0,
  avg_dwell_minutes DECIMAL(8, 2),
  UNIQUE (zone_id, bucket, age_group, gender_estimate, group_type)
);

CREATE INDEX idx_demo_agg_zone_bucket ON demographic_aggregates(zone_id, bucket DESC);

-- ============================================================
-- MODULE 7: HEATMAP & DWELL TIME
-- ============================================================

CREATE TABLE tracking_events (
  id           BIGSERIAL PRIMARY KEY,
  camera_id    UUID NOT NULL REFERENCES cameras(id),
  floorplan_id UUID NOT NULL REFERENCES floorplans(id),
  track_id     VARCHAR(100) NOT NULL,
  x_coord      DECIMAL(8, 4) NOT NULL,
  y_coord      DECIMAL(8, 4) NOT NULL,
  zone_id      UUID REFERENCES zones(id),
  tracked_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tracking_zone_time ON tracking_events(zone_id, tracked_at DESC);
CREATE INDEX idx_tracking_floorplan_time ON tracking_events(floorplan_id, tracked_at DESC);

COMMENT ON TABLE tracking_events IS 'Vị trí ẩn danh. High-volume — giữ 7 ngày raw, sau đó aggregate.';

-- ----

CREATE TABLE dwell_events (
  id            BIGSERIAL PRIMARY KEY,
  zone_id       UUID NOT NULL REFERENCES zones(id),
  camera_id     UUID REFERENCES cameras(id),
  track_id      VARCHAR(100),
  entered_at    TIMESTAMPTZ NOT NULL,
  exited_at     TIMESTAMPTZ,
  dwell_seconds INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dwell_zone_entered ON dwell_events(zone_id, entered_at DESC);

-- ----

CREATE TABLE heatmap_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id     UUID NOT NULL REFERENCES floorplans(id),
  snapshot_type    heatmap_snapshot_type NOT NULL,
  bucket_start     TIMESTAMPTZ NOT NULL,
  bucket_end       TIMESTAMPTZ NOT NULL,
  image_url        TEXT,
  density_matrix   JSONB,
  max_density      DECIMAL(8, 4),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_heatmap_floorplan_bucket ON heatmap_snapshots(floorplan_id, bucket_start DESC);

-- ============================================================
-- MODULE 8: JOURNEY & CONVERSION
-- ============================================================

CREATE TABLE journey_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id   UUID REFERENCES floorplans(id),
  track_id       VARCHAR(100) NOT NULL,
  entry_zone_id  UUID REFERENCES zones(id),
  exit_zone_id   UUID REFERENCES zones(id),
  zone_sequence  UUID[],
  started_at     TIMESTAMPTZ NOT NULL,
  ended_at       TIMESTAMPTZ,
  total_minutes  INTEGER
);

CREATE INDEX idx_journey_started ON journey_sessions(started_at DESC);
CREATE INDEX idx_journey_track ON journey_sessions(track_id);

-- ----

CREATE TABLE zone_transitions (
  id                  BIGSERIAL PRIMARY KEY,
  journey_session_id  UUID REFERENCES journey_sessions(id),
  from_zone_id        UUID NOT NULL REFERENCES zones(id),
  to_zone_id          UUID NOT NULL REFERENCES zones(id),
  transitioned_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_zone_trans_from_to ON zone_transitions(from_zone_id, to_zone_id);
CREATE INDEX idx_zone_trans_time ON zone_transitions(transitioned_at DESC);

COMMENT ON TABLE zone_transitions IS 'Aggregate (from, to) COUNT để build Sankey/flow chart';

-- ----

CREATE TABLE store_conversion_snapshots (
  id                        BIGSERIAL PRIMARY KEY,
  zone_id                   UUID NOT NULL REFERENCES zones(id),
  bucket                    TIMESTAMPTZ NOT NULL,
  passerby_count            INTEGER NOT NULL DEFAULT 0,
  entry_count               INTEGER NOT NULL DEFAULT 0,
  conversion_rate           DECIMAL(5, 4),
  attention_score           DECIMAL(5, 2),
  baseline_conversion_rate  DECIMAL(5, 4),
  UNIQUE (zone_id, bucket)
);

CREATE INDEX idx_store_conv_zone_bucket ON store_conversion_snapshots(zone_id, bucket DESC);

-- ============================================================
-- MODULE 9: SECURITY & ALERTS
-- ============================================================

CREATE TABLE alert_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  alert_type  alert_type NOT NULL,
  camera_ids  UUID[],
  zone_ids    UUID[],
  parameters  JSONB DEFAULT '{}'::jsonb,
  severity    severity_level NOT NULL DEFAULT 'medium',
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN alert_rules.parameters IS 'Ngưỡng cụ thể: {"min_seconds":30, "min_persons":5}';

-- ----

CREATE TABLE security_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id          UUID REFERENCES alert_rules(id),
  alert_type       alert_type NOT NULL,
  severity         severity_level NOT NULL,
  camera_id        UUID NOT NULL REFERENCES cameras(id),
  zone_id          UUID REFERENCES zones(id),
  snapshot_url     TEXT,
  ai_confidence    DECIMAL(4, 3),
  meta             JSONB DEFAULT '{}'::jsonb,
  response_state   alert_response_state NOT NULL DEFAULT 'new',
  acknowledged_by  UUID REFERENCES users(id),
  acknowledged_at  TIMESTAMPTZ,
  incident_id      UUID,  -- FK added after incidents table
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_state ON security_alerts(response_state) WHERE response_state = 'new';
CREATE INDEX idx_alerts_triggered ON security_alerts(triggered_at DESC);
CREATE INDEX idx_alerts_severity ON security_alerts(severity, triggered_at DESC);
CREATE INDEX idx_alerts_camera ON security_alerts(camera_id, triggered_at DESC);

-- ----

CREATE TABLE alert_escalation_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id          UUID NOT NULL REFERENCES security_alerts(id),
  escalated_to      UUID REFERENCES users(id),
  escalation_level  SMALLINT NOT NULL,
  method            VARCHAR(30),
  escalated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MODULE 10: INCIDENT MANAGEMENT
-- ============================================================

CREATE TABLE incidents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code  VARCHAR(50) UNIQUE,
  source_alert_id UUID REFERENCES security_alerts(id),
  incident_type  incident_type NOT NULL,
  severity       severity_level NOT NULL,
  status         incident_status NOT NULL DEFAULT 'new',
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  camera_id      UUID REFERENCES cameras(id),
  zone_id        UUID REFERENCES zones(id),
  assignee_id    UUID REFERENCES users(id),
  assigned_by    UUID REFERENCES users(id),
  resolution     TEXT,
  resolved_at    TIMESTAMPTZ,
  closed_at      TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_assignee ON incidents(assignee_id) WHERE status != 'closed';
CREATE INDEX idx_incidents_severity ON incidents(severity, created_at DESC);

-- Add FK back to security_alerts
ALTER TABLE security_alerts ADD CONSTRAINT fk_alert_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(id);

-- ----

CREATE TABLE incident_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES incidents(id),
  from_status  incident_status,
  to_status    incident_status NOT NULL,
  note         TEXT,
  changed_by   UUID NOT NULL REFERENCES users(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inc_status_hist_incident ON incident_status_history(incident_id);

-- ----

CREATE TABLE incident_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES incidents(id),
  content      TEXT NOT NULL,
  is_internal  BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inc_notes_incident ON incident_notes(incident_id);

-- ----

CREATE TABLE incident_attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id      UUID NOT NULL REFERENCES incidents(id),
  attachment_type  attachment_type NOT NULL,
  file_url         TEXT NOT NULL,
  file_name        VARCHAR(255),
  file_size_bytes  BIGINT,
  camera_id        UUID REFERENCES cameras(id),
  clip_start_at    TIMESTAMPTZ,
  clip_end_at      TIMESTAMPTZ,
  uploaded_by      UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inc_attach_incident ON incident_attachments(incident_id);

-- ============================================================
-- MODULE 11: VIDEO STORAGE & PLAYBACK
-- ============================================================

CREATE TABLE video_recordings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id              UUID NOT NULL REFERENCES cameras(id),
  storage_path           TEXT NOT NULL,
  start_at               TIMESTAMPTZ NOT NULL,
  end_at                 TIMESTAMPTZ NOT NULL,
  duration_seconds       INTEGER,
  file_size_bytes        BIGINT,
  codec                  VARCHAR(20),
  resolution             VARCHAR(20),
  has_motion             BOOLEAN NOT NULL DEFAULT false,
  ai_event_tags          TEXT[] DEFAULT '{}',
  is_incident_protected  BOOLEAN NOT NULL DEFAULT false,
  expires_at             TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_rec_camera_time ON video_recordings(camera_id, start_at DESC, end_at DESC);
CREATE INDEX idx_video_rec_expires ON video_recordings(expires_at) WHERE is_incident_protected = false;
CREATE INDEX idx_video_rec_protected ON video_recordings(is_incident_protected, expires_at);

COMMENT ON TABLE video_recordings IS 'Metadata video. File thực tế ở object storage. Normal: 30 ngày. Incident: 90 ngày.';

-- ----

CREATE TABLE video_export_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by   UUID NOT NULL REFERENCES users(id),
  camera_id      UUID REFERENCES cameras(id),
  recording_id   UUID REFERENCES video_recordings(id),
  clip_start_at  TIMESTAMPTZ NOT NULL,
  clip_end_at    TIMESTAMPTZ NOT NULL,
  export_url     TEXT,
  incident_id    UUID REFERENCES incidents(id),
  reason         TEXT,
  expires_at     TIMESTAMPTZ,
  downloaded_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_export_user ON video_export_logs(requested_by);
CREATE INDEX idx_video_export_created ON video_export_logs(created_at DESC);

COMMENT ON TABLE video_export_logs IS 'Audit mọi thao tác export/download video';

-- ============================================================
-- MODULE 12: WATCHLIST
-- ============================================================

CREATE TABLE watchlist_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(50) UNIQUE,
  label                VARCHAR(255) NOT NULL,
  reason               TEXT NOT NULL,
  priority             watchlist_priority NOT NULL DEFAULT 'normal',
  similarity_threshold DECIMAL(4, 3) NOT NULL DEFAULT 0.85,
  status               watchlist_status NOT NULL DEFAULT 'active',
  expires_at           TIMESTAMPTZ,
  last_detected_at     TIMESTAMPTZ,
  detection_count      INTEGER NOT NULL DEFAULT 0,
  created_by           UUID NOT NULL REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlist_status ON watchlist_entries(status) WHERE status = 'active';
CREATE INDEX idx_watchlist_expires ON watchlist_entries(expires_at) WHERE status = 'active';

COMMENT ON TABLE watchlist_entries IS 'Tách biệt hoàn toàn khỏi customer profile. Quyền tạo/xem phải hạn chế.';

-- ----

CREATE TABLE watchlist_face_refs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_entry_id   UUID NOT NULL REFERENCES watchlist_entries(id) ON DELETE CASCADE,
  image_url            TEXT NOT NULL,
  embedding            vector(512),
  model_version        VARCHAR(50),
  quality_score        DECIMAL(4, 3),
  is_primary           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlist_face_entry ON watchlist_face_refs(watchlist_entry_id);
CREATE INDEX idx_watchlist_face_hnsw ON watchlist_face_refs
  USING hnsw (embedding vector_cosine_ops);

-- ----

CREATE TABLE watchlist_matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_entry_id    UUID NOT NULL REFERENCES watchlist_entries(id),
  camera_id             UUID NOT NULL REFERENCES cameras(id),
  zone_id               UUID REFERENCES zones(id),
  similarity_score      DECIMAL(4, 3) NOT NULL,
  snapshot_url          TEXT,
  comparison_image_url  TEXT,
  alert_sent            BOOLEAN NOT NULL DEFAULT false,
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by           UUID REFERENCES users(id),
  review_result         VARCHAR(20) CHECK (review_result IN ('confirmed', 'false_positive')),
  reviewed_at           TIMESTAMPTZ
);

CREATE INDEX idx_watchlist_match_entry ON watchlist_matches(watchlist_entry_id, detected_at DESC);
CREATE INDEX idx_watchlist_match_unreviewed ON watchlist_matches(detected_at DESC) WHERE reviewed_by IS NULL;

-- ============================================================
-- MODULE 13: PARKING & LPR
-- ============================================================

CREATE TABLE parking_floors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  floor_level  SMALLINT NOT NULL,
  total_slots  INTEGER NOT NULL,
  floorplan_id UUID REFERENCES floorplans(id)
);

-- ----

CREATE TABLE parking_slots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id          UUID NOT NULL REFERENCES parking_floors(id),
  slot_code         VARCHAR(50) NOT NULL UNIQUE,
  slot_type         slot_type NOT NULL DEFAULT 'standard',
  camera_id         UUID REFERENCES cameras(id),
  sensor_id         VARCHAR(100),
  x_coord           DECIMAL(8, 4),
  y_coord           DECIMAL(8, 4),
  status            slot_status NOT NULL DEFAULT 'available',
  status_updated_at TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_parking_slot_floor ON parking_slots(floor_id);
CREATE INDEX idx_parking_slot_status ON parking_slots(status) WHERE is_active = true;

-- ----

CREATE TABLE lpr_events (
  id                       BIGSERIAL PRIMARY KEY,
  camera_id                UUID NOT NULL REFERENCES cameras(id),
  gate_id                  UUID REFERENCES gates(id),
  plate_number_raw         VARCHAR(20) NOT NULL,
  plate_number_normalized  VARCHAR(20),
  plate_number_corrected   VARCHAR(20),
  direction                vehicle_direction,
  vehicle_type             vehicle_type,
  vehicle_snapshot_url     TEXT,
  ocr_confidence           DECIMAL(4, 3),
  is_in_whitelist          BOOLEAN NOT NULL DEFAULT false,
  is_in_blacklist          BOOLEAN NOT NULL DEFAULT false,
  detected_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lpr_plate ON lpr_events(plate_number_normalized, detected_at DESC);
CREATE INDEX idx_lpr_gate_time ON lpr_events(gate_id, detected_at DESC);
CREATE INDEX idx_lpr_blacklist ON lpr_events(is_in_blacklist, detected_at DESC) WHERE is_in_blacklist = true;

-- ----

CREATE TABLE parking_events (
  id            BIGSERIAL PRIMARY KEY,
  slot_id       UUID NOT NULL REFERENCES parking_slots(id),
  event_type    slot_status NOT NULL,
  lpr_event_id  BIGINT REFERENCES lpr_events(id),
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parking_event_slot ON parking_events(slot_id, detected_at DESC);

-- ----

CREATE TABLE lpr_plate_corrections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lpr_event_id      BIGINT NOT NULL REFERENCES lpr_events(id),
  old_plate         VARCHAR(20) NOT NULL,
  new_plate         VARCHAR(20) NOT NULL,
  correction_reason TEXT,
  corrected_by      UUID NOT NULL REFERENCES users(id),
  corrected_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE lpr_plate_corrections IS 'Audit trail sửa tay biển số - bắt buộc theo spec';

-- ----

CREATE TABLE vehicle_violations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lpr_event_id       BIGINT REFERENCES lpr_events(id),
  camera_id          UUID REFERENCES cameras(id),
  violation_type     violation_type NOT NULL,
  evidence_image_url TEXT,
  plate_number       VARCHAR(20),
  status             violation_status NOT NULL DEFAULT 'open',
  detected_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_violations_status ON vehicle_violations(status) WHERE status = 'open';
CREATE INDEX idx_violations_time ON vehicle_violations(detected_at DESC);

-- ----

CREATE TABLE vehicle_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number VARCHAR(20) NOT NULL,
  list_type    vehicle_list_type NOT NULL,
  reason       TEXT,
  expires_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plate_number, list_type)
);

CREATE INDEX idx_vehicle_lists_plate ON vehicle_lists(plate_number, list_type);

-- ============================================================
-- MODULE 14: REPORTS & SCHEDULER
-- ============================================================

CREATE TABLE report_templates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(50) NOT NULL UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  allowed_roles        TEXT[] NOT NULL DEFAULT '{}',
  supported_formats    TEXT[] NOT NULL DEFAULT '{"pdf","excel","csv"}',
  default_time_range   report_time_range,
  is_active            BOOLEAN NOT NULL DEFAULT true
);

-- Seed default templates
INSERT INTO report_templates (code, name, description, allowed_roles, default_time_range) VALUES
  ('FOOTFALL_DAILY',    'Báo cáo lưu lượng khách ngày',    NULL, '{"director","operations","marketing"}', 'daily'),
  ('FOOTFALL_WEEKLY',   'Báo cáo lưu lượng khách tuần',   NULL, '{"director","operations","marketing"}', 'weekly'),
  ('FOOTFALL_MONTHLY',  'Báo cáo lưu lượng khách tháng',  NULL, '{"director","operations","marketing"}', 'monthly'),
  ('SECURITY_WEEKLY',   'Báo cáo an ninh tuần',            NULL, '{"director","security"}',               'weekly'),
  ('INCIDENT_MONTHLY',  'Báo cáo sự cố tháng',             NULL, '{"director","security","it_admin"}',   'monthly'),
  ('PARKING_DAILY',     'Báo cáo bãi xe ngày',             NULL, '{"director","parking","operations"}',  'daily'),
  ('DEMOGRAPHICS_MONTHLY', 'Báo cáo nhân khẩu học tháng', NULL, '{"director","marketing"}',             'monthly');

-- ----

CREATE TABLE report_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES report_templates(id),
  name              VARCHAR(255) NOT NULL,
  created_by        UUID NOT NULL REFERENCES users(id),
  schedule_cron     VARCHAR(100),
  time_range_type   report_time_range,
  format            report_format NOT NULL,
  recipients        TEXT[] NOT NULL DEFAULT '{}',
  parameters        JSONB DEFAULT '{}'::jsonb,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  next_run_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_jobs_next_run ON report_jobs(next_run_at) WHERE is_active = true;

-- ----

CREATE TABLE report_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID NOT NULL REFERENCES report_jobs(id),
  status           report_run_status NOT NULL DEFAULT 'pending',
  file_url         TEXT,
  file_size_bytes  BIGINT,
  error_message    TEXT,
  retry_count      SMALLINT NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_runs_job ON report_runs(job_id, created_at DESC);
CREATE INDEX idx_report_runs_status ON report_runs(status) WHERE status IN ('pending', 'running');

-- ============================================================
-- MODULE 15: INTEGRATION & OPEN API
-- ============================================================

CREATE TABLE api_clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  client_id             VARCHAR(100) NOT NULL UNIQUE,
  client_secret_hash    TEXT NOT NULL,
  allowed_scopes        TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_by            UUID REFERENCES users(id),
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN api_clients.allowed_scopes IS 'Ví dụ: ["footfall:read","incidents:read","watchlist:write"]';

-- ----

CREATE TABLE api_request_logs (
  id                    BIGSERIAL PRIMARY KEY,
  client_id             UUID REFERENCES api_clients(id),
  endpoint              VARCHAR(255) NOT NULL,
  method                VARCHAR(10) NOT NULL,
  status_code           SMALLINT,
  request_size_bytes    INTEGER,
  response_time_ms      INTEGER,
  ip_address            INET,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_req_client ON api_request_logs(client_id, created_at DESC);
CREATE INDEX idx_api_req_time ON api_request_logs(created_at DESC);

COMMENT ON TABLE api_request_logs IS 'Partition theo ngày. Giữ 30 ngày.';

-- ----

CREATE TABLE webhook_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID REFERENCES api_clients(id),
  name              VARCHAR(255) NOT NULL,
  url               TEXT NOT NULL,
  secret            TEXT,
  events            TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN webhook_configs.events IS 'Ví dụ: ["alert.created","incident.closed","watchlist.match"]';

-- ----

CREATE TABLE erp_sync_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type          erp_sync_type NOT NULL,
  status             erp_sync_status NOT NULL DEFAULT 'pending',
  records_processed  INTEGER NOT NULL DEFAULT 0,
  error_message      TEXT,
  retry_count        SMALLINT NOT NULL DEFAULT 0,
  started_at         TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_erp_sync_status ON erp_sync_jobs(status, created_at DESC);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cameras_updated_at
  BEFORE UPDATE ON cameras
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_watchlist_updated_at
  BEFORE UPDATE ON watchlist_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: Default Admin User (CHANGE PASSWORD IMMEDIATELY)
-- ============================================================

INSERT INTO users (email, password_hash, full_name, role, mfa_enabled, is_active)
VALUES (
  'admin@smartmall.local',
  -- bcrypt hash of 'Admin@123456' — change immediately after first login
  '$2b$10$rQnm8jzXfxUxWoYE7A3xF.qnmGHQQbCcJd9DcCKc.Qr8LPmJZ6MFO',
  'System Administrator',
  'super_admin',
  false,
  true
);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Total tables: 51
-- Modules: 15
-- High-volume tables (need partition in production):
--   footfall_raw_events, tracking_events, demographic_detections,
--   camera_health_logs, audit_logs, api_request_logs, lpr_events,
--   parking_events, dwell_events, zone_transitions
-- ============================================================
