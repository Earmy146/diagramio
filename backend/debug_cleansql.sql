






















































































CREATE TABLE users (
  id                   ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  email                VARCHAR(255) NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,
  full_name            VARCHAR(255) NOT NULL,
  role                 ENUM('user_role') NOT NULL,
  phone                VARCHAR(20),
  avatar_url           TEXT,
  mfa_enabled          BOOLEAN NOT NULL DEFAULT false,
  mfa_secret           TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  last_login_at        TIMESTAMP,
  password_changed_at  TIMESTAMP,
  created_by           ENUM('UUID') REFERENCES users(id),
  created_at           TIMESTAMP NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMP
);










CREATE TABLE user_sessions (
  id                  ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             ENUM('UUID') NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT,
  ip_address          ENUM('INET'),
  user_agent          TEXT,
  expires_at          TIMESTAMP NOT NULL,
  revoked_at          TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT now()
);






CREATE TABLE audit_logs (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id        ENUM('UUID') REFERENCES users(id),
  action         VARCHAR(100) NOT NULL,
  resource_type  VARCHAR(100),
  resource_id    TEXT,
  old_value      JSON,
  new_value      JSON,
  ip_address     ENUM('INET'),
  user_agent     TEXT,
  meta           JSON,
  created_at     TIMESTAMP NOT NULL DEFAULT now()
);












