/* One step of a damped spring, the feel About's portrait has when you pick it up and let go.
   `sp` is { x, v } (where it is, how fast it is moving), `to` where it wants to be, `k` the
   stiffness, `d` the damping and `dt` the frame time in seconds. It moves `sp` on by one frame and
   returns false once it has settled (then it snaps to `to`), so a requestAnimationFrame loop can
   stop when every spring it drives is at rest. Reduced motion is the caller's job: skip the loop
   and set `x` straight to `to`. */
export function spring(sp, to, k, d, dt) {
  sp.v += (k * (to - sp.x) - d * sp.v) * dt;
  sp.x += sp.v * dt;
  if (Math.abs(to - sp.x) < 0.002 && Math.abs(sp.v) < 0.01) {
    sp.x = to;
    sp.v = 0;
    return false;
  }
  return true;
}
