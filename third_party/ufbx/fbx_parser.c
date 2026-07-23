#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "ufbx.h"

typedef struct json_buffer {
    char *data;
    size_t length;
    size_t capacity;
    int failed;
} json_buffer;

static char *g_result;
static size_t g_result_length;
static char g_error[512];
static size_t g_error_length;

static int jb_reserve(json_buffer *buffer, size_t extra) {
    if (buffer->failed) return 0;
    size_t required = buffer->length + extra + 1;
    if (required <= buffer->capacity) return 1;
    size_t capacity = buffer->capacity ? buffer->capacity : 4096;
    while (capacity < required) capacity *= 2;
    char *next = (char*)realloc(buffer->data, capacity);
    if (!next) { buffer->failed = 1; return 0; }
    buffer->data = next;
    buffer->capacity = capacity;
    return 1;
}

static void jb_raw(json_buffer *buffer, const char *text) {
    size_t size = strlen(text);
    if (!jb_reserve(buffer, size)) return;
    memcpy(buffer->data + buffer->length, text, size);
    buffer->length += size;
    buffer->data[buffer->length] = '\0';
}

static void jb_char(json_buffer *buffer, char value) {
    if (!jb_reserve(buffer, 1)) return;
    buffer->data[buffer->length++] = value;
    buffer->data[buffer->length] = '\0';
}

static void jb_u64(json_buffer *buffer, uint64_t value) {
    char text[32];
    snprintf(text, sizeof(text), "%llu", (unsigned long long)value);
    jb_raw(buffer, text);
}

static void jb_i64(json_buffer *buffer, int64_t value) {
    char text[32];
    snprintf(text, sizeof(text), "%lld", (long long)value);
    jb_raw(buffer, text);
}

static void jb_real(json_buffer *buffer, double value) {
    char text[64];
    if (value == 0.0) value = 0.0;
    snprintf(text, sizeof(text), "%.17g", value);
    jb_raw(buffer, text);
}

static void jb_string_n(json_buffer *buffer, const char *data, size_t size) {
    jb_char(buffer, '"');
    for (size_t i = 0; i < size; i++) {
        unsigned char ch = (unsigned char)data[i];
        if (ch == '"' || ch == '\\') { jb_char(buffer, '\\'); jb_char(buffer, (char)ch); }
        else if (ch == '\n') jb_raw(buffer, "\\n");
        else if (ch == '\r') jb_raw(buffer, "\\r");
        else if (ch == '\t') jb_raw(buffer, "\\t");
        else if (ch < 0x20) jb_raw(buffer, "?");
        else jb_char(buffer, (char)ch);
    }
    jb_char(buffer, '"');
}

static void jb_string(json_buffer *buffer, ufbx_string value) {
    jb_string_n(buffer, value.data ? value.data : "", value.data ? value.length : 0);
}

static uint64_t source_id(const ufbx_element *element) {
    if (element && element->dom_node && element->dom_node->values.count > 0) {
        return (uint64_t)element->dom_node->values.data[0].value_int;
    }
    return element ? element->element_id : 0;
}

static ufbx_string dom_value_string(const ufbx_element *element, size_t index) {
    ufbx_string empty = { 0 };
    if (!element || !element->dom_node || element->dom_node->values.count <= index) return empty;
    return element->dom_node->values.data[index].value_str;
}

