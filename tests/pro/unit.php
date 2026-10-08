<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_pro_core.php';
require __DIR__.'/../../public/api/_pro_schema.php';
function check(bool $ok,string $label): void { if (!$ok) throw new RuntimeException($label); }
$now=new DateTimeImmutable('2026-01-31T12:00:00Z');
$first=cssv_pro_period($now,null);
check($first['expires_at']==='2026-03-02 12:00:00.000000','Exact 30 days, not calendar month');
check(cssv_pro_period($now,'2026-02-20 12:00:00')['expires_at']==='2026-03-22 12:00:00.000000','Active renewal extends existing expiry');
check(cssv_pro_period($now,'2025-12-01')['starts_at']===$first['starts_at'],'Expired renewal starts at approval');
check(cssv_pro_status(null,$now)==='free','No membership is free');
check(cssv_pro_status(['expires_at'=>'2026-01-31 12:00:00'],$now)==='expired','Expiry boundary exclusive');
check(cssv_pro_status(['expires_at'=>'2026-01-31 12:00:00.000001'],$now)==='active','Microsecond precision');
check(cssv_pro_period(new DateTimeImmutable('2026-01-31T17:00:00+05:00'),null)===$first,'Pakistan time normalizes to UTC');
foreach (['https://evil.invalid','//evil.invalid','/grammar-course?redirect=evil','/account/admin','/grammar-course#x',null] as $bad) check(cssv_pro_destination($bad)==='/account/dashboard','Reject unsupported return destination');
check(cssv_pro_destination('/grammar-course')==='/grammar-course','Keep supported learning destination');
check(cssv_pro_destination('/account/precis')==='/account/precis','Keep the new private Précis destination');
check(cssv_pro_destination('/account/precis?redirect=evil')==='/account/dashboard','Do not widen the Précis return to arbitrary queries');
check(cssv_pro_transaction(' abc-123 ') === 'ABC-123','Transaction normalization');
foreach (['<script>',123,'abc',str_repeat('a',81)] as $bad) { try { cssv_pro_transaction($bad); throw new RuntimeException('Invalid transaction accepted'); } catch (InvalidArgumentException) {} }
try { cssv_pro_fields(['user_id'=>'evil'],['action']); throw new RuntimeException('Unexpected field accepted'); } catch (InvalidArgumentException) {}
$sql=file_get_contents(__DIR__.'/../../server/sql/012_pro_membership.sql');
preg_match_all('/CREATE TABLE IF NOT EXISTS [\s\S]*?;/',$sql,$matches);
check(array_map(fn($v)=>trim($v,"; \n\r"),$matches[0])===cssv_pro_schema_statements(),'SQL/PHP schema parity');
echo "PASS: duration, renewal, expiry, timezone, destination, input rules and schema parity.\n";
