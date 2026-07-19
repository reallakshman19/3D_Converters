import unittest

from scripts.inputxml_compiler.state_machine import CompilerStage, CompilerState


class TestInputXMLCompilerStateMachine(unittest.TestCase):
    def test_legal_transitions(self):
        state = CompilerState()
        self.assertEqual(state.current_stage, CompilerStage.INITIALIZED)
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)
        self.assertEqual(state.current_stage, CompilerStage.SOURCE_ENVELOPE_CREATED)

    def test_prohibited_skip(self):
        state = CompilerState()
        with self.assertRaisesRegex(RuntimeError, "Illegal transition skip"):
            state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)

    def test_repeated_transition_rejection(self):
        state = CompilerState()
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        with self.assertRaisesRegex(RuntimeError, "skips backward or repeats"):
            state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)

    def test_transition_after_terminal_rejection(self):
        state = CompilerState()
        state.block("EARLY_GATE")
        with self.assertRaisesRegex(RuntimeError, "already terminal"):
            state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)

    def test_repeated_block_rejection(self):
        state = CompilerState()
        state.block("EARLY_GATE")
        with self.assertRaisesRegex(RuntimeError, "already terminal"):
            state.block("SECOND_GATE")

    def test_repeated_accept_rejection(self):
        state = CompilerState()
        for stage in list(CompilerStage)[1:]:
            state.transition(stage)
        state.accept()
        with self.assertRaisesRegex(RuntimeError, "already terminal"):
            state.accept()

    def test_completed_stages_derivation(self):
        state = CompilerState()
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)
        self.assertEqual(
            state.completed_stages,
            [
                "INITIALIZED",
                "CONTRACT_BUNDLE_VERIFIED",
                "SOURCE_ENVELOPE_CREATED",
            ],
        )

    def test_blocked_at_derivation(self):
        state = CompilerState()
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        state.block("SOME_GATE")
        self.assertEqual(state.blocked_at, "SOME_GATE")
        self.assertEqual(state.terminal_status, "BLOCKED")

    def test_successful_terminal_result(self):
        state = CompilerState()
        for stage in list(CompilerStage)[1:]:
            state.transition(stage)
        state.accept()
        self.assertEqual(state.terminal_status, "PASS")
        self.assertEqual(state.current_stage, CompilerStage.PRODUCTION_ACCEPTED)

    def test_accept_before_production_accepted(self):
        state = CompilerState()
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        with self.assertRaises(RuntimeError):
            state.accept()

    def test_orchestration_serialization_is_deterministic(self):
        first = CompilerState()
        second = CompilerState()
        for state in (first, second):
            state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
            state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)
            state.block("MEDIA_INSPECTION_GATE")
        self.assertEqual(
            first.as_orchestration_dict(),
            second.as_orchestration_dict(),
        )


if __name__ == "__main__":
    unittest.main()