static const char *element_type_name(ufbx_element_type type) {
    switch (type) {
        case UFBX_ELEMENT_UNKNOWN: return "UNKNOWN";
        case UFBX_ELEMENT_NODE: return "NODE";
        case UFBX_ELEMENT_MESH: return "MESH";
        case UFBX_ELEMENT_LIGHT: return "LIGHT";
        case UFBX_ELEMENT_CAMERA: return "CAMERA";
        case UFBX_ELEMENT_BONE: return "BONE";
        case UFBX_ELEMENT_EMPTY: return "EMPTY";
        case UFBX_ELEMENT_LINE_CURVE: return "LINE_CURVE";
        case UFBX_ELEMENT_NURBS_CURVE: return "NURBS_CURVE";
        case UFBX_ELEMENT_NURBS_SURFACE: return "NURBS_SURFACE";
        case UFBX_ELEMENT_NURBS_TRIM_SURFACE: return "NURBS_TRIM_SURFACE";
        case UFBX_ELEMENT_NURBS_TRIM_BOUNDARY: return "NURBS_TRIM_BOUNDARY";
        case UFBX_ELEMENT_PROCEDURAL_GEOMETRY: return "PROCEDURAL_GEOMETRY";
        case UFBX_ELEMENT_STEREO_CAMERA: return "STEREO_CAMERA";
        case UFBX_ELEMENT_CAMERA_SWITCHER: return "CAMERA_SWITCHER";
        case UFBX_ELEMENT_MARKER: return "MARKER";
        case UFBX_ELEMENT_LOD_GROUP: return "LOD_GROUP";
        case UFBX_ELEMENT_SKIN_DEFORMER: return "SKIN_DEFORMER";
        case UFBX_ELEMENT_SKIN_CLUSTER: return "SKIN_CLUSTER";
        case UFBX_ELEMENT_BLEND_DEFORMER: return "BLEND_DEFORMER";
        case UFBX_ELEMENT_BLEND_CHANNEL: return "BLEND_CHANNEL";
        case UFBX_ELEMENT_BLEND_SHAPE: return "BLEND_SHAPE";
        case UFBX_ELEMENT_CACHE_DEFORMER: return "CACHE_DEFORMER";
        case UFBX_ELEMENT_CACHE_FILE: return "CACHE_FILE";
        case UFBX_ELEMENT_MATERIAL: return "MATERIAL";
        case UFBX_ELEMENT_TEXTURE: return "TEXTURE";
        case UFBX_ELEMENT_VIDEO: return "VIDEO";
        case UFBX_ELEMENT_SHADER: return "SHADER";
        case UFBX_ELEMENT_SHADER_BINDING: return "SHADER_BINDING";
        case UFBX_ELEMENT_ANIM_STACK: return "ANIM_STACK";
        case UFBX_ELEMENT_ANIM_LAYER: return "ANIM_LAYER";
        case UFBX_ELEMENT_ANIM_VALUE: return "ANIM_VALUE";
        case UFBX_ELEMENT_ANIM_CURVE: return "ANIM_CURVE";
        case UFBX_ELEMENT_DISPLAY_LAYER: return "DISPLAY_LAYER";
        case UFBX_ELEMENT_SELECTION_SET: return "SELECTION_SET";
        case UFBX_ELEMENT_SELECTION_NODE: return "SELECTION_NODE";
        case UFBX_ELEMENT_CHARACTER: return "CHARACTER";
        case UFBX_ELEMENT_CONSTRAINT: return "CONSTRAINT";
        case UFBX_ELEMENT_AUDIO_LAYER: return "AUDIO_LAYER";
        case UFBX_ELEMENT_AUDIO_CLIP: return "AUDIO_CLIP";
        case UFBX_ELEMENT_POSE: return "POSE";
        case UFBX_ELEMENT_METADATA_OBJECT: return "METADATA_OBJECT";
        default: return "UNRECOGNIZED_ELEMENT_TYPE";
    }
}

static const char *record_disposition(ufbx_element_type type) {
    if (type == UFBX_ELEMENT_NODE) return "supported-occurrence";
    if (type == UFBX_ELEMENT_MESH || type == UFBX_ELEMENT_NURBS_CURVE) return "supported-geometry";
    if (type == UFBX_ELEMENT_UNKNOWN || type < 0 || type >= UFBX_ELEMENT_TYPE_COUNT) return "unresolved-unknown";
    return "retained-evidence";
}

static void write_id_string(json_buffer *buffer, uint64_t value) {
    jb_char(buffer, '"'); jb_u64(buffer, value); jb_char(buffer, '"');
}

static void write_vec3(json_buffer *buffer, ufbx_vec3 value) {
    jb_char(buffer, '['); jb_real(buffer, value.x); jb_char(buffer, ',');
    jb_real(buffer, value.y); jb_char(buffer, ','); jb_real(buffer, value.z); jb_char(buffer, ']');
}

