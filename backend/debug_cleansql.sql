CREATE TABLE users (
  id ENUM('UUID') PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  mfa_enabled BOOLEAN NOT NULL,
  mfa_secret TEXT,
  is_active BOOLEAN NOT NULL,
  last_login_at TIMESTAMP,
  password_changed_at TIMESTAMP,
  created_by ENUM('UUID'),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP
);

CREATE TABLE user_sessions (
  id ENUM('UUID') PRIMARY KEY,
  user_id ENUM('UUID') NOT NULL,
  refresh_token_hash TEXT,
  ip_address VARCHAR(64),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id ENUM('UUID'),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(64),
  user_agent TEXT,
  meta TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE camera_groups (
  id ENUM('UUID') PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  floor_level SMALLINT,
  description TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE cameras (
  id ENUM('UUID') PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  group_id ENUM('UUID'),
  rtsp_url TEXT,
  hls_url TEXT,
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  ip_address VARCHAR(64),
  mac_address VARCHAR(32),
  location_description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  resolution VARCHAR(20),
  fps SMALLINT,
  ai_features TEXT,
  status VARCHAR(30) NOT NULL,
  is_sensitive_area BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL,
  last_heartbeat_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE camera_health_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id ENUM('UUID') NOT NULL,
  status VARCHAR(30) NOT NULL,
  latency_ms INTEGER,
  error_code VARCHAR(50),
  error_message TEXT,
  checked_at TIMESTAMP NOT NULL
);

CREATE TABLE floorplans (
  id ENUM('UUID') PRIMARY KEY,
  floor_level SMALLINT NOT NULL,
  version INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  image_url TEXT,
  width_px INTEGER,
  height_px INTEGER,
  is_active BOOLEAN NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
UNIQUE (floor_level, version)
);

CREATE TABLE zones (
  id ENUM('UUID') PRIMARY KEY,
  floorplan_id ENUM('UUID') NOT NULL,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  zone_type VARCHAR(30) NOT NULL,
  polygon_coords TEXT,
  area_sqm DECIMAL(10, 2),
  tenant_name VARCHAR(255),
  store_category VARCHAR(100),
  is_dwell_zone BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE zone_configs (
  id ENUM('UUID') PRIMARY KEY,
  zone_id ENUM('UUID') NOT NULL,
  day_of_week TEXT,
  hour_from SMALLINT,
  hour_to SMALLINT,
  dwell_threshold_seconds INTEGER NOT NULL,
  max_capacity INTEGER,
  crowd_warning_pct SMALLINT NOT NULL,
  crowd_critical_pct SMALLINT NOT NULL,
  created_at TIMESTAMP NOT NULL,
CONSTRAINT chk_hour_range CHECK (hour_from >= 0 AND hour_to <= 23 AND hour_from < hour_to),
CONSTRAINT chk_pct_range CHECK (crowd_warning_pct < crowd_critical_pct)
);

CREATE TABLE gates (
  id ENUM('UUID') PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  camera_id ENUM('UUID'),
  zone_id ENUM('UUID'),
  gate_type VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE gate_thresholds (
  id ENUM('UUID') PRIMARY KEY,
  gate_id ENUM('UUID') NOT NULL,
  day_of_week SMALLINT,
  people_per_minute_warning INTEGER NOT NULL,
  people_per_minute_alert INTEGER NOT NULL,
  people_per_minute_critical INTEGER NOT NULL,
CONSTRAINT chk_threshold_order CHECK (
    people_per_minute_warning < people_per_minute_alert
    AND people_per_minute_alert < people_per_minute_critical
  )
);

CREATE TABLE footfall_raw_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id ENUM('UUID') NOT NULL,
  gate_id ENUM('UUID'),
  direction VARCHAR(10) NOT NULL,
  track_id VARCHAR(100),
  confidence DECIMAL(4, 3),
  is_staff BOOLEAN NOT NULL,
  detected_at TIMESTAMP NOT NULL
);

CREATE TABLE footfall_minutely (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  gate_id ENUM('UUID') NOT NULL,
  bucket TIMESTAMP NOT NULL,
  in_count INTEGER NOT NULL,
  out_count INTEGER NOT NULL,
  running_count INTEGER,
  density_level VARCHAR(30),
UNIQUE (gate_id, bucket)
);

CREATE TABLE footfall_hourly (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  gate_id ENUM('UUID') NOT NULL,
  bucket TIMESTAMP NOT NULL,
  in_count INTEGER NOT NULL,
  out_count INTEGER NOT NULL,
  peak_running_count INTEGER,
  avg_people_per_minute DECIMAL(8, 2),
UNIQUE (gate_id, bucket)
);

CREATE TABLE footfall_forecasts (
  id ENUM('UUID') PRIMARY KEY,
  gate_id ENUM('UUID'),
  forecast_date DATE NOT NULL,
  forecast_hour SMALLINT NOT NULL,
  predicted_in_count INTEGER,
  predicted_peak INTEGER,
  confidence_low INTEGER,
  confidence_high INTEGER,
  model_version VARCHAR(50),
  generated_at TIMESTAMP NOT NULL,
UNIQUE (gate_id, forecast_date, forecast_hour)
);

CREATE TABLE consent_records (
  id ENUM('UUID') PRIMARY KEY,
  customer_id ENUM('UUID'),
  consent_method VARCHAR(30) NOT NULL,
  consent_text_version VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  consented_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoke_reason TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE customers (
  id ENUM('UUID') PRIMARY KEY,
  consent_id ENUM('UUID') NOT NULL UNIQUE,
  customer_code VARCHAR(50) UNIQUE,
  segment VARCHAR(20) NOT NULL,
  total_visits INTEGER NOT NULL,
  first_visit_at TIMESTAMP,
  last_visit_at TIMESTAMP,
  favorite_gate_id ENUM('UUID'),
  favorite_time_slot SMALLINT,
  avg_stay_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP
);

CREATE TABLE face_embeddings (
  id ENUM('UUID') PRIMARY KEY,
  customer_id ENUM('UUID') NOT NULL,
  embedding TEXT,
  model_version VARCHAR(50) NOT NULL,
  quality_score DECIMAL(4, 3),
  is_primary BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE customer_visits (
  id ENUM('UUID') PRIMARY KEY,
  customer_id ENUM('UUID') NOT NULL,
  entry_gate_id ENUM('UUID'),
  exit_gate_id ENUM('UUID'),
  entry_camera_id ENUM('UUID'),
  entered_at TIMESTAMP NOT NULL,
  exited_at TIMESTAMP,
  stay_duration_minutes INTEGER,
  zones_visited TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE demographic_detections (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id ENUM('UUID') NOT NULL,
  zone_id ENUM('UUID'),
  age_group VARCHAR(20) NOT NULL,
  gender_estimate VARCHAR(20),
  group_type VARCHAR(30) NOT NULL,
  group_size SMALLINT NOT NULL,
  confidence DECIMAL(4, 3),
  detected_at TIMESTAMP NOT NULL
);

CREATE TABLE demographic_aggregates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id ENUM('UUID'),
  bucket TIMESTAMP NOT NULL,
  age_group VARCHAR(20) NOT NULL,
  gender_estimate VARCHAR(20) NOT NULL,
  group_type VARCHAR(30) NOT NULL,
  sample_count INTEGER NOT NULL,
  avg_dwell_minutes DECIMAL(8, 2),
UNIQUE (zone_id, bucket, age_group, gender_estimate, group_type)
);

CREATE TABLE tracking_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id ENUM('UUID') NOT NULL,
  floorplan_id ENUM('UUID') NOT NULL,
  track_id VARCHAR(100) NOT NULL,
  x_coord DECIMAL(8, 4) NOT NULL,
  y_coord DECIMAL(8, 4) NOT NULL,
  zone_id ENUM('UUID'),
  tracked_at TIMESTAMP NOT NULL
);

CREATE TABLE dwell_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id ENUM('UUID') NOT NULL,
  camera_id ENUM('UUID'),
  track_id VARCHAR(100),
  entered_at TIMESTAMP NOT NULL,
  exited_at TIMESTAMP,
  dwell_seconds INTEGER,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE heatmap_snapshots (
  id ENUM('UUID') PRIMARY KEY,
  floorplan_id ENUM('UUID') NOT NULL,
  snapshot_type VARCHAR(20) NOT NULL,
  bucket_start TIMESTAMP NOT NULL,
  bucket_end TIMESTAMP NOT NULL,
  image_url TEXT,
  density_matrix TEXT,
  max_density DECIMAL(8, 4),
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE journey_sessions (
  id ENUM('UUID') PRIMARY KEY,
  floorplan_id ENUM('UUID'),
  track_id VARCHAR(100) NOT NULL,
  entry_zone_id ENUM('UUID'),
  exit_zone_id ENUM('UUID'),
  zone_sequence TEXT,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  total_minutes INTEGER
);

CREATE TABLE zone_transitions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  journey_session_id ENUM('UUID'),
  from_zone_id ENUM('UUID') NOT NULL,
  to_zone_id ENUM('UUID') NOT NULL,
  transitioned_at TIMESTAMP NOT NULL
);

CREATE TABLE store_conversion_snapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id ENUM('UUID') NOT NULL,
  bucket TIMESTAMP NOT NULL,
  passerby_count INTEGER NOT NULL,
  entry_count INTEGER NOT NULL,
  conversion_rate DECIMAL(5, 4),
  attention_score DECIMAL(5, 2),
  baseline_conversion_rate DECIMAL(5, 4),
UNIQUE (zone_id, bucket)
);

CREATE TABLE alert_rules (
  id ENUM('UUID') PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  alert_type VARCHAR(30) NOT NULL,
  camera_ids TEXT,
  zone_ids TEXT,
  parameters TEXT,
  severity VARCHAR(20) NOT NULL,
  cooldown_seconds INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE security_alerts (
  id ENUM('UUID') PRIMARY KEY,
  rule_id ENUM('UUID'),
  alert_type VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  camera_id ENUM('UUID') NOT NULL,
  zone_id ENUM('UUID'),
  snapshot_url TEXT,
  ai_confidence DECIMAL(4, 3),
  meta TEXT,
  response_state VARCHAR(30) NOT NULL,
  acknowledged_by ENUM('UUID'),
  acknowledged_at TIMESTAMP,
  incident_id ENUM('UUID'),
  triggered_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE alert_escalation_logs (
  id ENUM('UUID') PRIMARY KEY,
  alert_id ENUM('UUID') NOT NULL,
  escalated_to ENUM('UUID'),
  escalation_level SMALLINT NOT NULL,
  method VARCHAR(30),
  escalated_at TIMESTAMP NOT NULL
);

CREATE TABLE incidents (
  id ENUM('UUID') PRIMARY KEY,
  incident_code VARCHAR(50) UNIQUE,
  source_alert_id ENUM('UUID'),
  incident_type VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  camera_id ENUM('UUID'),
  zone_id ENUM('UUID'),
  assignee_id ENUM('UUID'),
  assigned_by ENUM('UUID'),
  resolution TEXT,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_by ENUM('UUID'),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE incident_status_history (
  id ENUM('UUID') PRIMARY KEY,
  incident_id ENUM('UUID') NOT NULL,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  note TEXT,
  changed_by ENUM('UUID') NOT NULL,
  changed_at TIMESTAMP NOT NULL
);

CREATE TABLE incident_notes (
  id ENUM('UUID') PRIMARY KEY,
  incident_id ENUM('UUID') NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL,
  created_by ENUM('UUID') NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE incident_attachments (
  id ENUM('UUID') PRIMARY KEY,
  incident_id ENUM('UUID') NOT NULL,
  attachment_type VARCHAR(20) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size_bytes BIGINT,
  camera_id ENUM('UUID'),
  clip_start_at TIMESTAMP,
  clip_end_at TIMESTAMP,
  uploaded_by ENUM('UUID') NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE video_recordings (
  id ENUM('UUID') PRIMARY KEY,
  camera_id ENUM('UUID') NOT NULL,
  storage_path TEXT NOT NULL,
  playback_url TEXT,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  codec VARCHAR(20),
  resolution VARCHAR(20),
  has_motion BOOLEAN NOT NULL,
  ai_event_tags TEXT,
  is_incident_protected BOOLEAN NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE video_export_logs (
  id ENUM('UUID') PRIMARY KEY,
  requested_by ENUM('UUID') NOT NULL,
  camera_id ENUM('UUID'),
  recording_id ENUM('UUID'),
  clip_start_at TIMESTAMP NOT NULL,
  clip_end_at TIMESTAMP NOT NULL,
  export_url TEXT,
  incident_id ENUM('UUID'),
  reason TEXT,
  expires_at TIMESTAMP,
  downloaded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE watchlist_entries (
  id ENUM('UUID') PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  label VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  similarity_threshold DECIMAL(4, 3) NOT NULL,
  status VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP,
  last_detected_at TIMESTAMP,
  detection_count INTEGER NOT NULL,
  created_by ENUM('UUID') NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE watchlist_face_refs (
  id ENUM('UUID') PRIMARY KEY,
  watchlist_entry_id ENUM('UUID') NOT NULL,
  image_url TEXT NOT NULL,
  embedding TEXT,
  model_version VARCHAR(50),
  quality_score DECIMAL(4, 3),
  is_primary BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE watchlist_matches (
  id ENUM('UUID') PRIMARY KEY,
  watchlist_entry_id ENUM('UUID') NOT NULL,
  camera_id ENUM('UUID') NOT NULL,
  zone_id ENUM('UUID'),
  similarity_score DECIMAL(4, 3) NOT NULL,
  snapshot_url TEXT,
  comparison_image_url TEXT,
  alert_sent BOOLEAN NOT NULL,
  detected_at TIMESTAMP NOT NULL,
  reviewed_by ENUM('UUID'),
  review_result VARCHAR(20)),
  reviewed_at TIMESTAMP
);

CREATE TABLE parking_floors (
  id ENUM('UUID') PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  floor_level SMALLINT NOT NULL,
  total_slots INTEGER NOT NULL,
  floorplan_id ENUM('UUID')
);

CREATE TABLE parking_slots (
  id ENUM('UUID') PRIMARY KEY,
  floor_id ENUM('UUID') NOT NULL,
  slot_code VARCHAR(50) NOT NULL UNIQUE,
  slot_type VARCHAR(20) NOT NULL,
  camera_id ENUM('UUID'),
  sensor_id VARCHAR(100),
  x_coord DECIMAL(8, 4),
  y_coord DECIMAL(8, 4),
  status VARCHAR(20) NOT NULL,
  status_updated_at TIMESTAMP,
  is_active BOOLEAN NOT NULL
);

CREATE TABLE lpr_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  camera_id ENUM('UUID') NOT NULL,
  gate_id ENUM('UUID'),
  plate_number_raw VARCHAR(20) NOT NULL,
  plate_number_normalized VARCHAR(20),
  plate_number_corrected VARCHAR(20),
  direction VARCHAR(20),
  vehicle_type VARCHAR(20),
  vehicle_snapshot_url TEXT,
  ocr_confidence DECIMAL(4, 3),
  is_in_whitelist BOOLEAN NOT NULL,
  is_in_blacklist BOOLEAN NOT NULL,
  detected_at TIMESTAMP NOT NULL
);

CREATE TABLE parking_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  slot_id ENUM('UUID') NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  lpr_event_id BIGINT,
  detected_at TIMESTAMP NOT NULL
);

CREATE TABLE lpr_plate_corrections (
  id ENUM('UUID') PRIMARY KEY,
  lpr_event_id BIGINT NOT NULL,
  old_plate VARCHAR(20) NOT NULL,
  new_plate VARCHAR(20) NOT NULL,
  correction_reason TEXT,
  corrected_by ENUM('UUID') NOT NULL,
  corrected_at TIMESTAMP NOT NULL
);

CREATE TABLE vehicle_violations (
  id ENUM('UUID') PRIMARY KEY,
  lpr_event_id BIGINT,
  camera_id ENUM('UUID'),
  violation_type VARCHAR(40) NOT NULL,
  evidence_image_url TEXT,
  plate_number VARCHAR(20),
  status VARCHAR(20) NOT NULL,
  detected_at TIMESTAMP NOT NULL
);

CREATE TABLE vehicle_lists (
  id ENUM('UUID') PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL,
  list_type VARCHAR(20) NOT NULL,
  reason TEXT,
  expires_at TIMESTAMP,
  created_by ENUM('UUID'),
  created_at TIMESTAMP NOT NULL,
UNIQUE (plate_number, list_type)
);

CREATE TABLE report_templates (
  id ENUM('UUID') PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  allowed_roles TEXT NOT NULL,
  supported_formats TEXT NOT NULL,
  default_time_range VARCHAR(20),
  is_active BOOLEAN NOT NULL
);

CREATE TABLE report_jobs (
  id ENUM('UUID') PRIMARY KEY,
  template_id ENUM('UUID') NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_by ENUM('UUID') NOT NULL,
  schedule_cron VARCHAR(100),
  time_range_type VARCHAR(20),
  format VARCHAR(20) NOT NULL,
  recipients TEXT NOT NULL,
  parameters TEXT,
  is_active BOOLEAN NOT NULL,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE report_runs (
  id ENUM('UUID') PRIMARY KEY,
  job_id ENUM('UUID') NOT NULL,
  status VARCHAR(20) NOT NULL,
  file_url TEXT,
  file_size_bytes BIGINT,
  error_message TEXT,
  retry_count SMALLINT NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE api_clients (
  id ENUM('UUID') PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  client_id VARCHAR(100) NOT NULL UNIQUE,
  client_secret_hash TEXT NOT NULL,
  allowed_scopes TEXT NOT NULL,
  rate_limit_per_minute INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_by ENUM('UUID'),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE api_request_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_id ENUM('UUID'),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code SMALLINT,
  request_size_bytes INTEGER,
  response_time_ms INTEGER,
  ip_address VARCHAR(64),
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE webhook_configs (
  id ENUM('UUID') PRIMARY KEY,
  client_id ENUM('UUID'),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT NOT NULL,
  is_active BOOLEAN NOT NULL,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE erp_sync_jobs (
  id ENUM('UUID') PRIMARY KEY,
  sync_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_processed INTEGER NOT NULL,
  error_message TEXT,
  retry_count SMALLINT NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);





ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE user_sessions ADD CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE cameras ADD CONSTRAINT fk_cameras_group_id FOREIGN KEY (group_id) REFERENCES camera_groups(id);
ALTER TABLE camera_health_logs ADD CONSTRAINT fk_camera_health_logs_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE zones ADD CONSTRAINT fk_zones_floorplan_id FOREIGN KEY (floorplan_id) REFERENCES floorplans(id);
ALTER TABLE zone_configs ADD CONSTRAINT fk_zone_configs_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE gates ADD CONSTRAINT fk_gates_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE gates ADD CONSTRAINT fk_gates_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE gate_thresholds ADD CONSTRAINT fk_gate_thresholds_gate_id FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE footfall_raw_events ADD CONSTRAINT fk_footfall_raw_events_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE footfall_raw_events ADD CONSTRAINT fk_footfall_raw_events_gate_id FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE footfall_minutely ADD CONSTRAINT fk_footfall_minutely_gate_id FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE footfall_hourly ADD CONSTRAINT fk_footfall_hourly_gate_id FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE footfall_forecasts ADD CONSTRAINT fk_footfall_forecasts_gate_id FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE customers ADD CONSTRAINT fk_customers_consent_id FOREIGN KEY (consent_id) REFERENCES consent_records(id);
ALTER TABLE customers ADD CONSTRAINT fk_customers_favorite_gate_id FOREIGN KEY (favorite_gate_id) REFERENCES gates(id);
ALTER TABLE face_embeddings ADD CONSTRAINT fk_face_embeddings_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customer_visits ADD CONSTRAINT fk_customer_visits_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE customer_visits ADD CONSTRAINT fk_customer_visits_entry_gate_id FOREIGN KEY (entry_gate_id) REFERENCES gates(id);
ALTER TABLE customer_visits ADD CONSTRAINT fk_customer_visits_exit_gate_id FOREIGN KEY (exit_gate_id) REFERENCES gates(id);
ALTER TABLE customer_visits ADD CONSTRAINT fk_customer_visits_entry_camera_id FOREIGN KEY (entry_camera_id) REFERENCES cameras(id);
ALTER TABLE demographic_detections ADD CONSTRAINT fk_demographic_detections_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE demographic_detections ADD CONSTRAINT fk_demographic_detections_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE demographic_aggregates ADD CONSTRAINT fk_demographic_aggregates_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE tracking_events ADD CONSTRAINT fk_tracking_events_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE tracking_events ADD CONSTRAINT fk_tracking_events_floorplan_id FOREIGN KEY (floorplan_id) REFERENCES floorplans(id);
ALTER TABLE tracking_events ADD CONSTRAINT fk_tracking_events_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE dwell_events ADD CONSTRAINT fk_dwell_events_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE dwell_events ADD CONSTRAINT fk_dwell_events_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE heatmap_snapshots ADD CONSTRAINT fk_heatmap_snapshots_floorplan_id FOREIGN KEY (floorplan_id) REFERENCES floorplans(id);
ALTER TABLE journey_sessions ADD CONSTRAINT fk_journey_sessions_floorplan_id FOREIGN KEY (floorplan_id) REFERENCES floorplans(id);
ALTER TABLE journey_sessions ADD CONSTRAINT fk_journey_sessions_entry_zone_id FOREIGN KEY (entry_zone_id) REFERENCES zones(id);
ALTER TABLE journey_sessions ADD CONSTRAINT fk_journey_sessions_exit_zone_id FOREIGN KEY (exit_zone_id) REFERENCES zones(id);
ALTER TABLE zone_transitions ADD CONSTRAINT fk_zone_transitions_journey_session_id FOREIGN KEY (journey_session_id) REFERENCES journey_sessions(id);
ALTER TABLE zone_transitions ADD CONSTRAINT fk_zone_transitions_from_zone_id FOREIGN KEY (from_zone_id) REFERENCES zones(id);
ALTER TABLE zone_transitions ADD CONSTRAINT fk_zone_transitions_to_zone_id FOREIGN KEY (to_zone_id) REFERENCES zones(id);
ALTER TABLE store_conversion_snapshots ADD CONSTRAINT fk_store_conversion_snapshots_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE security_alerts ADD CONSTRAINT fk_security_alerts_rule_id FOREIGN KEY (rule_id) REFERENCES alert_rules(id);
ALTER TABLE security_alerts ADD CONSTRAINT fk_security_alerts_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE security_alerts ADD CONSTRAINT fk_security_alerts_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE security_alerts ADD CONSTRAINT fk_security_alerts_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES users(id);
ALTER TABLE alert_escalation_logs ADD CONSTRAINT fk_alert_escalation_logs_alert_id FOREIGN KEY (alert_id) REFERENCES security_alerts(id);
ALTER TABLE alert_escalation_logs ADD CONSTRAINT fk_alert_escalation_logs_escalated_to FOREIGN KEY (escalated_to) REFERENCES users(id);
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_source_alert_id FOREIGN KEY (source_alert_id) REFERENCES security_alerts(id);
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_assignee_id FOREIGN KEY (assignee_id) REFERENCES users(id);
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id);
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE incident_status_history ADD CONSTRAINT fk_incident_status_history_incident_id FOREIGN KEY (incident_id) REFERENCES incidents(id);
ALTER TABLE incident_status_history ADD CONSTRAINT fk_incident_status_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id);
ALTER TABLE incident_notes ADD CONSTRAINT fk_incident_notes_incident_id FOREIGN KEY (incident_id) REFERENCES incidents(id);
ALTER TABLE incident_notes ADD CONSTRAINT fk_incident_notes_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE incident_attachments ADD CONSTRAINT fk_incident_attachments_incident_id FOREIGN KEY (incident_id) REFERENCES incidents(id);
ALTER TABLE incident_attachments ADD CONSTRAINT fk_incident_attachments_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE incident_attachments ADD CONSTRAINT fk_incident_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE video_recordings ADD CONSTRAINT fk_video_recordings_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE video_export_logs ADD CONSTRAINT fk_video_export_logs_requested_by FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE video_export_logs ADD CONSTRAINT fk_video_export_logs_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE video_export_logs ADD CONSTRAINT fk_video_export_logs_recording_id FOREIGN KEY (recording_id) REFERENCES video_recordings(id);
ALTER TABLE video_export_logs ADD CONSTRAINT fk_video_export_logs_incident_id FOREIGN KEY (incident_id) REFERENCES incidents(id);
ALTER TABLE watchlist_entries ADD CONSTRAINT fk_watchlist_entries_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE watchlist_face_refs ADD CONSTRAINT fk_watchlist_face_refs_watchlist_entry_id FOREIGN KEY (watchlist_entry_id) REFERENCES watchlist_entries(id);
ALTER TABLE watchlist_matches ADD CONSTRAINT fk_watchlist_matches_watchlist_entry_id FOREIGN KEY (watchlist_entry_id) REFERENCES watchlist_entries(id);
ALTER TABLE watchlist_matches ADD CONSTRAINT fk_watchlist_matches_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE watchlist_matches ADD CONSTRAINT fk_watchlist_matches_zone_id FOREIGN KEY (zone_id) REFERENCES zones(id);
ALTER TABLE watchlist_matches ADD CONSTRAINT fk_watchlist_matches_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE parking_floors ADD CONSTRAINT fk_parking_floors_floorplan_id FOREIGN KEY (floorplan_id) REFERENCES floorplans(id);
ALTER TABLE parking_slots ADD CONSTRAINT fk_parking_slots_floor_id FOREIGN KEY (floor_id) REFERENCES parking_floors(id);
ALTER TABLE parking_slots ADD CONSTRAINT fk_parking_slots_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE lpr_events ADD CONSTRAINT fk_lpr_events_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE lpr_events ADD CONSTRAINT fk_lpr_events_gate_id FOREIGN KEY (gate_id) REFERENCES gates(id);
ALTER TABLE parking_events ADD CONSTRAINT fk_parking_events_slot_id FOREIGN KEY (slot_id) REFERENCES parking_slots(id);
ALTER TABLE parking_events ADD CONSTRAINT fk_parking_events_lpr_event_id FOREIGN KEY (lpr_event_id) REFERENCES lpr_events(id);
ALTER TABLE lpr_plate_corrections ADD CONSTRAINT fk_lpr_plate_corrections_lpr_event_id FOREIGN KEY (lpr_event_id) REFERENCES lpr_events(id);
ALTER TABLE lpr_plate_corrections ADD CONSTRAINT fk_lpr_plate_corrections_corrected_by FOREIGN KEY (corrected_by) REFERENCES users(id);
ALTER TABLE vehicle_violations ADD CONSTRAINT fk_vehicle_violations_lpr_event_id FOREIGN KEY (lpr_event_id) REFERENCES lpr_events(id);
ALTER TABLE vehicle_violations ADD CONSTRAINT fk_vehicle_violations_camera_id FOREIGN KEY (camera_id) REFERENCES cameras(id);
ALTER TABLE vehicle_lists ADD CONSTRAINT fk_vehicle_lists_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE report_jobs ADD CONSTRAINT fk_report_jobs_template_id FOREIGN KEY (template_id) REFERENCES report_templates(id);
ALTER TABLE report_jobs ADD CONSTRAINT fk_report_jobs_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE report_runs ADD CONSTRAINT fk_report_runs_job_id FOREIGN KEY (job_id) REFERENCES report_jobs(id);
ALTER TABLE api_clients ADD CONSTRAINT fk_api_clients_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE api_request_logs ADD CONSTRAINT fk_api_request_logs_client_id FOREIGN KEY (client_id) REFERENCES api_clients(id);
ALTER TABLE webhook_configs ADD CONSTRAINT fk_webhook_configs_client_id FOREIGN KEY (client_id) REFERENCES api_clients(id);
