<?php
declare(strict_types=1);

// Column allowlist for the signed, temporary account migration endpoint.
// Only columns that already exist in Supabase are copied. New Hostinger-only
// profile/batch fields remain at their safe defaults until students provide them.
return [
    'student_profiles' => [
        'columns' => ['user_id','display_name','avatar_url','created_at','updated_at','last_seen_at'],
        'keys' => ['user_id'], 'ts' => ['created_at','updated_at','last_seen_at'],
    ],
    'student_progress' => [
        'columns' => ['user_id','payload','client_updated_at','updated_at'],
        'keys' => ['user_id'], 'json' => ['payload'], 'ts' => ['client_updated_at','updated_at'],
    ],
    'student_activity' => [
        'columns' => ['id','user_id','event_key','activity_type','label','path','metadata','occurred_at','created_at'],
        'keys' => ['id'], 'json' => ['metadata'], 'ts' => ['occurred_at','created_at'],
    ],
    'quiz_attempts' => [
        'columns' => ['id','user_id','attempt_key','quiz_type','category','score','total','metadata','completed_at','created_at'],
        'keys' => ['id'], 'json' => ['metadata'], 'ts' => ['completed_at','created_at'],
    ],
    'question_attempts' => [
        'columns' => ['id','user_id','event_key','question_id','category','topic','subtopic','mode','difficulty','selected_option','correct','attempted_at','created_at'],
        'keys' => ['id'], 'bool' => ['correct'], 'ts' => ['attempted_at','created_at'],
    ],
    'site_content' => [
        'columns' => ['id','content','updated_at','updated_by'],
        'keys' => ['id'], 'json' => ['content'], 'ts' => ['updated_at'],
    ],
    'site_content_versions' => [
        'columns' => ['id','content','created_at','created_by'],
        'keys' => ['id'], 'json' => ['content'], 'ts' => ['created_at'],
    ],
    'mcq_error_reports' => [
        'columns' => ['id','user_id','question_id','note','status','created_at','resolved_at','resolved_by'],
        'keys' => ['id'], 'ts' => ['created_at','resolved_at'],
    ],
    'custom_test_series_requests' => [
        'columns' => ['request_id','user_id','student_name','student_email','phone','subjects','test_count','scheduling_mode','start_date','duration_days','gap_days','schedule','unit_price','total_fee','status','created_at','updated_at'],
        'keys' => ['request_id'], 'json' => ['subjects','schedule'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_subjects' => [
        'columns' => ['id','user_id','name','description','icon','cover_style','accent_color','exam_label','target_date','position','category_count','entry_count','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'],
    ],
    'factbook_categories' => [
        'columns' => ['id','user_id','subject_id','parent_id','name','icon','color','position','entry_count','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'], 'defer_parent' => true,
    ],
    'factbook_entries' => [
        'columns' => ['id','user_id','subject_id','category_id','title','entry_type','content','importance','revision_status','bookmarked','source_count','personal_remarks','search_text','position','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'json' => ['content'], 'bool' => ['bookmarked'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'],
    ],
    'factbook_entry_blocks' => [
        'columns' => ['id','user_id','entry_id','block_type','content','position','created_at','updated_at'],
        'keys' => ['id'], 'json' => ['content'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_sources' => [
        'columns' => ['id','user_id','entry_id','title','author_organization','publication_year','page_number','web_address','accessed_on','verification_note','position','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_tags' => [
        'columns' => ['id','user_id','name','color','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_entry_tags' => [
        'columns' => ['user_id','entry_id','tag_id','created_at'],
        'keys' => ['entry_id','tag_id'], 'ts' => ['created_at'],
    ],
    'factbook_collections' => [
        'columns' => ['id','user_id','name','description','color','position','archived_at','deleted_at','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['archived_at','deleted_at','created_at','updated_at'],
    ],
    'factbook_collection_entries' => [
        'columns' => ['user_id','collection_id','entry_id','position','created_at'],
        'keys' => ['collection_id','entry_id'], 'ts' => ['created_at'],
    ],
    'factbook_media' => [
        'columns' => ['id','user_id','entry_id','storage_path','file_name','mime_type','byte_size','width','height','caption','alt_text','source','created_at','updated_at'],
        'keys' => ['id'], 'ts' => ['created_at','updated_at'],
    ],
    'factbook_revisions' => [
        'columns' => ['id','user_id','entry_id','snapshot','created_at'],
        'keys' => ['id'], 'json' => ['snapshot'], 'ts' => ['created_at'],
    ],
    'factbook_preferences' => [
        'columns' => ['user_id','default_view','default_print_layout','source_reminders','autosave_enabled','revision_labels','created_at','updated_at'],
        'keys' => ['user_id'], 'bool' => ['source_reminders','autosave_enabled','revision_labels'], 'ts' => ['created_at','updated_at'],
    ],
];

