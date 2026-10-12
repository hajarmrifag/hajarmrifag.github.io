"""Pipeline test: one original beveled brass bar, exported as a single GLB."""

import bpy

OUTPUT = "/Users/hajarmrifag/hajarmrifag.github.io-1/studio/pipeline-test/brass-token.glb"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
token = bpy.context.active_object
token.name = "BrassToken"
token.scale = (0.06, 0.035, 0.02)
bpy.ops.object.transform_apply(scale=True)

bevel = token.modifiers.new(name="Bevel", type="BEVEL")
bevel.width = 0.004
bevel.segments = 3
bevel.affect = "EDGES"
bpy.ops.object.modifier_apply(modifier=bevel.name)
bpy.ops.object.shade_smooth_by_angle(angle=0.7)

brass = bpy.data.materials.new(name="Brass")
brass.use_nodes = True
principled = next(node for node in brass.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
principled.inputs["Base Color"].default_value = (0.68, 0.45, 0.22, 1.0)
principled.inputs["Metallic"].default_value = 1.0
principled.inputs["Roughness"].default_value = 0.32
token.data.materials.append(brass)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_animations=False,
    export_materials="EXPORT",
    export_draco_mesh_compression_enable=False,
)
print("EXPORTED", OUTPUT)