static void write_vec4(json_buffer *buffer, ufbx_vec4 value) {
    jb_char(buffer, '['); jb_real(buffer, value.x); jb_char(buffer, ',');
    jb_real(buffer, value.y); jb_char(buffer, ','); jb_real(buffer, value.z);
    jb_char(buffer, ','); jb_real(buffer, value.w); jb_char(buffer, ']');
}

static void write_matrix(json_buffer *buffer, ufbx_matrix matrix) {
    jb_char(buffer, '[');
    for (size_t i = 0; i < 12; i++) {
        if (i) jb_char(buffer, ',');
        jb_real(buffer, matrix.v[i]);
    }
    jb_char(buffer, ']');
}

static void write_transform(json_buffer *buffer, ufbx_transform transform) {
    jb_raw(buffer, "{\"translation\":"); write_vec3(buffer, transform.translation);
    jb_raw(buffer, ",\"rotation\":"); write_vec4(buffer, (ufbx_vec4){
        transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w });
    jb_raw(buffer, ",\"scale\":"); write_vec3(buffer, transform.scale); jb_char(buffer, '}');
}

static void write_custom_properties(json_buffer *buffer, const ufbx_props *props) {
    jb_char(buffer, '[');
    int first = 1;
    for (size_t i = 0; i < props->props.count; i++) {
        const ufbx_prop *prop = &props->props.data[i];
        if (!(prop->flags & UFBX_PROP_FLAG_USER_DEFINED)) continue;
        if (!first) jb_char(buffer, ','); first = 0;
        jb_raw(buffer, "{\"name\":"); jb_string(buffer, prop->name);
        jb_raw(buffer, ",\"type\":"); jb_i64(buffer, prop->type);
        jb_raw(buffer, ",\"flags\":"); jb_i64(buffer, prop->flags);
        jb_raw(buffer, ",\"valueInt\":"); jb_i64(buffer, prop->value_int);
        jb_raw(buffer, ",\"valueReal\":"); jb_real(buffer, prop->value_real);
        jb_raw(buffer, ",\"valueVec4\":"); write_vec4(buffer, prop->value_vec4);
        jb_raw(buffer, ",\"valueString\":"); jb_string(buffer, prop->value_str); jb_char(buffer, '}');
    }
    jb_char(buffer, ']');
}

static void write_connection_property_names(json_buffer *buffer, const ufbx_element *element) {
    jb_char(buffer, '[');
    int first = 1;
    for (size_t i = 0; i < element->connections_src.count; i++) {
        const ufbx_connection *connection = &element->connections_src.data[i];
        if (connection->src_prop.length) {
            if (!first) jb_char(buffer, ','); first = 0; jb_string(buffer, connection->src_prop);
        }
        if (connection->dst_prop.length) {
            if (!first) jb_char(buffer, ','); first = 0; jb_string(buffer, connection->dst_prop);
        }
    }
    for (size_t i = 0; i < element->connections_dst.count; i++) {
        const ufbx_connection *connection = &element->connections_dst.data[i];
        if (connection->src_prop.length) {
            if (!first) jb_char(buffer, ','); first = 0; jb_string(buffer, connection->src_prop);
        }
        if (connection->dst_prop.length) {
            if (!first) jb_char(buffer, ','); first = 0; jb_string(buffer, connection->dst_prop);
        }
    }
    jb_char(buffer, ']');
}

