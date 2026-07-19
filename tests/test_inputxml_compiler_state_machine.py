import unittest
from scripts.inputxml_compiler.state_machine import CompilerState, CompilerStage


class TestInputXMLCompilerStateMachine(unittest.TestCase):

    def test_legal_transitions(self):
        state = CompilerState()
        self.assertEqual(state.current_stage, CompilerStage.INITIALIZED)
        
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        self.assertEqual(state.current_stage, CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        
        state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)
        self.assertEqual(state.current_stage, CompilerStage.SOURCE_ENVELOPE_CREATED)

    def test_prohibited_skip(self):
        state = CompilerState()
        with self.assertRaises(RuntimeError) as ctx:
            state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)
        self.assertIn("Illegal transition skip", str(ctx.exception))

    def test_repeated_transition_rejection(self):
        state = CompilerState()
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        with self.assertRaises(RuntimeError) as ctx:
            state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        self.assertIn("skips backward or repeats", str(ctx.exception))

    def test_transition_after_terminal_rejection(self):
        state = CompilerState()
        state.block("EARLY_GATE")
        with self.assertRaises(RuntimeError) as ctx:
            state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        self.assertIn("Cannot transition", str(ctx.exception))
        
    def test_completed_stages_derivation(self):
        state = CompilerState()
        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)
        
        stages = state.completed_stages
        self.assertEqual(stages, [
            "INITIALIZED",
            "CONTRACT_BUNDLE_VERIFIED",
            "SOURCE_ENVELOPE_CREATED"
        ])
        
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

if __name__ == '__main__':
    unittest.main()
