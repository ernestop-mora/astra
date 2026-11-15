# Lists the mesh objects of a .blend with their size, so one can be picked.
# blender -b tools/raw/human_base_meshes.blend --python tools/inspect-blend.py
import bpy

for scene in bpy.data.scenes:
    print("SCENE", scene.name)
for coll in bpy.data.collections:
    print("COLLECTION", coll.name, [o.name for o in coll.objects][:12])
for ob in bpy.data.objects:
    if ob.type != "MESH":
        continue
    d = ob.dimensions
    mods = [m.type for m in ob.modifiers]
    print(
        "MESH", ob.name, "verts", len(ob.data.vertices), "polys", len(ob.data.polygons),
        "dims %.2f %.2f %.2f" % (d.x, d.y, d.z), "loc %.2f %.2f %.2f" % tuple(ob.location), mods,
    )