static void write_source_object(json_buffer *buffer, const ufbx_element *element, size_t order) {
    ufbx_string dom_class = element->dom_node ? element->dom_node->name : (ufbx_string){ 0 };
    ufbx_string dom_source_name = dom_value_string(element, 1);
    ufbx_string dom_subtype = dom_value_string(element, 2);
    jb_raw(buffer, "{\"sourceObjectId\":"); write_id_string(buffer, source_id(element));
    jb_raw(buffer, ",\"ufbxElementId\":"); jb_u64(buffer, element->element_id);
    jb_raw(buffer, ",\"ufbxTypedId\":"); jb_u64(buffer, element->typed_id);
    jb_raw(buffer, ",\"ufbxElementType\":"); jb_string_n(buffer, element_type_name(element->type), strlen(element_type_name(element->type)));
    jb_raw(buffer, ",\"ufbxElementTypeValue\":"); jb_i64(buffer, element->type);
    jb_raw(buffer, ",\"domClass\":"); jb_string(buffer, dom_class);
    jb_raw(buffer, ",\"domSubtype\":"); jb_string(buffer, dom_subtype);
    jb_raw(buffer, ",\"domSourceName\":"); jb_string(buffer, dom_source_name);
    jb_raw(buffer, ",\"displayName\":"); jb_string(buffer, element->name);
    jb_raw(buffer, ",\"customProperties\":"); write_custom_properties(buffer, &element->props);
    jb_raw(buffer, ",\"sourceRecordDisposition\":");
    jb_string_n(buffer, record_disposition(element->type), strlen(record_disposition(element->type)));
    jb_raw(buffer, ",\"nodeAttributeType\":");
    if (element->type == UFBX_ELEMENT_NODE && ((const ufbx_node*)element)->all_attribs.count) {
        const ufbx_node *node = (const ufbx_node*)element;
        jb_string_n(buffer, element_type_name(node->attrib_type), strlen(element_type_name(node->attrib_type)));
    } else if (element->type == UFBX_ELEMENT_NODE) {
        jb_raw(buffer, "\"UNKNOWN\"");
    } else {
        jb_raw(buffer, "null");
    }
    jb_raw(buffer, ",\"nodeAttributeTypeValue\":");
    if (element->type == UFBX_ELEMENT_NODE && ((const ufbx_node*)element)->all_attribs.count) {
        jb_i64(buffer, ((const ufbx_node*)element)->attrib_type);
    } else if (element->type == UFBX_ELEMENT_NODE) {
        jb_raw(buffer, "0");
    } else {
        jb_raw(buffer, "null");
    }
    jb_raw(buffer, ",\"objectPropertyPath\":null,\"connectionPropertyNames\":");
    write_connection_property_names(buffer, element);
    jb_raw(buffer, ",\"sourceDocumentOrder\":"); jb_u64(buffer, order); jb_char(buffer, '}');
}

static void write_source_objects(json_buffer *buffer, const ufbx_scene *scene) {
    jb_raw(buffer, "\"sourceObjects\":[");
    int first = 1;
    for (size_t i = 0; i < scene->elements.count; i++) {
        const ufbx_element *element = scene->elements.data[i];
        if (!element->dom_node) continue;
        if (!first) jb_char(buffer, ','); first = 0;
        write_source_object(buffer, element, i);
    }
    jb_raw(buffer, "],");
}

static void write_occurrences(json_buffer *buffer, const ufbx_scene *source, const ufbx_scene *normalized) {
    jb_raw(buffer, "\"occurrences\":[");
    int first = 1;
    for (size_t i = 0; i < source->nodes.count; i++) {
        const ufbx_node *node = source->nodes.data[i];
        if (node->is_root) continue;
        const ufbx_node *norm = normalized->nodes.data[node->typed_id];
        if (!first) jb_char(buffer, ','); first = 0;
        jb_raw(buffer, "{\"sourceOccurrenceId\":\"occ:"); jb_u64(buffer, source_id(&node->element));
        jb_raw(buffer, "\",\"sourceModelObjectId\":"); write_id_string(buffer, source_id(&node->element));
        jb_raw(buffer, ",\"parentOccurrenceId\":");
        if (!node->parent || node->parent->is_root) jb_raw(buffer, "null");
        else { jb_raw(buffer, "\"occ:"); jb_u64(buffer, source_id(&node->parent->element)); jb_char(buffer, '"'); }
        jb_raw(buffer, ",\"geometryObjectIds\":[");
        for (size_t j = 0; j < node->all_attribs.count; j++) {
            if (j) jb_char(buffer, ','); write_id_string(buffer, source_id(node->all_attribs.data[j]));
        }
        jb_raw(buffer, "],\"inheritMode\":"); jb_i64(buffer, node->inherit_mode);
        jb_raw(buffer, ",\"originalInheritMode\":"); jb_i64(buffer, node->original_inherit_mode);
        jb_raw(buffer, ",\"hasGeometryTransform\":"); jb_raw(buffer, node->has_geometry_transform ? "true" : "false");
        jb_raw(buffer, ",\"localTransformSource\":"); write_transform(buffer, node->local_transform);
        jb_raw(buffer, ",\"geometryTransformSource\":"); write_transform(buffer, node->geometry_transform);
        jb_raw(buffer, ",\"worldMatrixSource\":"); write_matrix(buffer, node->node_to_world);
        jb_raw(buffer, ",\"geometryMatrixSource\":"); write_matrix(buffer, node->geometry_to_world);
        jb_raw(buffer, ",\"worldMatrixMm\":"); write_matrix(buffer, norm->node_to_world);
        jb_raw(buffer, ",\"geometryMatrixMm\":"); write_matrix(buffer, norm->geometry_to_world);
        jb_char(buffer, '}');
    }
    jb_raw(buffer, "],");
}