CREATE TABLE camera_groups (
  id           ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  floor_level  SMALLINT,
  description  TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE cameras (
  id                    ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_code           VARCHAR(50) NOT NULL UNIQUE,
  name                  VARCHAR(255) NOT NULL,
  group_id              ENUM('UUID') REFERENCES camera_groups(id),
  
  rtsp_url              TEXT,
  hls_url               TEXT,
  manufacturer          VARCHAR(100),
  model                 VARCHAR(100),
  ip_address            ENUM('INET'),
  mac_address           ENUM('MACADDR'),
  location_description  TEXT,
  latitude              DECIMAL(10, 7),
  longitude             DECIMAL(10, 7),
  resolution            VARCHAR(20),
  fps                   SMALLINT,
  ai_features           JSON DEFAULT '[]',
  status                ENUM('camera_status') NOT NULL DEFAULT 'online',
  is_sensitive_area     BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat_at     TIMESTAMP,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);









CREATE TABLE camera_health_logs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id     ENUM('UUID') NOT NULL REFERENCES cameras(id),
  status        ENUM('camera_status') NOT NULL,
  latency_ms    INTEGER,
  error_code    VARCHAR(50),
  error_message TEXT,
  checked_at    TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE floorplans (
  id          ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_level SMALLINT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  name        VARCHAR(100) NOT NULL,
  image_url   TEXT,
  width_px    INTEGER,
  height_px   INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  valid_from  TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (floor_level, version)
);





CREATE TABLE zones (
  id              ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id    ENUM('UUID') NOT NULL REFERENCES floorplans(id),
  code            VARCHAR(50) UNIQUE,
  name            VARCHAR(255) NOT NULL,
  ENUM('zone_type')       ENUM('zone_type') NOT NULL,
  polygon_coords  JSON,
  area_sqm        DECIMAL(10, 2),
  tenant_name     VARCHAR(255),
  store_category  VARCHAR(100),
  is_dwell_zone   BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE zone_configs (
  id                        ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id                   ENUM('UUID') NOT NULL REFERENCES zones(id),
  day_of_week               SMALLINT[],
  hour_from                 SMALLINT,
  hour_to                   SMALLINT,
  dwell_threshold_seconds   INTEGER NOT NULL DEFAULT 30,
  max_capacity              INTEGER,
  crowd_warning_pct         SMALLINT NOT NULL DEFAULT 70,
  crowd_critical_pct        SMALLINT NOT NULL DEFAULT 90,
  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT chk_hour_range CHECK (hour_from >= 0 AND hour_to <= 23 AND hour_from < hour_to),
  CONSTRAINT chk_pct_range CHECK (crowd_warning_pct < crowd_critical_pct)
);


ALTER TABLE cameras ADD COLUMN zone_id ENUM('UUID') REFERENCES zones(id);





CREATE TABLE gates (
  id          ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  camera_id   ENUM('UUID') REFERENCES cameras(id),
  zone_id     ENUM('UUID') REFERENCES zones(id),
  ENUM('gate_type')   ENUM('gate_type') NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE gate_thresholds (
  id                            ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id                       ENUM('UUID') NOT NULL REFERENCES gates(id),
  day_of_week                   SMALLINT,
  people_per_minute_warning     INTEGER NOT NULL,
  people_per_minute_alert       INTEGER NOT NULL,
  people_per_minute_critical    INTEGER NOT NULL,
  CONSTRAINT chk_threshold_order CHECK (
    people_per_minute_warning < people_per_minute_alert
    AND people_per_minute_alert < people_per_minute_critical
  )
);




CREATE TABLE footfall_raw_events (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id    ENUM('UUID') NOT NULL REFERENCES cameras(id),
  gate_id      ENUM('UUID') REFERENCES gates(id),
  direction    ENUM('footfall_direction') NOT NULL,
  track_id     VARCHAR(100),
  confidence   DECIMAL(4, 3),
  is_staff     BOOLEAN NOT NULL DEFAULT false,
  detected_at  TIMESTAMP NOT NULL
);








CREATE TABLE footfall_minutely (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  gate_id        ENUM('UUID') NOT NULL REFERENCES gates(id),
  bucket         TIMESTAMP NOT NULL,
  in_count       INTEGER NOT NULL DEFAULT 0,
  out_count      INTEGER NOT NULL DEFAULT 0,
  running_count  INTEGER,
  ENUM('density_level')  ENUM('density_level'),
  UNIQUE (gate_id, bucket)
);







CREATE TABLE footfall_hourly (
  id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
  gate_id                ENUM('UUID') NOT NULL REFERENCES gates(id),
  bucket                 TIMESTAMP NOT NULL,
  in_count               INTEGER NOT NULL DEFAULT 0,
  out_count              INTEGER NOT NULL DEFAULT 0,
  peak_running_count     INTEGER,
  avg_people_per_minute  DECIMAL(8, 2),
  UNIQUE (gate_id, bucket)
);





CREATE TABLE footfall_forecasts (
  id                  ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id             ENUM('UUID') REFERENCES gates(id),
  forecast_date       DATE NOT NULL,
  forecast_hour       SMALLINT NOT NULL CHECK (forecast_hour >= 0 AND forecast_hour <= 23),
  predicted_in_count  INTEGER,
  predicted_peak      INTEGER,
  confidence_low      INTEGER,
  confidence_high     INTEGER,
  model_version       VARCHAR(50),
  generated_at        TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (gate_id, forecast_date, forecast_hour)
);





CREATE TABLE consent_records (
  id                    ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           ENUM('UUID'),  
  ENUM('consent_method')        ENUM('consent_method') NOT NULL,
  consent_text_version  VARCHAR(20) NOT NULL,
  status                ENUM('consent_status') NOT NULL DEFAULT 'active',
  consented_at          TIMESTAMP NOT NULL,
  expires_at            TIMESTAMP,
  revoked_at            TIMESTAMP,
  revoke_reason         TEXT,
  ip_address            ENUM('INET'),
  created_at            TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE customers (
  id                        ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id                ENUM('UUID') NOT NULL UNIQUE REFERENCES consent_records(id),
  customer_code             VARCHAR(50) UNIQUE,
  segment                   ENUM('customer_segment') NOT NULL DEFAULT 'new',
  total_visits              INTEGER NOT NULL DEFAULT 0,
  first_visit_at            TIMESTAMP,
  last_visit_at             TIMESTAMP,
  favorite_gate_id          ENUM('UUID') REFERENCES gates(id),
  favorite_time_slot        SMALLINT,
  avg_stay_duration_minutes INTEGER,
  notes                     TEXT,
  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMP
);





ALTER TABLE consent_records ADD CONSTRAINT fk_consent_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id);



CREATE TABLE face_embeddings (
  id            ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   ENUM('UUID') NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  embedding     ENUM('vector'),
  model_version VARCHAR(50) NOT NULL,
  quality_score DECIMAL(4, 3),
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);


CREATE INDEX idx_face_embedding_hnsw ON face_embeddings
  USING hnsw (embedding vector_cosine_ops);





CREATE TABLE customer_visits (
  id                    ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           ENUM('UUID') NOT NULL REFERENCES customers(id),
  entry_gate_id         ENUM('UUID') REFERENCES gates(id),
  exit_gate_id          ENUM('UUID') REFERENCES gates(id),
  entry_camera_id       ENUM('UUID') REFERENCES cameras(id),
  entered_at            TIMESTAMP NOT NULL,
  exited_at             TIMESTAMP,
  stay_duration_minutes INTEGER,
  zones_visited         ENUM('UUID')[],
  created_at            TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE demographic_detections (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id        ENUM('UUID') NOT NULL REFERENCES cameras(id),
  zone_id          ENUM('UUID') REFERENCES zones(id),
  ENUM('age_group')        ENUM('age_group') NOT NULL,
  ENUM('gender_estimate')  ENUM('gender_estimate'),
  ENUM('group_type')       ENUM('group_type') NOT NULL,
  group_size       SMALLINT NOT NULL DEFAULT 1,
  confidence       DECIMAL(4, 3),
  detected_at      TIMESTAMP NOT NULL
);








CREATE TABLE demographic_aggregates (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id          ENUM('UUID') REFERENCES zones(id),
  bucket           TIMESTAMP NOT NULL,
  ENUM('age_group')        ENUM('age_group') NOT NULL,
  ENUM('gender_estimate')  ENUM('gender_estimate') NOT NULL,
  ENUM('group_type')       ENUM('group_type') NOT NULL,
  sample_count     INTEGER NOT NULL DEFAULT 0,
  avg_dwell_minutes DECIMAL(8, 2),
  UNIQUE (zone_id, bucket, ENUM('age_group'), ENUM('gender_estimate'), ENUM('group_type'))
);







CREATE TABLE tracking_events (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id    ENUM('UUID') NOT NULL REFERENCES cameras(id),
  floorplan_id ENUM('UUID') NOT NULL REFERENCES floorplans(id),
  track_id     VARCHAR(100) NOT NULL,
  x_coord      DECIMAL(8, 4) NOT NULL,
  y_coord      DECIMAL(8, 4) NOT NULL,
  zone_id      ENUM('UUID') REFERENCES zones(id),
  tracked_at   TIMESTAMP NOT NULL
);








CREATE TABLE dwell_events (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id       ENUM('UUID') NOT NULL REFERENCES zones(id),
  camera_id     ENUM('UUID') REFERENCES cameras(id),
  track_id      VARCHAR(100),
  entered_at    TIMESTAMP NOT NULL,
  exited_at     TIMESTAMP,
  dwell_seconds INTEGER,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE heatmap_snapshots (
  id               ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id     ENUM('UUID') NOT NULL REFERENCES floorplans(id),
  snapshot_type    ENUM('heatmap_snapshot_type') NOT NULL,
  bucket_start     TIMESTAMP NOT NULL,
  bucket_end       TIMESTAMP NOT NULL,
  image_url        TEXT,
  density_matrix   JSON,
  max_density      DECIMAL(8, 4),
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);







CREATE TABLE journey_sessions (
  id             ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id   ENUM('UUID') REFERENCES floorplans(id),
  track_id       VARCHAR(100) NOT NULL,
  entry_zone_id  ENUM('UUID') REFERENCES zones(id),
  exit_zone_id   ENUM('UUID') REFERENCES zones(id),
  zone_sequence  ENUM('UUID')[],
  started_at     TIMESTAMP NOT NULL,
  ended_at       TIMESTAMP,
  total_minutes  INTEGER
);






CREATE TABLE zone_transitions (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  journey_session_id  ENUM('UUID') REFERENCES journey_sessions(id),
  from_zone_id        ENUM('UUID') NOT NULL REFERENCES zones(id),
  to_zone_id          ENUM('UUID') NOT NULL REFERENCES zones(id),
  transitioned_at     TIMESTAMP NOT NULL
);








CREATE TABLE store_conversion_snapshots (
  id                        BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id                   ENUM('UUID') NOT NULL REFERENCES zones(id),
  bucket                    TIMESTAMP NOT NULL,
  passerby_count            INTEGER NOT NULL DEFAULT 0,
  entry_count               INTEGER NOT NULL DEFAULT 0,
  conversion_rate           DECIMAL(5, 4),
  attention_score           DECIMAL(5, 2),
  baseline_conversion_rate  DECIMAL(5, 4),
  UNIQUE (zone_id, bucket)
);







CREATE TABLE alert_rules (
  id          ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  ENUM('alert_type')  ENUM('alert_type') NOT NULL,
  camera_ids  ENUM('UUID')[],
  zone_ids    ENUM('UUID')[],
  parameters  JSON DEFAULT '{}',
  severity    ENUM('severity_level') NOT NULL DEFAULT 'medium',
  cooldown_seconds INTEGER NOT NULL DEFAULT 60,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE security_alerts (
  id               ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id          ENUM('UUID') REFERENCES alert_rules(id),
  ENUM('alert_type')       ENUM('alert_type') NOT NULL,
  severity         ENUM('severity_level') NOT NULL,
  camera_id        ENUM('UUID') NOT NULL REFERENCES cameras(id),
  zone_id          ENUM('UUID') REFERENCES zones(id),
  snapshot_url     TEXT,
  ai_confidence    DECIMAL(4, 3),
  meta             JSON DEFAULT '{}',
  response_state   ENUM('alert_response_state') NOT NULL DEFAULT 'new',
  acknowledged_by  ENUM('UUID') REFERENCES users(id),
  acknowledged_at  TIMESTAMP,
  incident_id      ENUM('UUID'),  
  triggered_at     TIMESTAMP NOT NULL DEFAULT now(),
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE alert_escalation_logs (
  id                ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id          ENUM('UUID') NOT NULL REFERENCES security_alerts(id),
  escalated_to      ENUM('UUID') REFERENCES users(id),
  escalation_level  SMALLINT NOT NULL,
  method            VARCHAR(30),
  escalated_at      TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE incidents (
  id             ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_code  VARCHAR(50) UNIQUE,
  source_alert_id ENUM('UUID') REFERENCES security_alerts(id),
  ENUM('incident_type')  ENUM('incident_type') NOT NULL,
  severity       ENUM('severity_level') NOT NULL,
  status         ENUM('incident_status') NOT NULL DEFAULT 'new',
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  camera_id      ENUM('UUID') REFERENCES cameras(id),
  zone_id        ENUM('UUID') REFERENCES zones(id),
  assignee_id    ENUM('UUID') REFERENCES users(id),
  assigned_by    ENUM('UUID') REFERENCES users(id),
  resolution     TEXT,
  resolved_at    TIMESTAMP,
  closed_at      TIMESTAMP,
  created_by     ENUM('UUID') REFERENCES users(id),
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP NOT NULL DEFAULT now()
);






ALTER TABLE security_alerts ADD CONSTRAINT fk_alert_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(id);



CREATE TABLE incident_status_history (
  id           ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  ENUM('UUID') NOT NULL REFERENCES incidents(id),
  from_status  ENUM('incident_status'),
  to_status    ENUM('incident_status') NOT NULL,
  note         TEXT,
  changed_by   ENUM('UUID') NOT NULL REFERENCES users(id),
  changed_at   TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE incident_notes (
  id           ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  ENUM('UUID') NOT NULL REFERENCES incidents(id),
  content      TEXT NOT NULL,
  is_internal  BOOLEAN NOT NULL DEFAULT true,
  created_by   ENUM('UUID') NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE incident_attachments (
  id               ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id      ENUM('UUID') NOT NULL REFERENCES incidents(id),
  ENUM('attachment_type')  ENUM('attachment_type') NOT NULL,
  file_url         TEXT NOT NULL,
  file_name        VARCHAR(255),
  file_size_bytes  BIGINT,
  camera_id        ENUM('UUID') REFERENCES cameras(id),
  clip_start_at    TIMESTAMP,
  clip_end_at      TIMESTAMP,
  uploaded_by      ENUM('UUID') NOT NULL REFERENCES users(id),
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);







CREATE TABLE video_recordings (
  id                     ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id              ENUM('UUID') NOT NULL REFERENCES cameras(id),
  storage_path           TEXT NOT NULL,
  start_at               TIMESTAMP NOT NULL,
  end_at                 TIMESTAMP NOT NULL,
  duration_seconds       INTEGER,
  file_size_bytes        BIGINT,
  codec                  VARCHAR(20),
  resolution             VARCHAR(20),
  has_motion             BOOLEAN NOT NULL DEFAULT false,
  ai_event_tags          TEXT[] DEFAULT '{}',
  is_incident_protected  BOOLEAN NOT NULL DEFAULT false,
  expires_at             TIMESTAMP NOT NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT now()
);









CREATE TABLE video_export_logs (
  id             ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by   ENUM('UUID') NOT NULL REFERENCES users(id),
  camera_id      ENUM('UUID') REFERENCES cameras(id),
  recording_id   ENUM('UUID') REFERENCES video_recordings(id),
  clip_start_at  TIMESTAMP NOT NULL,
  clip_end_at    TIMESTAMP NOT NULL,
  export_url     TEXT,
  incident_id    ENUM('UUID') REFERENCES incidents(id),
  reason         TEXT,
  expires_at     TIMESTAMP,
  downloaded_at  TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT now()
);










CREATE TABLE watchlist_entries (
  id                   ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(50) UNIQUE,
  label                VARCHAR(255) NOT NULL,
  reason               TEXT NOT NULL,
  priority             ENUM('watchlist_priority') NOT NULL DEFAULT 'normal',
  similarity_threshold DECIMAL(4, 3) NOT NULL DEFAULT 0.85,
  status               ENUM('watchlist_status') NOT NULL DEFAULT 'active',
  expires_at           TIMESTAMP,
  last_detected_at     TIMESTAMP,
  detection_count      INTEGER NOT NULL DEFAULT 0,
  created_by           ENUM('UUID') NOT NULL REFERENCES users(id),
  created_at           TIMESTAMP NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE watchlist_face_refs (
  id                   ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_entry_id   ENUM('UUID') NOT NULL REFERENCES watchlist_entries(id) ON DELETE CASCADE,
  image_url            TEXT NOT NULL,
  embedding            ENUM('vector'),
  model_version        VARCHAR(50),
  quality_score        DECIMAL(4, 3),
  is_primary           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMP NOT NULL DEFAULT now()
);


CREATE INDEX idx_watchlist_face_hnsw ON watchlist_face_refs
  USING hnsw (embedding vector_cosine_ops);



CREATE TABLE watchlist_matches (
  id                    ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_entry_id    ENUM('UUID') NOT NULL REFERENCES watchlist_entries(id),
  camera_id             ENUM('UUID') NOT NULL REFERENCES cameras(id),
  zone_id               ENUM('UUID') REFERENCES zones(id),
  similarity_score      DECIMAL(4, 3) NOT NULL,
  snapshot_url          TEXT,
  comparison_image_url  TEXT,
  alert_sent            BOOLEAN NOT NULL DEFAULT false,
  detected_at           TIMESTAMP NOT NULL DEFAULT now(),
  reviewed_by           ENUM('UUID') REFERENCES users(id),
  review_result         VARCHAR(20) CHECK (review_result IN ('confirmed', 'false_positive')),
  reviewed_at           TIMESTAMP
);








CREATE TABLE parking_floors (
  id           ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  floor_level  SMALLINT NOT NULL,
  total_slots  INTEGER NOT NULL,
  floorplan_id ENUM('UUID') REFERENCES floorplans(id)
);



CREATE TABLE parking_slots (
  id                ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id          ENUM('UUID') NOT NULL REFERENCES parking_floors(id),
  slot_code         VARCHAR(50) NOT NULL UNIQUE,
  ENUM('slot_type')         ENUM('slot_type') NOT NULL DEFAULT 'standard',
  camera_id         ENUM('UUID') REFERENCES cameras(id),
  sensor_id         VARCHAR(100),
  x_coord           DECIMAL(8, 4),
  y_coord           DECIMAL(8, 4),
  status            ENUM('slot_status') NOT NULL DEFAULT 'available',
  status_updated_at TIMESTAMP,
  is_active         BOOLEAN NOT NULL DEFAULT true
);






CREATE TABLE lpr_events (
  id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id                ENUM('UUID') NOT NULL REFERENCES cameras(id),
  gate_id                  ENUM('UUID') REFERENCES gates(id),
  plate_number_raw         VARCHAR(20) NOT NULL,
  plate_number_normalized  VARCHAR(20),
  plate_number_corrected   VARCHAR(20),
  direction                ENUM('vehicle_direction'),
  ENUM('vehicle_type')             ENUM('vehicle_type'),
  vehicle_snapshot_url     TEXT,
  ocr_confidence           DECIMAL(4, 3),
  is_in_whitelist          BOOLEAN NOT NULL DEFAULT false,
  is_in_blacklist          BOOLEAN NOT NULL DEFAULT false,
  detected_at              TIMESTAMP NOT NULL DEFAULT now()
);







CREATE TABLE parking_events (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  slot_id       ENUM('UUID') NOT NULL REFERENCES parking_slots(id),
  event_type    ENUM('slot_status') NOT NULL,
  lpr_event_id  BIGINT REFERENCES lpr_events(id),
  detected_at   TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE lpr_plate_corrections (
  id                ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  lpr_event_id      BIGINT NOT NULL REFERENCES lpr_events(id),
  old_plate         VARCHAR(20) NOT NULL,
  new_plate         VARCHAR(20) NOT NULL,
  correction_reason TEXT,
  corrected_by      ENUM('UUID') NOT NULL REFERENCES users(id),
  corrected_at      TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE vehicle_violations (
  id                 ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  lpr_event_id       BIGINT REFERENCES lpr_events(id),
  camera_id          ENUM('UUID') REFERENCES cameras(id),
  ENUM('violation_type')     ENUM('violation_type') NOT NULL,
  evidence_image_url TEXT,
  plate_number       VARCHAR(20),
  status             ENUM('violation_status') NOT NULL DEFAULT 'open',
  detected_at        TIMESTAMP NOT NULL DEFAULT now()
);






CREATE TABLE vehicle_lists (
  id           ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number VARCHAR(20) NOT NULL,
  list_type    ENUM('vehicle_list_type') NOT NULL,
  reason       TEXT,
  expires_at   TIMESTAMP,
  created_by   ENUM('UUID') REFERENCES users(id),
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (plate_number, list_type)
);







CREATE TABLE report_templates (
  id                   ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(50) NOT NULL UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  allowed_roles        TEXT[] NOT NULL DEFAULT '{}',
  supported_formats    TEXT[] NOT NULL DEFAULT '{"pdf","excel","csv"}',
  default_time_range   ENUM('report_time_range'),
  is_active            BOOLEAN NOT NULL DEFAULT true
);






CREATE TABLE report_jobs (
  id                ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       ENUM('UUID') NOT NULL REFERENCES report_templates(id),
  name              VARCHAR(255) NOT NULL,
  created_by        ENUM('UUID') NOT NULL REFERENCES users(id),
  schedule_cron     VARCHAR(100),
  time_range_type   ENUM('report_time_range'),
  format            ENUM('report_format') NOT NULL,
  recipients        TEXT[] NOT NULL DEFAULT '{}',
  parameters        JSON DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  next_run_at       TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE report_runs (
  id               ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           ENUM('UUID') NOT NULL REFERENCES report_jobs(id),
  status           ENUM('report_run_status') NOT NULL DEFAULT 'pending',
  file_url         TEXT,
  file_size_bytes  BIGINT,
  error_message    TEXT,
  retry_count      SMALLINT NOT NULL DEFAULT 0,
  started_at       TIMESTAMP,
  completed_at     TIMESTAMP,
  sent_at          TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE api_clients (
  id                    ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  client_id             VARCHAR(100) NOT NULL UNIQUE,
  client_secret_hash    TEXT NOT NULL,
  allowed_scopes        TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_by            ENUM('UUID') REFERENCES users(id),
  expires_at            TIMESTAMP,
  created_at            TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE api_request_logs (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_id             ENUM('UUID') REFERENCES api_clients(id),
  endpoint              VARCHAR(255) NOT NULL,
  method                VARCHAR(10) NOT NULL,
  status_code           SMALLINT,
  request_size_bytes    INTEGER,
  response_time_ms      INTEGER,
  ip_address            ENUM('INET'),
  created_at            TIMESTAMP NOT NULL DEFAULT now()
);








CREATE TABLE webhook_configs (
  id                ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         ENUM('UUID') REFERENCES api_clients(id),
  name              VARCHAR(255) NOT NULL,
  url               TEXT NOT NULL,
  secret            TEXT,
  events            TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);





CREATE TABLE erp_sync_jobs (
  id                 ENUM('UUID') PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type          ENUM('erp_sync_type') NOT NULL,
  status             ENUM('erp_sync_status') NOT NULL DEFAULT 'pending',
  records_processed  INTEGER NOT NULL DEFAULT 0,
  error_message      TEXT,
  retry_count        SMALLINT NOT NULL DEFAULT 0,
  started_at         TIMESTAMP,
  completed_at       TIMESTAMP,
  created_at         TIMESTAMP NOT NULL DEFAULT now()
);





































