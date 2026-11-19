<?php
declare(strict_types=1);

/**
 * Personal notes. Every query is scoped to the authenticated user.
 * Rich text is stored as untrusted data; clients MUST sanitize before display.
 * Notes can hold any number of pages. Each page has a bounded transfer size;
 * there is no total note/word limit in this data model.
 */
const CSSV_NOTES_PAGE_BYTES = 2097152;
const CSSV_NOTES_MAX_FOLDER_DEPTH = 5;

function cssv_notes_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) return;
    $existing = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('student_note_folders','student_notes','student_note_pages','student_note_revisions')");
    if ((int)$existing->fetchColumn() === 4) { $ready = true; return; }
    if ((int)$pdo->query("SELECT GET_LOCK('cssvista-notes-schema-v1', 5)")->fetchColumn() !== 1) {
        throw new RuntimeException('Notes database setup is busy.');
    }
    try {
        $statements = [
            "CREATE TABLE IF NOT EXISTS student_note_folders (
                id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, parent_id CHAR(36) NULL,
                name VARCHAR(180) NOT NULL, depth TINYINT UNSIGNED NOT NULL,
                deleted_at DATETIME(6) NULL,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY(id), KEY user_parent (user_id,parent_id,deleted_at),
                CONSTRAINT note_folders_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS student_notes (
                id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
                folder_id CHAR(36) NULL, title VARCHAR(255) NOT NULL DEFAULT 'Untitled note',
                pinned TINYINT(1) NOT NULL DEFAULT 0, deleted_at DATETIME(6) NULL,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY(id), KEY user_folder (user_id,folder_id,deleted_at),
                KEY user_recent (user_id,deleted_at,pinned,updated_at),
                CONSTRAINT notes_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS student_note_pages (
                id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, note_id CHAR(36) NOT NULL,
                position INT UNSIGNED NOT NULL, content_html LONGTEXT NOT NULL,
                version INT UNSIGNED NOT NULL DEFAULT 1, last_request_id CHAR(36) NULL,
                deleted_at DATETIME(6) NULL,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY(id), KEY note_pages_order (user_id,note_id,deleted_at,position),
                CONSTRAINT note_pages_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT note_pages_note_fk FOREIGN KEY(note_id) REFERENCES student_notes(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            "CREATE TABLE IF NOT EXISTS student_note_revisions (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, user_id CHAR(36) NOT NULL,
                page_id CHAR(36) NOT NULL, version INT UNSIGNED NOT NULL, content_html LONGTEXT NOT NULL,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY(id), UNIQUE KEY user_page_version (user_id,page_id,version),
                KEY revision_recent (user_id,page_id,created_at),
                CONSTRAINT note_revisions_owner_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT note_revisions_page_fk FOREIGN KEY(page_id) REFERENCES student_note_pages(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ];
        foreach ($statements as $sql) $pdo->exec($sql);
        $ready = true;
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('cssvista-notes-schema-v1')");
    }
}

function cssv_notes_id(mixed $value): string
{
    if (!is_string($value) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iD', $value)) {
        throw new InvalidArgumentException('A valid note or folder ID is required.');
    }
    return strtolower($value);
}

function cssv_notes_title(mixed $value, int $max = 255): string
{
    if (!is_string($value)) throw new InvalidArgumentException('Enter a valid title.');
    $title = trim(preg_replace('/\s+/u', ' ', preg_replace('/[\x00-\x1f\x7f]+/u', ' ', $value) ?? '') ?? '');
    if ($title === '' || mb_strlen($title) > $max) throw new InvalidArgumentException('Title is empty or too long.');
    return $title;
}

function cssv_notes_folders(PDO $pdo, string $user): array
{
    $q = $pdo->prepare('SELECT id,parent_id,name,depth,deleted_at,updated_at FROM student_note_folders WHERE user_id=? ORDER BY name,id');
    $q->execute([$user]);
    return $q->fetchAll();
}

/** Checks parent ancestry, cycles and maximum resulting depth, including descendants. */
function cssv_notes_move_depths(array $folders, ?string $moveId, ?string $parentId): array
{
    $byId = [];
    foreach ($folders as $f) $byId[(string)$f['id']] = $f;
    $depth = 0;
    $visited = [];
    $walk = $parentId;
    while ($walk !== null) {
        if (!isset($byId[$walk]) || $byId[$walk]['deleted_at'] !== null) throw new InvalidArgumentException('Choose an active folder in your account.');
        if (isset($visited[$walk]) || $walk === $moveId) throw new InvalidArgumentException('Folder cannot be placed inside itself.');
        $visited[$walk] = true;
        $depth++;
        if ($depth > CSSV_NOTES_MAX_FOLDER_DEPTH) throw new InvalidArgumentException('Maximum folder nesting is five levels.');
        $walk = $byId[$walk]['parent_id'] === null ? null : (string)$byId[$walk]['parent_id'];
    }
    $newDepth = $depth + 1;
    if ($newDepth > CSSV_NOTES_MAX_FOLDER_DEPTH) throw new InvalidArgumentException('Maximum folder nesting is five levels.');
    if ($moveId === null) return ['new_depth' => $newDepth, 'updates' => []];
    if (!isset($byId[$moveId])) throw new OutOfBoundsException('Folder was not found.');
    $updates = [];
    $queue = [[$moveId, $newDepth]];
    while ($queue) {
        [$id, $level] = array_shift($queue);
        if ($level > CSSV_NOTES_MAX_FOLDER_DEPTH) throw new InvalidArgumentException('Moving this folder would exceed five levels.');
        $updates[$id] = $level;
        foreach ($folders as $f) {
            if ($f['parent_id'] === $id && !isset($updates[(string)$f['id']])) {
                $queue[] = [(string)$f['id'], $level + 1];
            }
        }
    }
    return ['new_depth' => $newDepth, 'updates' => $updates];
}

function cssv_notes_own_note(PDO $pdo, string $user, string $id, bool $lock = false): array
{
    $q = $pdo->prepare('SELECT id,folder_id,title,pinned,deleted_at,created_at,updated_at FROM student_notes WHERE user_id=? AND id=? LIMIT 1'.($lock?' FOR UPDATE':''));
    $q->execute([$user,$id]);
    $note = $q->fetch();
    if (!$note) throw new OutOfBoundsException('Note was not found.');
    $note['pinned'] = (bool)$note['pinned'];
    return $note;
}

function cssv_notes_own_page(PDO $pdo, string $user, string $id, bool $lock = false): array
{
    $q = $pdo->prepare('SELECT id,note_id,position,content_html,version,last_request_id,deleted_at,updated_at FROM student_note_pages WHERE user_id=? AND id=? LIMIT 1'.($lock?' FOR UPDATE':''));
    $q->execute([$user,$id]);
    $row = $q->fetch();
    if (!$row) throw new OutOfBoundsException('Note page was not found.');
    $row['version'] = (int)$row['version'];
    $row['position'] = (int)$row['position'];
    return $row;
}

function cssv_notes_valid_folder(PDO $pdo, string $user, ?string $id): void
{
    if ($id === null) return;
    $folders = cssv_notes_folders($pdo,$user);
    $byId = array_column($folders,null,'id');
    $walk=$id;$seen=[];$depth=0;
    while($walk!==null) {
        if(!isset($byId[$walk]) || $byId[$walk]['deleted_at']!==null || isset($seen[$walk])) throw new InvalidArgumentException('Choose an active folder in your account.');
        $seen[$walk]=true;$depth++;
        if($depth>CSSV_NOTES_MAX_FOLDER_DEPTH) throw new InvalidArgumentException('Folder nesting exceeds five levels.');
        $walk=$byId[$walk]['parent_id'];
    }
}

function cssv_notes_list(PDO $pdo, string $user, array $query): array
{
    $folders = cssv_notes_folders($pdo,$user);
    $trash = ($query['trash'] ?? '') === '1';
    $search = isset($query['search']) && is_string($query['search']) ? trim($query['search']) : '';
    if (mb_strlen($search) > 100) throw new InvalidArgumentException('Search is too long.');
    $offset = filter_var($query['offset'] ?? 0, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>10000000]]);
    if ($offset === false) throw new InvalidArgumentException('Invalid page number.');
    $where = 'user_id=? AND deleted_at IS '.($trash ? 'NOT NULL' : 'NULL');
    $params = [$user];
    if ($search !== '') { $where .= ' AND title LIKE ?'; $params[] = '%'.addcslashes($search, '%_\\').'%'; }
    $stmt = $pdo->prepare('SELECT id,folder_id,title,pinned,deleted_at,updated_at,created_at FROM student_notes WHERE '.$where.' ORDER BY pinned DESC,updated_at DESC,id DESC LIMIT 101 OFFSET '.(int)$offset);
    $stmt->execute($params);
    $notes = $stmt->fetchAll();
    $hasMore = count($notes)>100;
    $notes = array_slice($notes,0,100);
    foreach ($notes as &$note) $note['pinned'] = (bool)$note['pinned'];
    unset($note);
    return ['folders'=>$folders,'notes'=>$notes,'has_more'=>$hasMore,'next_offset'=>$offset+count($notes)];
}

function cssv_notes_detail(PDO $pdo,string $user,string $noteId): array
{
    $note=cssv_notes_own_note($pdo,$user,$noteId);
    $q=$pdo->prepare('SELECT id,position,version,deleted_at,updated_at FROM student_note_pages WHERE user_id=? AND note_id=? ORDER BY position,id');
    $q->execute([$user,$noteId]);
    $pages=$q->fetchAll();
    foreach($pages as &$page){$page['version']=(int)$page['version'];$page['position']=(int)$page['position'];}
    unset($page);
    return ['note'=>$note,'pages'=>$pages];
}

function cssv_notes_page_history(PDO $pdo,string $user,string $pageId): array
{
    cssv_notes_own_page($pdo,$user,$pageId);
    $q=$pdo->prepare('SELECT id,version,created_at FROM student_note_revisions WHERE user_id=? AND page_id=? ORDER BY version DESC LIMIT 50');
    $q->execute([$user,$pageId]);
    return ['revisions'=>$q->fetchAll()];
}

function cssv_notes_mutate(PDO $pdo,string $user,array $body): array
{
    $action = $body['action'] ?? '';
    if (!is_string($action)) throw new InvalidArgumentException('Unknown notes action.');
    $pdo->beginTransaction();
    try {
        switch ($action) {
            case 'folder_create':
            case 'folder_update': {
                $parent = empty($body['parent_id']) ? null : cssv_notes_id($body['parent_id']);
                $name = cssv_notes_title($body['name'] ?? '',180);
                $folders = cssv_notes_folders($pdo,$user);
                if ($action === 'folder_create') {
                    $check = cssv_notes_move_depths($folders,null,$parent);
                    $id=cssv_uuid_v4();
                    $q=$pdo->prepare('INSERT INTO student_note_folders(id,user_id,parent_id,name,depth) VALUES(?,?,?,?,?)');
                    $q->execute([$id,$user,$parent,$name,$check['new_depth']]);
                } else {
                    $id=cssv_notes_id($body['id'] ?? null);
                    $current = array_values(array_filter($folders,fn($f)=>$f['id']===$id))[0]??null;
                    if (!$current || $current['deleted_at']!==null) throw new OutOfBoundsException('Folder not found.');
                    $check = cssv_notes_move_depths($folders,$id,$parent);
                    $q=$pdo->prepare('UPDATE student_note_folders SET parent_id=?,name=?,depth=? WHERE id=? AND user_id=?');
                    $q->execute([$parent,$name,$check['new_depth'],$id,$user]);
                    foreach ($check['updates'] as $child=>$depth) {
                        if ($child===$id) continue;
                        $pdo->prepare('UPDATE student_note_folders SET depth=? WHERE id=? AND user_id=?')->execute([$depth,$child,$user]);
                    }
                }
                $result=['id'=>$id];
                break;
            }
            case 'folder_trash':
            case 'folder_restore': {
                $id=cssv_notes_id($body['id']??null);
                $folders=cssv_notes_folders($pdo,$user);
                $folder=array_values(array_filter($folders,fn($f)=>$f['id']===$id))[0]??null;
                if (!$folder) throw new OutOfBoundsException('Folder not found.');
                if ($action==='folder_restore') {
                    cssv_notes_move_depths($folders,null,$folder['parent_id']===null?null:(string)$folder['parent_id']);
                    $pdo->prepare('UPDATE student_note_folders SET deleted_at=NULL WHERE id=? AND user_id=?')->execute([$id,$user]);
                } else {
                    $pdo->prepare('UPDATE student_note_folders SET deleted_at=NOW(6) WHERE id=? AND user_id=?')->execute([$id,$user]);
                }
                $result=['id'=>$id];break;
            }
            case 'note_create': {
                $folder=empty($body['folder_id'])?null:cssv_notes_id($body['folder_id']);
                cssv_notes_valid_folder($pdo,$user,$folder);
                $title=cssv_notes_title($body['title']??'Untitled note');
                $id=cssv_uuid_v4();$page=cssv_uuid_v4();
                $pdo->prepare('INSERT INTO student_notes(id,user_id,folder_id,title) VALUES(?,?,?,?)')->execute([$id,$user,$folder,$title]);
                $pdo->prepare("INSERT INTO student_note_pages(id,user_id,note_id,position,content_html) VALUES(?,?,?,1,'')")->execute([$page,$user,$id]);
                $result=['id'=>$id,'page_id'=>$page];break;
            }
            case 'note_update': {
                $id=cssv_notes_id($body['id']??null);
                $note=cssv_notes_own_note($pdo,$user,$id,true);
                if ($note['deleted_at']!==null) throw new InvalidArgumentException('Restore this note before editing.');
                $folder=array_key_exists('folder_id',$body)?(empty($body['folder_id'])?null:cssv_notes_id($body['folder_id'])):$note['folder_id'];
                cssv_notes_valid_folder($pdo,$user,$folder);
                $title=array_key_exists('title',$body)?cssv_notes_title($body['title']):$note['title'];
                $pinned=array_key_exists('pinned',$body)?(int)!!$body['pinned']:(int)$note['pinned'];
                $pdo->prepare('UPDATE student_notes SET folder_id=?,title=?,pinned=? WHERE id=? AND user_id=?')->execute([$folder,$title,$pinned,$id,$user]);
                $result=['id'=>$id];break;
            }
            case 'note_trash':
            case 'note_restore': {
                $id=cssv_notes_id($body['id']??null);
                cssv_notes_own_note($pdo,$user,$id,true);
                $deleted=$action==='note_trash'?'NOW(6)':'NULL';
                $pdo->prepare('UPDATE student_notes SET deleted_at='.$deleted.' WHERE id=? AND user_id=?')->execute([$id,$user]);
                $result=['id'=>$id];break;
            }
            case 'page_create': {
                $noteId=cssv_notes_id($body['note_id']??null);
                $note=cssv_notes_own_note($pdo,$user,$noteId,true);
                if ($note['deleted_at']!==null) throw new InvalidArgumentException('Restore the note before adding pages.');
                $q=$pdo->prepare('SELECT COALESCE(MAX(position),0) FROM student_note_pages WHERE user_id=? AND note_id=?');
                $q->execute([$user,$noteId]);
                $next=(int)$q->fetchColumn()+1;
                if ($next > 4294967294) throw new InvalidArgumentException('Document has reached its database page index limit.');
                $id=cssv_uuid_v4();
                $pdo->prepare("INSERT INTO student_note_pages(id,user_id,note_id,position,content_html) VALUES(?,?,?,?,'')")->execute([$id,$user,$noteId,$next]);
                $result=['id'=>$id,'position'=>$next,'version'=>1];break;
            }
            case 'page_save':
            case 'page_restore_revision': {
                $id=cssv_notes_id($body['id']??null);
                $page=cssv_notes_own_page($pdo,$user,$id,true);
                $note=cssv_notes_own_note($pdo,$user,$page['note_id']);
                if ($note['deleted_at']!==null || $page['deleted_at']!==null) throw new InvalidArgumentException('Restore this note page before editing.');
                $expected=filter_var($body['version']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
                $requestId=cssv_notes_id($body['request_id']??null);
                if ($expected===false) throw new InvalidArgumentException('An existing page version is required.');
                if ($requestId === $page['last_request_id']) { $result=['id'=>$id,'version'=>$page['version'],'replayed'=>true];break; }
                if ($expected!==$page['version']) throw new DomainException('Another device saved a newer version. Your draft has not been overwritten.');
                if ($action==='page_restore_revision') {
                    $revision=filter_var($body['revision']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
                    if ($revision===false) throw new InvalidArgumentException('Invalid revision number.');
                    $q=$pdo->prepare('SELECT content_html FROM student_note_revisions WHERE user_id=? AND page_id=? AND version=? LIMIT 1');
                    $q->execute([$user,$id,$revision]);$html=$q->fetchColumn();
                    if ($html===false) throw new OutOfBoundsException('Earlier version was not found.');
                } else $html=$body['html']??null;
                if (!is_string($html) || strlen($html)>CSSV_NOTES_PAGE_BYTES) throw new InvalidArgumentException('This page is too large. Continue on a new page.');
                if ($html===$page['content_html']) { $result=['id'=>$id,'version'=>$page['version'],'unchanged'=>true];break; }
                $pdo->prepare('INSERT INTO student_note_revisions(user_id,page_id,version,content_html) VALUES(?,?,?,?)')->execute([$user,$id,$page['version'],$page['content_html']]);
                $next=$page['version']+1;
                $pdo->prepare('UPDATE student_note_pages SET content_html=?,version=?,last_request_id=?,updated_at=NOW(6) WHERE id=? AND user_id=? AND version=?')->execute([$html,$next,$requestId,$id,$user,$page['version']]);
                $pdo->prepare('UPDATE student_notes SET updated_at=NOW(6) WHERE id=? AND user_id=?')->execute([$page['note_id'],$user]);
                $result=['id'=>$id,'version'=>$next];break;
            }
            case 'page_trash':
            case 'page_restore': {
                $id=cssv_notes_id($body['id']??null);
                $page=cssv_notes_own_page($pdo,$user,$id,true);
                $note=cssv_notes_own_note($pdo,$user,$page['note_id']);
                if ($note['deleted_at']!==null) throw new InvalidArgumentException('Restore this note first.');
                if ($action==='page_trash') {
                    $q=$pdo->prepare('SELECT COUNT(*) FROM student_note_pages WHERE note_id=? AND user_id=? AND deleted_at IS NULL');
                    $q->execute([$page['note_id'],$user]);
                    if ((int)$q->fetchColumn()<=1) throw new InvalidArgumentException('A note must have at least one page.');
                }
                $pdo->prepare('UPDATE student_note_pages SET deleted_at='.($action==='page_trash'?'NOW(6)':'NULL').' WHERE id=? AND user_id=?')->execute([$id,$user]);
                $result=['id'=>$id];break;
            }
            default: throw new InvalidArgumentException('Unknown notes action.');
        }
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