static void write_owner_occurrences(json_buffer *buffer, ufbx_node_list instances) {
    jb_char(buffer, '[');
    for (size_t i = 0; i < instances.count; i++) {
        if (i) jb_char(buffer, ',');
        jb_raw(buffer, "\"occ:"); jb_u64(buffer, source_id(&instances.data[i]->element)); jb_char(buffer, '"');
    }
    jb_char(buffer, ']');
}

static void write_mesh_geometry(json_buffer *buffer, const ufbx_mesh *mesh, const ufbx_mesh *norm) {
    jb_raw(buffer, "{\"geometryObjectId\":"); write_id_string(buffer, source_id(&mesh->element));
    jb_raw(buffer, ",\"sourceObjectId\":"); write_id_string(buffer, source_id(&mesh->element));
    jb_raw(buffer, ",\"kind\":\"MESH\",\"verticesSource\":[");
    for (size_t i = 0; i < mesh->vertices.count; i++) { if (i) jb_char(buffer, ','); write_vec3(buffer, mesh->vertices.data[i]); }
    jb_raw(buffer, "],\"verticesMm\":[");
    for (size_t i = 0; i < norm->vertices.count; i++) { if (i) jb_char(buffer, ','); write_vec3(buffer, norm->vertices.data[i]); }
    jb_raw(buffer, "],\"ownerOccurrenceIds\":"); write_owner_occurrences(buffer, mesh->instances); jb_char(buffer, '}');
}

static void write_nurbs_geometry(json_buffer *buffer, const ufbx_nurbs_curve *curve, const ufbx_nurbs_curve *norm) {
    jb_raw(buffer, "{\"geometryObjectId\":"); write_id_string(buffer, source_id(&curve->element));
    jb_raw(buffer, ",\"sourceObjectId\":"); write_id_string(buffer, source_id(&curve->element));
    jb_raw(buffer, ",\"kind\":\"NURBS_CURVE\",\"controlPointsSource\":[");
    for (size_t i = 0; i < curve->control_points.count; i++) { if (i) jb_char(buffer, ','); write_vec4(buffer, curve->control_points.data[i]); }
    jb_raw(buffer, "],\"controlPointsMm\":[");
    for (size_t i = 0; i < norm->control_points.count; i++) { if (i) jb_char(buffer, ','); write_vec4(buffer, norm->control_points.data[i]); }
    jb_raw(buffer, "],\"ownerOccurrenceIds\":"); write_owner_occurrences(buffer, curve->instances); jb_char(buffer, '}');
}

static void write_geometries(json_buffer *buffer, const ufbx_scene *source, const ufbx_scene *normalized) {
    jb_raw(buffer, "\"geometries\":[");
    int first = 1;
    for (size_t i = 0; i < source->elements.count; i++) {
        const ufbx_element *element = source->elements.data[i];
        if (element->type != UFBX_ELEMENT_MESH && element->type != UFBX_ELEMENT_NURBS_CURVE) continue;
        if (!first) jb_char(buffer, ','); first = 0;
        if (element->type == UFBX_ELEMENT_MESH) {
            const ufbx_mesh *mesh = (const ufbx_mesh*)element;
            write_mesh_geometry(buffer, mesh, normalized->meshes.data[mesh->typed_id]);
        } else {
            const ufbx_nurbs_curve *curve = (const ufbx_nurbs_curve*)element;
            write_nurbs_geometry(buffer, curve, normalized->nurbs_curves.data[curve->typed_id]);
        }
    }
    jb_raw(buffer, "],");
}

