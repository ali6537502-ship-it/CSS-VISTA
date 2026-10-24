<?php
declare(strict_types=1);
require __DIR__.'/../../public/api/_pro_coupon_core.php';
require __DIR__.'/../../public/api/_pro_coupon_schema.php';
function check(bool $value,string $why): void {if(!$value)throw new RuntimeException($why);}
check(cssv_coupon_amount('percent',25,195000)===146250,'25 percent deterministic paisa');
check(cssv_coupon_amount('percent',33,1001)===671,'Fractional paisa discount rounds down');
check(cssv_coupon_amount('fixed',50000,195000)===145000,'Fixed PKR discount');
check(cssv_coupon_amount('complimentary',0,195000)===0,'Free access explicit');
foreach([['fixed',195000],['fixed',0],['percent',100],['percent',0],['complimentary',1],['other',1]]as [$kind,$value]){try{cssv_coupon_amount($kind,$value,195000);throw new RuntimeException('Invalid discount accepted');}catch(InvalidArgumentException){}}
check(cssv_coupon_code(' vista-0123456789abcdef ')==='VISTA-0123456789ABCDEF','Canonical code');
foreach(['abc',123,'VISTA-<script>-123456','VISTA-0123456789 ABCDEF']as $bad){try{cssv_coupon_code($bad);throw new RuntimeException('Invalid code accepted');}catch(InvalidArgumentException){}}
$sql=file_get_contents(__DIR__.'/../../server/sql/026_pro_coupons.sql');preg_match_all('/CREATE TABLE IF NOT EXISTS [\s\S]*?;/',$sql,$matches);check(array_map(fn($v)=>trim($v,"; \n\r"),$matches[0])===cssv_coupon_schema_statements(),'Migration parity');
echo "PASS: coupon integer pricing, normalization, invalid discounts and additive schema parity.\n";
