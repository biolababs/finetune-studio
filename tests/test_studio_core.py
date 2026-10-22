"""Verify that each desktop workflow routes to its intended local engine."""

from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bundle"))
from studio_core import RunRequest, build_plan, environment_executable


class StudioRoutingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / "training.jsonl"
        self.data.write_text('{}\n', encoding="utf-8")
        self.yaml = self.root / "liquid.yaml"
        self.yaml.write_text('training_type: sft\n', encoding="utf-8")
        for folder, name in (("webslm-trainer", "python"), ("llama-factory", "python"),
                             ("liquid-finetune", "liquid-finetune")):
            executable = environment_executable(self.root / folder, name)
            executable.parent.mkdir(parents=True)
            executable.touch()

    def test_text_routes_to_webslm_direct_trainer(self):
        plan = build_plan(self.root, RunRequest("text", self.data, "LiquidAI/LFM2.5-230M",
                                                self.root / "text-output", 2))
        self.assertIn("check", plan.check)
        self.assertIn("train", plan.train)
        self.assertNotIn("--backend-python", plan.train)
        self.assertEqual(plan.cwd, self.root / "webslm-trainer")

    def test_audio_and_video_route_through_bundled_media_backend(self):
        for mode, model, template in (("audio", "Qwen/Qwen2.5-Omni-3B", "qwen2_omni"),
                                      ("video", "Qwen/Qwen3-VL-2B-Instruct", "qwen3_vl_nothink")):
            with self.subTest(mode=mode):
                plan = build_plan(self.root, RunRequest(mode, self.data, model,
                                                        self.root / f"{mode}-output", 3))
                self.assertIn("check-media", plan.check)
                self.assertIn("train-media", plan.train)
                self.assertEqual(plan.train[plan.train.index("--template") + 1], template)
                self.assertEqual(plan.train[plan.train.index("--backend-python") + 1],
                                 str(environment_executable(self.root / "llama-factory", "python")))

    def test_liquid_yaml_routes_to_full_liquid_cli(self):
        plan = build_plan(self.root, RunRequest("liquid", self.yaml))
        self.assertEqual(plan.check, ())
        self.assertEqual(plan.cwd, self.root / "liquid-finetune")
        self.assertEqual(plan.train[0], str(environment_executable(plan.cwd, "liquid-finetune")))
        self.assertEqual(plan.train[1], str(self.yaml))

    def test_existing_output_is_protected(self):
        output = self.root / "occupied"
        output.mkdir()
        (output / "adapter.bin").touch()
        with self.assertRaisesRegex(ValueError, "new or empty"):
            build_plan(self.root, RunRequest("text", self.data, "Qwen/Qwen3-0.6B", output))


if __name__ == "__main__":
    unittest.main()
