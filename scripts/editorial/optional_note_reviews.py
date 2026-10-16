"""Apply small, sourced editorial reviews after importing the original DOCX.

The source documents remain intact. Exact block preconditions stop a later
author revision from being silently overwritten by an outdated correction.
"""
import copy
import json
import re
from pathlib import Path
from urllib.parse import urlparse


def load_reviews(path):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    if data.get('schemaVersion') != 1:
        raise ValueError('Unsupported optional-note review schema')
    reviews = {}
    for review in data['reviews']:
        key = review['topic']
        if not re.fullmatch(r'[a-z0-9-]+/[a-z0-9-]+', key) or key in reviews:
            raise ValueError(f'Invalid or duplicate reviewed topic: {key}')
        if not review.get('reason') or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', review.get('reviewedAt', '')):
            raise ValueError(f'Missing editorial provenance: {key}')
        sources = review.get('sources', [])
        if not sources or any(urlparse(s.get('url', '')).scheme != 'https'
                              or not urlparse(s['url']).netloc
                              or not s.get('locator') for s in sources):
            raise ValueError(f'Missing source URL/locator: {key}')
        operations = review.get('operations', [])
        if not operations or any(op.get('action') not in ('replace', 'insert_after')
                                 or not op.get('expectedBlock')
                                 or not op.get('blocks') for op in operations):
            raise ValueError(f'Invalid review operations: {key}')
        rendered = json.dumps([op['blocks'] for op in operations], ensure_ascii=False)
        if any(s['url'] not in rendered for s in sources):
            raise ValueError(f'Review must expose its sources to readers: {key}')
        reviews[key] = review
    return reviews


def apply_review(blocks, review):
    result = copy.deepcopy(blocks)
    for operation in review['operations']:
        matches = [i for i, block in enumerate(result) if block == operation['expectedBlock']]
        if len(matches) != 1:
            raise ValueError(f'Editorial source precondition changed: {review["topic"]}')
        index = matches[0]
        if operation['action'] == 'replace':
            result[index:index + 1] = copy.deepcopy(operation['blocks'])
        else:
            result[index + 1:index + 1] = copy.deepcopy(operation['blocks'])
    return result
