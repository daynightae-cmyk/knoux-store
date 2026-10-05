import tempfile
import unittest
from pathlib import Path

from .path_guard import resolve_under


class ArtifactBoundaryTests(unittest.TestCase):
    def test_nested_artifact_is_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.assertEqual(resolve_under(root / "processed" / "file.parquet", [root]), root.resolve() / "processed" / "file.parquet")

    def test_parent_and_sibling_paths_are_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for candidate in [root, root / ".." / "escape.json", Path(str(root) + "-sibling") / "file.json"]:
                with self.subTest(path=candidate), self.assertRaises(ValueError):
                    resolve_under(candidate, [root])

    def test_sql_delimiters_are_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):
                resolve_under(Path(folder) / "bad'path.parquet", [Path(folder)])

    def test_symlink_escape_is_refused(self):
        with tempfile.TemporaryDirectory() as folder, tempfile.TemporaryDirectory() as external:
            link = Path(folder) / "escape"
            try:
                link.symlink_to(external, target_is_directory=True)
            except OSError:
                self.skipTest("Creating symlinks is unavailable on this host")
            with self.assertRaises(ValueError):
                resolve_under(link / "file.json", [Path(folder)])