static void write_edges(json_buffer *buffer, const ufbx_scene *scene) {
    jb_raw(buffer, "\"hierarchyEdges\":[");
    int first = 1;
    for (size_t i = 0; i < scene->nodes.count; i++) {
        const ufbx_node *node = scene->nodes.data[i];
        if (node->is_root || !node->parent || node->parent->is_root) continue;
        if (!first) jb_char(buffer, ','); first = 0;
        jb_raw(buffer, "{\"parentOccurrenceId\":\"occ:"); jb_u64(buffer, source_id(&node->parent->element));
        jb_raw(buffer, "\",\"childOccurrenceId\":\"occ:"); jb_u64(buffer, source_id(&node->element)); jb_raw(buffer, "\"}");
    }
    jb_raw(buffer, "],\"connectionEdges\":[");
    for (size_t i = 0; i < scene->connections_src.count; i++) {
        const ufbx_connection *connection = &scene->connections_src.data[i];
        if (i) jb_char(buffer, ',');
        jb_raw(buffer, "{\"sourceObjectId\":"); write_id_string(buffer, source_id(connection->src));
        jb_raw(buffer, ",\"destinationObjectId\":"); write_id_string(buffer, source_id(connection->dst));
        jb_raw(buffer, ",\"sourceProperty\":"); jb_string(buffer, connection->src_prop);
        jb_raw(buffer, ",\"destinationProperty\":"); jb_string(buffer, connection->dst_prop); jb_char(buffer, '}');
    }
    jb_raw(buffer, "],");
}

static void write_unsupported_record(json_buffer *buffer, const ufbx_element *element) {
    ufbx_string dom_class = element->dom_node ? element->dom_node->name : (ufbx_string){ 0 };
    jb_raw(buffer, "{\"sourceObjectId\":"); write_id_string(buffer, source_id(element));
    jb_raw(buffer, ",\"ufbxElementType\":"); jb_string_n(buffer, element_type_name(element->type), strlen(element_type_name(element->type)));
    jb_raw(buffer, ",\"ufbxElementTypeValue\":"); jb_i64(buffer, element->type);
    jb_raw(buffer, ",\"domClass\":"); jb_string(buffer, dom_class);
    jb_raw(buffer, ",\"domSubtype\":"); jb_string(buffer, dom_value_string(element, 2));
    jb_raw(buffer, ",\"domSourceName\":"); jb_string(buffer, dom_value_string(element, 1));
    jb_raw(buffer, ",\"sourceRecordDisposition\":");
    jb_string_n(buffer, record_disposition(element->type), strlen(record_disposition(element->type)));
    jb_char(buffer, '}');
}

static void write_diagnostics(json_buffer *buffer, const ufbx_scene *scene) {
    jb_raw(buffer, "\"warnings\":[");
    for (size_t i = 0; i < scene->metadata.warnings.count; i++) {
        const ufbx_warning *warning = &scene->metadata.warnings.data[i];
        if (i) jb_char(buffer, ',');
        jb_raw(buffer, "{\"type\":"); jb_i64(buffer, warning->type);
        jb_raw(buffer, ",\"description\":"); jb_string(buffer, warning->description);
        jb_raw(buffer, ",\"elementId\":"); jb_u64(buffer, warning->element_id);
        jb_raw(buffer, ",\"count\":"); jb_u64(buffer, warning->count); jb_char(buffer, '}');
    }
    jb_raw(buffer, "],\"unsupportedRecords\":[");
    int first = 1;
    for (size_t i = 0; i < scene->elements.count; i++) {
        const ufbx_element *element = scene->elements.data[i];
        if (!element->dom_node) continue;
        if (element->type == UFBX_ELEMENT_NODE || element->type == UFBX_ELEMENT_MESH || element->type == UFBX_ELEMENT_NURBS_CURVE) continue;
        if (!first) jb_char(buffer, ','); first = 0;
        write_unsupported_record(buffer, element);
    }
    jb_raw(buffer, "],\"unresolvedReferences\":[");
    first = 1;
    for (size_t i = 0; i < scene->elements.count; i++) {
        const ufbx_element *element = scene->elements.data[i];
        if (!element->dom_node || element->type != UFBX_ELEMENT_UNKNOWN) continue;
        if (!first) jb_char(buffer, ','); first = 0;
        jb_raw(buffer, "{\"sourceObjectId\":"); write_id_string(buffer, source_id(element));
        jb_raw(buffer, ",\"reason\":\"unknown-element-type\"}");
    }
    jb_char(buffer, ']');
}

