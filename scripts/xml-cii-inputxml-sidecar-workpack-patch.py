from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


def patch_worker() -> None:
    path = Path('converters/py-worker.js')
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        "import { getConverterPackageWheelUrls } from './pyodide-local-packages.js';\n",
        "import { getConverterPackageWheelUrls } from './pyodide-local-packages.js';\nimport { buildXmlCiiSidecarExportSpec, readXmlCiiSidecarArtifacts } from './xml-cii-inputxml-sidecar-worker.js';\n",
        'worker import',
    )
    text = replace_once(
        text,
        "  'xml_to_inputxml_debug.py',\n",
        "  'xml_to_inputxml_debug.py',\n  'xml_to_cii_inputxml_sidecar_diagnostics.py',\n",
        'worker script list',
    )
    text = regex_once(
        text,
        r"function _primaryStem\(primaryName\) \{.*?\n\}\n\nasync function _runXmlCiiEnrichedInputXmlExport\(.*?\n\}\n",
        """async function _runXmlCiiEnrichedInputXmlExport(pyodide, input, stdout, stderr) {
  const spec = buildXmlCiiSidecarExportSpec(input);
  if (!spec) return null;
  await _runPythonScript(
    pyodide,
    '/scripts/xml_to_inputxml_debug.py',
    spec.argv,
    stdout,
    stderr,
  );
  return { script: 'xml_to_inputxml_debug.py', ...spec };
}
""",
        'worker sidecar runner',
    )
    old_call = """  const enrichedInputXmlResult = await _runXmlCiiEnrichedInputXmlExport(
    pyodide,
    converterId,
    primaryPath,
    primary.name,
    secondaryPath,
    options,
    jobDir,
    stdout,
    stderr,
  );
"""
    new_call = """  const enrichedInputXmlResult = await _runXmlCiiEnrichedInputXmlExport(
    pyodide,
    {
      converterId,
      primaryPath,
      primaryName: primary.name,
      secondaryPath,
      options,
      jobDir,
      ciiOutputPath: invocation.outputPath,
    },
    stdout,
    stderr,
  );
"""
    text = replace_once(text, old_call, new_call, 'worker sidecar call')
    old_output = """  if (enrichedInputXmlResult) {
    outputs.push({
      name: enrichedInputXmlResult.outputName,
      text: pyodide.FS.readFile(enrichedInputXmlResult.outputPath, { encoding: 'utf8' }),
      mime: _inferTextMime(enrichedInputXmlResult.outputName),
    });
  }
"""
    new_output = """  let sidecarDiagnostics = null;
  if (enrichedInputXmlResult) {
    try {
      const artifacts = readXmlCiiSidecarArtifacts(pyodide, enrichedInputXmlResult);
      outputs.push(artifacts.inputXml, artifacts.diagnostics);
      sidecarDiagnostics = artifacts.diagnostics.document;
    } catch (error) {
      stderrLines.push(`XML→CII InputXML sidecar artifacts unavailable: ${_errorToString(error)}`);
    }
  }
"""
    text = replace_once(text, old_output, new_output, 'worker sidecar outputs')
    text = replace_once(
        text,
        "      diagnostics: stagedInputXmlDiagnostics,\n",
        "      diagnostics: stagedInputXmlDiagnostics,\n      sidecarDiagnostics,\n",
        'worker sidecar logs',
    )
    path.write_text(text, encoding='utf-8')


