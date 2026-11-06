import importlib.util
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from zoneinfo import ZoneInfo

spec = importlib.util.spec_from_file_location(
    "init_study", Path(__file__).resolve().parents[1] / "scripts/init-study.py"
)
initializer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(initializer)


class TestStudyDirectory(unittest.TestCase):
    def test_user_timezone_and_self_contained_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            now = datetime(2026, 11, 6, 5, 49, tzinfo=timezone.utc).astimezone(ZoneInfo("Asia/Shanghai"))
            root = initializer.create_study("studio", directory, now)
            self.assertEqual(root.name, "studio_DESIGN_202611061349")
            metadata = json.loads((root / "study.json").read_text())
            self.assertEqual(metadata["createdAt"], "2026-11-06T13:49:00+08:00")
            self.assertEqual(metadata["timezone"], "Asia/Shanghai")
            self.assertEqual(list(Path(directory).resolve().iterdir()), [root])

    def test_simultaneous_runs_preserve_existing_work(self):
        with tempfile.TemporaryDirectory() as directory:
            now = datetime(2026, 11, 6, 13, 49, tzinfo=timezone.utc)
            original = initializer.create_study("studio", directory, now)
            (original / "index.html").write_text("existing work")
            with ThreadPoolExecutor(max_workers=4) as pool:
                roots = list(pool.map(lambda _: initializer.create_study("studio", directory, now), range(4)))
            self.assertEqual(len(set(roots)), 4)
            self.assertNotIn(original, roots)
            self.assertEqual((original / "index.html").read_text(), "existing work")
            self.assertTrue(all((root / "study.json").is_file() for root in roots))

    def test_site_name_cannot_escape_parent(self):
        with tempfile.TemporaryDirectory() as directory:
            for name in ("../../outside", "飞书 / 官网", "...", "name1"):
                root = initializer.create_study(name, directory, datetime.now().astimezone())
                self.assertEqual(root.parent, Path(directory).resolve())
                self.assertNotIn("..", root.name)
                self.assertTrue((root / "study.json").is_file())


if __name__ == "__main__":
    unittest.main()
