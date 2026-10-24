<?php
declare(strict_types=1);
/** The trusted operator installs an approved dossier privately; this API cannot create one. */
function cssv_topic_review_check(array $manifest,string $version,string $hash,string $today): array {
    $fields=['version_id','content_hash','status','author_ref','reviewer_ref','independent_approval_ref','approval_evidence_sha256','source_review_ref','assessment_review_ref','coverage_ref','owner_authorization_ref','valid_until'];
    cssv_pro_fields($manifest,$fields);
    foreach($fields as $field)if(!is_string($manifest[$field]??null)||trim($manifest[$field])===''||strlen($manifest[$field])>500)throw new InvalidArgumentException('The private review dossier is incomplete.');
    if($manifest['status']!=='approved'||$manifest['version_id']!==$version||!hash_equals($hash,$manifest['content_hash']))throw new DomainException('The review dossier does not approve this exact edition and content hash.');
    if($manifest['author_ref']===$manifest['reviewer_ref'])throw new DomainException('Independent academic approval must be separate from author self-review.');
    if(!preg_match('/^[a-f0-9]{64}$/D',$manifest['approval_evidence_sha256']))throw new InvalidArgumentException('Retain the exact independent approval evidence hash.');
    if(!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$manifest['valid_until'])||!checkdate((int)substr($manifest['valid_until'],5,2),(int)substr($manifest['valid_until'],8,2),(int)substr($manifest['valid_until'],0,4))||$manifest['valid_until']<$today)throw new DomainException('The academic review is stale. Review freshness before publication.');
    return $manifest;
}
function cssv_topic_review_load(mixed $id,string $version,string $hash): array {
    if(!is_string($id)||!preg_match('/^[a-f0-9]{64}$/D',$id))throw new InvalidArgumentException('Choose the hash of an independently approved private review dossier.');
    $root=cssv_env('CSSV_PRIVATE_STORAGE_DIR','');
    if(!is_string($root)||$root===''||!is_dir($root))throw new LogicException('Private review storage is unavailable.');
    $path=rtrim($root,'/').'/topic-reviews/'.$id.'.json';
    if(!is_file($path)||is_link($path)||filesize($path)>16000)throw new InvalidArgumentException('The approved private review dossier is unavailable.');
    $raw=file_get_contents($path);
    if(!is_string($raw)||!hash_equals($id,hash('sha256',$raw)))throw new DomainException('The review dossier changed. Retain and review its exact artifact.');
    $manifest=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
    if(!is_array($manifest))throw new InvalidArgumentException('The review dossier is invalid.');
    return cssv_topic_review_check($manifest,$version,$hash,cssv_topic_today());
}
