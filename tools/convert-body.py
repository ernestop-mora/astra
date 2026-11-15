# Converts the Blender Human Base Meshes body (CC0) into the app's body model.
#
#   blender -b tools/raw/human_base_meshes.blend --python tools/convert-body.py
#
# Writes:
#   public/models/body.glb                      smooth mesh, positions and normals only
#   src/components/body/model.generated.ts      front silhouette (SVG fallback) and the
#                                               surface point and normal of each body zone
#
# The source file lives in tools/raw/ (ignored by git). Source: Blender Studio,
# "Human Base Meshes", CC0. https://www.blender.org/download/demo-files/
import json
import os
import sys

import bpy
import numpy as np

SOURCE = "GEO-body_male_realistic"
# One level of subdivision smooths the cage: about 42k vertices, well under 3 MB.
SUBDIVISIONS = 1
ROWS = 240

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB = os.path.join(ROOT, "public", "models", "body.glb")
TS = os.path.join(ROOT, "src", "components", "body", "model.generated.ts")

# Body zones in the shared body frame: x to the viewer's right, y from -1 (feet)
# to 1 (head top). The script finds the front surface under each (x, y).
ZONES = {
    "head": (0.0, 0.875),
    "heart": (0.035, 0.47),
    "torso": (-0.09, 0.33),
    "abdomen": (0.05, 0.17),
}

src = bpy.data.objects[SOURCE]
for mod in list(src.modifiers):
    src.modifiers.remove(mod)
sub = src.modifiers.new("smooth", "SUBSURF")
sub.levels = SUBDIVISIONS
sub.render_levels = SUBDIVISIONS

depsgraph = bpy.context.evaluated_depsgraph_get()
mesh = bpy.data.meshes.new_from_object(src.evaluated_get(depsgraph))
mesh.transform(src.matrix_world)
for layer in list(mesh.uv_layers):
    mesh.uv_layers.remove(layer)
for attr in list(mesh.color_attributes):
    mesh.color_attributes.remove(attr)
mesh.materials.clear()
mesh.shade_smooth()

body = bpy.data.objects.new("body", mesh)
bpy.context.scene.collection.objects.link(body)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body

os.makedirs(os.path.dirname(GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=GLB,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_texcoords=False,
    export_normals=True,
    export_materials="NONE",
    export_animations=False,
    export_skins=False,
    export_morph=False,
)

# ---- body frame: height normalised to 2 units, centred on the bounding box ----
n = len(mesh.vertices)
co = np.empty(n * 3, dtype=np.float64)
mesh.vertices.foreach_get("co", co)
co = co.reshape(n, 3)
lo, hi = co.min(axis=0), co.max(axis=0)
centre = (lo + hi) / 2
scale = 2.0 / (hi[2] - lo[2])
# Blender (x right, y back, z up) to the body frame (x right, y up, z to the viewer).
frame = np.stack([(co[:, 0] - centre[0]) * scale, (co[:, 2] - centre[2]) * scale, -(co[:, 1] - centre[1]) * scale], axis=1)

mesh.calc_loop_triangles()
t = len(mesh.loop_triangles)
tri = np.empty(t * 3, dtype=np.int32)
mesh.loop_triangles.foreach_get("vertices", tri)
tri = tri.reshape(t, 3)
P = frame[tri]  # (t, 3 corners, xyz)

# ---- front silhouette: per row, the x intervals the body covers ----
rows = []
ymin, ymax = P[:, :, 1].min(axis=1), P[:, :, 1].max(axis=1)
for k in range(ROWS):
    y = -1 + (k + 0.5) * 2 / ROWS
    hit = P[(ymin <= y) & (ymax >= y)]
    spans = []
    for a, b in ((0, 1), (1, 2), (2, 0)):
        ya, yb = hit[:, a, 1], hit[:, b, 1]
        crosses = (ya - y) * (yb - y) <= 0
        with np.errstate(divide="ignore", invalid="ignore"):
            f = np.where(yb != ya, (y - ya) / (yb - ya), 0.0)
        x = hit[:, a, 0] + f * (hit[:, b, 0] - hit[:, a, 0])
        spans.append(np.where(crosses, x, np.nan))
    xs = np.stack(spans, axis=1)
    left, right = np.nanmin(xs, axis=1), np.nanmax(xs, axis=1)
    order = np.argsort(left)
    merged = []
    for i in order:
        if np.isnan(left[i]):
            continue
        if merged and left[i] <= merged[-1][1] + 0.004:
            merged[-1][1] = max(merged[-1][1], right[i])
        else:
            merged.append([left[i], right[i]])
    rows.append([round(float(v), 3) for span in merged for v in span])

# ---- zones: the front surface point and its normal ----
def surface(x, y):
    a, b, c = P[:, 0], P[:, 1], P[:, 2]
    d = (b[:, 1] - c[:, 1]) * (a[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (a[:, 1] - c[:, 1])
    with np.errstate(divide="ignore", invalid="ignore"):
        u = ((b[:, 1] - c[:, 1]) * (x - c[:, 0]) + (c[:, 0] - b[:, 0]) * (y - c[:, 1])) / d
        v = ((c[:, 1] - a[:, 1]) * (x - c[:, 0]) + (a[:, 0] - c[:, 0]) * (y - c[:, 1])) / d
    w = 1 - u - v
    inside = (u >= 0) & (v >= 0) & (w >= 0) & (np.abs(d) > 1e-12)
    z = u * a[:, 2] + v * b[:, 2] + w * c[:, 2]
    z = np.where(inside, z, -np.inf)
    i = int(np.argmax(z))
    normal = np.cross(b[i] - a[i], c[i] - a[i])
    normal = normal / np.linalg.norm(normal)
    if normal[2] < 0:
        normal = -normal
    return [x, y, float(z[i]) + 0.004], [float(v) for v in normal]

zones = {}
for name, (x, y) in ZONES.items():
    position, normal = surface(x, y)
    zones[name] = {"position": [round(v, 3) for v in position], "normal": [round(v, 3) for v in normal]}

half_width = float(np.abs(frame[:, 0]).max())
with open(TS, "w", encoding="utf-8", newline="\n") as out:
    out.write("// GENERATED by tools/convert-body.py from the Blender Human Base Meshes (CC0). Do not edit.\n")
    out.write("// Body frame: x to the viewer's right, y from -1 (feet) to 1 (head top), z toward the viewer.\n\n")
    out.write("/** Front silhouette: for each row from the feet up, pairs of x where the body starts and ends. */\n")
    out.write("export const SILHOUETTE_ROWS: readonly (readonly number[])[] = %s;\n\n" % json.dumps(rows, separators=(",", ":")))
    out.write("/** Half of the widest point, hands included. */\n")
    out.write("export const BODY_HALF_WIDTH = %.3f;\n\n" % half_width)
    out.write("/** Where each zone sits on the skin, and which way that skin faces. */\n")
    out.write("export const ZONE_SURFACE = %s as const;\n" % json.dumps(zones, indent=2))

print("BODY vertices", n, "triangles", t, "glb bytes", os.path.getsize(GLB), "half width %.3f" % half_width)
print("BODY zones", json.dumps(zones))
sys.stdout.flush()
