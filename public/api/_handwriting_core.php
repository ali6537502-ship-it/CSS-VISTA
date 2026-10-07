<?php
declare(strict_types=1);
require_once __DIR__.'/_learning_core.php';
function cssv_handwriting_number(string $key,int $default,int $min,int $max): int {
 $v=cssv_env($key,(string)$default);return is_string($v) && preg_match('/^(?:0|[1-9][0-9]*)$/D',$v) && (int)$v>=$min && (int)$v<=$max ? (int)$v : 0;
}
function cssv_handwriting_configuration(): array {
 $retention=cssv_handwriting_number('CSSV_HANDWRITING_RETENTION_SECONDS',0,0,86400);
 $policy=cssv_env('CSSV_HANDWRITING_POLICY_VERSION','');$notice=cssv_env('CSSV_HANDWRITING_PROCESSING_NOTICE','');
 $limits=['max_bytes'=>cssv_handwriting_number('CSSV_HANDWRITING_MAX_BYTES',5242880,1024,5242880),'max_edge'=>cssv_handwriting_number('CSSV_HANDWRITING_MAX_EDGE',4096,320,4096),'max_pixels'=>cssv_handwriting_number('CSSV_HANDWRITING_MAX_PIXELS',12000000,102400,12000000),'max_words'=>cssv_handwriting_number('CSSV_HANDWRITING_MAX_WORDS',450,20,450),'max_characters'=>6000,'retention_seconds'=>$retention];
 $gd=function_exists('imagecreatefromstring') && function_exists('imagejpeg') && function_exists('exif_read_data');
 if($gd){$formats=gd_info();$gd=($formats['JPEG Support']??false) && ($formats['PNG Support']??false) && ($formats['WebP Support']??false) && class_exists('finfo');}
 $base=cssv_env('CSSV_PRIVATE_STORAGE_DIR');$private=$base?realpath($base):false;$storage=$private && is_dir($private) && is_writable($private);
 foreach(array_filter([realpath(dirname(__DIR__)),realpath((string)($_SERVER['DOCUMENT_ROOT']??''))]) as $root)if($private===$root || str_starts_with((string)$private,$root.DIRECTORY_SEPARATOR))$storage=false;
 $ready=cssv_env('CSSV_HANDWRITING_ENABLED','0')==='1' && cssv_env('CSSV_AI_VISION_VERIFIED','0')==='1' && cssv_env('CSSV_HANDWRITING_CLEANUP_VERIFIED','0')==='1' && in_array($retention,[3600,86400],true) && is_string($policy) && preg_match('/^[A-Za-z0-9._-]{1,80}$/D',$policy) && is_string($notice) && mb_strlen($notice)>=30 && mb_strlen($notice)<=3000 && $gd && $storage && function_exists('curl_init') && cssv_ai_configuration()['configured'] && in_array(cssv_ai_limit('handwriting'),[3,5],true) && cssv_ai_limit('handwriting_extract')===2*cssv_ai_limit('handwriting') && !in_array(0,$limits,true);
 return ['enabled'=>(bool)$ready,'policy_version'=>$ready?$policy:null,'processing_notice'=>$ready?$notice:null,'limits'=>$limits];
}
function cssv_handwriting_text(mixed $text): string {
 $text=cssv_learning_string($text,6000,'one paragraph');$max=cssv_handwriting_number('CSSV_HANDWRITING_MAX_WORDS',450,20,450);
 if($max===0 || cssv_learning_words($text)>$max || preg_match('/\n\s*\n/u',$text))throw new InvalidArgumentException('Use one paragraph of no more than '.$max.' words.');return $text;
}
function cssv_handwriting_extraction_result(array $data): array {
 cssv_pro_fields($data,['readable','text','uncertain','reason']);
 if(!is_bool($data['readable']??null) || !is_bool($data['uncertain']??null) || !is_string($data['text']??null))throw new InvalidArgumentException('Invalid extraction result.');
 $reason=cssv_learning_string($data['reason']??null,500,'reading note',true);
 $text=$data['readable'] ? cssv_handwriting_text($data['text']) : '';
 if(!$data['readable'] && trim($data['text'])!=='')throw new InvalidArgumentException('Unreadable content must not invent a transcription.');
 return ['readable'=>$data['readable'],'text'=>$text,'uncertain'=>$data['uncertain'],'reason'=>$reason];
}
/** Header/MIME bounds precede full decode. Re-encoding removes metadata/trailing payloads. */
function cssv_handwriting_decode(string $path): array {
 $config=cssv_handwriting_configuration()['limits'];$size=filesize($path);$info=@getimagesize($path);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($path);
 if(!$size || $config['max_bytes']===0 || $size>$config['max_bytes'] || !is_array($info) || !in_array($mime,['image/jpeg','image/png','image/webp'],true) || ($info['mime']??'')!==$mime)throw new InvalidArgumentException('Choose a valid JPG, PNG or WebP image within the displayed size limit.');
 $width=(int)$info[0];$height=(int)$info[1];
 if($width<320 || $height<320 || $width>$config['max_edge'] || $height>$config['max_edge'] || $width*$height>$config['max_pixels'])throw new InvalidArgumentException('Use a clear page image between 320 and '.$config['max_edge'].' pixels per edge and within the displayed pixel limit.');
 if(!function_exists('imagecreatefromstring'))throw new LogicException('Handwriting image processing is unavailable.');
 // Refuse decoding that would exceed the actual PHP memory budget.
 $memory=ini_get('memory_limit');$budget=(int)$memory;if(preg_match('/^([0-9]+)([KMG])$/i',(string)$memory,$m))$budget=(int)$m[1]*(1024**(array_search(strtoupper($m[2]),['K','M','G'],true)+1));
 if($budget>0 && memory_get_usage(true)+$size*3+$width*$height*12+33554432>$budget)throw new InvalidArgumentException('Choose a smaller image so this page can be processed safely.');
 $source=@imagecreatefromstring((string)file_get_contents($path));if(!$source)throw new InvalidArgumentException('This image could not be decoded. Choose a new page image.');
 $orientation=1;if($mime==='image/jpeg' && function_exists('exif_read_data')){$exif=@exif_read_data($path,'IFD0',true,false);$orientation=is_array($exif)?(int)($exif['IFD0']['Orientation']??1):1;}
 if(in_array($orientation,[2,5,7],true))imageflip($source,IMG_FLIP_HORIZONTAL);elseif($orientation===4)imageflip($source,IMG_FLIP_VERTICAL);
 $angle=match($orientation){3=>180,5,8=>90,6,7=>-90,default=>0};if($angle!==0){$rotated=imagerotate($source,$angle,0);if(!$rotated){imagedestroy($source);throw new InvalidArgumentException('Choose a new page image.');}imagedestroy($source);$source=$rotated;$width=imagesx($source);$height=imagesy($source);}
 $canvas=imagecreatetruecolor($width,$height);if(!$canvas){imagedestroy($source);throw new RuntimeException('image_decode_unavailable');}
 imagefill($canvas,0,0,imagecolorallocate($canvas,255,255,255));imagecopy($canvas,$source,0,0,0,0,$width,$height);imagedestroy($source);
 ob_start();try{if(!imagejpeg($canvas,null,90))throw new RuntimeException('image_encode_failed');$bytes=ob_get_contents();}finally{ob_end_clean();imagedestroy($canvas);}
 if(!is_string($bytes) || strlen($bytes)>$config['max_bytes'])throw new InvalidArgumentException('The processed image is too large. Choose a smaller clear image.');
 return ['bytes'=>$bytes,'sha256'=>hash('sha256',$bytes),'source_hash'=>hash_file('sha256',$path),'width'=>$width,'height'=>$height];
}
