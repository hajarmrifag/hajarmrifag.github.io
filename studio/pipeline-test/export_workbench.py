"""Original Night Floor workbench. Mesh and GLB export only.

Does not edit the laboratory, save a .blend, download files, or run other programs.
Textures are generated in memory and embedded in the GLB. Numpy is Blender's own.

Coordinate contract, meters. Blender is Z-up. Export uses Yup, which maps
Blender (x, y, z) to glTF / Three.js (x, z, -y):

  Three.js X length  -> Blender X
  Three.js Y up      -> Blender Z
  Three.js Z depth   -> Blender -Y

The usable top is exactly y = 0.76 in Three.js. Station groups, the nameplate,
the notebook, and the pen already meet that plane and must not be moved.
"""

import math
import sys
import tempfile
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "workbench.glb"

# Current slab in furnishings.ts, with the contact face lowered from the
# procedural box top (0.7625) onto the shared BENCH.top plane.
X0 = -1.77
X1 = 12.22
FRONT = -0.01
BACK = 0.91
TOP = 0.76
BOTTOM = 0.715
DEPTH = BACK - FRONT
BOARD = X1 - X0

# Seven frames: both ends, plus one in each gap between the six stations.
# Stations stay at x = 0, 2.2, 4.4, 6.6, 8.8, 11. Legs are 48 mm wide.
FRAME_X = (-1.69, 1.10, 3.30, 5.50, 7.70, 9.90, 12.05)
LEG_X = 0.048
LEG_Y = 0.020
LEG_FRONT = FRONT + 0.040

# Left return, clear of the end leg and of the Sourced station at x = 0.
RETURN_X0 = -1.64
RETURN_X1 = -0.40
RETURN_Z0 = 0.368
RETURN_Z1 = 0.708
STILE = 0.024
RAIL = 0.016
REVEAL = 0.003
DRAWER_H = 0.140
PULL = 0.096

# Repeated drawers sit to the right of each middle leg so the leg does not
# pass through the drawer. Five gaps, each drawer 0.72 m wide.
BAY_DRAWER_W = 0.72
BAY_DRAWER_H = 0.120
BAY_GAP = 0.040

ROD_X0 = -1.30
ROD_X1 = 12.15
ROD_Y = 0.45
ROD_Z = 1.788
ROD_R = 0.008

# Photographic veneer, CC0, listed in walnut-sources.txt.
# Three 1 m sheets sit side by side in one atlas. 4096 is the phone texture limit.
TEXTURE_DIR = ROOT / "textures" / "walnut"
SHEET_FILES = (
    "black_walnut_veneer_02",
    "european_walnut_veneer_05",
    "black_walnut_veneer_03",
)
SHEETS = len(SHEET_FILES)
PLANK = 1.0
CELL = 0.25
COLOR_W = 4096
COLOR_H = 1024
NORMAL_W = 2048
NORMAL_H = 512
# The end face is 0.92 m across and 45 mm thick. A square ring image
# stretched over that face becomes a chevron, so the map matches the cut.
END_W = 1024
END_H = 64
STEEL_N = 512
TRI_CEILING = 40000


