#!/usr/bin/env python3
import struct
from pathlib import Path

VERSION = 7400
NULL_RECORD = b"\0" * 13
FOOTER_MAGIC_1 = bytes.fromhex("fabcab09d0c8d466b176fb831cf7267e")
FOOTER_MAGIC_2 = bytes.fromhex("f85a8c6adef5d97eece90ce3758f290b")


def property_bytes(value):
    if isinstance(value, str):
        data = value.encode("utf-8")
        return b"S" + struct.pack("<I", len(data)) + data
    if isinstance(value, int):
        return b"L" + struct.pack("<q", value)
    if isinstance(value, float):
        return b"D" + struct.pack("<d", value)
    kind, values = value
    fmt = {"d": "d", "i": "i"}[kind]
    raw = struct.pack("<" + fmt * len(values), *values)
    return kind.encode() + struct.pack("<III", len(values), 0, len(raw)) + raw


def node(name, properties=(), children=()):
    return name, tuple(properties), tuple(children)


def encode_node(spec, start):
    name, properties, children = spec
    name_bytes = name.encode("utf-8")
    props = b"".join(property_bytes(value) for value in properties)
    child_offset = start + 13 + len(name_bytes) + len(props)
    child_data = bytearray()
    for child in children:
        child_data.extend(encode_node(child, child_offset + len(child_data)))
    if children:
        child_data.extend(NULL_RECORD)
    end = start + 13 + len(name_bytes) + len(props) + len(child_data)
    header = struct.pack("<IIIB", end, len(properties), len(props), len(name_bytes))
    return header + name_bytes + props + bytes(child_data)


def p_vec(name, values):
    return node("P", (name, "Lcl Translation", "", "A", *map(float, values)))


def p_geometric_translation(values):
    return node("P", ("GeometricTranslation", "Vector3D", "Vector", "", *map(float, values)))


def p_int(name, value):
    return node("P", (name, "int", "Integer", "", int(value)))


def p_double(name, value):
    return node("P", (name, "double", "Number", "", float(value)))


def model(object_id, name, subtype, translation, geometric_translation=None):
    properties = [p_vec("Lcl Translation", translation)]
    if geometric_translation is not None:
        properties.append(p_geometric_translation(geometric_translation))
    return node("Model", (object_id, f"Model::{name}", subtype), (
        node("Version", (232,)), node("Properties70", children=properties),
    ))


def mesh(object_id, name, vertices=None):
    values = vertices or [0, 0, 0, 10, 0, 0]
    return node("Geometry", (object_id, f"Geometry::{name}", "Mesh"), (
        node("GeometryVersion", (124,)),
        node("Vertices", (("d", values),)),
        node("PolygonVertexIndex", (("i", [0, -2]),)),
    ))


def connection(source, destination):
    return node("C", ("OO", source, destination))


def global_settings(up_axis=1, front_axis=2):
    properties = (
        p_int("UpAxis", up_axis), p_int("UpAxisSign", 1),
        p_int("FrontAxis", front_axis), p_int("FrontAxisSign", -1),
        p_int("CoordAxis", 0), p_int("CoordAxisSign", 1),
        p_double("UnitScaleFactor", 1.0), p_double("OriginalUnitScaleFactor", 1.0),
    )
    return node("GlobalSettings", children=(
        node("Version", (1000,)), node("Properties70", children=properties),
    ))


def binary_document(top_specs, creator):
    header = b"Kaydara FBX Binary  \x00\x1a\x00" + struct.pack("<I", VERSION)
    body = bytearray()
    header_extension = node("FBXHeaderExtension", children=(
        node("FBXHeaderVersion", (1003,)), node("FBXVersion", (VERSION,)),
        node("Creator", (creator,)),
    ))
    for spec in (header_extension, *top_specs):
        body.extend(encode_node(spec, len(header) + len(body)))
    body.extend(NULL_RECORD)
    footer = FOOTER_MAGIC_1 + b"\0" * 4 + struct.pack("<I", VERSION) + b"\0" * 120 + FOOTER_MAGIC_2
    return header + bytes(body) + footer


def assemble_two_pipes():
    objects = node("Objects", children=(
        model(200, "Parent", "Null", (10, 0, 0)),
        model(201, "PipeOne", "Mesh", (20, 0, 0)), mesh(101, "PipeOne"),
        model(202, "PipeTwo", "Mesh", (40, 0, 0)), mesh(102, "PipeTwo"),
    ))
    connections = node("Connections", children=(
        connection(101, 201), connection(201, 200), connection(200, 0),
        connection(102, 202), connection(202, 0),
    ))
    return binary_document((global_settings(), objects, connections), "F2S-001 deterministic fixture")


def assemble_axis_geometric():
    objects = node("Objects", children=(
        model(300, "ZUpParent", "Null", (0, 0, 10)),
        model(301, "ZUpPipe", "Mesh", (0, 0, 20), geometric_translation=(0, 0, 5)),
        mesh(103, "ZUpPipe", [0, 0, 0, 0, 0, 10]),
    ))
    connections = node("Connections", children=(
        connection(103, 301), connection(301, 300), connection(300, 0),
    ))
    return binary_document((global_settings(up_axis=2, front_axis=1), objects, connections),
                           "F2S-001 axis and geometric transform fixture")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    fixture_root = root / "tests/fixtures/fbx"
    fixture_root.mkdir(parents=True, exist_ok=True)
    outputs = {
        fixture_root / "two-pipes.fbx": assemble_two_pipes(),
        fixture_root / "axis-geometric.fbx": assemble_axis_geometric(),
    }
    for target, data in outputs.items():
        target.write_bytes(data)
        print(target)
