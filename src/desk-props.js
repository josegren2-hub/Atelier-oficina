/** Low-poly per-profession desk objects (Oficina v16.16 spirit) — shared materials, hide when phoneFar. */
import * as THREE from 'three';

function mats() {
  const mk = (color, metal = 0.1, rough = 0.55) => new THREE.MeshStandardMaterial({color, metalness: metal, roughness: rough});
  return {
    negro: mk(0x1d1d1f, 0.2, 0.45),
    marco: mk(0x4a5560, 0.35, 0.4),
    nogal: mk(0x6b4423, 0.05, 0.7),
    papel: mk(0xf4efe6, 0, 0.9),
    rojo: mk(0xb43c3c, 0.1, 0.5),
    oro: mk(0xc8a46a, 0.6, 0.35),
    gris: mk(0x7a7f88, 0.3, 0.45),
    pantalla: mk(0x88c4ff, 0.1, 0.2),
    morado: mk(0x7a5ca8, 0.1, 0.5),
    azul: mk(0x3b82f6),
    naranja: mk(0xf59b27),
    verde: mk(0x30aa76),
  };
}

function box(m, w, h, d) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
function cyl(m, r, h, r2 = r, n = 10) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r2, h, n), m); }

/** Build a small group of props for a bot id. */
export function createDeskProp(id, M = mats()) {
  const g = new THREE.Group();
  g.name = `desk-prop-${id}`;
  const add = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); };
  const TOP = 0;
  switch (id) {
    case 'director':
      add(box(M.negro, 0.2, 0.12, 0.12), 0, TOP + 0.06, 0);
      { const lens = cyl(M.marco, 0.045, 0.08); lens.rotation.x = Math.PI / 2; add(lens, 0, TOP + 0.06, 0.1); }
      break;
    case 'julian':
      { const gavel = cyl(M.nogal, 0.035, 0.14); gavel.rotation.z = Math.PI / 2; add(gavel, 0, TOP + 0.06, 0); }
      break;
    case 'mateo':
      add(box(M.papel, 0.22, 0.012, 0.3), 0, TOP + 0.006, 0);
      add(box(M.rojo, 0.22, 0.013, 0.07), 0, TOP + 0.007, -0.05);
      break;
    case 'tr-editor':
      add(box(M.papel, 0.21, 0.004, 0.29), 0, TOP + 0.002, 0);
      { const pen = cyl(M.rojo, 0.008, 0.16); pen.rotation.z = Math.PI / 2; add(pen, 0.02, TOP + 0.012, -0.04); }
      break;
    case 'tr-cm':
      add(box(M.negro, 0.14, 0.09, 0.06), 0, TOP + 0.045, 0);
      { const lens = cyl(M.marco, 0.03, 0.05); lens.rotation.x = Math.PI / 2; add(lens, 0, TOP + 0.045, 0.05); }
      break;
    case 'tadeo':
      add(box(M.gris, 0.3, 0.015, 0.2), 0, TOP + 0.008, 0);
      { const lid = box(M.gris, 0.3, 0.2, 0.01); lid.rotation.x = -0.25; lid.position.set(0, TOP + 0.11, -0.1); g.add(lid); }
      break;
    case 'ted':
      add(box(M.nogal, 0.2, 0.012, 0.28), 0, TOP + 0.006, 0);
      add(box(M.papel, 0.17, 0.004, 0.22), 0, TOP + 0.014, 0.01);
      add(box(M.oro, 0.08, 0.02, 0.03), 0, TOP + 0.02, -0.12);
      break;
    case 'luna':
      add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M.morado), 0, TOP + 0.12, 0);
      add(cyl(M.oro, 0.06, 0.04, 0.08), 0, TOP + 0.02, 0);
      break;
    case 'vale':
      { const phone = box(M.negro, 0.07, 0.14, 0.008); phone.rotation.x = -0.3; add(phone, 0, TOP + 0.07, 0); }
      break;
    case 'emiliano':
      { const bar = cyl(M.marco, 0.012, 0.22); bar.rotation.z = Math.PI / 2; add(bar, 0, TOP + 0.045, 0); }
      break;
    case 'ines':
      add(box(M.gris, 0.12, 0.02, 0.18), 0, TOP + 0.01, 0);
      add(box(M.pantalla, 0.09, 0.004, 0.04), 0, TOP + 0.022, -0.05);
      break;
    case 'ceo':
      add(box(M.nogal, 0.32, 0.22, 0.09), 0, TOP + 0.11, 0);
      break;
    case 'apps':
      { const phone = box(M.negro, 0.07, 0.14, 0.008); phone.rotation.x = -0.3; add(phone, 0, TOP + 0.07, 0); }
      break;
    case 'libro':
      add(box(M.papel, 0.16, 0.05, 0.22), 0, TOP + 0.025, 0);
      add(box(M.rojo, 0.17, 0.012, 0.23), 0, TOP + 0.056, 0);
      break;
    case 'rulo':
      add(cyl(M.negro, 0.06, 0.015), 0, TOP + 0.008, 0);
      add(cyl(M.marco, 0.01, 0.2), 0, TOP + 0.11, 0);
      add(cyl(M.oro, 0.043, 0.012), 0, TOP + 0.21, 0);
      break;
    case 'luca':
      add(box(M.marco, 0.2, 0.012, 0.03), 0, TOP + 0.008, 0);
      break;
    default:
      add(box(M.gris, 0.12, 0.04, 0.08), 0, TOP + 0.02, 0);
  }
  g.scale.setScalar(1.15);
  return g;
}

/** Attach props near each bot model group. Returns controller. */
export function attachDeskProps(botModels) {
  const M = mats();
  const props = [];
  for (const b of botModels) {
    const prop = createDeskProp(b.id, M);
    prop.position.set(0.55, 0.75, 0.15);
    b.group.add(prop);
    props.push(prop);
  }
  return {
    setVisible(v) { for (const p of props) p.visible = v; },
    dispose() {
      for (const p of props) {
        p.parent?.remove(p);
        p.traverse(o => {
          o.geometry?.dispose?.();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
            else o.material.dispose?.();
          }
        });
      }
    },
  };
}
