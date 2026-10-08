<?php
declare(strict_types=1);
function cssv_precis_feedback_schema_statements(): array {return [
 'CREATE TABLE IF NOT EXISTS precis_evaluations (
 operation_id CHAR(36) PRIMARY KEY, input JSON NOT NULL, input_hash CHAR(64) NOT NULL,
 CONSTRAINT precis_evaluation_operation_fk FOREIGN KEY(operation_id) REFERENCES ai_operations(id) ON DELETE RESTRICT
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
 ];}
