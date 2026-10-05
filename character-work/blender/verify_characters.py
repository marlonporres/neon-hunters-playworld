"""Render the saved master and verify each retained humanoid rig deforms its mesh."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector, Quaternion

BASE = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(BASE / 'GameCharacters_Master.blend'))
report = []
for collection in [bpy.data.collections['CHAR_' + name] for name in ('RUMI', 'MIRA', 'ZOEY')]:
    armature = next(o for o in collection.objects if o.type == 'ARMATURE')
    meshes = [o for o in collection.objects if o.type == 'MESH']
    checks = []
    for suffix in ('C_Head', 'L_Shoulder', 'L_UpperArm', 'C_Hips', 'L_UpperLeg', 'L_LowerLeg'):
        bone = armature.pose.bones.get('J_Bip_' + suffix)
        assert bone is not None, suffix
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        before = [[v.co.copy() for v in o.evaluated_get(graph).data.vertices] for o in meshes]
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = Quaternion((1, 0, 0), 0.25)
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        change = max((v.co - old).length for obj, old_mesh in zip(meshes, before) for v, old in zip(obj.evaluated_get(graph).data.vertices, old_mesh))
        assert math.isfinite(change) and change > 0.0001, f'{collection.name} {suffix} did not deform'
        checks.append({'joint': suffix, 'maxVertexMovement': change})
        bone.rotation_quaternion.identity()
    # Front comparison pose only; the saved master and GLBs retain the bind pose.
    for side, sign in [('L', 1), ('R', -1)]:
        bone = armature.pose.bones['J_Bip_' + side + '_UpperArm']
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = Quaternion((0, 0, 1), -sign * 1.3)
    report.append({'character': collection.name, 'deformation': checks})

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1500
scene.render.resolution_y = 750
scene.render.resolution_percentage = 100
scene.world.color = (0.6, 0.6, 0.6)
scene.view_settings.view_transform = 'Standard'
camera_data = bpy.data.cameras.new('Comparison Camera')
camera = bpy.data.objects.new('Comparison Camera', camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -10, 2.5)
camera.rotation_euler = (Vector((0, 0, 1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 8.2
scene.camera = camera
light_data = bpy.data.lights.new('Softbox', 'AREA')
light = bpy.data.objects.new('Softbox', light_data)
scene.collection.objects.link(light)
light.location = (0, -4, 6)
light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()
light_data.energy = 500
light_data.shape = 'DISK'
light_data.size = 8
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(BASE / 'comparison.png')
bpy.ops.render.render(write_still=True)
(BASE / 'rig-verification.json').write_text(json.dumps(report, indent=2))
print('ALL_THREE_RIGS_VERIFIED')
