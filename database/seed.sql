OPEN SCHEMA RAAHI;
INSERT INTO TRAILS VALUES ('TRIUND','Triund Trek','Dharamkot, Himachal Pradesh',7.80,1050);
INSERT INTO TRAIL_SEGMENTS VALUES
  ('TRIUND_01','TRIUND',1,'Dharamkot to Gallu',55,FALSE),
  ('TRIUND_02','TRIUND',2,'Gallu to Magic View',70,FALSE),
  ('TRIUND_03','TRIUND',3,'Magic View to Forest Bend',65,FALSE),
  ('TRIUND_04','TRIUND',4,'Forest Bend to Ridge Crossing',75,FALSE),
  ('TRIUND_05','TRIUND',5,'Ridge Crossing to Triund',70,FALSE),
  ('TRIUND_FB','TRIUND',6,'Forest Bend fallback shelter',25,TRUE);
INSERT INTO DECISION_RULES VALUES
  ('PACE_LOW','PACE_RATIO','LT',0.75,'WARNING','Your pace is below 75% of the plan.',TRUE),
  ('DAYLIGHT_LOW','DAYLIGHT_BUFFER_MIN','LT',90,'CRITICAL','The daylight buffer before shelter is below 90 minutes.',TRUE),
  ('WEATHER_STALE','WEATHER_AGE_HOURS','GT',6,'WARNING','The weather snapshot is more than 6 hours old.',TRUE),
  ('BATTERY_LOW','BATTERY_PERCENT','LT',20,'WARNING','Battery is below 20%; preserve emergency access.',TRUE),
  ('EVIDENCE_LOW','EVIDENCE_CONFIDENCE','LT',50,'WARNING','Information for the segment ahead has low confidence.',TRUE),
  ('HAZARD_HIGH','HAZARD_POINTS','GTE',40,'CRITICAL','Significant disruption has been reported ahead.',TRUE);
INSERT INTO SEGMENT_VERIFICATIONS VALUES
  ('VER_01','TRIUND_01','GPS_CONFIRMED','CROSSED','2026-08-18 08:30:00'),
  ('VER_02','TRIUND_02','VERIFIED_GUIDE','CROSSED','2026-08-18 09:10:00'),
  ('VER_03','TRIUND_03','GPS_CONFIRMED','CROSSED','2026-08-17 11:20:00'),
  ('VER_04','TRIUND_04','GPS_CONFIRMED','CROSSED','2026-08-16 12:00:00');
INSERT INTO RESOURCE_POINTS VALUES
  ('RES_01','TRIUND','TRIUND_02','WATER','Gallu water point',32.2521000,76.3223000,'2026-08-18 09:00:00'),
  ('RES_02','TRIUND','TRIUND_FB','SHELTER','Forest Bend shelter',32.2489000,76.3381000,'2026-08-18 10:00:00');
