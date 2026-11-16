# Cloth-sim flag render for About's postcard (src/components/Crossing.astro). Run headless:
#   blender -b --factory-startup --python scripts/flags/flag.py -- <saltire|us> <outdir> 301 600 40
# then: npm run flags:loop -- <outdir> flag-saltire src/assets/photography/canvas/edinburgh-skyline.jpg day
#   (or flag-us with src/assets/about/cincinnati-skyline.jpg night)
# Bakes a cloth simulation of the flag (textures beside this file, real proportions) pinned at the
# hoist in gusting wind, and renders first..last close up, the cloth filling a 1116 x 840 frame, as
# RGBA PNGs on a transparent film with Cycles on the GPU and motion blur. Saltire by day, the Stars
# and Stripes floodlit at night. Every setting can be overridden by an environment variable of the same
# name (E('WIND', 20000) and so on); the defaults are the ones the shipped loops were rendered with.
# Blender's cloth mass is per vertex and its air damping and stiffness do not scale with it, so the
# wind is large to match a standard 0.3 mass, not a real-world figure. The cloth runs at a quarter
# speed (TIME) with stiff bending and broad, gentle turbulence, so it reads as a huge flag rolling
# slowly in a steady breeze rather than a small one snapping in a gale.
import bpy, sys, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
FLAG, OUT, FIRST, LAST = argv[0], argv[1], int(argv[2]), int(argv[3])
SAMPLES = int(argv[4]) if len(argv) > 4 else 64
E = lambda k, d: float(os.environ.get(k, d))
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

# ---- scene ---------------------------------------------------------------------------
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene
sc.render.fps = 30
sc.frame_start, sc.frame_end = 1, LAST
sc.render.resolution_x, sc.render.resolution_y = int(E("RX", 1116)), int(E("RY", 840))
sc.render.resolution_percentage = int(E("PCT", 100))
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.engine = 'CYCLES'
cy = bpy.context.preferences.addons['cycles'].preferences
cy.compute_device_type = 'OPTIX'
cy.refresh_devices()
for d in cy.devices:
    d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.denoiser = 'OPTIX'
sc.render.use_motion_blur = True
sc.render.motion_blur_shutter = 0.5
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Punchy'

# ---- the flag: a vertical grid, hoist on the left -------------------------------------
H = 1.5
W = 2.5 if FLAG == 'saltire' else 2.85
# A coarse simulation mesh (Blender's cloth mass is per vertex), smoothed by subdivision at render.
nx = int(E('NX', 60 if FLAG == 'saltire' else 68)); ny = int(nx * H / W)
bpy.ops.mesh.primitive_grid_add(x_subdivisions=nx, y_subdivisions=ny, size=1)
flag = bpy.context.active_object
flag.name = 'Flag'
flag.scale = (W, H, 1)
bpy.ops.object.transform_apply(scale=True)
flag.rotation_euler = (math.radians(90), 0, 0)
flag.location = (W / 2, 0, 0)
bpy.ops.object.transform_apply(location=True, rotation=True)

pin = flag.vertex_groups.new(name='pin')
pin.add([v.index for v in flag.data.vertices if v.co.x < 1e-3], 1.0, 'REPLACE')

cloth = flag.modifiers.new('Cloth', 'CLOTH')
cs = cloth.settings
cs.quality = 10
# Below 1 the cloth moves in slow motion: a huge flag's folds roll slowly and heavily.
cs.time_scale = E('TIME', 0.25)
cs.mass = E('MASS', 0.3)  # kg per vertex: about 0.3 kg for the flag, like real nylon
cs.air_damping = E('AIR', 1.0)
cs.tension_stiffness = cs.compression_stiffness = E('TENS', 15)
cs.shear_stiffness = 4
cs.bending_stiffness = E('BEND', 4)
cs.bending_damping = 0.4
cs.vertex_group_mass = 'pin'
cc = cloth.collision_settings
cc.use_self_collision = bool(E('SELF', 1))
cc.self_distance_min = 0.004
cloth.point_cache.frame_start = 1
cloth.point_cache.frame_end = LAST
sub = flag.modifiers.new('Subd', 'SUBSURF')
sub.levels, sub.render_levels = 1, 3
bpy.ops.object.shade_smooth()

# ---- wind: a steady breeze from the hoist, gusts and turbulence on top -----------------
bpy.ops.object.effector_add(type='WIND', location=(-1.5, 0, 0), rotation=(0, math.radians(90), math.radians(E('ANG', 4))))
wind = bpy.context.active_object
wind.field.strength = E('WIND', 20000)
wind.field.flow = 0.6
wind.field.noise = E('NOISE', 1)
wind.field.seed = 7 if FLAG == 'saltire' else 23
bpy.ops.object.effector_add(type='TURBULENCE', location=(W / 2, -0.5, 0))
turb = bpy.context.active_object
turb.field.strength = E('TURB', 400)
turb.field.size = E('TSIZE', 5)
turb.field.flow = 0.5
turb.field.seed = 3 if FLAG == 'saltire' else 11
# Gusts: the wind swings side to side, and the turbulence drifts downwind with it, so the cloth
# keeps flapping and its ripples travel instead of settling into one shape. Drivers, not keys.
def drive(obj, path, idx, expr):
    d = obj.driver_add(path, idx).driver
    d.type = 'SCRIPTED'
    d.expression = expr