static void write_graph(json_buffer *buffer, const ufbx_scene *source, const ufbx_scene *normalized) {
    jb_raw(buffer, "{\"schema\":\"FbxSourceGraph.v2\",\"file\":{\"version\":");
    jb_u64(buffer, source->metadata.version);
    jb_raw(buffer, ",\"ascii\":"); jb_raw(buffer, source->metadata.ascii ? "true" : "false");
    jb_raw(buffer, ",\"creator\":"); jb_string(buffer, source->metadata.creator); jb_raw(buffer, "},");
    jb_raw(buffer, "\"documentMetadata\":{\"originalApplication\":"); jb_string(buffer, source->metadata.original_application.name);
    jb_raw(buffer, ",\"latestApplication\":"); jb_string(buffer, source->metadata.latest_application.name); jb_raw(buffer, "},");
    jb_raw(buffer, "\"globalSettings\":{\"unitMeters\":"); jb_real(buffer, source->settings.unit_meters);
    jb_raw(buffer, ",\"axes\":{\"right\":"); jb_i64(buffer, source->settings.axes.right);
    jb_raw(buffer, ",\"up\":"); jb_i64(buffer, source->settings.axes.up);
    jb_raw(buffer, ",\"front\":"); jb_i64(buffer, source->settings.axes.front); jb_raw(buffer, "}},");
    write_source_objects(buffer, source);
    write_occurrences(buffer, source, normalized);
    write_geometries(buffer, source, normalized);
    write_edges(buffer, source);
    write_diagnostics(buffer, source);
    jb_char(buffer, '}');
}

static void set_error(const char *prefix, const ufbx_error *error) {
    const char *description = error && error->description.data ? error->description.data : "unknown parser error";
    snprintf(g_error, sizeof(g_error), "%s: %.*s", prefix, error ? (int)error->description.length : 20, description);
    g_error_length = strlen(g_error);
}

int fbx_parse(const void *data, size_t size) {
    free(g_result); g_result = NULL; g_result_length = 0; g_error_length = 0;
    ufbx_load_opts source_opts = { 0 };
    source_opts.retain_dom = true;
    source_opts.load_external_files = false;
    source_opts.ignore_embedded = true;
    ufbx_error source_error;
    ufbx_scene *source = ufbx_load_memory(data, size, &source_opts, &source_error);
    if (!source) { set_error("ufbx source parse failed", &source_error); return 0; }

    ufbx_load_opts normalized_opts = source_opts;
    normalized_opts.target_axes = ufbx_axes_right_handed_y_up;
    normalized_opts.target_unit_meters = 0.001;
    normalized_opts.space_conversion = UFBX_SPACE_CONVERSION_MODIFY_GEOMETRY;
    ufbx_error normalized_error;
    ufbx_scene *normalized = ufbx_load_memory(data, size, &normalized_opts, &normalized_error);
    if (!normalized) {
        set_error("ufbx normalization failed", &normalized_error);
        ufbx_free_scene(source);
        return 0;
    }

    json_buffer buffer = { 0 };
    write_graph(&buffer, source, normalized);
    ufbx_free_scene(normalized);
    ufbx_free_scene(source);
    if (buffer.failed) { free(buffer.data); snprintf(g_error, sizeof(g_error), "FBX source graph allocation failed."); g_error_length = strlen(g_error); return 0; }
    g_result = buffer.data;
    g_result_length = buffer.length;
    return 1;
}

const char *fbx_result_ptr(void) { return g_result; }
size_t fbx_result_len(void) { return g_result_length; }
const char *fbx_error_ptr(void) { return g_error; }
size_t fbx_error_len(void) { return g_error_length; }