def patch_debug_exporter() -> None:
    path = Path('converters/scripts/xml_to_inputxml_debug.py')
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        "import xml_to_cii2019_patched as patched\n",
        "import xml_to_cii2019_patched as patched\nimport xml_to_cii_inputxml_sidecar_diagnostics as sidecar_diag\n",
        'debug diagnostics import',
    )
    text = regex_once(
        text,
        r"def _add_restraint\(parent: ET\.Element, restraint: base\.RestraintSpec, node_number: int, support_config: dict\[str, Any\]\) -> None:\n.*?\n\n(?=def _regex_or_contains)",
        """def _add_restraint(
    parent: ET.Element,
    restraint: base.RestraintSpec,
    node_number: int,
    support_config: dict[str, Any],
    tag: str,
) -> None:
    fric = _inputxml_friction_value(restraint, support_config)
    ET.SubElement(parent, "RESTRAINT", {
        "NUM": "1",
        "NODE": _fmt(node_number),
        "TYPE": _fmt(restraint.type_code),
        "STIFFNESS": _fmt(restraint.stiffness),
        "GAP": _fmt(restraint.gap),
        "FRIC_COEF": _fmt(fric),
        "CNODE": "0",
        "XCOSINE": "-1.0101",
        "YCOSINE": "-1.0101",
        "ZCOSINE": "-1.0101",
        "TAG": tag,
        "GUID": "",
    })


""",
        'debug add restraint',
    )
    replacement = r'''def _restraint_source_label(
    node_number: int,
    restraint: base.RestraintSpec,
    source_maps: dict[str, dict[int, tuple[base.RestraintSpec, ...]]],
) -> str:
    labels = []
    for key, label in (("xml", "XML-explicit"), ("component", "ComponentType-derived"), ("dtxr", "DTXR-derived")):
        if restraint in source_maps.get(key, {}).get(node_number, tuple()):
            labels.append(label)
    return "+".join(labels) if labels else "Merged-unknown"


def _emit_restraints(
    parent: ET.Element,
    *,
    node_number: int,
    specs: tuple[base.RestraintSpec, ...],
    source_maps: dict[str, dict[int, tuple[base.RestraintSpec, ...]]],
    kind_map: dict[int, str],
    support_config: dict[str, Any],
    records: list[dict[str, Any]],
) -> int:
    retained = specs[:6]
    for slot, restraint in enumerate(retained, start=1):
        label = _restraint_source_label(node_number, restraint, source_maps)
        _add_restraint(parent, restraint, node_number, support_config, label)
        parent[-1].set("NUM", str(slot))
        records.append(sidecar_diag.make_record(
            "INFO", "SIDECAR_RESTRAINT_SOURCE",
            f"Node {node_number} restraint slot {slot} uses {label} evidence.",
            stage="restraint", source_row=node_number, element=node_number,
            output_field=f"RESTRAINT[{slot}]", action="emitted",
            context={"tag": label, "type": restraint.type_code, "dtxrKind": kind_map.get(node_number, "")},
        ))
    if len(specs) > 6:
        records.append(sidecar_diag.make_record(
            "WARNING", "SIDECAR_RESTRAINT_TRUNCATED",
            f"Node {node_number} supplied {len(specs)} restraints; retained 6 and reported {len(specs) - 6} dropped rows.",
            stage="restraint", source_row=node_number, element=node_number,
            output_field="RESTRAINT", action="truncated",
            context={"retained": 6, "dropped": len(specs) - 6},
        ))
    return len(retained)


def _element_attributes(
    edge: base.Edge,
    branch: Any,
    hydro_by_branch: dict[str, float],
    insulation_density_map: dict[str, float],
    support_config: dict[str, Any],
) -> dict[str, str]:
    from_node, to_node = edge.from_node, edge.to_node
    dx, dy, dz = _edge_delta(edge)
    material = to_node.material_code or from_node.material_code or branch.material_number
    fluid_density = patched._density_for_output(branch.branch_fluid_density, support_config)
    insulation_density = patched._density_for_output(insulation_density_map.get(branch.branch_name, 0.0), support_config)
    attrs = {
        "FROM_NODE": _fmt(from_node.node_number), "TO_NODE": _fmt(to_node.node_number),
        "FROM_NAME": from_node.node_name, "TO_NAME": to_node.node_name,
        "LINE_ID": branch.branch_name, "DELTA_X": _fmt(dx, 4), "DELTA_Y": _fmt(dy, 4), "DELTA_Z": _fmt(dz, 4),
        "DIAMETER": _fmt(base._element_outside_diameter(edge), 5),
        "WALL_THICK": _fmt(from_node.wall_thickness if from_node.wall_thickness > 0 else to_node.wall_thickness, 6),
        "INSUL_THICK": _fmt(to_node.insulation_thickness, 6), "CORR_ALLOW": _fmt(to_node.corrosion_allowance, 6),
        "MATERIAL_NUM": _fmt(material), "FLUID_DENSITY": _fmt(fluid_density, 9),
        "INSUL_DENSITY": _fmt(insulation_density, 9),
        "HYDRO_PRESSURE": _fmt(hydro_by_branch.get(branch.branch_name, 0.0), 6),
    }
    for index in range(9):
        attrs[f"TEMP_EXP_C{index + 1}"] = _fmt(_case(branch.temperatures, index), 6)
        attrs[f"PRESSURE_C{index + 1}"] = _fmt(_case(branch.pressures, index), 6)
    return attrs


def _add_component_children(
    element: ET.Element,
    edge: base.Edge,
    by_number: dict[int, dict[str, str]],
    by_name: dict[str, dict[str, str]],
    support_config: dict[str, Any],
    weight_scale: float,
) -> None:
    from_node, to_node = edge.from_node, edge.to_node
    _add_point_properties(element, edge, by_number, by_name)
    if to_node.bend_radius > 0:
        ET.SubElement(element, "BEND", {"RADIUS": _fmt(to_node.bend_radius, 6), "TYPE": _fmt(to_node.bend_type or 0), "ANGLE1": "0", "NODE1": _fmt(to_node.node_number), "ANGLE2": "0", "NODE2": _fmt(to_node.node_number), "ANGLE3": "0", "NODE3": _fmt(to_node.node_number), "NUM_MITER": "0", "FITTINGTHICKNESS": _fmt(to_node.wall_thickness, 6), "KFACTOR": "0"})
    rigid_at_to = to_node.rigid == 2 or (from_node.rigid == 2 and to_node.component_type.upper() == "FLAN")
    rigid_without_endpoint = to_node.rigid is None and abs(to_node.weight) > 1e-9
    if rigid_at_to or rigid_without_endpoint:
        source_weight = from_node.weight if from_node.rigid == 2 and abs(from_node.weight) > 1e-12 else to_node.weight
        ET.SubElement(element, "RIGID", {"WEIGHT": _fmt(source_weight * weight_scale, 6)})
    if to_node.component_type.upper() in {"TEE", "OLET", "BRAN"}:
        meta = by_number.get(to_node.node_number) or by_name.get(to_node.node_name) or {}
        ET.SubElement(element, "SIF", {"NODE": _fmt(to_node.node_number), "TYPE": _fmt(_tee_sif_type_from_meta(meta, support_config))})


def _inputxml_from_final_xml(
    final_xml: Path,
    support_config: dict[str, Any],
    use_json_restraints: bool,
    weight_scale: float = 1.0,
    diagnostics_records: list[dict[str, Any]] | None = None,
) -> ET.ElementTree:
    records = diagnostics_records if diagnostics_records is not None else []
    document = base._parse_xml_document(final_xml)
    by_number, by_name, hydro_by_branch = _node_meta(final_xml)
    insulation_density_map = patched._branch_insulation_density_map(final_xml)
    dtxr_specs, kind_map = patched._build_keyword_restraint_specs(final_xml, support_config)
    xml_specs = base._build_explicit_restraint_specs(document.branches)
    component_specs = _component_type_restraint_specs(document, support_config)
    if use_json_restraints and patched._xml_restraints_are_authoritative(final_xml, support_config):
        explicit_specs = dict(xml_specs)
    elif use_json_restraints:
        explicit_specs = _prefer_xml_spec_map(xml_specs, component_specs, dtxr_specs)
    else:
        explicit_specs = _merge_spec_maps(component_specs, xml_specs, dtxr_specs)
    source_maps = {"xml": xml_specs, "component": component_specs, "dtxr": dtxr_specs}
    root = ET.Element("CAESARII", {"XML_TYPE": "Input", "VERSION": "2019", "SOURCE": "XML->CII diagnostic reconstruction", "ARTIFACT_ROLE": "diagnostic-reconstruction", "PARITY_AUTHORITY": "generated CII"})
    model = ET.SubElement(root, "PIPINGMODEL", {"JOBNAME": document.metadata.project_name or Path(final_xml).stem, "TIME": document.metadata.date_time, "NORTH_Y": "1", "NORTH_Z": "0", "NUMELEMENTS": "0", "NUMREST": "0"})
    element_count = restraint_count = 0
    for branch in document.branches:
        nodes = [node for node in branch.nodes if node.node_number is not None]
        for from_node, to_node in zip(nodes, nodes[1:]):
            if from_node.node_number <= 0 or to_node.node_number <= 0:
                continue
            edge = base.Edge(from_node=from_node, to_node=to_node, branch_temperature=branch.branch_temperature, branch_pressure=branch.branch_pressure, branch_fluid_density=branch.branch_fluid_density, branch_name=branch.branch_name, branch_material_number=branch.material_number)
            element = ET.SubElement(model, "PIPINGELEMENT", _element_attributes(edge, branch, hydro_by_branch, insulation_density_map, support_config))
            _add_component_children(element, edge, by_number, by_name, support_config, weight_scale)
            restraint_count += _emit_restraints(parent=element, node_number=to_node.node_number, specs=explicit_specs.get(to_node.node_number, tuple()), source_maps=source_maps, kind_map=kind_map, support_config=support_config, records=records)
            element_count += 1
    model.set("NUMELEMENTS", str(element_count))
    model.set("NUMREST", str(restraint_count))
    return ET.ElementTree(root)


'''
    text = regex_once(
        text,
        r"def _inputxml_from_final_xml\(.*?\n\n(?=def _parse_args)",
        replacement,
        'debug exporter core',
    )
    old_args = """    parser.add_argument("--weight-scale", dest="weight_scale", type=float, default=1.0,
                        help="Multiplier applied to RIGID element weights (e.g. 10 to convert kgf → N).")
    return parser.parse_args()
"""
    new_args = """    parser.add_argument("--weight-scale", dest="weight_scale", type=float, default=1.0,
                        help="Multiplier applied to RIGID element weights (e.g. 10 to convert kgf → N).")
    parser.add_argument("--cii-output", type=Path, default=None)
    parser.add_argument("--diagnostics-output", type=Path, default=None)
    parser.add_argument("--coords-mode", choices=("first", "all", "none"), default="first")
    parser.add_argument("--parity-tolerance", type=float, default=0.001)
    return parser.parse_args()
"""
    text = replace_once(text, old_args, new_args, 'debug parser args')
    old_main = """    tree = _inputxml_from_final_xml(final_xml, support_config, args.use_restraint_type_based_on_json, weight_scale=args.weight_scale)
    ET.indent(tree, space="  ")
    tree.write(args.output, encoding="unicode", xml_declaration=True)
    print(f"Wrote enriched InputXML debug artifact: {args.output}")
"""
    new_main = """    records: list[dict[str, Any]] = []
    tree = _inputxml_from_final_xml(final_xml, support_config, args.use_restraint_type_based_on_json, weight_scale=args.weight_scale, diagnostics_records=records)
    ET.indent(tree, space="  ")
    tree.write(args.output, encoding="unicode", xml_declaration=True)
    diagnostics_path = args.diagnostics_output or args.output.with_name(f"{args.output.stem}_diagnostics.json")
    records.append(sidecar_diag.make_record(
        "INFO", "SIDECAR_OPTION_FORWARDED",
        "XML→CII sidecar received the resolved topology and conversion options.",
        stage="options", action="forwarded",
        context={"splitCondensedValveFlange": args.split_condensed_valve_flange, "coordsMode": args.coords_mode, "weightScale": args.weight_scale, "useJsonRestraints": args.use_restraint_type_based_on_json},
    ))
    diagnostics = sidecar_diag.build_diagnostics(source_name=args.input.name, sidecar_name=args.output.name, tree=tree, cii_path=args.cii_output, generation_records=records, options={"splitCondensedValveFlange": args.split_condensed_valve_flange, "coordsMode": args.coords_mode, "weightScale": args.weight_scale, "useJsonRestraints": args.use_restraint_type_based_on_json}, tolerance=args.parity_tolerance)
    sidecar_diag.write_diagnostics(diagnostics_path, diagnostics)
    print(f"Wrote enriched InputXML diagnostic reconstruction: {args.output}")
    print(f"Wrote InputXML sidecar parity diagnostics: {diagnostics_path}")
"""
    text = replace_once(text, old_main, new_main, 'debug main')
    path.write_text(text, encoding='utf-8')