SW = E('SWING', 2)
T = E('TIME', 0.25)  # gusts slow down with the cloth
drive(wind, 'rotation_euler', 2, f'radians({E('ANG', 4)}) + radians({SW}) * (0.6*sin(frame*{T}*0.21) + 0.4*sin(frame*{T}*0.083 + 1.3))')
drive(wind, 'field.strength', -1, f'{E('WIND', 20000)} * (1 + 0.15*sin(frame*{T}*0.13) + 0.08*sin(frame*{T}*0.37))')
drive(turb, 'location', 0, f'-2 + frame * {T} * {E("DRIFT", 0.08)} % 8')

# ---- material: woven nylon, slightly translucent ---------------------------------------
mat = bpy.data.materials.new('Cloth')
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()
N = nt.nodes.new
L = nt.links.new
outp = N('ShaderNodeOutputMaterial')
tex = N('ShaderNodeTexImage')
tex.image = bpy.data.images.load(os.path.join(HERE, f'{FLAG}.png'))
tex.interpolation = 'Cubic'
uv = N('ShaderNodeTexCoord')
L(uv.outputs['UV'], tex.inputs['Vector'])
bsdf = N('ShaderNodeBsdfPrincipled')
L(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.72
bsdf.inputs['Sheen Weight'].default_value = 0.5
bsdf.inputs['Sheen Roughness'].default_value = 0.4
# The weave: two fine wave patterns across the threads, as a bump.
w1 = N('ShaderNodeTexWave'); w1.wave_type = 'BANDS'; w1.bands_direction = 'X'
w2 = N('ShaderNodeTexWave'); w2.wave_type = 'BANDS'; w2.bands_direction = 'Y'
for w in (w1, w2):
    w.inputs['Scale'].default_value = 420
    L(uv.outputs['UV'], w.inputs['Vector'])
mul = N('ShaderNodeMath'); mul.operation = 'MULTIPLY'
L(w1.outputs['Fac'], mul.inputs[0]); L(w2.outputs['Fac'], mul.inputs[1])
bump = N('ShaderNodeBump')
bump.inputs['Strength'].default_value = 0.05
bump.inputs['Distance'].default_value = 0.002
L(mul.outputs['Value'], bump.inputs['Height'])
L(bump.outputs['Normal'], bsdf.inputs['Normal'])
trans = N('ShaderNodeBsdfTranslucent')
L(tex.outputs['Color'], trans.inputs['Color'])
mix = N('ShaderNodeMixShader')
mix.inputs['Fac'].default_value = 0.18
L(bsdf.outputs['BSDF'], mix.inputs[1]); L(trans.outputs['BSDF'], mix.inputs[2])
L(mix.outputs['Shader'], outp.inputs['Surface'])
flag.data.materials.append(mat)

# ---- light -----------------------------------------------------------------------------
world = bpy.data.worlds.new('World'); sc.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
if FLAG == 'saltire':
    # A bright Edinburgh day: low sun from the front left, blue sky fill.
    bg.inputs['Color'].default_value = (0.42, 0.6, 0.95, 1)
    bg.inputs['Strength'].default_value = 0.9
    # Raking light from the side and a little behind, so every fold casts a shadow.
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(E('SUNX', 70)), 0, math.radians(E('SUNZ', -70))))
    sun = bpy.context.active_object
    sun.data.energy = 4.5
    sun.data.angle = math.radians(1.5)
    sun.data.color = (1, 0.96, 0.9)
else:
    # Cincinnati at night: a warm floodlight from below the flag, city glow behind.
    bg.inputs['Color'].default_value = (0.05, 0.06, 0.12, 1)
    bg.inputs['Strength'].default_value = 0.6
    bpy.ops.object.light_add(type='SPOT', location=(W * 0.35, -3.2, -2.6))
    spot = bpy.context.active_object
    spot.data.energy = 2600
    spot.data.spot_size = math.radians(55)
    spot.data.spot_blend = 0.6
    spot.data.shadow_soft_size = 0.25
    spot.data.color = (1, 0.9, 0.78)
    d = Vector((W * 0.55, 0, 0.1)) - spot.location
    spot.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='AREA', location=(W * 0.6, 2.5, 1.5))
    rim = bpy.context.active_object
    rim.data.energy = 120
    rim.data.size = 3
    rim.data.color = (0.6, 0.7, 1)
    d = Vector((W * 0.5, 0, 0)) - rim.location
    rim.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

# ---- camera: the cloth fills the frame, the hoist just out of shot ----------------------
bpy.ops.object.camera_add()
cam = bpy.context.active_object
sc.camera = cam
cam.data.lens = 50
cam.data.sensor_fit = 'HORIZONTAL'  # the frame's width is set by the flag, whatever its height
# Close in, a touch below and to the side, so the folds have depth and the cloth fills the frame.
target = Vector((W * 0.5, 0, -E('TZ', 0.15)))
# The cloth fills the frame: its height takes 72% of the flag's, its width follows the frame shape.
frame_w = H * E('FRAME', 0.55) * sc.render.resolution_x / sc.render.resolution_y
dist = frame_w * cam.data.lens / cam.data.sensor_width
yaw = math.radians(E('YAW', 8))
cam.location = target + Vector((-math.sin(yaw) * dist, -math.cos(yaw) * dist, -E('LOW', 0.15)))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()

# ---- bake the simulation (motion blur needs the cache), then render first..last -------
sc.frame_set(1)
with bpy.context.temp_override(scene=sc, active_object=flag, object=flag, point_cache=cloth.point_cache):
    bpy.ops.ptcache.bake(bake=True)
print("BAKED", cloth.point_cache.is_baked)
STEP = int(E('STEP', 1))
for f in range(FIRST, LAST + 1, STEP):
    sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, f'{f:04d}.png')
    bpy.ops.render.render(write_still=True)
print('DONE', FLAG, FIRST, LAST)
