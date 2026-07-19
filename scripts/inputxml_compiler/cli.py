from .base import *
from .compiler import *
from .publication import CompilationView, publish_result_bundle, verify_committed_bundle

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--dialect")
    parser.add_argument("--context", type=Path)
    parser.add_argument("--source-repository", default="unknown")
    parser.add_argument("--source-path")
    parser.add_argument("--producer", default="inputxml-canonical-compiler")
    parser.add_argument("--contracts-dir", type=Path, default=Path(__file__).resolve().parents[2] / "contracts" / "inputxml" / "v1")
    args = parser.parse_args(argv)
    
    context = _load_json(args.context) if args.context else {}
    source = args.input.read_bytes()
    contracts = args.contracts_dir
    
    try:
        canonical, ledger, validation = compile_document(
            source,
            source_name=args.input.name,
            source_repository=args.source_repository,
            source_path=args.source_path or str(args.input),
            producer=args.producer,
            registry_path=contracts / "inputxml-dialect-registry.json",
            adapter_registry_path=contracts / "compiler" / "inputxml-compiler-adapters.json",
            alias_registry_path=contracts / "catalogs" / "inputxml-alias-registry.json",
            canonical_xsd_path=contracts / "inputxml-canonical-v1.xsd",
            categorized_xsd_path=contracts / "categorized-inputxml-v3.xsd",
            semantic_rules_path=contracts / "inputxml-semantic-rules-v1.sch",
            dialect_override=args.dialect,
            context=context,
        )
        
        view = CompilationView(
            source_identity=args.input.stem,
            source_hash=_sha256(source),
            dialect=validation.get("dialect", "unresolved"),
            terminal_status=validation.get("status", "FAILED"),
            orchestration=validation.get("orchestration", {}),
            canonical_candidate=canonical,
            ledger=ledger,
            validation=validation,
        )
        
        publish_result_bundle(view, args.output_dir)
        verify_committed_bundle(args.output_dir, args.input.stem)
        
        # Best effort print for legacy workflows (though no longer the authority)
        stem = args.input.stem
        outputs = {
            "ledger": str(args.output_dir / f"{stem}.canonicalization-ledger.json"),
            "validation": str(args.output_dir / f"{stem}.canonical-validation.json"),
        }
        if canonical is not None:
            outputs["canonical"] = str(args.output_dir / f"{stem}.canonical.input.xml")
            
        print(json.dumps({"status": validation["status"], "outputs": outputs}, indent=2))
        return 0 if validation["status"] == "PASS" else 2
        
    except Exception as exc:
        print(f"INTERNAL ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

__all__ = [name for name in globals() if not name.startswith("__")]
