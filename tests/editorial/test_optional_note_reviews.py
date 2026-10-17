import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('reviews', ROOT / 'scripts/editorial/optional_note_reviews.py')
reviews = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reviews)


class OptionalNoteReviewTests(unittest.TestCase):
    def setUp(self):
        self.ledger = reviews.load_reviews(ROOT / 'scripts/editorial/optional-note-reviews.json')

    def test_author_revision_cannot_be_silently_overwritten(self):
        review = next(iter(self.ledger.values()))
        changed = copy.deepcopy(review['operations'][0]['expectedBlock'])
        changed['segments'][0]['text'] += ' Author revision.'
        with self.assertRaisesRegex(ValueError, 'precondition changed'):
            reviews.apply_review([changed], review)

    def test_ambiguous_anchor_is_rejected(self):
        review = next(iter(self.ledger.values()))
        block = review['operations'][0]['expectedBlock']
        with self.assertRaisesRegex(ValueError, 'precondition changed'):
            reviews.apply_review([block, block], review)

    def test_reviews_preserve_surrounding_author_material(self):
        for review in self.ledger.values():
            original = [copy.deepcopy(op['expectedBlock']) for op in review['operations']]
            before = {'kind': 'para', 'segments': [{'text': 'Original introduction.'}]}
            after = {'kind': 'para', 'segments': [{'text': 'Original conclusion.'}]}
            blocks = [before, *original, after]
            result = reviews.apply_review(blocks, review)
            self.assertEqual(result[0], before)
            self.assertEqual(result[-1], after)
            self.assertEqual(blocks, [before, *original, after])

    def test_unexposed_citations_fail_validation(self):
        review = copy.deepcopy(next(iter(self.ledger.values())))
        review['sources'][0]['url'] = 'https://example.com/unexposed'
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'review.json'
            path.write_text(json.dumps({'schemaVersion': 1, 'reviews': [review]}))
            with self.assertRaisesRegex(ValueError, 'expose its sources'):
                reviews.load_reviews(path)

    def test_generated_pages_include_review_and_keep_all_topics(self):
        index = json.loads((ROOT / 'src/data/bundled/optional-notes-index.json').read_text())
        self.assertEqual(index['topicTotal'], 339)
        for key, review in self.ledger.items():
            payload = json.loads((ROOT / 'public/study-material/optional' / f'{key}.json').read_text())
            for operation in review['operations']:
                for block in operation['blocks']:
                    self.assertIn(block, payload['blocks'])


if __name__ == '__main__':
    unittest.main()