def patch_tab() -> None:
    path = Path('tabs/model-converters/ModelConvertersTab.js')
    text = path.read_text(encoding='utf-8')
    text = replace_once(
        text,
        "import { installStagedJsonInputXmlDiagnosticsPanel } from './stagedjson-inputxml-diagnostics-panel.js?v=20260713-stagedjson-inputxml-audit-1';\n",
        "import { installStagedJsonInputXmlDiagnosticsPanel } from './stagedjson-inputxml-diagnostics-panel.js?v=20260713-stagedjson-inputxml-audit-1';\nimport { installXmlCiiInputXmlSidecarDiagnosticsPanel } from './xml-cii-inputxml-sidecar-diagnostics-panel.js?v=20260713-xml-cii-sidecar-audit-1';\n",
        'tab panel import',
    )
    text = replace_once(
        text,
        "['stagedjson-inputxml-diagnostics-panel', installStagedJsonInputXmlDiagnosticsPanel],",
        "['stagedjson-inputxml-diagnostics-panel', installStagedJsonInputXmlDiagnosticsPanel], ['xml-cii-inputxml-sidecar-diagnostics-panel', installXmlCiiInputXmlSidecarDiagnosticsPanel],",
        'tab installer entry',
    )
    path.write_text(text, encoding='utf-8')


def main() -> None:
    patch_worker()
    patch_debug_exporter()
    patch_tab()


if __name__ == '__main__':
    main()
