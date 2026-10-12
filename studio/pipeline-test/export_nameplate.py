"""Original Night Floor nameplate. Mesh and GLB export only.

Does not edit the laboratory, save a .blend, download files, or run other programs.
Engraving is converted to mesh before export, so the GLB contains no font files.
"""

import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "nameplate.glb"
NAME_FONT = ROOT / "fonts" / "SchibstedGrotesk-SemiBold.ttf"
MONO_FONT = ROOT / "fonts" / "IBMPlexMono-Regular.ttf"

# Matches the placeholder in furnishings.ts: a 0.48 × 0.20 face on a mount
# rotated -0.42 rad about X, centered at NAMEPLATE (y = 0.96). Bench top is 0.76.
TILT = 0.42
PLATE_W = 0.48
PLATE_H = 0.20
PLATE_T = 0.008
MOUNT_Y = 0.96
BENCH_TOP = 0.76
BEVEL = 0.0016
ENGRAVE = 0.00145

for font in (NAME_FONT, MONO_FONT):
    if not font.is_file():
        sys.exit(f"Missing OFL font file: {font}")

if OUTPUT.exists():
    OUTPUT.unlink()


def srgb(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def active(obj: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj


def world_bounds(obj: bpy.types.Object) -> list[Vector]:
    bpy.context.view_layer.update()
    return [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]


def brushed_roughness() -> bpy.types.Image:
    image = bpy.data.images.new("BrassBrush", 2048, 512, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    pixels: list[float] = []
    for row in range(512):
        hair = 0.37 + 0.006 * math.sin(row * 0.83) + 0.003 * math.sin(row * 2.17)
        for column in range(2048):
            grain = 0.003 * math.sin((column * 0.37) + (row * 1.9))
            value = min(0.39, max(0.35, hair + grain))
            pixels.extend((value, value, value, 1.0))
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    return image


def brass_material() -> bpy.types.Material:
    material = bpy.data.materials.new("NameplateBrass")
    if material.node_tree is None:
        material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    # Existing studio brass #d4b06a, stored in the GLB as linear color.
    principled.inputs["Base Color"].default_value = (
        srgb(0xD4 / 255),
        srgb(0xB0 / 255),
        srgb(0x6A / 255),
        1.0,
    )
    principled.inputs["Metallic"].default_value = 1.0
    principled.inputs["Roughness"].default_value = 0.34
    # Brush is a roughness image on the UV map. This project's GLTFLoader does not
    # apply KHR_materials_anisotropy, so the anisotropic slider is left at zero.
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = brushed_roughness()
    links.new(texture.outputs["Color"], principled.inputs["Roughness"])
    return material


def engraved_material() -> bpy.types.Material:
    material = bpy.data.materials.new("EngravedBrass")
    if material.node_tree is None:
        material.use_nodes = True
    principled = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    principled.inputs["Base Color"].default_value = (
        srgb(0xC4 / 255),
        srgb(0x9A / 255),
        srgb(0x58 / 255),
        1.0,
    )
    principled.inputs["Metallic"].default_value = 1.0
    principled.inputs["Roughness"].default_value = 0.68
    return material


def cutter(body: str, font_path: Path, width: float, center_z: float, material: bpy.types.Material) -> bpy.types.Object:
    curve = bpy.data.curves.new(body, type="FONT")
    curve.body = body
    curve.font = bpy.data.fonts.load(str(font_path), check_existing=True)
    curve.dimensions = "2D"
    curve.fill_mode = "BOTH"
    curve.fill_solver = "CDT"
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = 0.04
    # Thicker than the recess so the cutter is a closed solid. Blender 5.2 adds
    # this depth along local +Z; the placement below sets the cut depth.
    curve.extrude = 0.004
    curve.resolution_u = 16
    obj = bpy.data.objects.new(body, curve)
    bpy.context.collection.objects.link(obj)
    active(obj)
    obj.rotation_euler.x = math.pi / 2
    bpy.ops.object.convert(target="MESH")
    obj.data.materials.append(material)
    bpy.ops.object.transform_apply(rotation=True)
    corners = world_bounds(obj)
    span = max(corner.x for corner in corners) - min(corner.x for corner in corners)
    obj.scale *= width / span
    bpy.ops.object.transform_apply(scale=True)
    corners = world_bounds(obj)
    obj.location.x -= (min(corner.x for corner in corners) + max(corner.x for corner in corners)) / 2
    obj.location.z += center_z - (min(corner.z for corner in corners) + max(corner.z for corner in corners)) / 2
    bpy.context.view_layer.update()
    corners = world_bounds(obj)
    # Front face is the more-negative Y side. The cutter overlaps that face by
    # ENGRAVE and protrudes past it, so the letters stay a recess.
    front = -PLATE_T / 2
    obj.location.y += (front + ENGRAVE) - max(corner.y for corner in corners)
    bpy.ops.object.transform_apply(location=True)
    close_cutter(obj)
    active(obj)
    corners = world_bounds(obj)
    obj.location.y += (front + ENGRAVE) - max(corner.y for corner in corners)
    bpy.ops.object.transform_apply(location=True)
    return obj


def close_cutter(obj: bpy.types.Object) -> None:
    active(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=1e-6)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    open_edges = nonmanifold_edges(obj.data)
    print(f"CUTTER {obj.name!r} vertices={len(obj.data.vertices)} nonmanifold_edges={open_edges}")
    if open_edges == 0:
        lip(obj)
        return
    remesh = obj.modifiers.new("Close", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.0003
    active(obj)
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    print(f"REMESHED {obj.name!r} vertices={len(obj.data.vertices)} nonmanifold_edges={nonmanifold_edges(obj.data)}")


def lip(obj: bpy.types.Object) -> None:
    backup = obj.data.copy()
    active(obj)
    bevel = obj.modifiers.new("Lip", "BEVEL")
    bevel.width = 0.00012
    bevel.segments = 1
    bevel.affect = "EDGES"
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(35)
    try:
        bpy.ops.object.modifier_apply(modifier=bevel.name)
    except RuntimeError:
        if bevel.name in obj.modifiers:
            obj.modifiers.remove(obj.modifiers[bevel.name])
        obj.data = backup
        return
    if nonmanifold_edges(obj.data):
        bpy.data.meshes.remove(obj.data)
        obj.data = backup
        print(f"LIP skipped for {obj.name!r}; bevel left the cutter open")
        return
    bpy.data.meshes.remove(backup)
    print(f"LIP {obj.name!r} vertices={len(obj.data.vertices)}")


def nonmanifold_edges(mesh: bpy.types.Mesh) -> int:
    topology = bmesh.new()
    topology.from_mesh(mesh)
    count = sum(1 for edge in topology.edges if not edge.is_manifold)
    topology.free()
    return count


def difference(plate: bpy.types.Object, tool: bpy.types.Object) -> None:
    last_error = "no solver ran"
    before = len(plate.data.vertices)
    for solver in ("MANIFOLD", "EXACT"):
        active(plate)
        modifier = plate.modifiers.new("Engrave", "BOOLEAN")
        modifier.operation = "DIFFERENCE"
        modifier.object = tool
        modifier.solver = solver
        modifier.material_mode = "TRANSFER"
        if solver == "EXACT":
            modifier.use_hole_tolerant = True
            modifier.use_self = True
        name = modifier.name
        try:
            bpy.ops.object.modifier_apply(modifier=name)
        except RuntimeError as exc:
            last_error = str(exc)
            if name in plate.modifiers:
                plate.modifiers.remove(plate.modifiers[name])
            continue
        if name in plate.modifiers:
            plate.modifiers.remove(plate.modifiers[name])
            last_error = f"{solver} did not apply"
            continue
        after = len(plate.data.vertices)
        if after <= before:
            last_error = f"{solver} left the plate unchanged ({before} vertices)"
            continue
        print(f"ENGRAVED {tool.name!r} with {solver}: {before} -> {after} vertices")
        bpy.data.objects.remove(tool, do_unlink=True)
        return
    raise RuntimeError(f"Engraving boolean failed: {last_error}")


def post(x: float, material: bpy.types.Material) -> bpy.types.Object:
    gap = (MOUNT_Y - (PLATE_H / 2) * math.cos(TILT)) - BENCH_TOP
    start = Vector((x, 0.001, -PLATE_H / 2 + 0.004))
    direction = Vector((0.0, math.sin(TILT), -math.cos(TILT)))
    end = start + direction * (gap + 0.004)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.0045, depth=(end - start).length)
    shaft = bpy.context.active_object
    shaft.name = "NameplatePost"
    shaft.location = (start + end) / 2
    shaft.rotation_euler = (end - start).to_track_quat("Z", "Y").to_euler()
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.011, depth=0.003, location=end)
    foot = bpy.context.active_object
    foot.rotation_euler = shaft.rotation_euler
    for part in (shaft, foot):
        part.data.materials.append(material)
    active(shaft)
    foot.select_set(True)
    bpy.ops.object.join()
    return shaft


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
plate = bpy.context.active_object
plate.name = "Nameplate"
plate.data.name = "Nameplate"
plate.scale = (PLATE_W, PLATE_T, PLATE_H)
bpy.ops.object.transform_apply(scale=True)
bevel = plate.modifiers.new("Bevel", "BEVEL")
bevel.width = BEVEL
bevel.segments = 3
bevel.affect = "EDGES"
bpy.ops.object.modifier_apply(modifier=bevel.name)

material = brass_material()
cut = engraved_material()
plate.data.materials.append(material)
name = cutter("Hajar Mrifag", NAME_FONT, 0.34, 0.022, cut)
line = cutter("Software Engineering · 2027", MONO_FONT, 0.38, -0.050, cut)
difference(plate, name)
difference(plate, line)

for side in (-0.11, 0.11):
    post(side, material)

active(plate)
for obj in bpy.context.scene.objects:
    obj.select_set(True)
bpy.ops.object.join()
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.cube_project()
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))

bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_animations=False,
    export_materials="EXPORT",
    export_draco_mesh_compression_enable=False,
)
print("EXPORTED", OUTPUT)