def srgb(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def linear_color(hex_rgb: int) -> tuple[float, float, float, float]:
    return (
        srgb(((hex_rgb >> 16) & 255) / 255),
        srgb(((hex_rgb >> 8) & 255) / 255),
        srgb((hex_rgb & 255) / 255),
        1.0,
    )


def fail(message: str) -> None:
    sys.exit(message)


def active(obj: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj


def extents(obj: bpy.types.Object) -> tuple[float, float, float, float, float, float]:
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    xs = [corner.x for corner in corners]
    ys = [corner.y for corner in corners]
    zs = [corner.z for corner in corners]
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def expect_near(label: str, value: float, expected: float, tolerance: float) -> None:
    if abs(value - expected) > tolerance:
        fail(f"{label}: {value:.5f}, expected {expected:.5f} ± {tolerance}")


def to_linear_srgb(image: np.ndarray) -> np.ndarray:
    return np.where(image <= 0.04045, image / 12.92, ((image + 0.055) / 1.055) ** 2.4).astype(np.float32)


def to_srgb(image: np.ndarray) -> np.ndarray:
    clipped = np.maximum(image, 0.0)
    encoded = np.where(
        clipped <= 0.0031308,
        clipped * 12.92,
        1.055 * np.power(clipped, 1.0 / 2.4) - 0.055,
    )
    return encoded.astype(np.float32)


def new_image(
    name: str,
    width: int,
    height: int,
    pixels: np.ndarray,
    color: bool,
    file_format: str = "JPEG",
    as_srgb_bytes: bool = False,
) -> bpy.types.Image:
    image = bpy.data.images.new(name, width, height, alpha=False, float_buffer=False)
    colorspace = "sRGB" if color else "Non-Color"
    image.colorspace_settings.name = colorspace
    image.file_format = file_format
    # image.save() stores the float buffer directly in the JPEG. The glTF
    # exporter then embeds that file. Color maps therefore have to be sRGB
    # already, or the bench is exported as the linear values and looks black.
    stored = pixels
    if as_srgb_bytes:
        stored = np.array(pixels, copy=True)
        stored[..., :3] = to_srgb(stored[..., :3])
    flat = np.ascontiguousarray(stored, dtype=np.float32).ravel()
    if flat.size != width * height * 4:
        fail(f"{name} pixel buffer is {flat.size}, expected {width * height * 4}")
    image.pixels.foreach_set(flat)
    image.update()
    # Generated images export as PNG even when file_format is JPEG. Write a
    # real file and reload it so the color map stays JPEG and the normal stays PNG.
    # Outside the project. The only file this script writes into the repo is workbench.glb.
    baked = Path(tempfile.gettempdir()) / "night-floor-workbench-bake"
    baked.mkdir(parents=True, exist_ok=True)
    path = baked / f"{name}.{'jpg' if file_format == 'JPEG' else 'png'}"
    scene = bpy.context.scene
    scene.render.image_settings.file_format = file_format
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 88
    image.filepath_raw = str(path)
    image.save()
    bpy.data.images.remove(image)
    loaded = bpy.data.images.load(str(path), check_existing=False)
    loaded.name = name
    loaded.colorspace_settings.name = colorspace
    return loaded


def value_noise(u: np.ndarray, v: np.ndarray, cells_u: float, cells_v: float, seed: int) -> np.ndarray:
    """Smooth noise. Coordinates are 0–1 across the whole board, so nothing has to tile."""
    x = u * cells_u
    y = v * cells_v
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    xf = (x - x0).astype(np.float32)
    yf = (y - y0).astype(np.float32)

    def lattice(ix: np.ndarray, iy: np.ndarray) -> np.ndarray:
        n = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + np.int64(seed)) & np.int64(0x7FFFFFFF)
        n = (n ^ (n >> 13)) * np.int64(1274126177) & np.int64(0xFFFFFFFF)
        return (n & np.int64(65535)).astype(np.float32) / np.float32(65535.0)

    s = xf * xf * xf * (xf * (xf * 6.0 - 15.0) + 10.0)
    t = yf * yf * yf * (yf * (yf * 6.0 - 15.0) + 10.0)
    n00 = lattice(x0, y0)
    n10 = lattice(x0 + 1, y0)
    n01 = lattice(x0, y0 + 1)
    n11 = lattice(x0 + 1, y0 + 1)
    return n00 * (1 - s) * (1 - t) + n10 * s * (1 - t) + n01 * (1 - s) * t + n11 * s * t


def load_photo(path: Path, width: int, height: int, color: bool) -> np.ndarray:
    if not path.is_file():
        fail(f"Missing walnut texture: {path}")
    image = bpy.data.images.load(str(path), check_existing=False)
    if not color:
        image.colorspace_settings.name = "Non-Color"
    source_w, source_h = image.size
    buffer = np.empty(source_w * source_h * 4, dtype=np.float32)
    image.pixels.foreach_get(buffer)
    bpy.data.images.remove(image)
    # Blender's first row is the bottom of the file. Work top-down from here.
    pixels = np.flipud(buffer.reshape((source_h, source_w, 4))[..., :3])
    # A color JPEG comes back as stored sRGB values, not scene-linear light.
    if color:
        pixels = to_linear_srgb(pixels)
    return resize_image(pixels, width, height)


def resize_image(image: np.ndarray, width: int, height: int) -> np.ndarray:
    source_h, source_w, channels = image.shape
    ys = (np.arange(height, dtype=np.float32) + 0.5) * (source_h / height) - 0.5
    xs = (np.arange(width, dtype=np.float32) + 0.5) * (source_w / width) - 0.5
    y0 = np.clip(np.floor(ys).astype(np.int32), 0, source_h - 1)
    x0 = np.clip(np.floor(xs).astype(np.int32), 0, source_w - 1)
    y1 = np.clip(y0 + 1, 0, source_h - 1)
    x1 = np.clip(x0 + 1, 0, source_w - 1)
    fy = (ys - y0).astype(np.float32)[:, None, None]
    fx = (xs - x0).astype(np.float32)[None, :, None]
    top = image[y0][:, x0] * (1.0 - fx) + image[y0][:, x1] * fx
    bottom = image[y1][:, x0] * (1.0 - fx) + image[y1][:, x1] * fx
    mixed = top * (1.0 - fy) + bottom * fy
    return mixed.reshape((height, width, channels)).astype(np.float32)


LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def grade_walnut_sheets(photos: list[np.ndarray], names: tuple[str, ...]) -> list[np.ndarray]:
    """Give the three scans one dark-walnut level and one contrast.

    The old grade multiplied every sheet by the same 0.45, so the lighter
    black-walnut scans stayed lighter than European walnut. This keeps each
    photograph's grain and only moves its luminance and its average color.
    """
    target = np.array(linear_color(0x3E291C)[:3], dtype=np.float32)
    target_y = float(target @ LUMA)
    means: list[float] = []
    stds: list[float] = []
    for photo in photos:
        luma = photo @ LUMA
        means.append(float(luma.mean()))
        stds.append(float(luma.std()))
    # Contrast each sheet would have if it were only darkened to the target.
    # The middle of those three is the shared contrast, so the flattest sheet
    # is lifted slightly and the boldest is eased slightly.
    scaled = sorted(std * (target_y / max(mean, 1e-6)) for mean, std in zip(means, stds))
    target_std = scaled[len(scaled) // 2]
    graded: list[np.ndarray] = []
    for name, photo, mean_y, std_y in zip(names, photos, means, stds):
        luma = photo @ LUMA
        residual = photo - luma[..., None]
        contrast = target_std / max(std_y, 1e-6)
        image = (luma - mean_y)[..., None] * contrast + target_y + residual * contrast
        mean_rgb = image.reshape(-1, 3).mean(axis=0)
        image = image + (target - mean_rgb)
        clipped = float(np.mean((image < 0.0) | (image > 1.0)))
        image = np.clip(image, 0.0, 1.0).astype(np.float32)
        after = image @ LUMA
        print(
            f"GRADE {name} luma {mean_y:.4f}->{float(after.mean()):.4f} "
            f"std {std_y:.4f}->{float(after.std()):.4f} clip {clipped:.4f}"
        )
        graded.append(image)
    return graded


def plank_slot(x: float) -> tuple[int, float, bool]:
    """Which 1 m sheet, where that plank starts, and whether this repeat is mirrored."""
    span = max(0.0, x - X0)
    index = int(span / PLANK)
    last = int((X1 - X0 - 1e-6) / PLANK)
    index = min(index, last)
    return index % SHEETS, X0 + index * PLANK, (index // SHEETS) % 2 == 1


def atlas_uv(x: float, across_m: float, origin: float, sheet: int, flip: bool) -> tuple[float, float]:
    length = min(PLANK, max(1e-4, X1 - origin))
    along = min(1.0, max(0.0, (x - origin) / length))
    if flip:
        along = 1.0 - along
    u_span = CELL * (length / PLANK)
    across = min(0.98, max(0.0, across_m / PLANK))
    return sheet * CELL + along * u_span, across


def rgba(color: np.ndarray) -> np.ndarray:
    image = np.empty(color.shape[:2] + (4,), dtype=np.float32)
    image[..., 0:3] = np.clip(color, 0.0, 1.0)
    image[..., 3] = 1.0
    return np.flipud(image)


def pack_sheets(width: int, height: int, color: bool) -> np.ndarray:
    cell_w = width // 4
    atlas = np.zeros((height, width, 3), dtype=np.float32)
    kind = "diff" if color else "nor_gl"
    photos = [
        load_photo(TEXTURE_DIR / f"{name}_{kind}_2k.jpg", cell_w, height, color)
        for name in SHEET_FILES
    ]
    if color:
        photos = grade_walnut_sheets(photos, SHEET_FILES)
    for index, (name, photo) in enumerate(zip(SHEET_FILES, photos)):
        atlas[:, index * cell_w : (index + 1) * cell_w, :] = photo
        print(f"SHEET {name} {kind} {cell_w}x{height}")
    return atlas


def wood_images() -> tuple[bpy.types.Image, bpy.types.Image]:
    color = pack_sheets(COLOR_W, COLOR_H, True)
    normal = pack_sheets(NORMAL_W, NORMAL_H, False)
    return (
        new_image("WalnutColor", COLOR_W, COLOR_H, rgba(color), True, "JPEG", True),
        new_image("WalnutNormal", NORMAL_W, NORMAL_H, rgba(normal), False, "PNG"),
    )


def end_grain_image() -> bpy.types.Image:
    yy, xx = np.mgrid[0:END_H, 0:END_W]
    u = (xx / END_W).astype(np.float32)
    v = (yy / END_H).astype(np.float32)
    depth = u * np.float32(DEPTH)
    thick = v * np.float32(TOP - BOTTOM)
    # Pith is below the board, so this cut is a stack of shallow arcs.
    dx = depth - np.float32(DEPTH * 0.47)
    dy = thick + np.float32(0.16)
    radius = np.sqrt(dx * dx + dy * dy).astype(np.float32)
    radius += (value_noise(u, v, 5.0, 2.0, 3) - 0.5) * np.float32(0.003)
    phase = radius / np.float32(0.0036) + (value_noise(u, v, 7.0, 2.0, 12) - 0.5) * 0.7
    cycle = phase - np.floor(phase)
    ring = np.exp(-((cycle - 0.22) ** 2) / 0.02)
    ring *= 0.72 + 0.28 * value_noise(u, v, 4.0, 2.0, 20)
    shade = np.clip(ring * 0.5, 0.0, 1.0)
    dark = np.array([0x26, 0x17, 0x0F], dtype=np.float32) / 255.0
    mid = np.array([0x3E, 0x29, 0x1C], dtype=np.float32) / 255.0
    color = mid * (1.0 - 0.34 * shade[..., None]) + dark * (0.34 * shade[..., None])
    return new_image("WalnutEnd", END_W, END_H, rgba(color), True)


def steel_roughness_image() -> bpy.types.Image:
    u = np.linspace(0.0, 1.0, STEEL_N, endpoint=False, dtype=np.float32)
    v = np.linspace(0.0, 1.0, STEEL_N, endpoint=False, dtype=np.float32)
    uu, vv = np.meshgrid(u, v)
    value = 0.56 + 0.03 * np.sin(2 * np.pi * 4 * uu) * np.sin(2 * np.pi * 3 * vv)
    value += 0.018 * np.sin(2 * np.pi * (uu + vv) * 8)
    value = np.clip(value, 0.48, 0.66)
    pixels = np.empty((STEEL_N, STEEL_N, 4), dtype=np.float32)
    pixels[..., 0] = value
    pixels[..., 1] = value
    pixels[..., 2] = value
    pixels[..., 3] = 1.0
    return new_image("SteelRough", STEEL_N, STEEL_N, np.flipud(pixels), False)


def principled(material: bpy.types.Material) -> tuple[bpy.types.NodeTree, bpy.types.Node]:
    if material.node_tree is None:
        material.use_nodes = True
    tree = material.node_tree
    node = next(item for item in tree.nodes if item.type == "BSDF_PRINCIPLED")
    return tree, node


def link_color(tree: bpy.types.NodeTree, node: bpy.types.Node, image: bpy.types.Image, socket: str) -> None:
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = "EXTEND"
    tree.links.new(tex.outputs["Color"], node.inputs[socket])


def make_materials() -> dict[str, bpy.types.Material]:
    albedo, normal_image = wood_images()
    walnut = bpy.data.materials.new("Walnut")
    tree, node = principled(walnut)
    node.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    node.inputs["Metallic"].default_value = 0.0
    node.inputs["Roughness"].default_value = 0.64
    link_color(tree, node, albedo, "Base Color")
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = normal_image
    tex.extension = "EXTEND"
    normal = tree.nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.40
    tree.links.new(tex.outputs["Color"], normal.inputs["Color"])
    tree.links.new(normal.outputs["Normal"], node.inputs["Normal"])

    end = bpy.data.materials.new("WalnutEnd")
    tree, node = principled(end)
    node.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    node.inputs["Metallic"].default_value = 0.0
    node.inputs["Roughness"].default_value = 0.68
    link_color(tree, node, end_grain_image(), "Base Color")

    steel = bpy.data.materials.new("BlackenedSteel")
    tree, node = principled(steel)
    node.inputs["Base Color"].default_value = linear_color(0x3A4046)
    node.inputs["Metallic"].default_value = 1.0
    node.inputs["Roughness"].default_value = 1.0
    link_color(tree, node, steel_roughness_image(), "Roughness")

    brass = bpy.data.materials.new("SatinBrass")
    _tree, node = principled(brass)
    # Same satin as the approved nameplate. No roughness map: a dark map
    # would multiply this factor back down and blow out under the station pools.
    node.inputs["Base Color"].default_value = linear_color(0xD4B06A)
    node.inputs["Metallic"].default_value = 1.0
    node.inputs["Roughness"].default_value = 0.58
    return {"walnut": walnut, "end": end, "steel": steel, "brass": brass}


def dedupe(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    cleaned = [points[0]]
    for point in points[1:]:
        if math.hypot(point[0] - cleaned[-1][0], point[1] - cleaned[-1][1]) > 1e-7:
            cleaned.append(point)
    if math.hypot(cleaned[0][0] - cleaned[-1][0], cleaned[0][1] - cleaned[-1][1]) < 1e-7:
        cleaned.pop()
    return cleaned


def slab_profile() -> list[tuple[float, float]]:
    radius = 0.0025
    nose = 0.018
    groove = 0.008
    recess = 0.0012
    chamfer = 0.0004
    center = (FRONT + radius, TOP - radius)
    groove_front = FRONT + radius + nose
    groove_back = groove_front + groove
    points = [
        (FRONT + 0.001, BOTTOM),
        (BACK - 0.001, BOTTOM),
        (BACK, BOTTOM + 0.001),
        (BACK, TOP - 0.0015),
        (BACK - 0.0015, TOP),
        (groove_back + chamfer, TOP),
        (groove_back, TOP - chamfer),
        (groove_back, TOP - recess + chamfer),
        (groove_back - chamfer, TOP - recess),
        (groove_front + chamfer, TOP - recess),
        (groove_front, TOP - recess + chamfer),
        (groove_front, TOP - chamfer),
        (groove_front - chamfer, TOP),
        (FRONT + radius, TOP),
    ]
    for step in range(1, 7):
        theta = -math.pi / 2 * step / 6
        points.append((center[0] + radius * math.sin(theta), center[1] + radius * math.cos(theta)))
    points.append((FRONT, BOTTOM + 0.001))
    return dedupe(points)


def inlay_profile() -> list[tuple[float, float]]:
    radius = 0.0025
    nose = 0.018
    groove = 0.008
    inset = 0.00045
    y0 = FRONT + radius + nose + inset
    y1 = FRONT + radius + nose + groove - inset
    floor = TOP - 0.0012 + 0.00015
    crown = TOP - 0.00045
    mid = (y0 + y1) / 2
    return dedupe(
        [
            (y0, floor),
            (y1, floor),
            (y1, crown - 0.00015),
            (mid, crown),
            (y0, crown - 0.00015),
        ]
    )


def x_slices() -> list[float]:
    values = [X0]
    cursor = X0
    while cursor < X1 - 0.49:
        cursor += 0.5
        values.append(cursor)
    if values[-1] < X1 - 1e-6:
        values.append(X1)
    else:
        values[-1] = X1
    return values


def ensure_outward(bm: bmesh.types.BMesh) -> None:
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    top = max(bm.faces, key=lambda face: sum(vert.co.z for vert in face.verts) / len(face.verts))
    if top.normal.z < 0.5:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
        bm.normal_update()


def extrude_profile(
    name: str,
    profile: list[tuple[float, float]],
    x_values: list[float],
    materials: list[bpy.types.Material],
    end_material: bool,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    rings = [[bm.verts.new((x, y, z)) for y, z in profile] for x in x_values]
    count = len(profile)
    for segment, _x in enumerate(x_values[:-1]):
        left = rings[segment]
        right = rings[segment + 1]
        for index in range(count):
            nxt = (index + 1) % count
            bm.faces.new((left[index], right[index], right[nxt], left[nxt]))
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    ensure_outward(bm)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    bm.normal_update()
    x_start, x_end = x_values[0], x_values[-1]

    def is_end(face: bmesh.types.BMFace) -> bool:
        xs = [vert.co.x for vert in face.verts]
        # Concave end caps do not get a reliable face normal, so the cut is positional.
        return max(xs) - min(xs) < 1e-5 and (abs(xs[0] - x_start) < 1e-4 or abs(xs[0] - x_end) < 1e-4)

    def paint(face: bmesh.types.BMFace) -> None:
        end = is_end(face)
        face.material_index = 1 if end and end_material else 0
        normal = face.normal
        center_x = sum(loop.vert.co.x for loop in face.loops) / len(face.loops)
        sheet, origin, flip = plank_slot(center_x)
        for loop in face.loops:
            x, y, z = loop.vert.co
            if end:
                loop[uv].uv = ((y - FRONT) / DEPTH, (z - BOTTOM) / (TOP - BOTTOM))
            elif abs(normal.z) >= abs(normal.y):
                loop[uv].uv = atlas_uv(x, y - FRONT, origin, sheet, flip)
            else:
                loop[uv].uv = atlas_uv(x, (z - BOTTOM) + 0.08, origin, sheet, flip)

    for face in bm.faces:
        paint(face)
    caps = [face for face in bm.faces if is_end(face)]
    if end_material and len(caps) != 2:
        fail(f"{name} expected two end caps, found {len(caps)}")
    if caps:
        bmesh.ops.triangulate(bm, faces=caps, quad_method="BEAUTY", ngon_method="EAR_CLIP")
        bm.normal_update()
        for face in bm.faces:
            if is_end(face):
                paint(face)
    if end_material:
        painted = sum(1 for face in bm.faces if face.material_index == 1)
        if painted < 10:
            fail(f"{name} end grain kept only {painted} faces")
    bm.to_mesh(mesh)
    bm.free()
    for material in materials:
        mesh.materials.append(material)
    return obj


def finish_cube(bevel: float, segments: int) -> None:
    if bevel <= 0:
        return
    modifier = bpy.context.active_object.modifiers.new("Bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = segments
    modifier.affect = "EDGES"
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def cube(
    name: str,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
    material: bpy.types.Material,
    bevel: float = 0.0,
    segments: int = 1,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0))
    bpy.ops.object.transform_apply(scale=True)
    finish_cube(bevel, segments)
    obj.data.materials.append(material)
    world_uv(obj)
    return obj


def cylinder(
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    rotation: tuple[float, float, float],
    material: bpy.types.Material,
    vertices: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def world_uv(obj: bpy.types.Object) -> None:
    """UVs follow the bench, not each piece's local origin, so the grain is one board."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    uv = bm.loops.layers.uv.active or bm.loops.layers.uv.new("UVMap")
    world = obj.matrix_world
    for face in bm.faces:
        normal = (world.to_3x3() @ face.normal).normalized()
        points = [world @ loop.vert.co for loop in face.loops]
        xs = [point.x for point in points]
        zs = [point.z for point in points]
        tall = (max(zs) - min(zs)) > (max(xs) - min(xs)) * 1.8
        sheet, origin, flip = plank_slot(sum(xs) / len(xs))
        for loop, point in zip(face.loops, points):
            x, y, z = point
            if abs(normal.z) >= abs(normal.x) and abs(normal.z) >= abs(normal.y):
                uv_coord = atlas_uv(x, y - FRONT, origin, sheet, flip)
            elif abs(normal.y) >= abs(normal.x) and tall:
                # Stiles: the sheet's long grain runs up the piece.
                along = min(0.98, max(0.0, (z - RETURN_Z0) / PLANK))
                across = min(0.98, max(0.0, 0.40 + (x - min(xs)) / PLANK))
                uv_coord = (sheet * CELL + along * CELL, across)
            elif abs(normal.y) >= abs(normal.x):
                # Rails and drawer fronts: grain runs across the face.
                uv_coord = atlas_uv(x, 0.12 + (z - 0.36), origin, sheet, flip)
            else:
                uv_coord = atlas_uv(z, 0.20 + (y - FRONT) * 0.05, origin, sheet, flip)
            loop[uv].uv = uv_coord
    bm.to_mesh(obj.data)
    bm.free()


def build_slab(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    return extrude_profile(
        "Slab",
        slab_profile(),
        x_slices(),
        [materials["walnut"], materials["end"]],
        True,
    )


def build_inlay(material: bpy.types.Material) -> bpy.types.Object:
    return extrude_profile("Inlay", inlay_profile(), [X0 + 0.008, X1 - 0.008], [material], False)


def build_frame(material: bpy.types.Material) -> list[bpy.types.Object]:
    parts: list[bpy.types.Object] = []
    for index, x in enumerate(FRAME_X):
        half = LEG_X / 2
        parts.append(
            cube(
                f"Leg.{index}",
                x - half,
                x + half,
                LEG_FRONT,
                LEG_FRONT + LEG_Y,
                0.006,
                0.704,
                material,
                bevel=0.001,
                segments=2,
            )
        )
        parts.append(
            cube(
                f"Foot.{index}",
                x - 0.039,
                x + 0.039,
                LEG_FRONT - 0.008,
                LEG_FRONT + LEG_Y + 0.008,
                0.0,
                0.008,
                material,
                bevel=0.0008,
                segments=1,
            )
        )
        parts.append(
            cube(
                f"Bracket.{index}",
                x - 0.036,
                x + 0.036,
                LEG_FRONT - 0.004,
                LEG_FRONT + LEG_Y + 0.010,
                0.700,
                0.710,
                material,
                bevel=0.0008,
                segments=1,
            )
        )
    first, last = FRAME_X[0], FRAME_X[-1]
    parts.append(
        cube(
            "Stretcher",
            first,
            last,
            LEG_FRONT + 0.004,
            LEG_FRONT + LEG_Y - 0.002,
            0.100,
            0.132,
            material,
            bevel=0.0008,
            segments=1,
        )
    )
    # Rear apron matches the current procedural rail so the back silhouette stays.
    parts.append(cube("RearApron", -1.75, 12.20, 0.88, 0.94, 0.595, 0.645, material, bevel=0.001, segments=1))
    for index, x in enumerate(FRAME_X):
        parts.append(cube(f"Strap.{index}", x - 0.008, x + 0.008, 0.900, 0.916, 0.640, 0.712, material))
    parts.append(
        cylinder(
            "Rail",
            ROD_R,
            ROD_X1 - ROD_X0,
            ((ROD_X0 + ROD_X1) / 2, ROD_Y, ROD_Z),
            (0.0, math.pi / 2, 0.0),
            material,
            vertices=16,
        )
    )
    return parts


def return_drawers(walnut: bpy.types.Material) -> tuple[list[bpy.types.Object], list[tuple[float, float, float]]]:
    """Face frame and two drawer fronts. Returns pull centers (x, y, z)."""
    parts: list[bpy.types.Object] = []
    stile_front = 0.0332
    rail_front = 0.0340
    depth = 0.016
    face = 0.0312
    parts.append(cube("Stile.L", RETURN_X0, RETURN_X0 + STILE, stile_front, stile_front + depth, RETURN_Z0, RETURN_Z1, walnut, 0.0006, 1))
    parts.append(cube("Stile.R", RETURN_X1 - STILE, RETURN_X1, stile_front, stile_front + depth, RETURN_Z0, RETURN_Z1, walnut, 0.0006, 1))
    opening0 = RETURN_X0 + STILE
    opening1 = RETURN_X1 - STILE
    # Rails sit 0.8 mm behind the stiles and bite 0.4 mm into them, so the
    # corner is closed without two front faces on the same plane.
    bite = 0.0004
    cursor = RETURN_Z0
    pulls: list[tuple[float, float, float]] = []
    for index in range(2):
        parts.append(
            cube(
                f"Rail.{index}",
                opening0 - bite,
                opening1 + bite,
                rail_front,
                rail_front + depth,
                cursor,
                cursor + RAIL,
                walnut,
                0.0006,
                1,
            )
        )
        cursor += RAIL + REVEAL
        z1 = cursor + DRAWER_H
        parts.append(
            cube(
                f"ReturnDrawer.{index}",
                opening0 + REVEAL,
                opening1 - REVEAL,
                face,
                face + depth,
                cursor,
                z1,
                walnut,
                0.0014,
                2,
            )
        )
        pulls.append(((opening0 + opening1) / 2, face, (cursor + z1) / 2))
        cursor = z1 + REVEAL
    parts.append(
        cube(
            "Rail.Top",
            opening0 - bite,
            opening1 + bite,
            rail_front,
            rail_front + depth,
            cursor,
            cursor + RAIL,
            walnut,
            0.0006,
            1,
        )
    )
    cursor += RAIL
    if abs(cursor - RETURN_Z1) > 1e-6:
        fail(f"Left return frame ends at {cursor:.5f}, expected {RETURN_Z1:.5f}")
    return parts, pulls


def bay_drawers(walnut: bpy.types.Material, steel: bpy.types.Material) -> tuple[list[bpy.types.Object], list[tuple[float, float, float]]]:
    lower_center = RETURN_Z0 + RAIL + REVEAL + DRAWER_H / 2
    z0 = lower_center - BAY_DRAWER_H / 2
    z1 = lower_center + BAY_DRAWER_H / 2
    parts: list[bpy.types.Object] = []
    pulls: list[tuple[float, float, float]] = []
    face = 0.0312
    for index, leg in enumerate(FRAME_X[1:-1]):
        x0 = leg + LEG_X / 2 + BAY_GAP
        x1 = x0 + BAY_DRAWER_W
        parts.append(cube(f"BayDrawer.{index}", x0, x1, face, face + 0.016, z0, z1, walnut, 0.0014, 2))
        parts.append(
            cube(
                f"BayBack.{index}",
                x0 - 0.030,
                x1 + 0.030,
                0.078,
                0.088,
                z0 - 0.030,
                z1 + 0.030,
                steel,
            )
        )
        pulls.append(((x0 + x1) / 2, face, (z0 + z1) / 2))
    return parts, pulls


def pulls_and_fasteners(
    brass: bpy.types.Material,
    centers: list[tuple[float, float, float]],
) -> list[bpy.types.Object]:
    parts: list[bpy.types.Object] = []
    for index, (x, face, z) in enumerate(centers):
        bar_y = face - 0.012
        parts.append(cylinder(f"Pull.{index}", 0.0035, PULL, (x, bar_y, z), (0.0, math.pi / 2, 0.0), brass, 12))
        for side, dx in enumerate((-0.028, 0.028)):
            parts.append(
                cylinder(
                    f"PullPost.{index}.{side}",
                    0.0022,
                    0.012,
                    (x + dx, face - 0.005, z),
                    (math.pi / 2, 0.0, 0.0),
                    brass,
                    8,
                )
            )
    for index, y in enumerate((FRONT + 0.055, FRONT + 0.105, FRONT + 0.155, FRONT + 0.205)):
        parts.append(
            cylinder(
                f"EndFastener.{index}",
                0.0042,
                0.0012,
                (X0 - 0.0003, y, (TOP + BOTTOM) / 2),
                (0.0, math.pi / 2, 0.0),
                brass,
                8,
            )
        )
    bracket_front = LEG_FRONT - 0.004
    for index, x in enumerate(FRAME_X):
        for side, dx in enumerate((-0.016, 0.016)):
            parts.append(
                cylinder(
                    f"BracketScrew.{index}.{side}",
                    0.0024,
                    0.0012,
                    (x + dx, bracket_front + 0.0002, 0.705),
                    (math.pi / 2, 0.0, 0.0),
                    brass,
                    8,
                )
            )
    return parts


def join(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    if not objects:
        fail(f"Nothing to join for {name}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    return obj


def merge_slots(obj: bpy.types.Object) -> None:
    mesh = obj.data
    unique: list[bpy.types.Material] = []
    remap: dict[int, int] = {}
    for index, material in enumerate(mesh.materials):
        if material in unique:
            remap[index] = unique.index(material)
        else:
            remap[index] = len(unique)
            unique.append(material)
    for poly in mesh.polygons:
        poly.material_index = remap[poly.material_index]
    mesh.materials.clear()
    for material in unique:
        mesh.materials.append(material)


def smooth(obj: bpy.types.Object) -> None:
    active(obj)
    if bpy.context.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))


def triangles(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def parent_under(root: bpy.types.Object, child: bpy.types.Object) -> None:
    world = child.matrix_world.copy()
    child.parent = root
    child.matrix_world = world


def assert_contract(slab: bpy.types.Object, inlay: bpy.types.Object, steel: list[bpy.types.Object]) -> None:
    sx0, sx1, sy0, sy1, sz0, sz1 = extents(slab)
    expect_near("slab x0", sx0, X0, 0.001)
    expect_near("slab x1", sx1, X1, 0.001)
    expect_near("slab front", sy0, FRONT, 0.001)
    expect_near("slab back", sy1, BACK, 0.001)
    expect_near("slab underside", sz0, BOTTOM, 0.001)
    expect_near("slab top", sz1, TOP, 0.0004)
    ix0, ix1, _iy0, _iy1, _iz0, iz1 = extents(inlay)
    if iz1 > TOP - 0.0003:
        fail(f"Brass inlay rises to {iz1:.5f}, which meets the walnut face")
    if ix0 < X0 + 0.004 or ix1 > X1 - 0.004:
        fail("Brass inlay runs through the end grain")
    for obj in steel:
        _x0, _x1, _y0, _y1, z0, _z1 = extents(obj)
        if z0 < -0.0001:
            fail(f"{obj.name} drops below the floor ({z0:.5f})")
    feet = [obj for obj in steel if obj.name.startswith("Foot")]
    if len(feet) != len(FRAME_X):
        fail(f"Expected {len(FRAME_X)} feet, found {len(feet)}")
    for foot in feet:
        _x0, _x1, _y0, _y1, z0, _z1 = extents(foot)
        expect_near(foot.name, z0, 0.0, 0.0002)


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()

    scene = bpy.context.scene
    # Plain sRGB, so the matched walnut values are not pushed through AgX.
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    materials = make_materials()
    slab = build_slab(materials)
    inlay = build_inlay(materials["brass"])
    steel_parts = build_frame(materials["steel"])
    walnut_parts = [slab]
    return_parts, return_pulls = return_drawers(materials["walnut"])
    walnut_parts.extend(return_parts)
    bay_parts, bay_pulls = bay_drawers(materials["walnut"], materials["steel"])
    for part in bay_parts:
        if part.data.materials[0] == materials["walnut"]:
            walnut_parts.append(part)
        else:
            steel_parts.append(part)
    brass_parts = [inlay, *pulls_and_fasteners(materials["brass"], return_pulls + bay_pulls)]
    return_back = cube(
        "ReturnBack",
        RETURN_X0 - 0.01,
        RETURN_X1 + 0.01,
        0.080,
        0.092,
        RETURN_Z0 - 0.01,
        RETURN_Z1 + 0.004,
        materials["steel"],
    )
    steel_parts.append(return_back)

    assert_contract(slab, inlay, steel_parts)

    walnut = join(walnut_parts, "WorkbenchWalnut")
    steel = join(steel_parts, "WorkbenchSteel")
    brass = join(brass_parts, "WorkbenchBrass")
    for obj in (walnut, steel, brass):
        merge_slots(obj)
        smooth(obj)
    # Shade-smooth can rebuild the polygon list. End faces are the ones that
    # sit exactly on either cut of the slab, so the end-grain slot is reapplied.
    restored = 0
    for poly in walnut.data.polygons:
        xs = [walnut.data.vertices[index].co.x for index in poly.vertices]
        if max(xs) - min(xs) < 1e-5 and (abs(xs[0] - X0) < 1e-4 or abs(xs[0] - X1) < 1e-4):
            poly.material_index = 1
            # The cut is one flat face. Smooth normals from the roundover
            # otherwise draw the triangulation as a chevron.
            poly.use_smooth = False
            restored += 1
    if restored < 10:
        fail(f"End grain restore found only {restored} faces")
    print(f"END GRAIN faces {restored}")

    for obj in scene.objects:
        if obj.type in {"CAMERA", "LIGHT"}:
            fail(f"Unexpected {obj.type.lower()} in the export scene: {obj.name}")

    total = 0
    for obj in (walnut, steel, brass):
        count = triangles(obj)
        total += count
        print(f"TRIS {obj.name} {count} materials {[slot.name for slot in obj.data.materials]}")
    if total > TRI_CEILING:
        fail(f"Workbench is {total} triangles, above the {TRI_CEILING} ceiling")
    print(f"TRIS total {total}")

    root = bpy.data.objects.new("Workbench", None)
    scene.collection.objects.link(root)
    for obj in (walnut, steel, brass):
        parent_under(root, obj)

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
        export_image_format="AUTO",
        export_image_quality=88,
        export_vertex_color="NONE",
    )
    if not OUTPUT.is_file():
        fail("glTF export reported success but workbench.glb is missing")
    print("EXPORTED", OUTPUT)
    print("BYTES", OUTPUT.stat().st_size)


if __name__ == "__main__":
    main()
