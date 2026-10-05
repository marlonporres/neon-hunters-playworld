"""Import VRoid VRMs with Blender's standard glTF importer; preserve rigs and morphs."""
import bpy, json
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
report = []
for index, name in enumerate(('Rumi', 'Mira', 'Zoey')):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(BASE / 'vrm' / f'{name}_MVP.vrm'))
    objects = list(set(bpy.data.objects) - before)
    # Blender's glTF bone display creates an Icosphere helper, not avatar geometry.
    for obj in list(objects):
        if obj.name.startswith('Icosphere'):
            objects.remove(obj)
            bpy.data.objects.remove(obj, do_unlink=True)
    collection = bpy.data.collections.new('CHAR_' + name.upper())
    bpy.context.scene.collection.children.link(collection)
    for obj in objects:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        collection.objects.link(obj)
    root = bpy.data.objects.new(name + '_GameRoot', None)
    collection.objects.link(root)
    for obj in objects:
        if obj.parent is None:
            obj.parent = root
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH' for corner in obj.bound_box]
    bottom, top = min(p.z for p in points), max(p.z for p in points)
    factor = 2.0 / (top - bottom)
    root.scale = (factor,) * 3
    root.location.z = -bottom * factor
    for obj in objects:
        if obj.type == 'MESH':
            obj.data.name = name + '_' + obj.data.name
    for image in bpy.data.images:
        if image.size[0] > 1024 or image.size[1] > 1024:
            ratio = 1024 / max(image.size)
            image.scale(max(1, round(image.size[0] * ratio)), max(1, round(image.size[1] * ratio)))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects + [root]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(BASE / 'exports' / f'{name.lower()}.glb'), export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_morph=True, export_extras=True)
    report.append({'name': name, 'height': 2.0, 'sourceHeight': top-bottom, 'triangles': sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in objects if obj.type == 'MESH'), 'meshes': [{'name': obj.name, 'vertices': len(obj.data.vertices), 'morphs': len(obj.data.shape_keys.key_blocks) if obj.data.shape_keys else 0} for obj in objects if obj.type == 'MESH'], 'rigs': [{'name': obj.name, 'bones': len(obj.data.bones)} for obj in objects if obj.type == 'ARMATURE']})
    root.location.x = (index-1) * 2.4
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        area.spaces.active.shading.type = 'MATERIAL'
        area.spaces.active.region_3d.view_distance = 7.0
        area.spaces.active.region_3d.view_location = (0, 0, 1)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(BASE / 'blender' / 'GameCharacters_Master.blend'))
(BASE / 'blender' / 'model-report.json').write_text(json.dumps(report, indent=2))
print('CHARACTER_EXPORT_COMPLETE', json.dumps(report))
